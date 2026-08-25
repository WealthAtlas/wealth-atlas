import { createRoot } from 'react-dom/client';
import App from './app/App';

const rootElement = document.getElementById('root')!;

/**
 * The last resort, and the only one that works when nothing else got the chance
 * to.
 *
 * `AppFailureBoundary` covers everything React can see, but it can only run if
 * React ran — and the failure that started all of this could not be caught by
 * any component: a PWA serving a precached build whose chunks the server no
 * longer has, or a module that throws while evaluating, both leave the page
 * blank before a single component mounts. A blank page says nothing, so the only
 * remedy a user can find alone is to clear the site storage, which is where
 * every record they own is kept.
 *
 * So this is deliberately built out of nothing: no imports, no framework, no
 * theme. It only has to put one sentence on the screen.
 */
function showBootFailure(): void {
  // Anything already rendered is a better report than this one.
  if (rootElement.childElementCount > 0) return;

  const panel = document.createElement('div');
  panel.style.cssText =
    'font-family:system-ui,sans-serif;max-width:36rem;margin:3rem auto;padding:1.5rem;line-height:1.5';

  const heading = document.createElement('h1');
  heading.style.cssText = 'font-size:1.25rem;margin:0 0 1rem';
  heading.textContent = 'Wealth Atlas could not start';

  const cause = document.createElement('p');
  cause.textContent =
    'This device is most likely holding an old copy of the app. Reloading fetches the current ' +
    'version and leaves everything stored here untouched.';

  const warning = document.createElement('p');
  warning.style.cssText = 'font-weight:600';
  warning.textContent =
    'Do not clear this site data, cache or history. Your records are stored on this device, and ' +
    'clearing it deletes them. Nothing has been lost yet.';

  const button = document.createElement('button');
  button.style.cssText = 'padding:0.6rem 1rem;font-size:1rem;cursor:pointer';
  button.textContent = 'Reload with the current version';
  button.addEventListener('click', () => {
    // Cached *builds* only — never IndexedDB or local storage, which is where
    // the records this screen is telling the user not to delete are kept.
    const swept = navigator.serviceWorker
      ? navigator.serviceWorker
          .getRegistrations()
          .then(registrations => Promise.all(registrations.map(r => r.unregister())))
          .then(() => (typeof caches === 'undefined' ? [] : caches.keys()))
          .then(keys => Promise.all(keys.map(key => caches.delete(key))))
      : Promise.resolve([]);
    // Reload whatever happens: a failed sweep is no reason to leave a dead page.
    swept.catch(() => undefined).then(() => window.location.reload());
  });

  panel.append(heading, cause, warning, button);
  rootElement.append(panel);
}

try {
  createRoot(rootElement).render(<App />);
} catch {
  showBootFailure();
}

// A failed chunk fetch arrives here rather than at the call above, because the
// module that failed was being loaded, not called.
window.addEventListener('error', showBootFailure);
window.addEventListener('unhandledrejection', showBootFailure);
