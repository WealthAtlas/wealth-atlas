import { describe, expect, it } from 'vitest';
import { executeValueScript } from './ScriptExecutor';

describe('executeValueScript', () => {
  it('runs a script whose text is not Latin-1', async () => {
    // The cache key used to be `btoa(scriptCode)`, which throws
    // `InvalidCharacterError` on anything outside Latin-1 — before the script
    // ran, so a single ₹ or curly quote in a comment meant that asset silently
    // never got a value while its neighbours worked.
    const script = `
      // Fetches the ₹ value — “as at” today.
      exports.getValue = async function () { return 42; };
    `;

    await expect(executeValueScript(script)).resolves.toBe(42);
  });

  it('rejects a script that does not return a number', async () => {
    const script = `exports.getValue = async function () { return 'nope'; };`;

    await expect(executeValueScript(script)).rejects.toThrow('valid number');
  });
});
