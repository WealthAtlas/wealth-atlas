import { AssetCategory } from '../entities/assets/AssetCategory';
import { Currency } from '../entities/shared/Currency';
import { CurrencyConverter } from '../entities/shared/CurrencyConverter';
import { Frequency } from '../entities/shared/Frequency';
import { formatMoney } from '../utils/MoneyFormat';
import { AssetService, computeAssetPortfolioTotals } from './AssetService';

export interface PortfolioExportOptions {
  categories: string[]; // Filter by these categories (empty = all)
}

export interface SIPExportData {
  amount: number;
  frequency: string;
}

/** One holding, in the currency it is held in — never converted. */
export interface AssetExportData {
  name: string;
  category: string;
  description: string;
  invested: number;
  currentValue: number | undefined;
  profitLoss: number | undefined;
  profitLossPercentage: number | undefined;
  irr: number | undefined;
  currency: Currency;
  activeSIPs: SIPExportData[];
}

/** `value` is in the base currency: a share of the portfolio spans assets. */
export interface CategoryBreakdown {
  category: string;
  value: number;
  percentage: number;
}

/**
 * Every total here is in `baseCurrency`. That is not decoration: these figures
 * sum across assets that may each be held in a different currency, and until
 * they were converted this export added dollars to rupees and labelled the
 * result with a rupee sign.
 */
export interface PortfolioExportData {
  exportDate: string;
  baseCurrency: Currency;
  totalInvested: number;
  totalValue: number;
  totalProfitLoss: number;
  totalProfitLossPercentage: number;
  /** Currencies with no rate, whose holdings contributed 0 to the totals. */
  unratedCurrencies: Currency[];
  categoryBreakdown: CategoryBreakdown[];
  assets: AssetExportData[];
}

export class PortfolioExportService {
  private readonly assetService: AssetService;

  constructor() {
    this.assetService = new AssetService();
  }

