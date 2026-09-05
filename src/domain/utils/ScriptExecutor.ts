interface CacheEntry {
  value: number;
  timestamp: number;
}

// In-memory cache for script execution results
const scriptExecutionCache = new Map<string, CacheEntry>();

// Default cache TTL (Time To Live) in milliseconds (5 minutes)
const DEFAULT_CACHE_TTL = 5 * 60 * 1000;

/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Executes a JavaScript string in a controlled sandbox environment
 * @param scriptCode - The JavaScript code as a string to execute
 * @returns Promise that resolves to the asset value
 */
export async function executeValueScript(scriptCode: string): Promise<number> {
  try {
    // The script text itself, not `btoa` of it. `btoa` throws
    // `InvalidCharacterError` on anything outside Latin-1, so a single ₹, curly
    // quote, em dash or emoji — in a comment, even — made the whole call throw
    // before the script ran. The failure was swallowed into a `Logger.warn`, so
    // that asset simply never populated while its neighbours worked. A Map takes
    // any string as a key; there was nothing to encode for.
    const cacheKey = scriptCode;

    // Check cache if not bypassing
    const cachedEntry = scriptExecutionCache.get(cacheKey);
    const now = Date.now();

    if (cachedEntry && now - cachedEntry.timestamp < DEFAULT_CACHE_TTL) {
      console.log('Using cached asset value');
      return cachedEntry.value;
    }

    // Create a sandbox environment
    // This creates a controlled context to execute the code
    const sandbox = {
      // Define safe globals the script can access
      console: {
        log: (...args: any[]) => console.log('Script log:', ...args),
        error: (...args: any[]) => console.error('Script error:', ...args),
        warn: (...args: any[]) => console.warn('Script warn:', ...args),
      },
      fetch: window.fetch.bind(window), // Allow fetch API
      setTimeout: window.setTimeout.bind(window),
      clearTimeout: window.clearTimeout.bind(window),
      // Pass asset information to the script if available
      exports: {} as { getValue: () => Promise<number> },
    };

    // Transform ES6 export syntax to CommonJS for compatibility
    let transformedScript = scriptCode;

    // Handle various export patterns
    transformedScript = transformedScript
      // Transform: export function getValue() { ... } or export const getValue = ...
      .replace(
        /export\s+(function\s+getValue|const\s+getValue|let\s+getValue|var\s+getValue)/g,
        'sandbox.exports.getValue'
      )
      // Transform: export { getValue }
      .replace(/export\s*{\s*getValue\s*}/g, '// Exported getValue')
      // Transform: export default function() or export default async function()
      .replace(/export\s+default\s+(async\s+)?function/g, 'sandbox.exports.getValue = $1function')
      // Transform: export default getValue
      .replace(/export\s+default\s+getValue/g, 'sandbox.exports.getValue = getValue');

    // Create a function from the script code
    // The 'with' statement provides the sandbox variables to the function scope
    const scriptFunction = new Function(
      'sandbox',
      `
      with (sandbox) {
        ${transformedScript}
        return sandbox.exports;
      }
    `
    );

    // Execute the script in the sandbox
    const exports = scriptFunction(sandbox);

    // Check if the script exported the required getValue function
    if (typeof exports.getValue !== 'function') {
      throw new Error('Script must export a getValue function');
    }

    const value = await exports.getValue();

    // Validate the return value
    if (typeof value !== 'number' || isNaN(value)) {
      throw new Error('getValue function must return a valid number');
    }

    // Cache the result
    scriptExecutionCache.set(cacheKey, {
      value,
      timestamp: Date.now(),
    });

    return value;
  } catch (error) {
    console.error('Error executing asset value script:', error);
    throw error;
  }
}
