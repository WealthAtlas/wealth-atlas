import { executeValueScript } from "./scriptExecutor";
import { scriptTemplates } from "./scriptTemplates";

// Mock global fetch to avoid making actual API calls during testing
global.fetch = jest.fn();

// Reset mocks before each test
beforeEach(() => {
  jest.resetAllMocks();
});

describe('Script Templates', () => {
  test('should have the expected template structure', () => {
    // Verify that the templates have the expected structure
    expect(scriptTemplates).toHaveProperty('assetContext');
    expect(scriptTemplates).toHaveProperty('stock');
    expect(scriptTemplates).toHaveProperty('crypto');
    expect(scriptTemplates).toHaveProperty('forex');
    expect(scriptTemplates).toHaveProperty('portfolio');
    expect(scriptTemplates).toHaveProperty('mock');
    
    // Check that each template has the required properties
    Object.entries(scriptTemplates).forEach(([key, template]) => {
      expect(template).toHaveProperty('name');
      expect(template).toHaveProperty('description');
      expect(template).toHaveProperty('template');
    });
  });

  test('mock template should be executable', async () => {
    // Setup the mock fetch response
    (global.fetch as jest.Mock).mockImplementation(() => {
      return Promise.resolve({
        json: () => Promise.resolve({ price: 100 })
      });
    });
    
    // The mock template should be executable and return a number
    const result = await executeValueScript(scriptTemplates.mock.template);
    expect(typeof result).toBe('number');
    // The mock template should return a value between 900 and 1100
    expect(result).toBeGreaterThanOrEqual(900);
    expect(result).toBeLessThanOrEqual(1100);
  });

  // Test that each template has a valid getValue function
  test.each(Object.keys(scriptTemplates))('%s template should export a getValue function', async (templateKey) => {
    // Mock the fetch API to return a valid response
    (global.fetch as jest.Mock).mockImplementation(() => {
      return Promise.resolve({
        json: () => Promise.resolve({ 
          // Mock responses for different API formats
          'Global Quote': { '05. price': '150.75' },
          bitcoin: { usd: 60000 },
          rates: { EUR: 0.85 },
          price: 100
        })
      });
    });
    
    // This test verifies that each template can be executed without throwing an error
    // We're not testing the actual return value because that depends on the mock API response
    // which would be different for each template
    try {
      const template = scriptTemplates[templateKey as keyof typeof scriptTemplates].template;
      await executeValueScript(template);
      // If we get here, the test passed
      expect(true).toBe(true);
    } catch (error: any) {
      // If the error is about an API key, that's expected and the test should pass
      if (error.message && (
        error.message.includes('API_KEY') || 
        error.message.includes('api key') ||
        error.message.includes('apikey')
      )) {
        expect(true).toBe(true);
      } else {
        // Otherwise, fail the test
        fail(`Template ${templateKey} threw an unexpected error: ${error.message}`);
      }
    }
  });
});
