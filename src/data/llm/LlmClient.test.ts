import { describe, expect, it } from 'vitest';
import { extractJson, repairTruncatedJson, TRUNCATED_REPLY } from './LlmClient';

/**
 * The truncation fixtures are real payloads captured from `api.deepseek.com`,
 * not constructions. With `thinking` enabled the provider does not apply
 * constrained decoding for `response_format: { type: 'json_object' }`, so it
 * intermittently emits its stop token before closing the envelope — measured at
 * 2 unparseable in 30 identical requests, both reporting `finish_reason: 'stop'`.
 * Nothing in `tsc`, the build or a test of a pure function sees that, and the
 * user saw only "The model did not return valid JSON".
 */

/** Missing nothing but the final `}`. The sentence itself is complete. */
const BRACE_ONLY_CUT =
  '{\n  "reply": "Okay — trying it with assumptions, since no targets are recorded yet. ' +
  'If you set targets yourself, I\'d note them in the goals tracker so we stop re-estimating."';

/** Cut mid-word, so the closing quote is missing too. Note the escaped quotes. */
const MID_STRING_CUT =
  '{"reply":"I\'ll take \\"try\\" to mean: go ahead and size the goals for me. ' +
  "Once you tell me a rough monthly amount you can invest, I can size realistic SIPs and show where they'd fit.";

describe('extractJson', () => {
  it('parses a clean object', () => {
    expect(extractJson('{"reply":"hello"}')).toEqual({ reply: 'hello' });
  });

  it('recovers JSON from a markdown fence', () => {
    expect(extractJson('```json\n{"reply":"hi"}\n```')).toEqual({ reply: 'hi' });
  });

  it('recovers JSON wrapped in prose', () => {
    expect(extractJson('Sure! {"reply":"hi"} — hope that helps')).toEqual({ reply: 'hi' });
  });

  describe('an envelope the model stopped short of closing', () => {
    it('closes a payload missing only its brace, and keeps the reply whole', () => {
      const parsed = extractJson(BRACE_ONLY_CUT) as Record<string, string>;

      expect(parsed.reply).toContain('Okay — trying it with assumptions');
      expect(parsed.reply).toContain('so we stop re-estimating.');
    });

    it('does not flag that payload as cut off, because nothing was lost', () => {
      const parsed = extractJson(BRACE_ONLY_CUT) as Record<symbol, unknown>;

      expect(parsed[TRUNCATED_REPLY]).toBeUndefined();
    });

    it('closes a payload cut mid-string, preserving the escapes already emitted', () => {
      const parsed = extractJson(MID_STRING_CUT) as Record<string, string>;

      expect(parsed.reply).toContain('I\'ll take "try" to mean');
      expect(parsed.reply).toContain("show where they'd fit.");
    });

    it('flags a payload cut mid-string, where text really is missing', () => {
      const parsed = extractJson(MID_STRING_CUT) as Record<symbol, unknown>;

      expect(parsed[TRUNCATED_REPLY]).toBe(true);
    });

    it('strips a truncated markdown fence whose closing fence never arrived', () => {
      const parsed = extractJson('```json\n{"reply":"cut off here') as Record<string, string>;

      expect(parsed.reply).toBe('cut off here');
    });

    it('closes a truncated tool call, brackets and all', () => {
      const parsed = extractJson('{"toolCalls":[{"name":"listAssets","args":{}}') as {
        toolCalls: { name: string }[];
      };

      expect(parsed.toolCalls).toHaveLength(1);
      expect(parsed.toolCalls[0].name).toBe('listAssets');
    });
  });

  describe('what it refuses to repair', () => {
    it('rejects a cut that leaves a key with no value', () => {
      // Nothing determines what belonged there, so inventing one would put a
      // figure in the user's answer that no model ever produced.
      expect(() => extractJson('{"reply":')).toThrow(/did not return valid JSON/);
    });

    it('rejects prose with no JSON in it at all', () => {
      expect(() => extractJson('I cannot help with that.')).toThrow(/did not return valid JSON/);
    });

    it('rejects a document broken in some way other than truncation', () => {
      // An unescaped quote mid-string is a different fault, and closing
      // brackets around it would only mask it.
      expect(() => extractJson('{"reply":"he said "hi" to me"}')).toThrow(
        /did not return valid JSON/
      );
    });
  });
});

describe('repairTruncatedJson', () => {
  it('reports needing only brackets, so the caller knows nothing was lost', () => {
    expect(repairTruncatedJson('{"a":1')).toEqual({ text: '{"a":1}', closedString: false });
  });

  it('reports having to close a string, so the caller knows text is missing', () => {
    expect(repairTruncatedJson('{"a":"be')).toEqual({ text: '{"a":"be"}', closedString: true });
  });

  it('closes nested structures innermost first', () => {
    expect(repairTruncatedJson('{"a":[{"b":[1')?.text).toBe('{"a":[{"b":[1]}]}');
  });

  it('drops a trailing comma a cut left behind', () => {
    expect(repairTruncatedJson('{"a":1,')?.text).toBe('{"a":1}');
  });

  it('drops a dangling backslash rather than letting it escape the quote it adds', () => {
    expect(repairTruncatedJson('{"a":"b\\')).toEqual({ text: '{"a":"b"}', closedString: true });
  });

  it('is not fooled by braces and quotes inside a string', () => {
    expect(repairTruncatedJson('{"a":"} \\" {"')?.text).toBe('{"a":"} \\" {"}');
  });

  it('declines a complete document, leaving a real fault to surface', () => {
    expect(repairTruncatedJson('{"a":1}')).toBeUndefined();
  });

  it('declines a document with more closes than opens', () => {
    expect(repairTruncatedJson('{"a":1}}')).toBeUndefined();
  });
});
