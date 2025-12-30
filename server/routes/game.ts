/**
 * @file Game management API routes
 */

import express from 'express';
import { getPublicGames, getGameState, getGameLogs } from '../services/gameState.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * Get list of public games
 */
router.get('/public', (req, res) => {
  try {
    const games = getPublicGames();
    res.json({ games });
  } catch (error) {
    logger.error('Failed to get public games:', error);
    res.status(500).json({ error: 'Failed to retrieve games' });
  }
});

/**
 * Get game state by ID
 */
router.get('/:gameId', (req, res) => {
  try {
    const { gameId } = req.params;
    const gameState = getGameState(gameId);

    if (!gameState) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }

    // Sanitize game state for API response
    const sanitizedState = {
      ...gameState,
      players: gameState.players.map(player => ({
        ...player,
        ws: undefined // Remove WebSocket references
      }))
    };

    res.json(sanitizedState);
  } catch (error) {
    logger.error('Failed to get game state:', error);
    res.status(500).json({ error: 'Failed to retrieve game state' });
  }
});

/**
 * Get game logs
 */
router.get('/:gameId/logs', (req, res) => {
  try {
    const { gameId } = req.params;
    const logs = getGameLogs(gameId);

    if (!logs) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }

    res.json({ logs });
  } catch (error) {
    logger.error('Failed to get game logs:', error);
    res.status(500).json({ error: 'Failed to retrieve game logs' });
  }
});

export { router as gameRoutes };