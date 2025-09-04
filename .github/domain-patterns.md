# Wealth Management Domain Patterns

## Asset & Transaction Model

- **Assets** represent investable items (stocks, real estate, mutual funds, FDs, gold, etc.)
- **Transactions** track buy/sell activities with quantity (optional) and unit price
- **No Computed Storage** - Calculate portfolio metrics at runtime
- **Money-First Approach** - Always prioritize monetary tracking over quantity
- **Enhanced Valuation** - Assets support multiple valuation models via AssetValuationConfig

## Asset Valuation System

- **Market-Based Valuation** - Manual entry or API-driven current market values
- **Fixed Income Valuation** - Interest-rate based calculations with compounding
- **Maturity-Based Valuation** - Fixed return calculations for insurance policies
- **API Integration** - Automatic value fetching from external APIs
- **Flexible Configuration** - Each asset can use different valuation strategies

## SIP (Systematic Investment Plan) Model

- **Scheduled Asset Transactions** represent recurring investment plans for assets
- **Auto-Conversion Pattern** - Follows loan payment pattern for converting scheduled to actual transactions
- **Investment Frequency** - Support for monthly, quarterly, semi-annual, and annual investments
- **Progress Tracking** - Monitor total invested vs expected investment amounts
- **SIP Lifecycle Management** - Create, edit, pause/resume, and delete SIPs with transaction preservation options
- **Application Startup Auto-Conversion** - Automatically processes due SIPs when application opens

## Expense Tracking Model

- **Expenses** represent personal expenditures with categorization and analytics
- **Monthly Grouping** - Expenses are organized by month with expandable sections
- **Multi-Currency Support** - Expenses support different currencies using Currency enum
- **Category Classification** - Expenses are categorized (FOOD, TRANSPORT, HOUSING, etc.)
- **Essential vs Non-Essential** - Track whether expenses are essential or discretionary
- **Scheduled Expenses** - Recurring expenses that auto-generate actual expense records

## Scheduled Expense Model

- **Scheduled Expenses** represent recurring expense patterns for auto-generation of actual expenses
- **Auto-Generation Pattern** - Follows loan payment pattern for converting scheduled to actual expenses
- **Expense Frequency** - Support for daily, weekly, monthly, quarterly, semi-annual, and annual expenses
- **Application Startup Auto-Conversion** - Automatically processes due scheduled expenses when application opens
- **Optional End Date** - Scheduled expenses can run indefinitely or until a specified end date
- **Future-Only Editing** - Changes to scheduled expenses only affect future generated expenses
- **Clear Attribution** - Generated expenses include "Generated from: [Schedule Name]" in description

## Loan Management Model

- **Loans** represent borrowed money with payment tracking and financial analysis
- **Payment Schedule** - Automated generation of scheduled payments with configurable frequency
- **Payment Tracking** - Mark payments as paid/unpaid with overdue detection
- **IRR Analysis** - Advanced Internal Rate of Return calculations using Newton-Raphson method
- **Financial Metrics** - Comprehensive loan analytics including effective interest rates, risk assessment, and payment history
- **Payment-First Model** - Focus on actual payment tracking rather than theoretical schedules

## Goal Management Model

- **Goals** represent financial objectives with target amounts, maturity dates, and inflation adjustments
- **Asset-Goal Allocations** track percentage-based allocation of assets to specific goals
- **Progress Tracking** - Real-time calculation of goal achievement probability using asset IRR
- **Multi-Asset Support** - Single goals can have allocations from multiple assets
- **Currency Independence** - Goals have independent currency settings with future conversion support

## Business Rules

### Key Business Rules

1. **Store Raw Data Only** - Never store computed values that can be calculated
2. **Unit Price Storage** - Store unit price including fees, not separate fee fields
3. **Optional Quantity** - Some assets (FDs, bonds) don't have meaningful quantity concept
4. **Explicit Transaction Types** - Use `buy`/`sell` rather than positive/negative amounts
5. **Market Value Separation** - `currentMarketValue` is manually updated or API-fetched

### Expense Management Rules

1. **Monthly Organization** - Group expenses by month for historical analysis
2. **Currency Consistency** - Use Currency enum for standardized currency handling
3. **Category Classification** - Mandatory expense categorization for analytics
4. **Essential Tracking** - Distinguish between essential and discretionary spending
5. **Real-time Analytics** - Calculate monthly totals and trends dynamically

### Scheduled Expense Management Rules

1. **Schedule-First Approach** - Focus on scheduled expense tracking with automatic conversion to actual expenses
2. **Auto-Conversion Logic** - Convert due scheduled expenses to actual expenses on application startup
3. **Future-Only Editing** - When editing scheduled expenses, changes only affect future generated expenses
4. **Optional End Date** - Scheduled expenses can run indefinitely or until a specified end date
5. **Separate Management** - Dedicated "Scheduled Expenses" dialog for viewing and managing recurring expenses
6. **Clear Attribution** - Generated expenses show origin schedule in description for transparency
7. **Frequency Support** - Daily, weekly, monthly, quarterly, semi-annual, and yearly scheduling options

