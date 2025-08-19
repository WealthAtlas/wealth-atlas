import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Asset } from '../../entities/assets/Asset';
import { AssetCategory } from '../../entities/assets/AssetCategory';
import { AssetPricingModel } from '../../entities/assets/AssetPricingModel';
import { AssetTransaction } from '../../entities/assets/AssetTransaction';
import { CompoundingFrequency } from '../../entities/assets/CompoundingFrequency';
import { AssetValuationService } from '../AssetValuationService';

describe('AssetValuationService', () => {
  const baseDate = new Date('2023-01-01');
  const currentDate = new Date('2024-01-01'); // One year later

  beforeAll(() => {
    // Mock the current date for consistent testing
    vi.useFakeTimers();
    vi.setSystemTime(currentDate);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  describe('Fixed Income Assets', () => {
    it('should calculate correct value for fixed deposit with 8% annual interest', () => {
      const asset = new Asset(
        1,
        'FD 1-Year',
        '8% Fixed Deposit',
        AssetCategory.FIXED_DEPOSITS,
        'USD',
        undefined,
        undefined,
        {
          pricingModel: AssetPricingModel.FIXED_INCOME,
          interestRate: 8.0,
          compoundingFrequency: CompoundingFrequency.QUARTERLY,
        }
      );

      const transactions = [new AssetTransaction(1, 1, 'buy', 1, 10000, baseDate)];

      const result = AssetValuationService.calculateCurrentValue(asset, transactions);

      expect(result.isCalculated).toBe(true);
      expect(result.currentValue).toBeCloseTo(10824.32, 2); // 10000 * (1 + 0.08/4)^(4*1)
      expect(result.growthRate).toBe(8.0);
    });

    it('should handle maturity date correctly', () => {
      const maturityDate = new Date('2023-06-01'); // 6 months from base date

      const asset = new Asset(
        2,
        'Short FD',
        'FD with early maturity',
        AssetCategory.FIXED_DEPOSITS,
        'USD',
        undefined,
        undefined,
        {
          pricingModel: AssetPricingModel.FIXED_INCOME,
          interestRate: 10.0,
          compoundingFrequency: CompoundingFrequency.ANNUALLY,
          maturityDate,
        }
      );

      const transactions = [new AssetTransaction(1, 2, 'buy', 1, 5000, baseDate)];

      const result = AssetValuationService.calculateCurrentValue(asset, transactions);

      expect(result.isCalculated).toBe(true);
      // Should be calculated only until maturity date (6 months), not full year
      expect(result.currentValue).toBeCloseTo(5247.3, 2); // 5000 * (1.10)^0.5
    });
  });

  describe('Maturity-Based Assets', () => {
    it('should calculate correct value for insurance policy', () => {
      const maturityDate = new Date('2025-01-01'); // 2 years from base date

      const asset = new Asset(
        3,
        'Life Insurance',
        'Endowment Policy',
        AssetCategory.INSURANCE_POLICIES,
        'USD',
        undefined,
        undefined,
        {
          pricingModel: AssetPricingModel.MATURITY_BASED,
          maturityAmount: 20000,
          maturityDate,
        }
      );

      const transactions = [new AssetTransaction(1, 3, 'buy', 1, 15000, baseDate)];

      const result = AssetValuationService.calculateCurrentValue(asset, transactions);

      expect(result.isCalculated).toBe(true);
      // After 1 year out of 2 years, should be halfway between 15000 and 20000
      expect(result.currentValue).toBeCloseTo(17500, 2);
      expect(result.growthRate).toBeCloseTo(15.47, 2); // Annualized growth rate
    });

    it('should return maturity amount after maturity date', () => {
      const maturityDate = new Date('2023-06-01'); // 6 months ago (in the past)

      const asset = new Asset(
        4,
        'Matured Policy',
        'Already matured',
        AssetCategory.INSURANCE_POLICIES,
        'USD',
        undefined,
        undefined,
        {
          pricingModel: AssetPricingModel.MATURITY_BASED,
          maturityAmount: 25000,
          maturityDate,
        }
      );

      const transactions = [new AssetTransaction(1, 4, 'buy', 1, 20000, baseDate)];

      const result = AssetValuationService.calculateCurrentValue(asset, transactions);

      expect(result.isCalculated).toBe(true);
      expect(result.currentValue).toBe(25000);
    });
  });

  describe('Market-Based Assets', () => {
    it('should calculate IRR for stock investments', () => {
      const asset = new Asset(
        5,
        'AAPL Stock',
        'Apple Inc.',
        AssetCategory.STOCKS,
        'USD',
        150, // Current market value per share
        new Date(),
        {
          pricingModel: AssetPricingModel.MARKET_BASED,
        }
      );

      const transactions = [
        new AssetTransaction(1, 5, 'buy', 100, 100, baseDate), // Bought 100 shares at $100
      ];

      const result = AssetValuationService.calculateCurrentValue(asset, transactions);

      expect(result.isCalculated).toBe(false);
      expect(result.currentValue).toBe(15000); // 100 shares * $150
      expect(result.growthRate).toBeGreaterThan(40); // Should show significant growth
    });

    it('should handle assets without transactions', () => {
      const asset = new Asset(
        6,
        'Empty Asset',
        'No transactions',
        AssetCategory.STOCKS,
        'USD',
        100,
        new Date()
      );

      const result = AssetValuationService.calculateCurrentValue(asset, []);

      expect(result.currentValue).toBe(100);
      expect(result.growthRate).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle assets without pricing config', () => {
      const asset = new Asset(
        7,
        'Legacy Asset',
        'No pricing config',
        AssetCategory.OTHER,
        'USD',
        5000,
        new Date()
      );

      const result = AssetValuationService.calculateCurrentValue(asset, []);

      expect(result.isCalculated).toBe(false);
      expect(result.currentValue).toBe(5000);
      expect(result.calculatedValue).toBeUndefined();
    });

    it('should handle missing required fields gracefully', () => {
      const asset = new Asset(
        8,
        'Incomplete FD',
        'Missing interest rate',
        AssetCategory.FIXED_DEPOSITS,
        'USD',
        1000,
        new Date(),
        {
          pricingModel: AssetPricingModel.FIXED_INCOME,
          // Missing interestRate
        }
      );

      const result = AssetValuationService.calculateCurrentValue(asset, []);

      expect(result.isCalculated).toBe(false);
      expect(result.currentValue).toBe(1000); // Falls back to manual value
    });
  });
});
