import { AppFailureView, type AppFailureKind } from '@/app/components/views/AppFailureView';
import { openDatabase } from '@/data/database';
import { Logger } from '@/domain/utils/Logger';
import { Component, type ErrorInfo, type ReactNode } from 'react';

/**
 * Drops the precached build and reloads.
 *
 * A PWA serves whatever its service worker has cached, for as long as it likes,
 * which is how a device comes to run a build older than its own data. Unregister
 * plus a cache sweep is what makes "reload" actually fetch the current version
 * rather than the same broken one again.
 *
 * It clears `caches` and nothing else. IndexedDB and local storage are where the
 * user records and sync identity live, and this runs at the exact moment a
 * frightened user would otherwise be clearing those by hand — so it must be
 * provably incapable of touching them.
 */
async function reloadWithFreshBuild(): Promise<void> {
  try {
    const registrations = (await navigator.serviceWorker?.getRegistrations()) ?? [];
    await Promise.all(registrations.map(registration => registration.unregister()));
    if (typeof caches !== 'undefined') {
      const keys = await caches.keys();
      await Promise.all(keys.map(key => caches.delete(key)));
    }
  } catch (error) {
    // Reload anyway: a sweep that failed is no reason to leave the user on a
    // dead screen, and a plain reload still sometimes picks up a new build.
    Logger.warn('Could not clear the cached build before reloading:', error);
  }
  window.location.reload();
}

interface State {
  kind?: AppFailureKind;
  busy: boolean;
}

/**
 * Stands between a broken start-up and a blank page.
 *
 * Two failures land here and they arrive by different routes, which is why one
 * component owns both. A render that throws arrives through `componentDidCatch`,
 * the only mechanism React offers. A database that will not open arrives from
 * `openDatabase` — Dexie opens lazily on the first query, so without asking on
 * purpose the failure shows up as every screen quietly failing at once, which
 * looks exactly like a blank app.
 */
export class AppFailureBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { busy: false };

  componentDidMount(): void {
    void openDatabase().then(failure => {
      if (!failure) return;
      Logger.error(`The database could not be opened: ${failure}`);
      // A render error already showing is the more specific report of the two.
      this.setState(current => (current.kind ? current : { ...current, kind: failure }));
    });
  }

  static getDerivedStateFromError(): Partial<State> {
    return { kind: 'crashed' };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    Logger.error('Wealth Atlas failed to render:', error, info.componentStack);
  }

  private readonly onReload = (): void => {
    this.setState({ busy: true });
    void reloadWithFreshBuild();
  };

  render(): ReactNode {
    if (!this.state.kind) return this.props.children;
    return (
      <AppFailureView kind={this.state.kind} onReload={this.onReload} busy={this.state.busy} />
    );
  }
}
