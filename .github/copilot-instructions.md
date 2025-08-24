# GitHub Copilot Instructions for Wealth Atlas

## Quick Reference

**Wealth Atlas** is a local-first React PWA for wealth management built with Domain-Driven Design (DDD) architecture.

### Core Stack

- **React 18.3** + **TypeScript 5** + **Vite** + **Material-UI v5**
- **Dexie v4** (IndexedDB) + **React Router v6** + **Vitest**
- **pnpm** - Package manager (`packageManager: "pnpm@9.0.0"`)

### Architecture Overview

```
src/
├── domain/           # Pure business logic (entities, services)
│   ├── entities/     # Organized by bounded context (assets/, expenses/, loans/, goals/, shared/)
│   ├── services/     # Domain services and business logic
│   └── utils/        # Domain utilities (Logger)
├── data/             # Data access layer (repositories, database)
└── app/              # Application layer (components, containers, routing)
```

## Essential Principles

### 1. **DDD Architecture (Strict Separation)**

- **Domain Layer** - Pure business logic, no external dependencies
- **Data Layer** - Repository pattern, use domain interfaces directly
- **Application Layer** - UI components and containers

### 2. **Container-Presentational Pattern**

- **Container.tsx** - Smart components (data fetching, business logic)
- **Page.tsx** - Pure presentational components (UI rendering only)
- **Clear Responsibilities** - Containers never handle presentation, components never handle data

### 3. **Strategic Testing**

- **Test Complex Logic Only** - IRR calculations, financial metrics, domain services
- **Skip Presentation/Data** - No UI component or repository tests
- **Use Vitest** - Fast unit testing with TypeScript support

### 4. **Material-UI Only**

- **No Custom CSS** - Use Material-UI's styling solutions exclusively
- **Theme System** - Leverage Material-UI's theming for consistency

### 5. **Domain Service Input Pattern**

- **Service methods should accept only IDs (not full domain objects)**
- **Services must fetch required data internally using repositories**
- **Prevents leaking data-fetching responsibility to consumers**

## Critical Development Patterns

### Domain Service Input Example

```typescript
// BAD: Service expects full Asset object from consumer
async updateAssetValueFromApi(asset: Asset, ...)

// GOOD: Service expects only assetId and fetches Asset internally
async updateAssetValueFromApi(assetId: number, ...)
```

// Always inject repositories into services that need to fetch data.

### Repository Pattern

```typescript
export class AssetRepository {
  private toDomain(record: IAsset): Asset {
    /* map to domain */
  }
  private toRecord(asset: Asset): Omit<IAsset, 'id'> {
    /* map to record */
  }

  async findAll(): Promise<Asset[]> {
    /* ... */
  }
  async save(asset: Asset): Promise<Asset> {
    /* ... */
  }
}
```

### Container-Component Structure

```typescript
// Container: Smart component
export const AssetsContainer = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  // Data fetching and business logic
  return <AssetsPage assets={assets} onAdd={handleAdd} />;
};

// Component: Pure presentation
export const AssetsPage = ({ assets, onAdd }: Props) => {
  // UI rendering only
  return <MaterialUIComponents />;
};
```

### Domain Import Patterns

```typescript
// Asset domain
import { Asset } from '@/domain/entities/assets/Asset';
import { AssetTransaction } from '@/domain/entities/assets/AssetTransaction';

// Shared domain
import { Currency } from '@/domain/entities/shared/Currency';

// Services
import { PortfolioService } from '@/domain/services/PortfolioService';

// Utilities
import { Logger } from '@/domain/utils/Logger';
```

## Essential Anti-Patterns

❌ **Critical Don'ts:**

- Import external libraries in domain entities
- Use `any` type without justification
- Put business logic in React components
- Write custom CSS instead of Material-UI
- Store computed values in database (calculate at runtime)
- Use direct `console.*` calls (use Logger utility)
- Mix transaction management logic across containers
- Skip dialog state coordination in parent containers

✅ **Critical Do's:**

- Keep domain layer pure from external dependencies
- Use repository pattern for all data access
- Separate concerns between containers and components
- Calculate portfolio metrics at runtime from raw data
- Use Currency enum for all currency fields
- Follow container-presentational pattern strictly
- Use Logger utility for all logging needs

## Quick Development Flow

### Adding New Features

1. **Start with Domain** - Define entities and business logic first
2. **Implement Repository** - Handle data access with proper mapping
3. **Build Container** - Create smart component for business logic
4. **Add Presentation** - Create pure component for UI rendering
5. **Update Router** - Add new routes if needed

### Quality Checks

```bash
pnpm run quality  # Type-check, lint, format:check
pnpm test         # Run unit tests
pnpm dev          # Start development server
```

### File Naming

- **PascalCase** for components: `HomePage.tsx`, `HomeContainer.tsx`
- **camelCase** for utilities: `database.ts`, `useAuth.ts`
- **Organized imports**: React → external → domain → data → relative

## Main Layout Integration

All primary pages use `MainContainer` and `MainLayout`:

- Routes through `MainContainer` for dashboard, assets, loans, expenses, goals
- Consistent padding: `sx={{ p: 3, pb: 10 }}`
- FAB positioning: `{ position: 'fixed', bottom: 80, right: 16 }`

## Extended Documentation

For detailed patterns and domain-specific guidance:

- **Domain Patterns**: `.github/domain-patterns.md`
- **Technical Guide**: `.github/technical-guide.md`
- **Workflow Guide**: `.github/workflow-guide.md`

## AI Coding Mindset

**Think Holistically** - Consider business value, user experience, and application integration. Ask clarifying questions if requirements seem incomplete. Propose enhancements that align with user needs and application consistency.

**Goal: Deliver complete, polished features that feel native to the application with minimal revision cycles.**
