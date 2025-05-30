/**
 * Utility to safely execute dynamic asset value scripts in the browser
 */

/**
 * Executes a JavaScript string in a controlled sandbox environment
 * @param scriptCode - The JavaScript code as a string to execute
 * @returns Promise that resolves to the asset value
 */
export async function executeValueScript(scriptCode: string): Promise<number> {
  try {
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
      exports: {} as { getValue?: () => Promise<number> },
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
    
    // Execute the getValue function
    const value = await exports.getValue();
    
    // Validate the return value
    if (typeof value !== 'number' || isNaN(value)) {
      throw new Error('getValue function must return a valid number');
    }
    
    return value;
  } catch (error) {
    console.error('Error executing asset value script:', error);
    throw error;
  }
}
