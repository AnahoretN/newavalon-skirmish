/**
 * @file Logging utilities
 */

import fs from 'fs';
import path from 'path';

class Logger {
  public logFile: string;

  constructor() {
    const logDir = path.join(process.cwd(), 'logs');
    this.logFile = path.join(logDir, 'server.log');

    // Create logs directory if it doesn't exist
    if (!fs.existsSync(logDir)) {
      try {
        fs.mkdirSync(logDir, { recursive: true });
      } catch (error) {
        console.error('Failed to create logs directory:', error);
      }
    }
  }

  info(message: string): void {
    this.log('INFO', message);
  }

  error(message: string, error: Error | null = null): void {
    this.log('ERROR', message);
    if (error) {
      console.error(error);
    }
  }

  warn(message: string): void {
    this.log('WARN', message);
  }

  debug(message: string): void {
    if (process.env.NODE_ENV !== 'production') {
      this.log('DEBUG', message);
    }
  }

  log(level: string, message: string): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${level}: ${message}\n`;

    console.log(logMessage.trim());

    // Write to file
    try {
      fs.appendFileSync(this.logFile, logMessage);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }
}

export const logger = new Logger();