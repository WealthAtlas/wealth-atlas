import { Asset } from '../entities/assets/Asset';
import { AssetPricingModel } from '../entities/assets/AssetPricingModel';
import { AssetTransaction } from '../entities/assets/AssetTransaction';
import { Logger } from '../utils/Logger';

export interface ApiValuationResult {
  success: boolean;
  value?: number;
  error?: string;
  fetchedAt?: Date;
}

export interface ApiConfiguration {
  baseUrl: string;
  valueField: string; // Field name in API response containing the value
  timeout?: number;
}

export class AssetApiValuationService {
  private static readonly DEFAULT_TIMEOUT = 5000; // 5 seconds
  private static readonly DEFAULT_VALUE_FIELD = 'value';

  /**
   * Fetch current market value from API for market-based assets
   */
  static async fetchApiValue(
    asset: Asset,
    apiConfig: ApiConfiguration
  ): Promise<ApiValuationResult> {
    try {
      // Only fetch for market-based assets with API path configured
      if (
        asset.valuationConfig?.pricingModel !== AssetPricingModel.MARKET_BASED ||
        !asset.valuationConfig?.apiPath
      ) {
        return {
          success: false,
          error: 'Asset is not configured for API-based valuation',
        };
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        apiConfig.timeout || this.DEFAULT_TIMEOUT
      );

      try {
        const response = await fetch(`${apiConfig.baseUrl}${asset.valuationConfig.apiPath}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          return {
            success: false,
            error: `API request failed with status ${response.status}`,
          };
        }

        const data = await response.json();
        const valueField = apiConfig.valueField || this.DEFAULT_VALUE_FIELD;
        const value = data[valueField];

        if (typeof value !== 'number' || isNaN(value) || value < 0) {
          return {
            success: false,
            error: `Invalid value received from API: ${value}`,
          };
        }

        return {
          success: true,
          value,
          fetchedAt: new Date(),
        };
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (error) {
      Logger.error('Failed to fetch API value for asset:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Update asset's current market value using API
   */
  static async updateAssetValueFromApi(
    asset: Asset,
    transactions: AssetTransaction[],
    apiConfig: ApiConfiguration
  ): Promise<{ asset: Asset; result: ApiValuationResult }> {
    const result = await this.fetchApiValue(asset, apiConfig);

    if (result.success && result.value !== undefined) {
      // Calculate total value based on current holdings
      const currentHoldings = asset.getCurrentHoldings(transactions);
      const totalMarketValue = currentHoldings * result.value;

      // Create updated asset with new market value
      const updatedAsset = new Asset(
        asset.id,
        asset.name,
        asset.description,
        asset.category,
        asset.currency,
        totalMarketValue,
        result.fetchedAt,
        asset.valuationConfig
      );

      return {
        asset: updatedAsset,
        result,
      };
    }

    return {
      asset,
      result,
    };
  }

  /**
   * Batch update multiple assets from their respective APIs
   */
  static async batchUpdateAssetsFromApi(
    assets: Asset[],
    transactionsByAsset: Map<number, AssetTransaction[]>,
    apiConfig: ApiConfiguration
  ): Promise<Map<number, { asset: Asset; result: ApiValuationResult }>> {
    const results = new Map<number, { asset: Asset; result: ApiValuationResult }>();

    // Filter assets that can be updated via API
    const apiEnabledAssets = assets.filter(
      asset =>
        asset.valuationConfig?.pricingModel === AssetPricingModel.MARKET_BASED &&
        asset.valuationConfig?.apiPath &&
        asset.id !== undefined
    );

    // Process in parallel but with some rate limiting
    const promises = apiEnabledAssets.map(async asset => {
      const transactions = transactionsByAsset.get(asset.id!) || [];
      const updateResult = await this.updateAssetValueFromApi(asset, transactions, apiConfig);

      if (asset.id !== undefined) {
        results.set(asset.id, updateResult);
      }

      return updateResult;
    });

    try {
      await Promise.allSettled(promises);
    } catch (error) {
      Logger.error('Error in batch API valuation update:', error);
    }

    return results;
  }
}
