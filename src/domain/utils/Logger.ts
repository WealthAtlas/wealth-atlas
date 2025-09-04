/* eslint-disable no-console */
// Simple logger to centralize logging and satisfy no-console lint rule elsewhere.
export const Logger = {
  error: (...args: unknown[]): void => {
    console.error(...args);
  },
  warn: (...args: unknown[]): void => {
    console.warn(...args);
  },
  info: (...args: unknown[]): void => {
    console.info(...args);
  },
  log: (...args: unknown[]): void => {
    console.log(...args);
  },
};
