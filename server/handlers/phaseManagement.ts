/**
 * @file Phase management handlers
 * Handles turn phase navigation and auto-abilities toggle
 */

import { logger } from '../utils/logger.js';
import { getGameState } from '../services/gameState.js';
import { broadcastToGame } from '../services/websocket.js';

/**
 * Calculate the victory point threshold for a given round
 * Formula: 10 + (roundNumber * 10)
 * Round 1: 20, Round 2: 30, Round 3: 40, etc.
 */
export function getRoundVictoryThreshold(round: number): number {
  return 10 + (round * 10);
}

/**
 * Check if the round should end based on player scores
 * Called ONLY when the first player (startingPlayerId) enters Setup phase
 * or when the starting player is deselected (ending their turn)
 * @param gameState - The current game state
 * @param isDeselectCheck - Whether this check is triggered by deselecting the starting player
 * @returns true if round should end, false otherwise
 */
export function checkRoundEnd(gameState: any, isDeselectCheck = false): boolean {
  // Calculate the victory threshold for current round
  const threshold = getRoundVictoryThreshold(gameState.currentRound);
  const maxScore = Math.max(...gameState.players.map((p: any) => p.score || 0));
  const scores = gameState.players.map((p: any) => `P${p.id}:${p.score}`).join(', ');

  // Log the check attempt with all relevant info
  logger.info(`[RoundCheck] ========== ROUND CHECK ==========`);
  logger.info(`[RoundCheck] Round: ${gameState.currentRound}, Threshold: ${threshold}`);
  logger.info(`[RoundCheck] Phase: ${gameState.currentPhase}, activePlayerId: ${gameState.activePlayerId}, startingPlayerId: ${gameState.startingPlayerId}, isDeselectCheck: ${isDeselectCheck}`);
  logger.info(`[RoundCheck] Scores: [${scores}], Max: ${maxScore}`);
  logger.info(`[RoundCheck] isGameStarted: ${gameState.isGameStarted}, isRoundEndModalOpen: ${gameState.isRoundEndModalOpen}`);

  // Only check if game has started
  if (!gameState.isGameStarted) {
    logger.info(`[RoundCheck] ❌ SKIP: Game not started`);
    return false;
  }

  // Don't check if round end modal is already open
  if (gameState.isRoundEndModalOpen) {
    logger.info(`[RoundCheck] ❌ SKIP: Modal already open`);
    return false;
  }

  // Only check during Setup phase (0) when the starting player becomes active
  // This ensures the round is checked exactly once per round cycle
  if (gameState.currentPhase !== 0) {
    logger.info(`[RoundCheck] ❌ SKIP: Wrong phase (${gameState.currentPhase}), expected 0`);
    return false;
  }

  // Only check if the starting player is the active player, unless this is a deselect check
  // This prevents checking when other players are in their turns
  if (!isDeselectCheck && gameState.activePlayerId !== gameState.startingPlayerId) {
    logger.info(`[RoundCheck] ❌ SKIP: activePlayerId (${gameState.activePlayerId}) != startingPlayerId (${gameState.startingPlayerId})`);
    return false;
  }

  // Check if any player has reached the threshold
  if (maxScore >= threshold) {
    logger.info(`[RoundCheck] ✅ ROUND ${gameState.currentRound} ENDING - max score ${maxScore} >= threshold ${threshold}`);
    return true;
  }

  logger.info(`[RoundCheck] ❌ Round ${gameState.currentRound} continues - max score ${maxScore} < threshold ${threshold}`);
  return false;
}

/**
 * End the current round and determine winner(s)
 */
export function endRound(gameState: any): void {
  // Find all players with the highest score (who reached or exceeded threshold)
  const maxScore = Math.max(...gameState.players.map((p: any) => p.score || 0));
  const roundWinners = gameState.players
    .filter((p: any) => p.score === maxScore)
    .map((p: any) => p.id);

  // Store winners for this round
  if (!gameState.roundWinners) {
    gameState.roundWinners = {};
  }
  gameState.roundWinners[gameState.currentRound] = roundWinners;

  // Check for game winner (first to 2 round wins)
  const totalWins: Record<number, number> = {};
  Object.values(gameState.roundWinners).forEach((winners: any) => {
    (winners as number[]).forEach((winnerId: number) => {
      totalWins[winnerId] = (totalWins[winnerId] || 0) + 1;
    });
  });

  // Check if anyone has won 2 rounds
  for (const [playerId, winCount] of Object.entries(totalWins)) {
    if (winCount >= 2) {
      gameState.gameWinner = parseInt(playerId, 10);
      logger.info(`[RoundEnd] Player ${playerId} wins the match with ${winCount} round wins!`);
      break;
    }
  }

  // Mark round as triggered and open modal
  gameState.roundEndTriggered = true;
  gameState.isRoundEndModalOpen = true;

  logger.info(`[RoundEnd] Round ${gameState.currentRound} ended. Winners: ${roundWinners.join(', ')}`);
}

