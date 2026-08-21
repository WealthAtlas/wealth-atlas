import { describe, expect, it } from 'vitest';
import { SANDBOX_FRAME_POLICY } from './CodeSandbox';

/**
 * The runner executes JavaScript written by the model, so these two strings are
 * the only thing standing between a steered snippet and the user's records. Both
 * were verified in a real browser — with `allow-same-origin` added, a snippet
 * read localStorage; without it the same snippet got a SecurityError, and every
 * outbound channel (fetch, WebSocket, sendBeacon, an image pixel, a form POST)
 * failed to deliver under this CSP.
 *
 * Executing the code needs an iframe and is covered by that manual check, not
 * here. What is worth pinning in CI is the policy, because widening it is a
 * one-token edit that nothing else would notice.
 */
describe('the sandbox frame policy', () => {
  it('never grants same-origin access', () => {
    expect(SANDBOX_FRAME_POLICY.sandbox).toBe('allow-scripts');
    // The token that would expose IndexedDB, localStorage and the API key.
    expect(SANDBOX_FRAME_POLICY.sandbox).not.toContain('allow-same-origin');
  });

  it('denies every outbound channel by default', () => {
    expect(SANDBOX_FRAME_POLICY.csp).toContain("default-src 'none'");
    // connect-src, img-src and form-action all fall back to default-src, so
    // naming none of them is what blocks them. An explicit widening would show
    // up here as a directive that overrides the fallback.
    expect(SANDBOX_FRAME_POLICY.csp).not.toContain('connect-src');
    expect(SANDBOX_FRAME_POLICY.csp).not.toContain('img-src');
  });

  it('allows only the eval the runner itself needs', () => {
    // The snippet is compiled with AsyncFunction, which needs unsafe-eval; the
    // runner is an inline script, which needs unsafe-inline. Nothing else.
    expect(SANDBOX_FRAME_POLICY.csp).toContain("script-src 'unsafe-inline' 'unsafe-eval'");
  });
});
