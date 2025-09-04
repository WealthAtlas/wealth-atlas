src/
├── domain/ # Pure business logic (entities, services)
│ ├── entities/ # Organized by bounded context (assets/, expenses/, loans/, goals/, shared/)
│ ├── services/ # Domain services and business logic
│ └── utils/ # Domain utilities (Logger)
├── data/ # Data access layer (repositories, database)
└── app/ # Application layer (components, containers, routing)

# Wealth Atlas: Copilot & AI Agent Instructions

## For AI Agents: Start Here

**Project:** Wealth Atlas (React PWA, DDD, local-first, Material-UI)

**Key Rules:**

- Strict container-presentational pattern: Containers (`*Container.tsx`) handle data/business logic via Services only; Presentational components (`*Page.tsx`, `*Dialog.tsx`, `*View.tsx`) are UI-only, no state or logic.
- Never access repositories directly from containers—always go through a Service.
- Presentational components are grouped as `pages/`, `dialogs/`, and `views/`. Large UI? Split into child views, each with its own container.
- Always use existing domain classes; do not create new ones unless required by the domain model.
- No custom CSS—use Material-UI exclusively.
- Test only complex domain logic (Vitest); skip UI/repository tests.
- Use Logger utility, not `console.*`.
- All portfolio/expense/asset calculations are runtime only (never stored in DB).
- Use the provided scripts: `pnpm dev`, `pnpm build`, `pnpm test`, `pnpm run quality`.

**Project Structure:**

```
src/
  domain/   # Pure business logic (entities, services)
  data/     # Data access (repositories, DB)
  app/      # UI (components, containers, routing)
```

**Examples:**

```typescript
// Container (smart)
export const AssetViewContainer = () => {
  // fetches data via AssetService
  return <AssetView asset={asset} />;
};
// Presentational (dumb)
export const AssetView = ({ asset }: { asset: Asset }) => (
  <Card>{asset.name}</Card>
);
```

**For advanced patterns, anti-patterns, and deep dives, see the Extended Documentation below.**

### 1. **DDD Architecture (Strict Separation)**

- **Domain Layer** - Pure business logic, no external dependencies
- **Data Layer** - Repository pattern, use domain interfaces directly
- **Application Layer** - UI components and containers

### 2. **Strict Container-Presentational Pattern**

- **Containers (`*Container.tsx`)**: Smart components responsible for data fetching and business logic. **Containers must only access Services, never repositories directly.**
- **Presentational Components (`*Page.tsx`, `*Dialog.tsx`, `*View.tsx`)**: Dumb components for UI rendering only. **No state, business logic, or data access.**
- **Component Grouping**: Presentational components are grouped as `pages/`, `dialogs/`, and `views/`.
- **Child Views**: If a presentational component is large or separable, split into child views, each with its own container. Example: `AssetsContainer` → `AssetsPage` → `AssetViewContainer` → `AssetView`.
- **Domain Class Usage**: Always leverage existing domain classes; do not create new classes unless required by the domain model.

**Summary:**

- Containers → Services → Repositories → Domain
- Presentational components → UI only, no logic
- Never bypass the service layer from containers

**Examples:**

```typescript
// Container (smart)
export const AssetViewContainer = () => {
  // fetches data via AssetService
  return <AssetView asset={asset} />;
};

// Presentational (dumb)
export const AssetView = ({ asset }: { asset: Asset }) => (
  <Card>{asset.name}</Card>
);
```

### 3. **Strategic Testing**

---

## Extended Documentation Index

- **Domain Patterns** (`.github/domain-patterns.md`):
  - Wealth management domain models (assets, transactions, SIPs, expenses)
  - Valuation strategies, recurring patterns, and money-first approach
- **Technical Guide** (`.github/technical-guide.md`):
  - Linting, formatting, and TypeScript config standards
  - Prettier/ESLint/TS settings and quality scripts
- **Workflow Guide** (`.github/workflow-guide.md`):
  - Developer scripts, commit workflow, and repository pattern usage
  - Standard CRUD, mapping, and code quality enforcement

Refer to these files for deep dives into domain logic, technical standards, and day-to-day development workflow.

---

## AI Coding Mindset

- Think holistically: consider business value, user experience, and application integration.
- Ask clarifying questions if requirements seem incomplete.
- Propose enhancements that align with user needs and application consistency.

**Goal:** Deliver complete, polished features that feel native to the application with minimal revision cycles.