/**
 * Handle TOGGLE_AUTO_ABILITIES message
 * Toggles whether auto-abilities are enabled for the game
 */
export function handleToggleAutoAbilities(ws, data) {
  try {
    const { gameId, enabled } = data;
    const gameState = getGameState(gameId);

    if (!gameState) {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'Game not found'
      }));
      return;
    }

    // Validate that enabled is a boolean
    if (typeof enabled !== 'boolean') {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'Invalid enabled value: must be a boolean'
      }));
      return;
    }

    gameState.autoAbilitiesEnabled = enabled;
    broadcastToGame(gameId, gameState);
    logger.info(`Auto-abilities ${enabled ? 'enabled' : 'disabled'} for game ${gameId}`);
  } catch (error) {
    logger.error('Failed to toggle auto abilities:', error);
  }
}

/**
 * Handle TOGGLE_AUTO_DRAW message
 * Toggles whether auto-draw is enabled for a specific player
 */
export function handleToggleAutoDraw(ws, data) {
  try {
    const { gameId, playerId, enabled } = data;
    const gameState = getGameState(gameId);

    if (!gameState) {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'Game not found'
      }));
      return;
    }

    // Validate that enabled is a boolean
    if (typeof enabled !== 'boolean') {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'Invalid enabled value: must be a boolean'
      }));
      return;
    }

    // Find the player and update their auto-draw setting
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'Player not found'
      }));
      return;
    }

    player.autoDrawEnabled = enabled;
    broadcastToGame(gameId, gameState);
    logger.info(`Auto-draw ${enabled ? 'enabled' : 'disabled'} for player ${playerId} in game ${gameId}`);
  } catch (error) {
    logger.error('Failed to toggle auto draw:', error);
  }
}

/**
 * Handle TOGGLE_ACTIVE_PLAYER message
 * Sets the active player
 * Triggers the hidden Draw phase (-1) which automatically transitions to Setup (0)
 */
export function handleToggleActivePlayer(ws, data) {
  try {
    const { gameId, playerId } = data;
    const gameState = getGameState(gameId);

    if (!gameState) {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'Game not found'
      }));
      return;
    }

    const previousActivePlayerId = gameState.activePlayerId;
    logger.info(`[ToggleActivePlayer] ========== TOGGLE ACTIVE PLAYER ==========`);
    logger.info(`[ToggleActivePlayer] Previous active: ${previousActivePlayerId}, Clicked: ${playerId}, Current phase: ${gameState.currentPhase}`);

    // Toggle: if same player clicked, deselect; otherwise select new player
    if (previousActivePlayerId === playerId) {
      gameState.activePlayerId = undefined;
      logger.info(`[ToggleActivePlayer] ❌ DESELECTING player ${playerId}`);

      // Check for round end when deselecting the starting player during Setup phase
      // This handles the case where the starting player is already active and players
      // are deselecting to end their turn (completing a round cycle)
      if (playerId === gameState.startingPlayerId && gameState.currentPhase === 0) {
        logger.info(`[ToggleActivePlayer] Deselecting starting player during Setup phase - checking round end`);
        if (checkRoundEnd(gameState, true)) {
          logger.info(`[ToggleActivePlayer] ========== ROUND END TRIGGERED (on deselect of starting player) ==========`);
          endRound(gameState);
        }
      }
    } else {
      gameState.activePlayerId = playerId;
      logger.info(`[ToggleActivePlayer] ✅ SELECTING player ${playerId} (previous was ${previousActivePlayerId})`);

      // Enter Draw phase (-1) when selecting a new active player
      // The draw phase will auto-draw a card and transition to Setup (0)
      gameState.currentPhase = -1;
      logger.info(`[ToggleActivePlayer] Phase set to -1 (Draw), calling performDrawPhase...`);

      performDrawPhase(gameState);

      logger.info(`[ToggleActivePlayer] After performDrawPhase: phase=${gameState.currentPhase}, activePlayerId=${gameState.activePlayerId}`);
    }

    broadcastToGame(gameId, gameState);
    logger.info(`[ToggleActivePlayer] Broadcast complete. Active player: ${gameState.activePlayerId || 'none'}, Phase: ${gameState.currentPhase}`);
    logger.info(`[ToggleActivePlayer] ========== END TOGGLE ACTIVE PLAYER ==========`);
  } catch (error) {
    logger.error('Failed to toggle active player:', error);
  }
}

