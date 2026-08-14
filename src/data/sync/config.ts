/**
 * Sync API Configuration
 *
 * The endpoint is deployment-specific: every deployer of this app runs their own
 * backend, so it is supplied at build time through VITE_SYNC_API_URL (set as a
 * repository variable in the Pages workflow) and inlined by Vite.
 *
 * There is deliberately no default. A hardcoded fallback would mean every fork
 * silently pushed its data into whichever account happened to be baked in, at
 * that account owner's expense. Unconfigured builds simply have no sync.
 */

/** The configured backend, or undefined when this build has none. */
export function getSyncApiBaseUrl(): string | undefined {
  const envUrl = import.meta.env.VITE_SYNC_API_URL;
  if (!envUrl) return undefined;
  return envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
}

/** Whether this build has a sync backend to talk to at all. */
export function isSyncConfigured(): boolean {
  return Boolean(getSyncApiBaseUrl());
}

/**
 * Build full API URL for sync endpoints
 * @param path - API path (e.g., '/data', '/data/123')
 * @returns Full URL for the API endpoint
 * @throws When the build has no configured backend
 */
export function buildSyncApiUrl(path: string): string {
  const baseUrl = getSyncApiBaseUrl();
  if (!baseUrl) {
    throw new Error(
      'Sync is not configured for this build. Set VITE_SYNC_API_URL to your sync backend URL and rebuild.'
    );
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}
