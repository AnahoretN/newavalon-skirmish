/**
 * @file Game lifecycle service
 * Manages game termination, player disconnection, inactivity timers, and logging
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';
import { getGameState, deleteGameState, getPublicGames } from './gameState.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOGS_DIR = path.join(__dirname, '../../logs');
const INACTIVITY_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes

// Timer storage
export const gameTerminationTimers = new Map(); // gameId -> NodeJS.Timeout
export const gameInactivityTimers = new Map(); // gameId -> NodeJS.Timeout
export const playerDisconnectTimers = new Map(); // Key: `${gameId}-${playerId}` -> NodeJS.Timeout

/**
 * Ensure logs directory exists
 */
async function ensureLogsDir() {
  try {
    await fs.access(LOGS_DIR);
  } catch {
    await fs.mkdir(LOGS_DIR, { recursive: true });
  }
}

/**
 * Adds a timestamped message to a game's log
 */
export function logToGame(gameId: string, message: string, gameLogs: Map<string, string[]>) {
  if (!gameId) return;
  if (!gameLogs.has(gameId)) {
    gameLogs.set(gameId, []);
  }
  const logMessages = gameLogs.get(gameId);
  if (logMessages) {
    logMessages.push(`[${new Date().toISOString()}] ${message}`);
  }
}

/**
 * Ends a game, saves its log, and cleans up all associated data
 */
export async function endGame(
  gameId: string,
  reason: string,
  gameLogs: Map<string, string[]>,
  wss: any
) {
  logToGame(gameId, `Game ending due to: ${reason}.`, gameLogs);
  logger.info(`Ending game ${gameId} due to: ${reason}.`);

  // 1. Save the log file
  await ensureLogsDir();
  const logData = gameLogs.get(gameId);
  if (logData && logData.length > 0) {
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const filename = path.join(LOGS_DIR, `game-${gameId}-${timestamp}.log`);
    try {
      await fs.writeFile(filename, logData.join('\n'));
      logger.info(`Log for game ${gameId} saved to ${filename}`);
    } catch (error) {
      logger.error(`Failed to write log for game ${gameId}:`, error);
    }
  }

  // 2. Clean up all in-memory data
  deleteGameState(gameId);
  gameLogs.delete(gameId);

  const timerId = gameTerminationTimers.get(gameId);
  if (timerId) {
    clearTimeout(timerId);
    gameTerminationTimers.delete(gameId);
  }

  const inactivityTimerId = gameInactivityTimers.get(gameId);
  if (inactivityTimerId) {
    clearTimeout(inactivityTimerId);
    gameInactivityTimers.delete(gameId);
  }

  // Clean up any pending player conversion timers for this game
  for (const [key, timer] of playerDisconnectTimers.entries()) {
    if (key.startsWith(`${gameId}-`)) {
      clearTimeout(timer);
      playerDisconnectTimers.delete(key);
    }
  }

  // 3. Disconnect any remaining clients (spectators) in that game
  if (wss && wss.clients) {
    const clients = wss.clients;
    clients.forEach((client: any) => {
      if (client.gameId === gameId) {
        client.terminate(); // Forcefully close the connection
      }
    });
  }

  // 4. Update the public games list for all clients
  broadcastGamesList(gameLogs, wss);
}

/**
 * Resets the inactivity timer for a game
 * If the timer expires, the game is terminated
 */
export function resetInactivityTimer(
  gameId: string,
  gameLogs: Map<string, string[]>,
  wss: any
) {
  if (!gameId) return;

  // Clear existing timer
  if (gameInactivityTimers.has(gameId)) {
    clearTimeout(gameInactivityTimers.get(gameId));
  }

  // Set new timer
  const timerId = setTimeout(() => {
    const gameState = getGameState(gameId);
    if (gameState) {
      logToGame(gameId, 'Game terminated due to inactivity (20 minutes without action).', gameLogs);
      endGame(gameId, '20 minutes inactivity', gameLogs, wss);
    }
  }, INACTIVITY_TIMEOUT_MS);

  gameInactivityTimers.set(gameId, timerId);
}

/**
 * Converts a disconnected player into a dummy player
 */
