# Development Workflow Guide

## Scripts Usage

- `pnpm dev` - Start development server (localhost:3000)
- `pnpm build` - Production build with TypeScript compilation
- `pnpm test` - Run unit tests in watch mode
- `pnpm test:ui` - Run tests with interactive Vitest UI
- `pnpm test:run` - Run tests once without watch mode
- `pnpm run quality` - **Run before commits** to ensure code quality
- `pnpm run lint:fix && pnpm run format` - Auto-fix common issues

## Development Patterns

### Repository Pattern Implementation

Follow the simplified repository pattern using domain interfaces directly:

```typescript
export class AssetRepository {
  // Private mapping methods for DRY principle
  private toDomain(record: IAsset): Asset {
    return new Asset(/* map all business fields */);
  }
  private toRecord(asset: Asset): Omit<IAsset, 'id'> {
    return {
      /* only business fields */
    };
  }

  // Standard CRUD operations
  async findAll(): Promise<Asset[]> {
    /* ... */
  }
  async findById(id: number): Promise<Asset | null> {
    /* ... */
  }
  async save(asset: Asset): Promise<Asset> {
    /* ... */
  }
  async delete(id: number): Promise<void> {
    /* ... */
  }
}
```

### Transaction Management Pattern

The project implements a comprehensive transaction management system:

1. **Transaction Creation/Editing** - `TransactionFormDialog.tsx` + `TransactionFormContainer.tsx`
   - Supports both add and edit modes via `transactionToEdit` prop
   - Form pre-populates when editing existing transactions
   - Handles validation and business logic in container
2. **Transaction Listing** - `TransactionListDialog.tsx` + `TransactionListContainer.tsx`
   - Displays all transactions for a specific asset
   - Provides actions for editing and deleting transactions
   - Handles data loading and management operations
3. **Multi-Dialog Coordination** - `AssetsContainer.tsx`
   - Orchestrates between asset forms, transaction forms, and transaction lists
   - Manages state transitions between dialogs (e.g., from list to edit form)
   - Ensures data consistency across all operations

### Component Interaction Patterns

- **Form Dialog Pattern** - Reusable forms that support both create and edit modes
- **List Management Pattern** - Dedicated containers for complex list operations
- **Dialog Orchestration** - Parent containers coordinate multiple dialog states
- **Data Flow** - Containers handle all data operations, components handle presentation

### UI Layout Patterns

The project follows consistent layout patterns across all main pages:

1. **Main Layout Integration** - All primary pages must render through `MainContainer` and `MainLayout`
   - Routes in `AppRouter.tsx` should use `MainContainer` for dashboard, assets, loans, expenses, and goals
   - This ensures consistent app bar, bottom navigation, and page structure
   - Settings and utility pages can use direct containers for full-screen experiences

2. **Page Container Standards** - All main pages follow consistent styling patterns
   - Container padding: `sx={{ p: 3, pb: 10 }}` (3 units padding, 10 bottom for nav clearance)
   - Loading states: Centered `CircularProgress` with `height: 'calc(100vh - 200px)'`
   - Page headers: `Typography variant="h4" component="h1"` with consistent title naming

3. **Floating Action Button (FAB)** - Primary actions use consistent FAB placement
   - Position: `{ position: 'fixed', bottom: 80, right: 16 }` (above bottom navigation)
   - Use for main page actions (Add Asset, Create Goal, etc.)
   - Supplement empty state CTAs rather than replace them

4. **Tab State Synchronization** - `MainPage` maintains navigation state consistency
   - Tab selection syncs with URL changes via `useEffect` on `location.pathname`
   - Enables deep linking and proper navigation state for direct page access
   - Router navigation updates both URL and tab selection simultaneously

### Loan Management Pattern

The project implements a comprehensive loan management system:

1. **Loan Creation/Editing** - `LoanFormDialog.tsx` + `LoanFormContainer.tsx`
   - Supports both add and edit modes with loan validation
   - Handles principal amount, interest rates, and payment schedules
   - Integrates with automated payment generation
2. **Payment Management** - `PaymentFormDialog.tsx` + `PaymentListDialog.tsx`
   - Track individual payments with paid/unpaid status
   - Automatic overdue detection and aging analysis
   - Support for manual payment entry and bulk operations
3. **IRR Analysis** - `IRRAnalysisDialog.tsx` + `IRRAnalysisService.ts`
   - Advanced Internal Rate of Return calculations using Newton-Raphson method
   - Risk assessment with LOW/MEDIUM/HIGH categorization
   - Interactive displays with progressive disclosure (card → tooltip → detailed dialog)
   - Comprehensive financial metrics including EAR, monthly rates, and reliability scoring
4. **Payment Scheduling** - `PaymentSchedule` entity with automated generation
   - Configurable payment frequencies (monthly, quarterly, etc.)
   - Automatic conversion of scheduled to actual payments
   - Smart date handling with business day adjustments

## When Adding New Features

1. **Start with Domain** - Define entities and business logic first
2. **Extend Interface** - Add optional database fields to domain interface if needed
3. **Implement Repository** - Handle data access with proper mapping
4. **Build Container** - Create smart component for business logic
5. **Add Presentation** - Create pure component for UI rendering
6. **Update Router** - Add new routes if needed

## When Refactoring

1. **Preserve Architecture** - Maintain DDD boundaries
2. **Extract Business Logic** - Move from containers to domain entities
3. **Apply DRY Principle** - Use private methods for common patterns
4. **Update Tests** - Ensure quality scripts pass

## When Debugging

1. **Check Quality** - Run `pnpm run quality` first
2. **Verify Timestamps** - Database hooks should auto-manage timestamps
3. **Validate Mapping** - Ensure repository mapping between domain/records
4. **Review Dependencies** - Domain should not depend on external libraries

## Code Review Checklist

- [ ] Follows DDD architecture principles
- [ ] Uses established container-presentational pattern
- [ ] Includes proper TypeScript types
- [ ] Has private mapping methods in repositories
- [ ] Uses domain interfaces directly (no separate record types)
- [ ] Passes `pnpm run quality` checks
- [ ] Uses consistent naming conventions
- [ ] Maintains clean import organization
