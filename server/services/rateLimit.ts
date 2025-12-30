/**
 * @file Rate limiting service for DoS protection
 */

import { CONFIG } from '../utils/config.js';
import { logger } from '../utils/logger.js';
import type { WebSocket } from 'ws';

// Rate limiting maps
const messageCounts = new Map<WebSocket, number[]>(); // Connection -> [timestamps]

/**
 * Rate limit status interface
 */
export interface RateLimitStatus {
  currentCount: number;
  windowStart: number;
  isLimited: boolean;
  remaining: number;
}

/**
 * Check if connection is rate limited
 */
export function isRateLimited(client: WebSocket): boolean {
  const now = Date.now();
  const timestamps = messageCounts.get(client) || [];

  // Remove old timestamps outside the window
  const validTimestamps = timestamps.filter(
    timestamp => now - timestamp < CONFIG.RATE_LIMIT_WINDOW
  );

  // Check if limit exceeded
  if (validTimestamps.length >= CONFIG.MESSAGE_RATE_LIMIT) {
    logger.warn(`Rate limit exceeded for connection`);
    return true;
  }

  // Update timestamps
  validTimestamps.push(now);
  messageCounts.set(client, validTimestamps);

  return false;
}

/**
 * Clean up rate limiting data for disconnected client
 */
export function cleanupRateLimitData(client: WebSocket): void {
  messageCounts.delete(client);
}

/**
 * Get rate limit status for connection
 */
export function getRateLimitStatus(client: WebSocket): RateLimitStatus {
  const timestamps = messageCounts.get(client) || [];
  const now = Date.now();

  const validTimestamps = timestamps.filter(
    timestamp => now - timestamp < CONFIG.RATE_LIMIT_WINDOW
  );

  return {
    currentCount: validTimestamps.length,
    windowStart: validTimestamps[0] || now,
    isLimited: validTimestamps.length >= CONFIG.MESSAGE_RATE_LIMIT,
    remaining: Math.max(0, CONFIG.MESSAGE_RATE_LIMIT - validTimestamps.length)
  };
}