### Loan Management Rules

1. **Payment-First Approach** - Focus on actual payment tracking over theoretical calculations
2. **Automated Scheduling** - Generate payment schedules with configurable frequency (monthly, quarterly, etc.)
3. **IRR Calculation** - Use Newton-Raphson method for accurate Internal Rate of Return analysis
4. **Risk Assessment** - Categorize loans by risk level (LOW/MEDIUM/HIGH) based on payment history and rates
5. **Cash Flow Analysis** - Build comprehensive cash flow models for accurate financial metrics
6. **Overdue Detection** - Automatic identification of missed payments with aging analysis

### SIP Management Rules

1. **Schedule-First Approach** - Focus on scheduled investment tracking with automatic conversion to actual transactions
2. **Auto-Conversion Logic** - Convert due scheduled investments to actual transactions on application startup
3. **Edit with History** - When editing SIPs, automatically create actual transactions for past due dates
4. **Pause/Resume Capability** - Toggle SIP active status without losing configuration or transaction history
5. **Flexible Deletion** - Option to keep or remove existing transactions when deleting SIPs
6. **Progress Analytics** - Track total invested vs expected investment amounts with completion status
7. **Investment Frequency Support** - Monthly, quarterly, semi-annual, and annual scheduling options

### Goal Management Rules

1. **Simple Goal Structure** - Flat goal hierarchy without categories or sub-goals
2. **Static Percentage Allocation** - User-defined fixed percentages, no automatic adjustments
3. **Over-allocation Allowed** - Intentional buffer allocation beyond 100% for conservative planning
4. **Inflation-Adjusted Targeting** - Dynamic calculation of inflation-adjusted target amounts
5. **Progress Visualization** - Multi-color progress bars (green/yellow/red) based on achievement probability
6. **Asset Integration** - Simple count display showing goal allocation count per asset
7. **Currency Flexibility** - Independent goal currency with placeholder for future conversion logic
8. **Allocation Validation** - Strict 1-100% range validation with form submission blocking
9. **Real-time Updates** - Automatic progress recalculation when asset values change
10. **Clean Deletion** - Goal deletion removes all associated allocations without impact warnings

### Asset Management Rules

1. **Comprehensive Deletion** - Asset deletion removes associated transactions and scheduled investments (SIPs)
2. **Data Integrity** - Proper cleanup of all related data when assets are deleted
3. **User Confirmation** - Clear warnings about permanent deletion and data loss
4. **Streamlined UI** - Remove redundant actions (transaction creation available in transaction list dialog)

### Asset Valuation Rules

1. **Valuation Model Selection** - Every asset must have a valuation model (Market-Based, Fixed Income, or Maturity-Based)
2. **Market-Based Assets** - Support both manual value entry and API-driven automatic updates
3. **API Integration** - Store API path for automatic value fetching; calculate total value as holdings × unit price
4. **Fixed Income Assets** - Calculate value based on interest rate, compounding frequency, and optional maturity date
5. **Maturity-Based Assets** - Calculate value based on fixed maturity amount and maturity date
6. **Value Update Tracking** - Track when market values were last updated for transparency
7. **Model-Specific Fields** - Only show relevant configuration fields based on selected valuation model
8. **Default Initialization** - New assets default to Market-Based valuation model

## Portfolio Calculations (Runtime)

- **Total Invested** - Sum of (quantity × price) for all buy transactions minus sells
- **Current Holdings** - Sum of quantities bought minus quantities sold
- **Current Value** - Current holdings × current market value per unit
- **Profit/Loss** - Current value minus total invested amount

## Entity Evolution Pattern

Entities start as interfaces and evolve to classes:

```typescript
// Current: Interface with clean business fields
export interface IAsset {
  id?: number;
  name: string;
  description: string;
  category: AssetCategory;
  currency: string;
  currentMarketValue: number | undefined;
  valueUpdatedAt: Date | undefined;
  valuationConfig?: AssetValuationConfig;
}

// Domain class implementing the interface
export class Asset implements IAsset {
  constructor(/* all fields */) {
    this.validateName();
  }

  private validateName(): void {
    /* validation logic */
  }
  getTotalInvestedAmount(transactions: AssetTransaction[]): number {
    /* business logic */
  }
  getCurrentHoldings(transactions: AssetTransaction[]): number {
    /* business logic */
  }
  getProfitLoss(transactions: AssetTransaction[]): number | undefined {
    /* business logic */
  }
}
```
