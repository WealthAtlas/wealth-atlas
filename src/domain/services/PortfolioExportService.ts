import { AssetCategory } from '../entities/assets/AssetCategory';
import { Frequency } from '../entities/shared/Frequency';
import { AssetService } from './AssetService';

export interface PortfolioExportOptions {
  categories: string[]; // Filter by these categories (empty = all)
}

export interface SIPExportData {
  amount: number;
  frequency: string;
}

export interface AssetExportData {
  name: string;
  category: string;
  description: string;
  invested: number;
  currentValue: number | undefined;
  profitLoss: number | undefined;
  profitLossPercentage: number | undefined;
  irr: number | undefined;
  currency: string;
  activeSIPs: SIPExportData[];
}

export interface CategoryBreakdown {
  category: string;
  value: number;
  percentage: number;
}

export interface PortfolioExportData {
  exportDate: string;
  totalInvested: number;
  totalValue: number;
  totalProfitLoss: number;
  totalProfitLossPercentage: number;
  categoryBreakdown: CategoryBreakdown[];
  assets: AssetExportData[];
}

export class PortfolioExportService {
  private readonly assetService: AssetService;

  constructor() {
    this.assetService = new AssetService();
  }

  public async generateExportData(options: PortfolioExportOptions): Promise<PortfolioExportData> {
    const allAssets = await this.assetService.getAssets();

    // Filter by categories if specified
    const filteredAssets =
      options.categories.length > 0
        ? allAssets.filter(asset => options.categories.includes(asset.category))
        : allAssets;

    // Calculate totals
    let totalInvested = 0;
    let totalValue = 0;

    const categoryValueMap = new Map<string, number>();

    const assetsData: AssetExportData[] = await Promise.all(
      filteredAssets.map(async asset => {
        const invested = asset.getTotalInvestedAmount();
        const currentValue = asset.getValue();
        const profitLoss = asset.getProfitLoss();
        const profitLossPercentage =
          invested > 0 && profitLoss !== undefined ? (profitLoss / invested) * 100 : undefined;
        const irr = asset.getIRR();

        totalInvested += invested;
        totalValue += currentValue ?? 0;

        // Track category values
        const categoryValue = categoryValueMap.get(asset.category) ?? 0;
        categoryValueMap.set(asset.category, categoryValue + (currentValue ?? 0));

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
        percentage: totalValue > 0 ? (value / totalValue) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);

    const totalProfitLoss = totalValue - totalInvested;
    const totalProfitLossPercentage =
      totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0;

    return {
      exportDate: new Date().toISOString().split('T')[0],
      totalInvested,
      totalValue,
      totalProfitLoss,
      totalProfitLossPercentage,
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
    lines.push(`| Total Invested | ${this.formatCurrency(data.totalInvested)} |`);
    lines.push(`| Current Value | ${this.formatCurrency(data.totalValue)} |`);
    lines.push(
      `| Total P&L | ${this.formatCurrency(data.totalProfitLoss)} (${this.formatPercentage(data.totalProfitLossPercentage)}) |`
    );
    lines.push('');

    // Category Allocation
    if (data.categoryBreakdown.length > 0) {
      lines.push('## Category Allocation');
      lines.push('| Category | Value | % of Portfolio |');
      lines.push('|----------|-------|----------------|');
      for (const cat of data.categoryBreakdown) {
        lines.push(
          `| ${cat.category} | ${this.formatCurrency(cat.value)} | ${cat.percentage.toFixed(1)}% |`
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
            ? `${this.formatCurrency(asset.profitLoss)} (${this.formatPercentage(asset.profitLossPercentage)})`
            : 'N/A';
        const irrDisplay = asset.irr !== undefined ? `${asset.irr.toFixed(1)}%` : 'N/A';
        const valueDisplay =
          asset.currentValue !== undefined ? this.formatCurrency(asset.currentValue) : 'N/A';
        const descDisplay = asset.description || '-';
        lines.push(
          `| ${asset.name} | ${descDisplay} | ${this.formatCurrency(asset.invested)} | ${valueDisplay} | ${plDisplay} | ${irrDisplay} |`
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
            `| ${asset.name} | ${this.formatCurrency(sip.amount)} | ${sip.frequency} |`
          );
        }
      }
      lines.push('');
    }

    // Footer
    lines.push('---');
    lines.push('*Use this data with an LLM (like Perplexity or ChatGPT) to get personalized investment insights based on current market conditions.*');

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
      const sipInfo = asset.activeSIPs
        .map(sip => `${sip.amount} ${sip.frequency}`)
        .join('; ');

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

  private formatCurrency(amount: number): string {
    return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
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
