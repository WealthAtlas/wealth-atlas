import { AssetRepository } from '@/data/repositories/AssetRepository';
import { AssetTransactionRepository } from '@/data/repositories/AssetTransactionRepository';
import { Asset } from '@/domain/entities/assets/Asset';
import { AssetCategory } from '@/domain/entities/assets/AssetCategory';
import { AssetTransaction } from '@/domain/entities/assets/AssetTransaction';
import { Currency } from '@/domain/entities/shared/Currency';

export async function seedAssetData() {
  const assetRepository = new AssetRepository();
  const transactionRepository = new AssetTransactionRepository();

  // Check if assets already exist
  const existingAssets = await assetRepository.findAll();
  if (existingAssets.length > 0) {
    console.log('Asset data already exists, skipping seed');
    return;
  }

  const sampleAssets = [
    // Mutual Funds
    {
      name: 'HDFC Top 100 Fund',
      description: 'Large cap equity mutual fund',
      category: AssetCategory.MUTUAL_FUNDS,
      currency: Currency.INR,
      currentMarketValue: 85.5,
      valueUpdatedAt: new Date('2024-08-15'),
    },
    {
      name: 'SBI Small Cap Fund',
      description: 'Small cap equity mutual fund',
      category: AssetCategory.MUTUAL_FUNDS,
      currency: Currency.INR,
      currentMarketValue: 120.75,
      valueUpdatedAt: new Date('2024-08-15'),
    },
    {
      name: 'Axis Bluechip Fund',
      description: 'Large cap equity fund',
      category: AssetCategory.MUTUAL_FUNDS,
      currency: Currency.INR,
      currentMarketValue: 95.2,
      valueUpdatedAt: new Date('2024-08-15'),
    },

    // Stocks
    {
      name: 'Reliance Industries',
      description: 'Oil & Gas conglomerate',
      category: AssetCategory.STOCKS,
      currency: Currency.INR,
      currentMarketValue: 2850.0,
      valueUpdatedAt: new Date('2024-08-15'),
    },
    {
      name: 'TCS',
      description: 'IT Services company',
      category: AssetCategory.STOCKS,
      currency: Currency.INR,
      currentMarketValue: 4200.0,
      valueUpdatedAt: new Date('2024-08-15'),
    },

    // Fixed Deposits
    {
      name: 'SBI Fixed Deposit',
      description: '5-year fixed deposit @ 7.5%',
      category: AssetCategory.FIXED_DEPOSITS,
      currency: Currency.INR,
      currentMarketValue: undefined, // FDs don't have market value fluctuation
      valueUpdatedAt: undefined,
    },
    {
      name: 'HDFC Fixed Deposit',
      description: '3-year fixed deposit @ 7.2%',
      category: AssetCategory.FIXED_DEPOSITS,
      currency: Currency.INR,
      currentMarketValue: undefined,
      valueUpdatedAt: undefined,
    },

    // International Assets
    {
      name: 'Apple Inc (AAPL)',
      description: 'Technology stock',
      category: AssetCategory.STOCKS,
      currency: Currency.USD,
      currentMarketValue: 185.5,
      valueUpdatedAt: new Date('2024-08-15'),
    },
    {
      name: 'Vanguard S&P 500 ETF',
      description: 'US large cap ETF',
      category: AssetCategory.OTHER, // Using OTHER for ETF since it's not in enum
      currency: Currency.USD,
      currentMarketValue: 420.25,
      valueUpdatedAt: new Date('2024-08-15'),
    },

    // Gold
    {
      name: 'Gold ETF',
      description: 'Gold exchange traded fund',
      category: AssetCategory.COMMODITIES, // Gold falls under commodities
      currency: Currency.INR,
      currentMarketValue: 5800.0,
      valueUpdatedAt: new Date('2024-08-15'),
    },

    // Real Estate
    {
      name: 'Apartment - Bangalore',
      description: '2 BHK apartment in Whitefield',
      category: AssetCategory.REAL_ESTATE,
      currency: Currency.INR,
      currentMarketValue: 8500000.0, // 85 lakhs
      valueUpdatedAt: new Date('2024-08-01'),
    },

    // PPF - using insurance policies as closest match
    {
      name: 'Public Provident Fund',
      description: 'Tax-saving investment with 15-year lock-in',
      category: AssetCategory.GOVERNMENT_BONDS, // PPF is government-backed
      currency: Currency.INR,
      currentMarketValue: undefined,
      valueUpdatedAt: undefined,
    },
  ];

  try {
    // Create assets with sample transactions
    for (const assetData of sampleAssets) {
      const asset = new Asset(
        undefined, // id
        assetData.name,
        assetData.description,
        assetData.category,
        assetData.currency,
        assetData.currentMarketValue,
        assetData.valueUpdatedAt
      );

      const savedAsset = await assetRepository.save(asset);

      // Add some sample transactions for each asset
      if (savedAsset.id) {
        const transactions = getSampleTransactions(savedAsset, assetData.category);
        for (const transaction of transactions) {
          await transactionRepository.save(transaction);
        }
      }
    }

    console.log('Sample asset data seeded successfully');
  } catch (error) {
    console.error('Failed to seed asset data:', error);
  }
}

