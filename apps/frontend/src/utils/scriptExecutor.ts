
interface CacheEntry {
  value: number;
  timestamp: number;
}

// In-memory cache for script execution results
const scriptExecutionCache = new Map<string, CacheEntry>();

// Default cache TTL (Time To Live) in milliseconds (5 minutes)
const DEFAULT_CACHE_TTL = 5 * 60 * 1000;

/**
 * Executes a JavaScript string in a controlled sandbox environment
 * @param scriptCode - The JavaScript code as a string to execute
 * @param assetInfo - Optional asset information to provide context to the script
 * @param options - Additional execution options
 * @returns Promise that resolves to the asset value
 */
export async function executeValueScript(
  scriptCode: string,
  options: {
    bypassCache?: boolean;
    cacheTTL?: number;
  } = {}
): Promise<number> {
  try {
    const { bypassCache = false, cacheTTL = DEFAULT_CACHE_TTL } = options;
    const scriptHash = btoa(scriptCode);
    const cacheKey = `${scriptHash}`;

    // Check cache if not bypassing
    if (!bypassCache) {
      const cachedEntry = scriptExecutionCache.get(cacheKey);
      const now = Date.now();

      if (cachedEntry && (now - cachedEntry.timestamp < cacheTTL)) {
        console.log('Using cached asset value');
        return cachedEntry.value;
      }
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

    // Create a function from the script code
    // The 'with' statement provides the sandbox variables to the function scope
    const scriptFunction = new Function('sandbox', `
      with (sandbox) {
        ${scriptCode}
        return sandbox.exports;
      }
    `);

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
      timestamp: Date.now()
    });

    return value;
  } catch (error) {
    console.error('Error executing asset value script:', error);
    throw error;
  }
}
