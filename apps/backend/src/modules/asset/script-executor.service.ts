import { Injectable } from '@nestjs/common';
import { NodeVM } from 'vm2';

interface CacheEntry {
  value: number;
  timestamp: number;
}

@Injectable()
export class ScriptExecutorService {
  // In-memory cache for script execution results
  private scriptExecutionCache = new Map<string, CacheEntry>();

  // Default cache TTL (Time To Live) in milliseconds (5 minutes)
  private DEFAULT_CACHE_TTL = 5 * 60 * 1000;

  /**
   * Executes a JavaScript string in a controlled sandbox environment using vm2
   * @param scriptCode - The JavaScript code as a string to execute
   * @param options - Additional execution options
   * @returns Promise that resolves to the asset value
   */
  async executeValueScript(
    scriptCode: string,
    options: {
      bypassCache?: boolean;
      cacheTTL?: number;
    } = {},
  ): Promise<number> {
    try {
      const { bypassCache = false, cacheTTL = this.DEFAULT_CACHE_TTL } = options;
      const scriptHash = Buffer.from(scriptCode).toString('base64');
      const cacheKey = `${scriptHash}`;

      // Check cache if not bypassing
      if (!bypassCache) {
        const cachedEntry = this.scriptExecutionCache.get(cacheKey);
        const now = Date.now();

        if (cachedEntry && now - cachedEntry.timestamp < cacheTTL) {
          console.log('Using cached asset value');
          return cachedEntry.value;
        }
      }
      
      // Create a VM2 NodeVM to safely execute code
      const vm = new NodeVM({
        console: 'redirect',
        sandbox: {},
        require: {
          external: true,
          builtin: ['http', 'https', 'url', 'querystring', 'path', 'util'],
          root: './',
          mock: {
            fs: {
              readFileSync: () => 'Not allowed',
            },
          },
        },
      });

      // Create a wrapper for the script
      const wrappedScript = `
        // Run the script code inside an IIFE to isolate it
        const setupScript = (function() {
          // Create a local exports object
          const exports = {};
          
          // Run the user script
          ${scriptCode}
          
          // Return the exports
          return exports;
        })();
        
        // Check if the script exports a getValue function
        if (typeof setupScript.getValue !== 'function') {
          throw new Error('Script must export a getValue function');
        }
        
        // Export a function that calls getValue and validates the result
        module.exports = async function() {
          const result = await setupScript.getValue();
          
          if (typeof result !== 'number' || isNaN(result)) {
            throw new Error('getValue function must return a valid number');
          }
          
          return result;
        };
      `;

      // Execute the script in the VM
      const getValue = vm.run(wrappedScript);
      
      // Run the getValue function
      const value = await getValue();

      // Cache the result
      this.scriptExecutionCache.set(cacheKey, {
        value,
        timestamp: Date.now(),
      });

      return value;
    } catch (error) {
      console.error('Error executing asset value script:', error);
      throw error;
    }
  }

  /**
   * Clears the script execution cache
   */
  clearCache(): void {
    this.scriptExecutionCache.clear();
  }

  /**
   * Removes a specific script from the cache
   * @param scriptCode - The script code to remove from cache
   */
  invalidateCache(scriptCode: string): void {
    const scriptHash = Buffer.from(scriptCode).toString('base64');
    this.scriptExecutionCache.delete(scriptHash);
  }
}