export function convertPlayerToDummy(
  gameId: string,
  playerId: number,
  gameLogs: Map<string, string[]>,
  broadcastState: (gameId: string, gameState: any) => void
) {
  const gameState = getGameState(gameId);
  if (!gameState) return;

  const player = gameState.players.find((p: any) => p.id === playerId);
  if (player && player.isDisconnected) {
    logToGame(gameId, `Player ${playerId} (${player.name}) failed to reconnect and is now a Dummy.`, gameLogs);
    logger.info(`Converting Player ${playerId} in game ${gameId} to Dummy.`);

    player.isDummy = true;
    player.isDisconnected = false; // Dummies are "connected" but not human
    player.name = `Dummy ${player.id}`;
    player.playerToken = null; // Prevent reconnection as this player

    // Remove the timer tracking this conversion
    playerDisconnectTimers.delete(`${gameId}-${playerId}`);

    broadcastState(gameId, gameState);
  }
}

/**
 * Schedules a game to be terminated after a delay if no real players are active
 */
export function scheduleGameTermination(
  gameId: string,
  gameLogs: Map<string, string[]>,
  wss: any
) {
  if (gameTerminationTimers.has(gameId)) return; // Timer already scheduled

  logToGame(gameId, 'Last real player disconnected. Starting 1-minute shutdown timer.', gameLogs);
  logger.info(`Scheduling termination for game ${gameId} in 1 minute.`);

  const timerId = setTimeout(() => {
    const gameState = getGameState(gameId);
    // An active player is one who is not a dummy and not disconnected
    const activePlayers = gameState ? gameState.players.filter((p: any) => !p.isDummy && !p.isDisconnected) : [];
    if (activePlayers.length === 0) {
      endGame(gameId, 'inactivity timeout (empty game)', gameLogs, wss);
    } else {
      gameTerminationTimers.delete(gameId); // A player reconnected
    }
  }, 60 * 1000); // 1 minute

  gameTerminationTimers.set(gameId, timerId);
}

/**
 * Cancels a scheduled game termination, usually because a player has reconnected
 */
export function cancelGameTermination(gameId: string, gameLogs: Map<string, string[]>) {
  if (gameTerminationTimers.has(gameId)) {
    clearTimeout(gameTerminationTimers.get(gameId));
    gameTerminationTimers.delete(gameId);
    logToGame(gameId, 'Shutdown timer cancelled due to player activity.', gameLogs);
    logger.info(`Termination cancelled for game ${gameId}.`);
  }
}

/**
 * Handles the logic for a player disconnecting from a game
 * Marks the player as disconnected, leaving their slot open
 */
export function handlePlayerLeave(
  gameId: string,
  playerId: number,
  isManualExit: boolean,
  gameLogs: Map<string, string[]>,
  wss: any,
  broadcastState: (gameId: string, gameState: any) => void,
  broadcastGamesListFn: () => void
) {
  if (!gameId || playerId === null || playerId === undefined) return;

  const gameState = getGameState(gameId);
  if (!gameState) return;

  const updatedPlayers = gameState.players.map((p: any) => {
    if (p.id === playerId && !p.isDisconnected) {
      return { ...p, isDisconnected: true, isReady: false };
    }
    return p;
  });

  // Update the game state
  if (typeof gameState.players !== 'undefined') {
    gameState.players = updatedPlayers;
  }

  // Clear existing conversion timer for this player if any
  const timerKey = `${gameId}-${playerId}`;
  if (playerDisconnectTimers.has(timerKey)) {
    clearTimeout(playerDisconnectTimers.get(timerKey));
    playerDisconnectTimers.delete(timerKey);
  }

  // If NOT a manual exit, schedule conversion to dummy in 60 seconds
  if (!isManualExit) {
    logger.info(`Scheduling conversion to Dummy for Player ${playerId} in game ${gameId} in 60s.`);
    const timerId = setTimeout(() => {
      convertPlayerToDummy(gameId, playerId, gameLogs, broadcastState);
    }, 60 * 1000); // 1 minute
    playerDisconnectTimers.set(timerKey, timerId);
  }

  // An active player is a human who is currently connected
  const activePlayers = updatedPlayers.filter((p: any) => !p.isDummy && !p.isDisconnected);

  if (activePlayers.length === 0) {
    scheduleGameTermination(gameId, gameLogs, wss);
  }

  broadcastState(gameId, gameState);
  broadcastGamesListFn();
}

/**
 * Sends the list of all active games to every connected client
 */
export function broadcastGamesList(gameLogs: Map<string, string[]>, wss: any) {
  const gamesList = getPublicGames();

  const message = JSON.stringify({ type: 'GAMES_LIST', games: gamesList });

  if (wss && wss.clients) {
    const clients = wss.clients;
    clients.forEach((client: any) => {
      if (client.readyState === 1) { // WebSocket.OPEN
        try {
          client.send(message);
        } catch (err) {
          logger.error(`BROADCAST_GAMES_LIST_ERROR: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    });
  }
}
