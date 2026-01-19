/**
 * @file Ready check handlers
 * Manages the ready check phase before game starts
 */

import { logger } from '../utils/logger.js';
import { getGameState } from '../services/gameState.js';
import { broadcastToGame } from '../services/websocket.js';
import { performDrawPhase } from './phaseManagement.js';

/**
 * Handle START_READY_CHECK message
 * Activates ready check phase and resets all player ready states
 */
export function handleStartReadyCheck(ws, data) {
  try {
    const gameState = getGameState(data.gameId);
    if (!gameState) {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'Game not found'
      }));
      return;
    }

    if (gameState.isGameStarted) {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'Game already started'
      }));
      return;
    }

    // Reset all ready statuses
    gameState.players.forEach(p => p.isReady = false);
    gameState.isReadyCheckActive = true;

    broadcastToGame(data.gameId, gameState);
    logger.info(`Ready check started for game ${data.gameId}`);
  } catch (error) {
    logger.error('Failed to start ready check:', error);
    ws.send(JSON.stringify({
      type: 'ERROR',
      message: 'Failed to start ready check'
    }));
  }
}

/**
 * Handle CANCEL_READY_CHECK message
 * Deactivates ready check phase
 */
export function handleCancelReadyCheck(ws, data) {
  try {
    const gameState = getGameState(data.gameId);
    if (!gameState) {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'Game not found'
      }));
      return;
    }

    if (!gameState.isReadyCheckActive) {
      return; // Already not in ready check
    }

    // Deactivate ready check and reset all ready states
    gameState.isReadyCheckActive = false;
    gameState.players.forEach(p => p.isReady = false);

    broadcastToGame(data.gameId, gameState);
    logger.info(`Ready check cancelled for game ${data.gameId}`);
  } catch (error) {
    logger.error('Failed to cancel ready check:', error);
    ws.send(JSON.stringify({
      type: 'ERROR',
      message: 'Failed to cancel ready check'
    }));
  }
}

/**
 * Handle PLAYER_READY message
 * Marks a player as ready and checks if all players are ready
 */
export function handlePlayerReady(ws, data) {
  try {
    const gameState = getGameState(data.gameId);
    if (!gameState) {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'Game not found'
      }));
      return;
    }

    if (!gameState.isReadyCheckActive) {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'No active ready check'
      }));
      return;
    }

    if (gameState.isGameStarted) {
      return; // Game already started
    }

    if (!data.playerId) {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'Player ID is required'
      }));
      return;
    }

    // Mark player as ready
    const player = gameState.players.find(p => p.id === data.playerId);
    if (!player) {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: `Player with ID ${data.playerId} not found in game`
      }));
      return;
    }

    player.isReady = true;
    logger.info(`Player ${data.playerId} marked as ready in game ${data.gameId}`);

    // Check if all non-dummy, connected players are ready
    const realPlayers = gameState.players.filter(p => !p.isDummy && !p.isDisconnected);
    const allReady = realPlayers.length > 0 && realPlayers.every(p => p.isReady);

    if (allReady && realPlayers.length >= 1) {
      // All players ready - start the game!
      logger.info(`[ReadyCheck] ========== ALL PLAYERS READY - STARTING GAME ==========`);
      gameState.isReadyCheckActive = false;
      gameState.isGameStarted = true;
      gameState.autoDrawnPlayers = []; // Clear auto-draw tracking for new game

      // Randomly select starting player from ALL players (including dummies)
      const allPlayers = gameState.players.filter(p => !p.isDisconnected);
      const randomIndex = Math.floor(Math.random() * allPlayers.length);
      gameState.startingPlayerId = allPlayers[randomIndex].id;
      gameState.activePlayerId = allPlayers[randomIndex].id;

      logger.info(`[ReadyCheck] Starting player: ${gameState.startingPlayerId} (${allPlayers[randomIndex].name}), Active player: ${gameState.activePlayerId}`);

      // Draw starting hands for players with auto-draw enabled
      // First player (active) draws 6 cards, others draw 6
      // Note: The extra card (7th) for first turn comes from Draw phase
      // For dummy players: check if host (Player 1) has auto-draw enabled
      // For real players: check their own auto-draw setting
      const hostPlayer = gameState.players.find(p => p.id === 1)
      const hostAutoDrawEnabled = hostPlayer?.autoDrawEnabled === true

      logger.info(`[ReadyCheck] Starting hand draw - host autoDrawEnabled: ${hostAutoDrawEnabled}, host exists: ${!!hostPlayer}`)

      for (const player of gameState.players) {
        logger.info(`[ReadyCheck] BEFORE DRAW - Player ${player.id} (name: ${player.name}, dummy: ${player.isDummy}): hand=${player.hand.length}, deck=${player.deck.length}, autoDrawEnabled=${player.autoDrawEnabled}`)

        if (player.hand.length > 0) {
          logger.info(`[ReadyCheck] Player ${player.id} already has ${player.hand.length} cards in hand - skipping starting hand draw`)
          continue
        }

        let shouldDraw = false
        if (player.isDummy) {
          // Dummy players draw if host has auto-draw enabled
          shouldDraw = hostAutoDrawEnabled
        } else {
          // Real players draw if they have auto-draw enabled (or use their own setting)
          // If real player doesn't have autoDrawEnabled set yet, default to true
          shouldDraw = player.autoDrawEnabled !== false
        }

        logger.info(`[ReadyCheck] Player ${player.id} shouldDraw starting hand: ${shouldDraw}`)

        if (!shouldDraw) {
          continue
        }

        // All players draw 6 cards (first player's extra 7th card comes from Draw phase)
        const cardsToDraw = 6

        // Draw cards from deck to hand
        for (let i = 0; i < cardsToDraw && i < player.deck.length; i++) {
          const drawnCard = player.deck[0]
          player.deck.splice(0, 1)
          player.hand.push(drawnCard)
        }

        logger.info(`[ReadyCheck] ✅ Drew ${cardsToDraw} cards for player ${player.id} (dummy: ${player.isDummy}). AFTER: hand=${player.hand.length}, deck=${player.deck.length}`);
      }

      logger.info(`[ReadyCheck] All starting hands drawn. Now triggering Draw phase for starting player ${gameState.activePlayerId}...`);

      // Log state before Draw phase
      const startingPlayer = gameState.players.find(p => p.id === gameState.activePlayerId);
      if (startingPlayer) {
        logger.info(`[ReadyCheck] Starting player state BEFORE Draw phase: hand=${startingPlayer.hand.length}, deck=${startingPlayer.deck.length}`);
      }

      // Trigger Draw phase for the starting player to give them their 7th card
      gameState.currentPhase = -1;
      logger.info(`[ReadyCheck] Phase set to -1, calling performDrawPhase...`);
      performDrawPhase(gameState);

      // Log state after Draw phase
      if (startingPlayer) {
        logger.info(`[ReadyCheck] Starting player state AFTER Draw phase: hand=${startingPlayer.hand.length}, deck=${startingPlayer.deck.length}`);
      }
      logger.info(`[ReadyCheck] Phase after Draw phase: ${gameState.currentPhase}`);
      logger.info(`[ReadyCheck] ========== GAME STARTED ==========`);
    }

    broadcastToGame(data.gameId, gameState);
  } catch (error) {
    logger.error('Failed to mark player as ready:', error);
    ws.send(JSON.stringify({
      type: 'ERROR',
      message: 'Failed to mark player as ready'
    }));
  }
}
