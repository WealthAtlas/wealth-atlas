import { executeValueScript } from './scriptExecutor';

// Mock global fetch to avoid making actual API calls during testing
global.fetch = jest.fn();

// Mock btoa for browser compatibility in test environment
global.btoa = (str) => Buffer.from(str).toString('base64');

// Reset mocks before each test
beforeEach(() => {
  jest.resetAllMocks();
});

describe('executeValueScript', () => {

  test('should execute a basic script that returns a static value', async () => {
    const script = `
      export function getValue() {
        return 100;
      }
    `;

    const result = await executeValueScript(script);
    expect(result).toBe(100);
  });

  test('should handle async scripts', async () => {
    const script = `
      export async function getValue() {
        // Simulate async operation
        return new Promise(resolve => {
          setTimeout(() => resolve(250), 10);
        });
      }
    `;

    const result = await executeValueScript(script);
    expect(result).toBe(250);
  });

  test('should throw error if script does not export getValue function', async () => {
    const script = `
      // No getValue export
      function calculateValue() {
        return 100;
      }
    `;

    await expect(executeValueScript(script)).rejects.toThrow(
      'Script must export a getValue function'
    );
  });

  test('should throw error if getValue does not return a number', async () => {
    const script = `
      export async function getValue() {
        return "not a number";
      }
    `;

    await expect(executeValueScript(script)).rejects.toThrow(
      'getValue function must return a valid number'
    );
  });

  test('should throw error if getValue returns NaN', async () => {
    const script = `
      export async function getValue() {
        return NaN;
      }
    `;

    await expect(executeValueScript(script)).rejects.toThrow(
      'getValue function must return a valid number'
    );
  });

  test('should handle script that makes API calls', async () => {
    // Mock fetch response
    const mockResponse = { price: 150.75 };
    (global.fetch as jest.Mock).mockResolvedValue({
      json: jest.fn().mockResolvedValue(mockResponse),
    });

    const script = `
      export async function getValue() {
        const response = await fetch('https://api.example.com/price');
        const data = await response.json();
        return data.price;
      }
    `;

    const result = await executeValueScript(script);
    
    expect(global.fetch).toHaveBeenCalledWith('https://api.example.com/price');
    expect(result).toBe(150.75);
  });

  test('should access console methods safely', async () => {
    // Spy on console methods
    const consoleSpy = jest.spyOn(console, 'log');
    const errorSpy = jest.spyOn(console, 'error');
    const warnSpy = jest.spyOn(console, 'warn');

    const script = `
      export async function getValue() {
        console.log('Testing console.log');
        console.error('Testing console.error');
        console.warn('Testing console.warn');
        return 42;
      }
    `;

    await executeValueScript(script);
    
    expect(consoleSpy).toHaveBeenCalledWith('Script log:', 'Testing console.log');
    expect(errorSpy).toHaveBeenCalledWith('Script error:', 'Testing console.error');
    expect(warnSpy).toHaveBeenCalledWith('Script warn:', 'Testing console.warn');
  });

  // Additional tests for caching functionality
  test('should cache results and reuse them on subsequent calls', async () => {
    const script = `
      export function getValue() {
        // Add a unique identifier to make sure we can verify cache hits
        return Math.random();
      }
    `;

    // First call should execute the script
    const firstResult = await executeValueScript(script);
    
    // Second call with same script should return the cached value
    const secondResult = await executeValueScript(script);
    
    // Results should be identical because of caching
    expect(secondResult).toBe(firstResult);
  });

  test('should bypass cache when requested', async () => {
    const script = `
      export function getValue() {
        // Add a unique identifier to make sure we can verify cache bypass
        return Math.random();
      }
    `;

    // First call should execute the script
    const firstResult = await executeValueScript(script);
    
    // Second call with bypassCache should execute the script again
    const secondResult = await executeValueScript(script, { bypassCache: true });
    
    // Results should be different because we bypassed cache
    expect(secondResult).not.toBe(firstResult);
  });

  test('should expire cache based on TTL', async () => {
    jest.useFakeTimers();
    
    const script = `
      export function getValue() {
        return Math.random();
      }
    `;

    // Set a short cache TTL
    const cacheTTL = 1000; // 1 second
    
    // First call should execute the script
    const firstResult = await executeValueScript(script, { cacheTTL });
    
    // Advance time past the cache TTL
    jest.advanceTimersByTime(cacheTTL + 100);
    
    // Next call should execute the script again because cache expired
    const secondResult = await executeValueScript(script, { cacheTTL });
    
    // Results should be different because cache expired
    expect(secondResult).not.toBe(firstResult);
    
    jest.useRealTimers();
  });
});