  public async generateExportData(
    options: PortfolioExportOptions,
    converter: CurrencyConverter
  ): Promise<PortfolioExportData> {
    const allAssets = await this.assetService.getAssets();

    // Filter by categories if specified
    const filteredAssets =
      options.categories.length > 0
        ? allAssets.filter(asset => options.categories.includes(asset.category))
        : allAssets;

    // Totals come from the same function the Assets page uses, so a copied
    // summary cannot disagree with the screen it was copied from.
    const totals = computeAssetPortfolioTotals(filteredAssets, converter);

    const categoryValueMap = new Map<string, number>();

    const assetsData: AssetExportData[] = await Promise.all(
      filteredAssets.map(async asset => {
        const invested = asset.getTotalInvestedAmount();
        const currentValue = asset.getValue();
        const profitLoss = asset.getProfitLoss();
        const profitLossPercentage =
          invested > 0 && profitLoss !== undefined ? (profitLoss / invested) * 100 : undefined;
        const irr = asset.getIRR();

        // A category's value spans assets, so it converts. The per-asset amounts
        // returned below deliberately do not — a holding is reported in the
        // currency the user actually holds it in, as the asset page shows it.
        const categoryValue = categoryValueMap.get(asset.category) ?? 0;
        categoryValueMap.set(
          asset.category,
          categoryValue + converter.toBase(currentValue ?? 0, asset.currency)
        );

        // Get SIPs for this asset
        const sips = await this.assetService.getSIPsByAssetId(asset.id!);
        const activeSIPs: SIPExportData[] = sips
          .filter(sip => !sip.endDate || sip.endDate > new Date())
          .map(sip => ({
            amount: sip.price,
            frequency: this.formatFrequency(sip.frequency),
          }));

        return {
          name: asset.name,
          category: asset.category,
          description: asset.description,
          invested,
          currentValue,
          profitLoss,
          profitLossPercentage,
          irr,
          currency: asset.currency,
          activeSIPs,
        };
      })
    );

    // Calculate category breakdown
    const categoryBreakdown: CategoryBreakdown[] = Array.from(categoryValueMap.entries())
      .map(([category, value]) => ({
        category,
        value,
        percentage: totals.totalValue > 0 ? (value / totals.totalValue) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);

    return {
      exportDate: new Date().toISOString().split('T')[0],
      baseCurrency: totals.currency,
      totalInvested: totals.totalInvested,
      totalValue: totals.totalValue,
      totalProfitLoss: totals.totalProfitLoss,
      totalProfitLossPercentage: totals.totalProfitLossPercentage,
      unratedCurrencies: totals.unratedCurrencies,
      categoryBreakdown,
      assets: assetsData,
    };
  }

  public toMarkdown(data: PortfolioExportData): string {
    const lines: string[] = [];

    // Header
    lines.push('# Portfolio Summary');
    lines.push(`**Exported on:** ${this.formatDateDisplay(data.exportDate)}`);
    lines.push('');

    // Overview
    lines.push('## Overview');
    lines.push('| Metric | Value |');
    lines.push('|--------|-------|');
    lines.push(`| Total Invested | ${formatMoney(data.totalInvested, data.baseCurrency)} |`);
    lines.push(`| Current Value | ${formatMoney(data.totalValue, data.baseCurrency)} |`);
    lines.push(
      `| Total P&L | ${formatMoney(data.totalProfitLoss, data.baseCurrency)} (${this.formatPercentage(data.totalProfitLossPercentage)}) |`
    );
    lines.push('');

    // Whoever reads this next is often an LLM, so say plainly which figures were
    // converted and which were not, rather than leaving it to be inferred from
    // the symbols.
    if (new Set(data.assets.map(asset => asset.currency)).size > 1) {
      lines.push(
        `*Totals and category shares are converted to ${data.baseCurrency} at today's rates. Each holding below is listed in the currency it is held in.*`
      );
      lines.push('');
    }
    if (data.unratedCurrencies.length > 0) {
      const plural = data.unratedCurrencies.length > 1 ? 'those currencies' : 'that currency';
      lines.push(
        `*No exchange rate for ${data.unratedCurrencies.join(', ')} — holdings in ${plural} count as zero in the totals above.*`
      );
      lines.push('');
    }

    // Category Allocation
    if (data.categoryBreakdown.length > 0) {
      lines.push('## Category Allocation');
      lines.push('| Category | Value | % of Portfolio |');
      lines.push('|----------|-------|----------------|');
      for (const cat of data.categoryBreakdown) {
        lines.push(
          `| ${cat.category} | ${formatMoney(cat.value, data.baseCurrency)} | ${cat.percentage.toFixed(1)}% |`
        );
      }
      lines.push('');
    }

    // Holdings grouped by category
    lines.push('## Holdings');
    const assetsByCategory = this.groupAssetsByCategory(data.assets);

    for (const [category, assets] of assetsByCategory) {
      lines.push(`### ${category}`);
      lines.push('| Name | Description | Invested | Current Value | P&L | IRR |');
      lines.push('|------|-------------|----------|---------------|-----|-----|');
      for (const asset of assets) {
        const plDisplay =
          asset.profitLoss !== undefined
            ? `${formatMoney(asset.profitLoss, asset.currency)} (${this.formatPercentage(asset.profitLossPercentage)})`
            : 'N/A';
        const irrDisplay = asset.irr !== undefined ? `${asset.irr.toFixed(1)}%` : 'N/A';
        const valueDisplay =
          asset.currentValue !== undefined
            ? formatMoney(asset.currentValue, asset.currency)
            : 'N/A';
        const descDisplay = asset.description || '-';
        lines.push(
          `| ${asset.name} | ${descDisplay} | ${formatMoney(asset.invested, asset.currency)} | ${valueDisplay} | ${plDisplay} | ${irrDisplay} |`
        );
      }
      lines.push('');
    }

    // Active SIPs
    const assetsWithSIPs = data.assets.filter(a => a.activeSIPs.length > 0);
    if (assetsWithSIPs.length > 0) {
      lines.push('## Active SIPs');
      lines.push('| Asset | Amount | Frequency |');
      lines.push('|-------|--------|-----------|');
      for (const asset of assetsWithSIPs) {
        for (const sip of asset.activeSIPs) {
          lines.push(
            `| ${asset.name} | ${formatMoney(sip.amount, asset.currency)} | ${sip.frequency} |`
          );
        }
      }
      lines.push('');
    }

    // Footer
    lines.push('---');
    lines.push(
      `*Use this data with an LLM (like Perplexity or ChatGPT) to get personalized investment insights based on current market conditions.*`
    );

    return lines.join('\n');
  }

  public toJSON(data: PortfolioExportData): string {
    return JSON.stringify(data, null, 2);
  }

  public toCSV(data: PortfolioExportData): string {
    const lines: string[] = [];

    // Header row
    lines.push(
      'Name,Category,Description,Invested,Current Value,P&L,P&L %,IRR %,Currency,Active SIPs'
    );

    // Data rows
    for (const asset of data.assets) {
      const sipInfo = asset.activeSIPs.map(sip => `${sip.amount} ${sip.frequency}`).join('; ');

      const row = [
        this.escapeCSV(asset.name),
        this.escapeCSV(asset.category),
        this.escapeCSV(asset.description),
        asset.invested.toString(),
        asset.currentValue?.toString() ?? '',
        asset.profitLoss?.toString() ?? '',
        asset.profitLossPercentage?.toFixed(2) ?? '',
        asset.irr?.toFixed(2) ?? '',
        asset.currency,
        this.escapeCSV(sipInfo),
      ];
      lines.push(row.join(','));
    }

    return lines.join('\n');
  }

  public getAvailableCategories(): string[] {
    return Object.values(AssetCategory);
  }

  private groupAssetsByCategory(assets: AssetExportData[]): Map<string, AssetExportData[]> {
    const grouped = new Map<string, AssetExportData[]>();
    for (const asset of assets) {
      const existing = grouped.get(asset.category) ?? [];
      existing.push(asset);
      grouped.set(asset.category, existing);
    }
    return grouped;
  }

  private formatFrequency(frequency: Frequency): string {
    const labels: Record<Frequency, string> = {
      [Frequency.DAILY]: 'Daily',
      [Frequency.WEEKLY]: 'Weekly',
      [Frequency.BIWEEKLY]: 'Bi-weekly',
      [Frequency.MONTHLY]: 'Monthly',
      [Frequency.QUARTERLY]: 'Quarterly',
      [Frequency.SEMI_ANNUALLY]: 'Semi-annually',
      [Frequency.ANNUALLY]: 'Annually',
    };
    return labels[frequency] ?? frequency;
  }

  private formatPercentage(percentage: number | undefined): string {
    if (percentage === undefined) return 'N/A';
    const sign = percentage >= 0 ? '+' : '';
    return `${sign}${percentage.toFixed(1)}%`;
  }

  private formatDateDisplay(isoDate: string): string {
    const date = new Date(isoDate);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  private escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
