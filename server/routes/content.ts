/**
 * @file Content API routes
 */

import express from 'express';
import {
  getAllCards,
  getAllTokens,
  getAllCounters,
  getCardDefinition,
  getTokenDefinition,
  getCounterDefinition,
  getDeckFiles
} from '../services/content.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * Get complete content database
 */
router.get('/database', (req, res) => {
  try {
    const cards = getAllCards();
    const tokens = getAllTokens();
    const counters = getAllCounters();
    const deckFiles = getDeckFiles();

    // Return as arrays of entries for easier client consumption
    const database = {
      cards: Object.entries(cards),
      tokens: Object.entries(tokens),
      counters: Object.entries(counters),
      deckFiles: deckFiles
    };
    res.json(database);
  } catch (error) {
    logger.error('Failed to get content database:', error);
    res.status(500).json({ error: 'Failed to retrieve content database' });
  }
});

/**
 * Get all cards
 */
router.get('/cards', (req, res) => {
  try {
    const cards = getAllCards();
    res.json({ cards });
  } catch (error) {
    logger.error('Failed to get cards:', error);
    res.status(500).json({ error: 'Failed to retrieve cards' });
  }
});

/**
 * Get specific card by ID
 */
router.get('/cards/:cardId', (req, res) => {
  try {
    const { cardId } = req.params;
    const card = getCardDefinition(cardId);

    if (!card) {
      res.status(404).json({ error: 'Card not found' });
      return;
    }

    res.json({ card });
  } catch (error) {
    logger.error('Failed to get card:', error);
    res.status(500).json({ error: 'Failed to retrieve card' });
  }
});

/**
 * Get all tokens
 */
router.get('/tokens', (req, res) => {
  try {
    const tokens = getAllTokens();
    res.json({ tokens });
  } catch (error) {
    logger.error('Failed to get tokens:', error);
    res.status(500).json({ error: 'Failed to retrieve tokens' });
  }
});

/**
 * Get specific token by ID
 */
router.get('/tokens/:tokenId', (req, res) => {
  try {
    const { tokenId } = req.params;
    const token = getTokenDefinition(tokenId);

    if (!token) {
      res.status(404).json({ error: 'Token not found' });
      return;
    }

    res.json({ token });
  } catch (error) {
    logger.error('Failed to get token:', error);
    res.status(500).json({ error: 'Failed to retrieve token' });
  }
});

/**
 * Get all counters
 */
router.get('/counters', (req, res) => {
  try {
    const counters = getAllCounters();
    res.json({ counters });
  } catch (error) {
    logger.error('Failed to get counters:', error);
    res.status(500).json({ error: 'Failed to retrieve counters' });
  }
});

/**
 * Get specific counter by ID
 */
router.get('/counters/:counterId', (req, res) => {
  try {
    const { counterId } = req.params;
    const counter = getCounterDefinition(counterId);

    if (!counter) {
      res.status(404).json({ error: 'Counter not found' });
      return;
    }

    res.json({ counter });
  } catch (error) {
    logger.error('Failed to get counter:', error);
    res.status(500).json({ error: 'Failed to retrieve counter' });
  }
});

export { router as contentRoutes };