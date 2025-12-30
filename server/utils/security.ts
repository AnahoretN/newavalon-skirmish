/**
 * @file Security utilities for input sanitization and validation
 */

import { CONFIG } from './config.js';
import crypto from 'crypto';

/**
 * Sanitize string input
 * Removes HTML special characters and control characters
 */
export function sanitizeString(input, maxLength = CONFIG.MAX_STRING_LENGTH) {
  if (typeof input !== 'string') return '';

  return input
    .replace(/[<>"'&]/g, '') // Remove HTML special chars
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .substring(0, maxLength);
}

/**
 * Sanitize player name
 */
export function sanitizePlayerName(name) {
  const sanitized = sanitizeString(name, 20);
  // Remove leading/trailing whitespace and collapse multiple spaces
  return sanitized.trim().replace(/\s+/g, ' ') || 'Anonymous';
}

/**
 * Validate game state size
 */
export function validateGameStateSize(gameState) {
  try {
    const size = JSON.stringify(gameState).length;
    return size <= CONFIG.MAX_GAME_STATE_SIZE;
  } catch {
    // JSON.stringify can throw on circular references or other unserializable data
    return false;
  }
}

/**
 * Check if message size is within limits
 * Handles both string and Buffer (from WebSocket messages)
 */
export function validateMessageSize(message: Buffer | string | null | undefined): boolean {
  // Guard against null/undefined
  if (message == null) {
    return true; // Treat null/undefined as empty message
  }
  // Handle Buffer (WebSocket messages are Buffers)
  if (Buffer.isBuffer(message)) {
    return message.length <= CONFIG.MAX_MESSAGE_SIZE;
  }
  // Handle string
  if (typeof message === 'string') {
    return message.length <= CONFIG.MAX_MESSAGE_SIZE;
  }
  // Unknown type
  return false;
}

/**
 * Generate secure game ID
 */
export function generateSecureGameId() {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(4).toString('hex').substring(0, 6);
  return `${timestamp}_${random}`.toUpperCase();
}