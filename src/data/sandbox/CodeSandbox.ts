import { CodeRunResult } from '@/domain/chat/ChatToolContext';
import { Logger } from '@/domain/utils/Logger';

/**
 * Runs model-authored JavaScript, off this app's origin.
 *
 * `ScriptExecutor` runs the *user's* own asset scripts through `new Function`
 * with a `with (sandbox)` wrapper. That is fine there — the user wrote the code
 * and saved it deliberately — but it is not a boundary: the function body still
 * reaches `globalThis`, and from there IndexedDB, the provider API key and
 * `fetch`. A snippet written by the model cannot have that reach. Its author is
 * remote, and its instructions are influenced by text the user did not write:
 * asset and goal names, and whatever the statement importer lifted out of a PDF.
 *
 * So the snippet runs in an iframe sandboxed *without* `allow-same-origin`,
 * which lands it on an opaque origin:
 *
 * - `indexedDB` and `localStorage` throw rather than resolve, so the financial
 *   records, the sync passphrase and `settings.ai.apiKey` are unreachable — not
 *   merely undeclared on a sandbox object.
 * - The frame's own CSP is `default-src 'none'`, so `connect-src` falls back to
 *   none and `fetch`/`XMLHttpRequest`/`WebSocket` cannot leave the page. There
 *   is no exfiltration path even for data we hand in.
 * - Nothing is handed in but the JSON dataset the caller passes, and only plain
 *   JSON comes back.
 *
 * What the snippet does get is real JavaScript — loops, `await`, the whole
 * standard library — which is the point of the feature.
 *
 * Residual risk, stated plainly: a snippet that spins in a tight synchronous
 * loop cannot be interrupted, only timed out and detached. Browsers usually
 * give a sandboxed frame its own process, so the app stays responsive, but that
 * is not guaranteed by the platform.
 */

/**
 * The two strings the whole boundary rests on, exported so a test can hold them
 * still. Verified in a real browser: with `allow-same-origin` added, a snippet
 * reads `localStorage` and the app's IndexedDB; without it the same snippet gets
 * a SecurityError, and with this CSP `fetch`, WebSocket, `sendBeacon`, an image
 * pixel and a form POST all fail to deliver.
 */
export const SANDBOX_FRAME_POLICY = {
  /** Adding `allow-same-origin` here would hand the snippet the whole database. */
  sandbox: 'allow-scripts',
  csp: "default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval'",
} as const;

/** Generous for arithmetic over a few hundred rows, short enough not to hang a turn. */
const DEFAULT_TIMEOUT_MS = 3_000;

/** Enough to explain a result; not enough for a snippet to pad the context. */
const MAX_LOGS = 20;

const RUNNER_HTML = `<!doctype html>
<meta http-equiv="Content-Security-Policy" content="${SANDBOX_FRAME_POLICY.csp}">
<title>calculation sandbox</title>
<script>
  var AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

  addEventListener('message', async function (event) {
    var payload = event.data || {};
    var logs = [];

    function record() {
      if (logs.length < ${MAX_LOGS}) {
        logs.push(Array.prototype.map.call(arguments, String).join(' '));
      }
    }

    function reply(message) {
      message.nonce = payload.nonce;
      message.logs = logs;
      parent.postMessage(message, '*');
    }

    try {
      var run = new AsyncFunction('data', 'console', '"use strict";' + payload.code);
      var value = await run(payload.data, { log: record, warn: record, error: record, info: record });

      // Only plain JSON travels back. Serialising here turns a class instance or
      // a function into a stated failure instead of a postMessage that throws
      // DataCloneError from inside the frame, where nobody can see it.
      var serialised;
      try {
        serialised = JSON.stringify(value === undefined ? null : value);
      } catch (serialiseError) {
        serialised = undefined;
      }

      if (serialised === undefined) {
        // JSON.stringify answers undefined for a function or a symbol, and
        // throws on a circular structure or a BigInt. Saying so beats the bare
        // '"undefined" is not valid JSON' the parse would otherwise produce.
        reply({
          ok: false,
          error:
            'The snippet returned something that is not plain JSON. Return a number, a string, an array or a plain object.',
        });
      } else {
        reply({ ok: true, value: JSON.parse(serialised) });
      }
    } catch (error) {
      reply({ ok: false, error: String((error && error.message) || error) });
    }
  });

  parent.postMessage({ ready: true }, '*');
</script>`;

interface SandboxMessage {
  ready?: boolean;
  nonce?: string;
  ok?: boolean;
  value?: unknown;
  error?: string;
  logs?: string[];
}

export interface SandboxOptions {
  timeoutMs?: number;
}

/**
 * Never rejects for anything the snippet itself did: a thrown error, a timeout
 * and an unserialisable return all come back as `ok: false`, because the model
 * is shown the reason and can correct itself on the next turn. Only a browser
 * that cannot host the frame at all is an exception.
 */
export async function runInSandbox(
  code: string,
  data: unknown,
  options: SandboxOptions = {}
): Promise<CodeRunResult> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const nonce = crypto.randomUUID();

  const iframe = document.createElement('iframe');
  // The absence of allow-same-origin is the whole boundary — do not add it.
  iframe.setAttribute('sandbox', SANDBOX_FRAME_POLICY.sandbox);
  iframe.setAttribute('aria-hidden', 'true');
  iframe.setAttribute('tabindex', '-1');
  iframe.style.display = 'none';
  iframe.srcdoc = RUNNER_HTML;

  return new Promise<CodeRunResult>(resolve => {
    let settled = false;

    const finish = (result: CodeRunResult) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      window.removeEventListener('message', onMessage);
      // Detaching stops a pending async snippet from ever being heard again.
      iframe.remove();
      resolve(result);
    };

    const onMessage = (event: MessageEvent) => {
      // The frame is on an opaque origin, so event.origin is "null" and cannot
      // identify it. The frame reference and the nonce do that instead.
      if (event.source !== iframe.contentWindow) return;
      const message = (event.data ?? {}) as SandboxMessage;

      if (message.ready) {
        iframe.contentWindow?.postMessage({ nonce, code, data }, '*');
        return;
      }
      if (message.nonce !== nonce) return;

      finish({
        ok: message.ok === true,
        ...(message.ok === true ? { value: message.value } : {}),
        ...(message.error !== undefined ? { error: message.error } : {}),
        logs: message.logs ?? [],
      });
    };

    const timer = window.setTimeout(() => {
      Logger.warn(`Sandboxed snippet exceeded ${timeoutMs}ms and was detached.`);
      finish({
        ok: false,
        error: `The snippet did not finish within ${timeoutMs}ms and was stopped. Simplify it or compute less in one go.`,
        logs: [],
      });
    }, timeoutMs);

    window.addEventListener('message', onMessage);
    document.body.appendChild(iframe);
  });
}
