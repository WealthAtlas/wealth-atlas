import { ApiConfiguration } from '../services/AssetApiValuationService';

/**
 * Default API configuration for asset valuation
 * This can be customized based on your API provider
 */
export const DEFAULT_API_CONFIG: ApiConfiguration = {
  baseUrl: 'https://api.example.com', // Replace with your API base URL
  valueField: 'value', // Field name in API response containing the price
  timeout: 10000, // 10 seconds timeout
};

/**
 * Example API configuration for different providers
 */
export const API_CONFIGS = {
  // Example for Alpha Vantage
  ALPHA_VANTAGE: {
    baseUrl: 'https://www.alphavantage.co/query',
    valueField: 'Global Quote.05. price',
    timeout: 15000,
  } as ApiConfiguration,

  // Example for Yahoo Finance
  YAHOO_FINANCE: {
    baseUrl: 'https://query1.finance.yahoo.com/v8/finance/chart',
    valueField: 'chart.result[0].meta.regularMarketPrice',
    timeout: 10000,
  } as ApiConfiguration,

  // Example for custom API
  CUSTOM: {
    baseUrl: 'https://your-api.com/v1',
    valueField: 'price',
    timeout: 5000,
  } as ApiConfiguration,
};

/**
 * Get API configuration based on environment or user preference
 */
export function getApiConfiguration(): ApiConfiguration {
  // You can implement logic to return different configs based on:
  // - Environment variables
  // - User settings
  // - Asset type
  return DEFAULT_API_CONFIG;
}
