/**
 * Sync API Configuration
 *
 * Handles the API base URL configuration for the sync service.
 * Can be overridden via environment variables for different deployments.
 */

/**
 * Get the sync API base URL from environment or use default
 *
 * Priority:
 * 1. VITE_SYNC_API_URL environment variable
 * 2. Default AWS API Gateway endpoint
 */
export function getSyncApiBaseUrl(): string {
  // Check for environment variable override
  const envUrl = import.meta.env.VITE_SYNC_API_URL;
  if (envUrl) {
    return envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
  }

  // Default to the AWS API Gateway endpoint
  return 'https://qjtqi1soth.execute-api.us-east-1.amazonaws.com/dev';
}

/**
 * Build full API URL for sync endpoints
 * @param path - API path (e.g., '/data', '/data/123')
 * @returns Full URL for the API endpoint
 */
export function buildSyncApiUrl(path: string): string {
  const baseUrl = getSyncApiBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}
