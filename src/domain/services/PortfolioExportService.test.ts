import { describe, expect, it } from 'vitest';
import { Currency } from '../entities/shared/Currency';
import {
  AssetExportData,
  PortfolioExportData,
  PortfolioExportService,
} from './PortfolioExportService';

/**
 * `generateExportData` reads through repositories, so what is covered here is
 * the rendering: which currency each figure is labelled with. That is where the
 * bug lived — every amount was stamped with a rupee sign, so a mixed-currency
 * portfolio exported a plausible-looking lie.
 *
 * `computeAssetPortfolioTotals`, which now produces the totals, is covered in
 * `AssetService.test.ts`.
 */

function asset(overrides: Partial<AssetExportData> = {}): AssetExportData {
  return {
    name: 'Test Asset',
    category: 'Equity',
    description: '',
    invested: 100000,
    currentValue: 150000,
    profitLoss: 50000,
    profitLossPercentage: 50,
    irr: 12,
    currency: Currency.INR,
    activeSIPs: [],
    ...overrides,
  };
}

function exportData(overrides: Partial<PortfolioExportData> = {}): PortfolioExportData {
  return {
    exportDate: '2026-08-22',
    baseCurrency: Currency.INR,
    totalInvested: 100000,
    totalValue: 150000,
    totalProfitLoss: 50000,
    totalProfitLossPercentage: 50,
    unratedCurrencies: [],
    categoryBreakdown: [{ category: 'Equity', value: 150000, percentage: 100 }],
    assets: [asset()],
    ...overrides,
  };
}

describe('PortfolioExportService.toMarkdown', () => {
  const service = new PortfolioExportService();

  it('labels totals with the base currency', () => {
    const markdown = service.toMarkdown(
      exportData({ baseCurrency: Currency.USD, totalValue: 1700 })
    );

    expect(markdown).toContain('| Current Value | $1,700 |');
    expect(markdown).not.toContain('₹1,700');
  });

  it('reports each holding in its own currency, not the base one', () => {
    const markdown = service.toMarkdown(
      exportData({
        assets: [
          asset({ name: 'Indian Fund', currency: Currency.INR, invested: 100000 }),
          asset({ name: 'US Stock', currency: Currency.USD, invested: 2000, currentValue: 2500 }),
        ],
      })
    );

    expect(markdown).toContain('| Indian Fund | - | ₹1,00,000 |');
    expect(markdown).toContain('| US Stock | - | $2,000 | $2,500 |');
  });

  it('says which figures were converted once more than one currency is held', () => {
    const single = service.toMarkdown(exportData());
    const mixed = service.toMarkdown(
      exportData({ assets: [asset(), asset({ currency: Currency.USD })] })
    );

    // A single-currency portfolio needs no explanation; a mixed one does.
    expect(single).not.toContain('converted to');
    expect(mixed).toContain('converted to INR');
  });

  it('warns that unrated holdings counted as zero', () => {
    const markdown = service.toMarkdown(exportData({ unratedCurrencies: [Currency.GBP] }));

    expect(markdown).toContain('No exchange rate for GBP');
    expect(markdown).toContain('that currency');
  });

  it('reports a SIP in the currency of the asset it belongs to', () => {
    const markdown = service.toMarkdown(
      exportData({
        assets: [
          asset({
            name: 'US Stock',
            currency: Currency.USD,
            activeSIPs: [{ amount: 500, frequency: 'Monthly' }],
          }),
        ],
      })
    );

    expect(markdown).toContain('| US Stock | $500 | Monthly |');
  });
});
