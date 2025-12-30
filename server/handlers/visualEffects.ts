/**
 * @file Visual effects handlers
 * Handles triggering visual effects on clients
 */

import { logger } from '../utils/logger.js';
import { getGameState } from '../services/gameState.js';
import { sanitizeString, validateMessageSize } from '../utils/security.js';
import type { WebSocket } from 'ws';

interface ExtendedWebSocket extends WebSocket {
  server?: any;
  playerId?: number;
  gameId?: string;
  clientGameMap?: Map<any, string>;
}

/**
 * Helper function to broadcast visual effects to all clients in a game
 * @param ws - WebSocket connection
 * @param gameId - Game ID (should be sanitized before calling)
 * @param messageType - Type of message to broadcast
 * @param payload - Message payload
 */
function broadcastVisualEffect(
  ws: ExtendedWebSocket,
  gameId: string,
  messageType: string,
  payload: Record<string, unknown>
): void {
  const message = JSON.stringify({
    type: messageType,
    ...payload
  });

  const wss = ws.server;
  if (wss && wss.clients) {
    wss.clients.forEach((client: ExtendedWebSocket) => {
      // Send to all clients in the game EXCEPT the sender (who already shows the effect locally)
      if (client !== ws && client.readyState === 1 && wss.clientGameMap && wss.clientGameMap.get(client) === gameId) {
        try {
          client.send(message);
        } catch (err: any) {
          logger.error(`Error sending ${messageType} to client:`, err);
        }
      }
    });
  }
}

/**
 * Handle TRIGGER_HIGHLIGHT message
 * Broadcasts a highlight effect to all clients in the game
 */
export function handleTriggerHighlight(ws: ExtendedWebSocket, data: any) {
  try {
    // Security: Validate message size
    if (!validateMessageSize(JSON.stringify(data))) {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'Message size exceeds limit'
      }));
      return;
    }

    // Input validation
    if (!data || typeof data !== 'object') {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'Invalid data format'
      }));
      return;
    }

    const { gameId, highlightData } = data;

    if (!gameId || typeof gameId !== 'string') {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'Invalid or missing gameId'
      }));
      return;
    }

    if (!highlightData || typeof highlightData !== 'object') {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'Invalid or missing highlightData'
      }));
      return;
    }

    // Security: Sanitize gameId
    const sanitizedGameId = sanitizeString(gameId);

    const gameState = getGameState(sanitizedGameId);

    if (!gameState) {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'Game not found'
      }));
      return;
    }

    // Broadcast the highlight event to all OTHER clients in the game (exclude sender)
    broadcastVisualEffect(ws, sanitizedGameId, 'HIGHLIGHT_TRIGGERED', { highlightData });

    logger.debug(`Highlight triggered in game ${sanitizedGameId}`);
  } catch (err: any) {
    logger.error('Failed to trigger highlight:', err);
  }
}

/**
 * Handle TRIGGER_NO_TARGET message
 * Broadcasts a "no target" overlay to all clients in the game
 */
export function handleTriggerNoTarget(ws: ExtendedWebSocket, data: any) {
  try {
    // Security: Validate message size
    if (!validateMessageSize(JSON.stringify(data))) {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'Message size exceeds limit'
      }));
      return;
    }

    // Input validation
    if (!data || typeof data !== 'object') {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'Invalid data format'
      }));
      return;
    }

    const { gameId, coords, timestamp } = data;

    if (!gameId || typeof gameId !== 'string') {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'Invalid or missing gameId'
      }));
      return;
    }

    if (!coords || typeof coords !== 'object' || typeof coords.row !== 'number' || typeof coords.col !== 'number') {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'Invalid or missing coords'
      }));
      return;
    }

    // Security: Sanitize gameId
    const sanitizedGameId = sanitizeString(gameId);

    const gameState = getGameState(sanitizedGameId);

    if (!gameState) {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'Game not found'
      }));
      return;
    }

    // Broadcast the no-target event to all OTHER clients in the game (exclude sender)
    broadcastVisualEffect(ws, sanitizedGameId, 'NO_TARGET_TRIGGERED', { coords, timestamp });

    logger.debug(`No target overlay triggered in game ${sanitizedGameId}`);
  } catch (err: any) {
    logger.error('Failed to trigger no target overlay:', err);
  }
}

/**
 * Handle TRIGGER_FLOATING_TEXT message
 * Broadcasts a floating text effect to all clients in the game
 */
export function handleTriggerFloatingText(ws: ExtendedWebSocket, data: any) {
  try {
    // Security: Validate message size
    if (!validateMessageSize(JSON.stringify(data))) {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'Message size exceeds limit'
      }));
      return;
    }

    // Input validation
    if (!data || typeof data !== 'object') {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'Invalid data format'
      }));
      return;
    }

    const { gameId, floatingTextData } = data;

    if (!gameId || typeof gameId !== 'string') {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'Invalid or missing gameId'
      }));
      return;
    }

    if (!floatingTextData || typeof floatingTextData !== 'object') {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'Invalid or missing floatingTextData'
      }));
      return;
    }

    // Security: Sanitize gameId
    const sanitizedGameId = sanitizeString(gameId);

    const gameState = getGameState(sanitizedGameId);

    if (!gameState) {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'Game not found'
      }));
      return;
    }

    // Broadcast the floating text event to all OTHER clients in the game (exclude sender)
    broadcastVisualEffect(ws, sanitizedGameId, 'FLOATING_TEXT_TRIGGERED', { floatingTextData });

    logger.debug(`Floating text triggered in game ${sanitizedGameId}`);
  } catch (err: any) {
    logger.error('Failed to trigger floating text:', err);
  }
}

/**
 * Handle TRIGGER_FLOATING_TEXT_BATCH message
 * Broadcasts a batch of floating text effects to all clients in the game
 */
export function handleTriggerFloatingTextBatch(ws: ExtendedWebSocket, data: any) {
  try {
    // Security: Validate message size
    if (!validateMessageSize(JSON.stringify(data))) {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'Message size exceeds limit'
      }));
      return;
    }

    // Input validation
    if (!data || typeof data !== 'object') {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'Invalid data format'
      }));
      return;
    }

    const { gameId, batch } = data;

    if (!gameId || typeof gameId !== 'string') {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'Invalid or missing gameId'
      }));
      return;
    }

    if (!Array.isArray(batch)) {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'Invalid or missing batch array'
      }));
      return;
    }

    // Security: Sanitize gameId
    const sanitizedGameId = sanitizeString(gameId);

    const gameState = getGameState(sanitizedGameId);

    if (!gameState) {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'Game not found'
      }));
      return;
    }

    // Broadcast the floating text batch event to all OTHER clients in the game (exclude sender)
    broadcastVisualEffect(ws, sanitizedGameId, 'FLOATING_TEXT_BATCH_TRIGGERED', { batch });

    logger.debug(`Floating text batch triggered in game ${sanitizedGameId}`);
  } catch (err: any) {
    logger.error('Failed to trigger floating text batch:', err);
  }
}