/**
 * Perform the hidden Draw phase
 * Draws exactly 1 card for the active player and transitions to Setup
 * Simple rule: draw 1 card from deck to hand when player becomes active
 */
export function performDrawPhase(gameState: any): void {
  logger.info(`[DrawPhase] ========== START DRAW PHASE ==========`);
  logger.info(`[DrawPhase] activePlayerId=${gameState.activePlayerId}, phase=${gameState.currentPhase}`);

  if (gameState.activePlayerId === null) {
    logger.info(`[DrawPhase] ❌ No active player, moving to Setup`);
    gameState.currentPhase = 0;
    return;
  }

  const activePlayer = gameState.players.find((p: any) => p.id === gameState.activePlayerId);
  if (!activePlayer) {
    logger.warn(`[DrawPhase] ❌ Active player ${gameState.activePlayerId} not found`);
    gameState.currentPhase = 0;
    return;
  }

  logger.info(`[DrawPhase] Player ${activePlayer.id} (${activePlayer.name}): hand=${activePlayer.hand?.length || 0}, deck=${activePlayer.deck?.length || 0}, dummy=${activePlayer.isDummy}, autoDraw=${activePlayer.autoDrawEnabled}`);

  // Check if player has cards to draw
  if (!activePlayer.deck || activePlayer.deck.length === 0) {
    logger.info(`[DrawPhase] ❌ Player ${activePlayer.id} has empty deck - skipping draw`);
    gameState.currentPhase = 0;
    return;
  }

  // Determine if auto-draw should happen
  let shouldDraw = false;
  if (activePlayer.isDummy) {
    const hostPlayer = gameState.players.find((p: any) => p.id === 1);
    shouldDraw = hostPlayer?.autoDrawEnabled === true;
    logger.info(`[DrawPhase] Dummy player - using host autoDrawEnabled: ${hostPlayer?.autoDrawEnabled}`);
  } else {
    shouldDraw = activePlayer.autoDrawEnabled !== false;
    logger.info(`[DrawPhase] Real player - using own autoDrawEnabled: ${activePlayer.autoDrawEnabled}`);
  }

  if (shouldDraw) {
    // Draw exactly 1 card from top of deck
    const cardToDraw = activePlayer.deck[0];
    const cardName = cardToDraw?.name || cardToDraw?.id || 'Unknown';
    const cardPower = cardToDraw?.power ?? 0;
    activePlayer.deck.splice(0, 1);
    activePlayer.hand.push(cardToDraw);
    logger.info(`[DrawPhase] ✅ Player ${activePlayer.id} (${activePlayer.name}) DREW [${cardName}] (Power: ${cardPower})`);
    logger.info(`[DrawPhase] Hand size: ${activePlayer.hand.length}, Deck remaining: ${activePlayer.deck.length}`);
  } else {
    logger.info(`[DrawPhase] ❌ Auto-draw DISABLED for player ${activePlayer.id} - skipping draw`);
  }

  // Transition to Setup phase
  gameState.currentPhase = 0;
  logger.info(`[DrawPhase] ========== END DRAW PHASE (phase now 0) ==========`);

  // Check for round end when entering Setup phase
  // This check happens after every draw phase, so when first player's turn comes around
  // and they enter Setup phase with phase=0, we check if round should end
  if (checkRoundEnd(gameState)) {
    logger.info(`[DrawPhase] ========== ROUND END TRIGGERED ==========`);
    endRound(gameState);
  } else {
    logger.info(`[DrawPhase] ========== ROUND CONTINUES ==========`);
  }
}

/**
 * Handle NEXT_PHASE message
 * Advances to the next turn phase
 */
export function handleNextPhase(ws, data) {
  try {
    const { gameId } = data;
    const gameState = getGameState(gameId);

    if (!gameState) {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'Game not found'
      }));
      return;
    }

    if (!gameState.isGameStarted) {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'Game has not started'
      }));
      return;
    }

    // Get current phase or default to 0
    const currentPhase = gameState.currentPhase || 0;

    // Advance to next phase, wrapping around
    const nextPhase = (currentPhase + 1) % 4;
    gameState.currentPhase = nextPhase;

    broadcastToGame(gameId, gameState);
    logger.info(`[NextPhase] Phase advanced from ${currentPhase} to ${nextPhase} in game ${gameId}, activePlayerId: ${gameState.activePlayerId}`);
  } catch (error) {
    logger.error('Failed to advance phase:', error);
  }
}

/**
 * Handle PREV_PHASE message
 * Goes back to the previous turn phase
 */
