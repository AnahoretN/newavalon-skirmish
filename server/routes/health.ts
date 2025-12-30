/**
 * @file Health check routes
 */

import express from 'express';
import { getGameStats } from '../services/gameState.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * Basic health check
 */
router.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * Detailed health check with stats
 */
router.get('/detailed', (req, res) => {
  try {
    const gameStats = getGameStats();
    const memUsage = process.memoryUsage();

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      gameStats,
      memory: {
        rss: Math.round(memUsage.rss / 1024 / 1024), // MB
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) // MB
      },
      version: process.env.npm_package_version || '1.0.0'
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Health check failed:', error instanceof Error ? error : null);
    res.status(500).json({
      status: 'unhealthy',
      error: errorMessage
    });
  }
});

/**
 * Readiness check (for container orchestration)
 */
router.get('/ready', (req, res) => {
  try {
    // Check if critical services are ready
    const gameStats = getGameStats();

    if (gameStats.activeGames > 1000) { // Example threshold
      res.status(503).json({
        status: 'not ready',
        reason: 'Too many active games'
      });
      return;
    }

    res.json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Readiness check failed:', error instanceof Error ? error : null);
    res.status(503).json({
      status: 'not ready',
      reason: 'Error retrieving game stats',
      error: errorMessage
    });
  }
});

export { router as healthRoutes };