function getSampleTransactions(asset: Asset, category: AssetCategory): AssetTransaction[] {
  const transactions: AssetTransaction[] = [];
  const assetId = asset.id!;

  switch (category) {
    case AssetCategory.MUTUAL_FUNDS:
      // Mutual fund SIPs
      transactions.push(
        new AssetTransaction(
          undefined, // id
          assetId,
          'buy',
          undefined, // quantity will be calculated
          58.5, // unit price
          new Date('2024-01-15')
        ),
        new AssetTransaction(undefined, assetId, 'buy', undefined, 62.2, new Date('2024-02-15')),
        new AssetTransaction(undefined, assetId, 'buy', undefined, 65.8, new Date('2024-03-15')),
        new AssetTransaction(undefined, assetId, 'buy', undefined, 72.4, new Date('2024-06-15'))
      );
      break;

    case AssetCategory.STOCKS:
      // Stock purchases
      if (asset.name === 'Reliance Industries') {
        transactions.push(
          new AssetTransaction(undefined, assetId, 'buy', 10, 2850, new Date('2024-03-10')),
          new AssetTransaction(undefined, assetId, 'buy', 5, 2850, new Date('2024-07-20'))
        );
      } else if (asset.name === 'TCS') {
        transactions.push(
          new AssetTransaction(undefined, assetId, 'buy', 5, 4200, new Date('2024-02-28'))
        );
      } else if (asset.name === 'Apple Inc (AAPL)') {
        transactions.push(
          new AssetTransaction(undefined, assetId, 'buy', 10, 185.5, new Date('2024-04-15'))
        );
      }
      break;

    case AssetCategory.FIXED_DEPOSITS:
      // FD investment (no quantity, amount-based)
      transactions.push(
        new AssetTransaction(
          undefined,
          assetId,
          'buy',
          undefined, // No quantity for FD
          100000, // Unit price equals amount for FDs
          new Date('2024-01-01')
        )
      );
      break;

    case AssetCategory.OTHER:
      // ETF purchases (for Vanguard S&P 500 ETF)
      if (asset.name.includes('ETF')) {
        transactions.push(
          new AssetTransaction(undefined, assetId, 'buy', 5, 420.25, new Date('2024-05-10'))
        );
      }
      break;

    case AssetCategory.COMMODITIES:
      // Gold ETF
      transactions.push(
        new AssetTransaction(undefined, assetId, 'buy', 5, 5800, new Date('2024-01-20')),
        new AssetTransaction(undefined, assetId, 'buy', 2, 5800, new Date('2024-04-20'))
      );
      break;

    case AssetCategory.REAL_ESTATE:
      // Real estate purchase
      transactions.push(
        new AssetTransaction(
          undefined,
          assetId,
          'buy',
          1, // 1 property
          8500000,
          new Date('2023-12-15')
        )
      );
      break;

    case AssetCategory.GOVERNMENT_BONDS:
      // PPF contributions
      transactions.push(
        new AssetTransaction(undefined, assetId, 'buy', undefined, 150000, new Date('2024-03-31'))
      );
      break;

    default:
      // Default minimal transaction
      transactions.push(
        new AssetTransaction(undefined, assetId, 'buy', undefined, 10000, new Date('2024-01-01'))
      );
  }

  return transactions;
}