export function handlePrevPhase(ws, data) {
  try {
    const { gameId } = data;
    const gameState = getGameState(gameId);

    if (!gameState) {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'Game not found'
      }));
      return;
    }

    if (!gameState.isGameStarted) {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'Game has not started'
      }));
      return;
    }

    // Get current phase or default to 0
    const currentPhase = gameState.currentPhase || 0;

    // Go to previous phase, wrapping around
    const prevPhase = (currentPhase - 1 + 4) % 4;
    gameState.currentPhase = prevPhase;

    broadcastToGame(gameId, gameState);
    logger.info(`[PrevPhase] Phase retreated from ${currentPhase} to ${prevPhase} in game ${gameId}, activePlayerId: ${gameState.activePlayerId}`);
  } catch (error) {
    logger.error('Failed to retreat phase:', error);
  }
}

/**
 * Handle SET_PHASE message
 * Sets the turn phase to a specific index
 * Draw phase (-1) is now an explicit phase that triggers auto-draw
 */
export function handleSetPhase(ws, data) {
  try {
    const { gameId, phaseIndex } = data;
    const gameState = getGameState(gameId);

    if (!gameState) {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'Game not found'
      }));
      return;
    }

    if (!gameState.isGameStarted) {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'Game has not started'
      }));
      return;
    }

    // Validate phaseIndex is numeric
    const numericPhaseIndex = Number(phaseIndex);
    if (!Number.isInteger(numericPhaseIndex) || Number.isNaN(numericPhaseIndex)) {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'Invalid phase index; must be an integer'
      }));
      return;
    }

    // Allow phases -1 (Draw) to 3 (Scoring)
    if (numericPhaseIndex < -1 || numericPhaseIndex >= 4) {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'Invalid phase index. Must be between -1 and 3'
      }));
      return;
    }

    const previousPhase = gameState.currentPhase;

    // Set the phase directly - auto-draw is handled by UPDATE_STATE when phase=-1 is sent
    // This keeps a single path: client sends UPDATE_STATE with phase=-1 + activePlayerId → draw
    gameState.currentPhase = numericPhaseIndex;

    broadcastToGame(gameId, gameState);
    logger.info(`Phase set to ${gameState.currentPhase} in game ${gameId} (from ${previousPhase})`);
  } catch (error) {
    logger.error('Failed to set phase:', error);
  }
}

/**
 * Handle START_NEXT_ROUND message
 * Starts the next round after round end modal is closed
 * Resets scores to 0, increments round number, closes modal
 */
export function handleStartNextRound(ws, data) {
  try {
    const { gameId } = data;
    const gameState = getGameState(gameId);

    if (!gameState) {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'Game not found'
      }));
      return;
    }

    if (!gameState.isGameStarted) {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'Game has not started'
      }));
      return;
    }

    logger.info(`[StartNextRound] Starting next round for game ${gameId}`);

    // If game has a winner, this is a "Continue Game" action - reset for new match
    if (gameState.gameWinner !== null) {
      logger.info(`[StartNextRound] Game over - starting new match`);
      // Reset for new match
      gameState.currentRound = 1;
      gameState.turnNumber = 1;
      gameState.roundWinners = {};
      gameState.gameWinner = null;
      gameState.roundEndTriggered = false;
    } else {
      // Starting next round of current match
      gameState.currentRound++;
    }

    // Reset all player scores to 0
    gameState.players.forEach((p: any) => {
      p.score = 0;
    });

    // Close the modal
    gameState.isRoundEndModalOpen = false;

    // Keep the same starting player - they continue with their setup phase
    // Phase stays at 0 (Setup) for the starting player to begin

    logger.info(`[StartNextRound] Round ${gameState.currentRound} started. Scores reset.`);

    broadcastToGame(gameId, gameState);
  } catch (error) {
    logger.error('Failed to start next round:', error);
  }
}

/**
 * Handle START_NEW_MATCH message
 * Resets the entire game state for a new match
 */
export function handleStartNewMatch(ws, data) {
  try {
    const { gameId } = data;
    const gameState = getGameState(gameId);

    if (!gameState) {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'Game not found'
      }));
      return;
    }

    logger.info(`[StartNewMatch] Starting new match for game ${gameId}`);

    // Reset all match state
    gameState.currentRound = 1;
    gameState.turnNumber = 1;
    gameState.roundWinners = {};
    gameState.gameWinner = null;
    gameState.roundEndTriggered = false;
    gameState.isRoundEndModalOpen = false;

    // Reset all player scores to 0
    gameState.players.forEach((p: any) => {
      p.score = 0;
    });

    logger.info(`[StartNewMatch] New match started.`);

    broadcastToGame(gameId, gameState);
  } catch (error) {
    logger.error('Failed to start new match:', error);
  }
}

/**
 * Handle START_NEW_MATCH message
 * Resets the entire game state for a new match
 */