/**
 * Client-side logger utility
 * Use instead of console.log for better debugging and to satisfy eslint rules
 */
/* eslint-disable no-console */
export const logger = {
  info: (...args: unknown[]) => {
    if (import.meta.env.DEV) {
      console.info(...args)
    }
  },
  warn: (...args: unknown[]) => {
    console.warn(...args)
  },
  error: (...args: unknown[]) => {
    console.error(...args)
  },
  debug: (...args: unknown[]) => {
    if (import.meta.env.DEV) {
      console.debug(...args)
    }
  }
}
