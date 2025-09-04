# Technical Guide

## Code Quality Standards

### ESLint Configuration

- Uses **ESLint 9.x** with **flat config** (`eslint.config.mjs`)
- TypeScript + React + Prettier integration
- Strict rules for clean code, no unused variables, prefer const over var
- React-specific rules with React 18.3 settings

### Prettier Formatting

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "endOfLine": "lf",
  "arrowParens": "avoid",
  "bracketSpacing": true,
  "jsxSingleQuote": false
}
```

### TypeScript Configuration

- **Strict mode enabled** with comprehensive linting rules
- **ES2020 target** with modern JavaScript features
- **Path mapping** configured (`@/*` → `src/*`)
- **React JSX transform** for automatic React imports

### Quality Scripts

- `pnpm run quality` - Runs type-check, lint, and format:check
- `pnpm run lint:fix` - Auto-fix ESLint issues
- `pnpm run format` - Auto-format code with Prettier
- `pnpm test` - Run unit tests with Vitest
- `pnpm test:ui` - Run tests with interactive UI
- `pnpm test:run` - Run tests once without watch mode

## Database Design Patterns

1. **Simple Schema** - Direct use of domain interfaces without audit fields
2. **Schema Versioning** - Proper Dexie version management for database migrations
3. **Domain Interface as Schema** - Use `IAsset`, `IAssetTransaction` directly as Dexie table types
4. **Personal Use Focus** - No monitoring or audit trails needed for single-user app

## File Naming Conventions

### Directory Structure

- **PascalCase** for components: `HomePage.tsx`, `HomeContainer.tsx`
- **camelCase** for utilities and hooks: `useAuth.ts`, `database.ts`
- **PascalCase** for entities and records: `Asset.ts`, `AssetRecord.ts`

### Component Organization

- **Forms** (`src/app/components/Forms/`) - Reusable form dialog components
  - `AssetFormDialog.tsx` - Asset creation/editing form
  - `TransactionFormDialog.tsx` - Transaction creation/editing form
  - `ExpenseFormDialog.tsx` - Expense creation/editing form
  - `ScheduledExpenseFormDialog.tsx` - Scheduled expense creation/editing form
  - `LoanFormDialog.tsx` - Loan creation/editing form
  - `PaymentFormDialog.tsx` - Payment creation/editing form
- **Dialogs** (`src/app/components/Dialogs/`) - Modal dialog components
  - `TransactionListDialog.tsx` - Transaction listing and management
  - `ScheduledExpenseListDialog.tsx` - Scheduled expense listing and management
  - `PaymentListDialog.tsx` - Payment listing and management
  - `IRRAnalysisDialog.tsx` - Detailed IRR analysis display
- **Pages** (`src/app/components/Pages/`) - Page-level presentational components
- **Containers** (`src/app/containers/`) - Smart components with business logic
  - `AssetsContainer.tsx` - Main orchestration for assets and transactions
  - `TransactionFormContainer.tsx` - Transaction form business logic
  - `TransactionListContainer.tsx` - Transaction list business logic
  - `ExpensesContainer.tsx` - Expense management and analytics
  - `ExpenseFormContainer.tsx` - Expense form business logic
  - `ScheduledExpenseContainer.tsx` - Scheduled expense management and orchestration
  - `LoansContainer.tsx` - Loan management and IRR analysis orchestration
  - `LoanFormContainer.tsx` - Loan form business logic
  - `PaymentFormContainer.tsx` - Payment form business logic
  - `PaymentListContainer.tsx` - Payment list business logic

### Import Organization

1. React and external libraries first
2. Internal domain imports
3. Internal data layer imports
4. Relative imports last
5. Use path mapping `@/*` when beneficial

### Domain Import Patterns

With the organized domain structure, use these import patterns:

```typescript
// Asset domain imports
import { Asset } from '@/domain/entities/assets/Asset';
import { AssetCategory } from '@/domain/entities/assets/AssetCategory';
import { AssetTransaction } from '@/domain/entities/assets/AssetTransaction';
import { AssetValuationConfig } from '@/domain/entities/assets/AssetValuationConfig';
import { AssetPricingModel } from '@/domain/entities/assets/AssetPricingModel';
import { CompoundingFrequency } from '@/domain/entities/assets/CompoundingFrequency';

// Expense domain imports
import { Expense } from '@/domain/entities/expenses/Expense';
import { ExpenseCategory } from '@/domain/entities/expenses/ExpenseCategory';
import { ScheduledExpense } from '@/domain/entities/expenses/ScheduledExpense';

// Loan domain imports
import { Loan } from '@/domain/entities/loans/Loan';
import { LoanPayment } from '@/domain/entities/loans/LoanPayment';
import { PaymentSchedule } from '@/domain/entities/loans/PaymentSchedule';
import { PaymentFrequency } from '@/domain/entities/loans/PaymentFrequency';

// Goal domain imports
import { Goal } from '@/domain/entities/goals/Goal';
import { AssetGoalAllocation } from '@/domain/entities/goals/AssetGoalAllocation';

// Shared domain imports
import { Currency } from '@/domain/entities/shared/Currency';

// Domain services
import { PortfolioService } from '@/domain/services/PortfolioService';
import { IRRAnalysisService } from '@/domain/services/IRRAnalysisService';
import { GoalPlanningService } from '@/domain/services/GoalPlanningService';
import { ScheduledExpenseService } from '@/domain/services/ScheduledExpenseService';
import { AssetValuationService } from '@/domain/services/AssetValuationService';
import { AssetApiValuationService } from '@/domain/services/AssetApiValuationService';

// Utilities (for logging and other cross-cutting concerns)
import { Logger } from '@/domain/utils/Logger';
```

### Logging Standards

- **Use Logger Utility** - Import and use `Logger` from `@/domain/utils/Logger` instead of direct `console.*` calls
- **Centralized Logging** - The Logger utility centralizes all logging and satisfies ESLint no-console rules
- **Available Methods** - Use `Logger.error()`, `Logger.warn()`, `Logger.info()`, and `Logger.log()` for all logging needs
- **Lint Compliance** - Logger utility has the necessary ESLint disable comment to allow console usage in one place

## Testing Patterns

The project follows strategic testing focused on complex business logic:

1. **Test Structure** - Place tests in `__tests__` folders adjacent to source files
   - `src/domain/services/__tests__/` for service logic tests
   - Use descriptive test names that explain business scenarios
2. **Test Content Focus**:
   - **Financial Calculations** - IRR analysis, Newton-Raphson convergence, loan metrics
   - **Business Logic Validation** - Entity validation, payment scheduling, expense scheduling, risk assessment
   - **Edge Cases** - Small amounts, overpayments, future dates, invalid data, infinite recurring schedules
3. **Test Organization**:
   - Group related tests with `describe` blocks
   - Use `beforeEach` for common test setup
   - Test both success and failure scenarios
   - Include edge cases and boundary conditions
4. **Vitest Configuration**:
   - Integrated with Vite for fast test execution
   - Global test utilities available
   - Support for TypeScript without additional configuration

## Sync (Encrypted, Local-First)

Goal: simple, maintenance-first encrypted sync for a personal app.

- Model: client-only encryption/decryption; server stores opaque blobs.
- Conflict: last-writer-wins (no server-side conflict logic, no compression, no client history).
- Passphrase: derive key via PBKDF2-SHA256; never store passphrase.

Implementation locations:

- `src/data/sync/crypto.ts` – Web Crypto helpers (PBKDF2-SHA256 + AES-256-GCM)
- `src/data/sync/SyncService.ts` – export/import Dexie snapshot, encrypt/decrypt, call API
- `src/data/sync/types.ts` – Snapshot, SyncStatus, RemoteDataResponse
- `src/data/sync/state.ts` – localStorage helpers: keyId, lastRemoteVersion, lastSyncAt

Snapshot payload (encrypted JSON):

- `{ schemaVersion: <Dexie version>, data: { assets, assetTransactions, scheduledAssetTransactions, expenses, scheduledExpenses, loans, paymentSchedules, loanPayments, goals, assetGoalAllocations } }`
- Uses current Dexie `database.ts` version (e.g., 7). Import clears then bulkPut in dependency order.

Crypto meta (stored with payload, non-secret):

- `{ enc: 'AES-GCM', kdf: 'PBKDF2-SHA256', iterations: ~250000, salt: base64(16B), iv: base64(12B), schemaVersion }`

API contract (last-writer-wins):

- `POST /data` → create dataset; returns `{ keyId, version: 1 }`
- `GET /data/:keyId` → latest `{ keyId, version, payload, meta, updatedAt }`
- `PUT /data/:keyId` → store `{ payload, meta }`, server increments version; returns `{ keyId, version }`
- `DELETE /data/:keyId` (optional) → remove dataset

Settings UI (container-presentational):

- Presentational: `SettingsPage.tsx` renders sync controls (Setup, Link, Push, Pull, Change Passphrase, Unlink)
- Container: `SettingsContainer.tsx` calls `SyncService` and shows simple alerts on errors

Config & Hosting:

- Frontend: static on GitHub Pages.
- Backend: host API separately (e.g., Cloudflare Workers). Set API base URL in a small config if not `/data`.

## PWA Configuration

- Uses `vite-plugin-pwa` for service worker generation
- Auto-update registration type
- Workbox for caching strategies

## VS Code Integration

- **Auto-format on save** with Prettier
- **ESLint integration** with auto-fix on save
- **Consistent indentation** (2 spaces, no tabs)
- **Import organization** on save
