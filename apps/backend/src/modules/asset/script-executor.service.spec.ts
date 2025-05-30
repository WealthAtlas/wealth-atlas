import { Test, TestingModule } from '@nestjs/testing';
import { ScriptExecutorService } from './script-executor.service';

describe('ScriptExecutorService', () => {
  let service: ScriptExecutorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ScriptExecutorService],
    }).compile();

    service = module.get<ScriptExecutorService>(ScriptExecutorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should execute a simple script that returns a number', async () => {
    const scriptCode = `
      exports.getValue = async () => {
        return 42;
      };
    `;

    const result = await service.executeValueScript(scriptCode);
    expect(result).toBe(42);
  });

  it('should execute a script that fetches data from an API', async () => {
    // Mock script that simulates fetching data
    const scriptCode = `
      exports.getValue = async () => {
        // In a real script, this would be a fetch call
        // For testing, we'll just return a simulated value
        return 1299.99;
      };
    `;

    const result = await service.executeValueScript(scriptCode);
    expect(result).toBe(1299.99);
  });

  it('should throw an error for scripts without getValue function', async () => {
    const scriptCode = `
      // Missing exports.getValue function
      const value = 100;
    `;

    await expect(service.executeValueScript(scriptCode)).rejects.toThrow(
      'Script must export a getValue function'
    );
  });

  it('should throw an error for scripts returning non-numeric values', async () => {
    const scriptCode = `
      exports.getValue = async () => {
        return "not a number";
      };
    `;

    await expect(service.executeValueScript(scriptCode)).rejects.toThrow(
      'getValue function must return a valid number'
    );
  });

  it('should use cached values when appropriate', async () => {
    const scriptCode = `
      exports.getValue = async () => {
        return Math.random(); // This should return the same value when cached
      };
    `;

    // First execution should cache the result
    const firstResult = await service.executeValueScript(scriptCode);
    
    // Second execution should use the cached value
    const secondResult = await service.executeValueScript(scriptCode);
    
    expect(firstResult).toBe(secondResult);
  });

  it('should bypass cache when requested', async () => {
    const scriptCode = `
      exports.getValue = async () => {
        return Date.now(); // This should return a different value when not cached
      };
    `;

    // First execution
    const firstResult = await service.executeValueScript(scriptCode);
    
    // Small delay to ensure timestamp changes
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Second execution with bypass cache
    const secondResult = await service.executeValueScript(scriptCode, { bypassCache: true });
    
    expect(firstResult).not.toBe(secondResult);
  });

  it('should clear the cache when requested', async () => {
    const scriptCode = `
      exports.getValue = async () => {
        return Math.random();
      };
    `;

    // Execute and cache
    const firstResult = await service.executeValueScript(scriptCode);
    
    // Clear cache
    service.clearCache();
    
    // Execute again - should be a new value
    const secondResult = await service.executeValueScript(scriptCode);
    
    expect(firstResult).not.toBe(secondResult);
  });

  it('should invalidate specific script in cache', async () => {
    const script1 = `exports.getValue = async () => { return 100; };`;
    const script2 = `exports.getValue = async () => { return 200; };`;
    
    // Execute both scripts to cache them
    await service.executeValueScript(script1);
    await service.executeValueScript(script2);
    
    // Replace script1 with a different implementation
    const newScript1 = `exports.getValue = async () => { return 150; };`;
    
    // Invalidate just script1
    service.invalidateCache(script1);
    
    // Execute both again
    const result1 = await service.executeValueScript(newScript1);
    const result2 = await service.executeValueScript(script2);
    
    expect(result1).toBe(150);
    expect(result2).toBe(200);
  });
});
