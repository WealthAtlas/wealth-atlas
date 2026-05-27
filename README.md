# Wealth Atlas

A local-first personal wealth tracking PWA. Track your investments, expenses, loans, and financial goals — all in your browser, with optional cloud sync.

## What it does

Wealth Atlas gives you a unified view of your financial life across six domains:

**Assets & Investments**  
Track stocks, mutual funds, fixed deposits, real estate, and gold. Each asset type uses the right valuation strategy — market-based pricing for equities, fixed-income for FDs, and maturity-based for structured products. Buy/sell transactions are recorded with quantity and unit price; portfolio value is computed at runtime, never stored.

**SIPs (Systematic Investment Plans)**  
Define recurring investments once. On startup, pending SIPs are automatically converted into transactions so your portfolio stays current without manual entry.

**Expenses**  
Log spending with categories and an essential/non-essential flag. Scheduled (recurring) expenses are auto-generated on startup from a separate recurring-expense schedule.

**Loans**  
Track loan payment schedules, detect overdue EMIs, and compute IRR using Newton-Raphson — useful for comparing actual loan cost against the stated rate.

**Goals**  
Map assets to named financial goals with percentage-based allocations. Targets are inflation-adjusted so you're planning in real terms.

**Dashboard**  
An aggregated view across all domains — portfolio value, allocation breakdown, recent activity, and goal progress.

## Tech stack

- **React 18** + **TypeScript 5** — UI and type safety
- **Vite** — fast dev server and build
- **Material-UI** — component library (no custom CSS)
- **Dexie (IndexedDB)** — local-first storage
- **PWA** — installable, offline-capable
- **AWS API (optional)** — sync layer behind `VITE_SYNC_API_URL`

## Architecture

Strict DDD with three layers — domain → data → app. Domain logic is pure TypeScript with no framework dependencies; the repository layer sits over Dexie with an optional sync adapter; React containers consume domain services only, never repositories directly.

## Quick start

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Dev server |
| `pnpm build` | Production build |
| `pnpm build:check` | TypeScript check + build |
| `pnpm test:run` | Single test run |
| `pnpm test` | Watch mode |
| `pnpm lint` | ESLint (0 warnings allowed) |
| `pnpm lint:fix` | Auto-fix ESLint issues |
| `pnpm type-check` | TypeScript validation |
| `pnpm quality` | type-check → lint → format:check |

## Sync configuration (optional)

```bash
cp .env.example .env.local
# Then set in .env.local:
VITE_SYNC_API_URL=https://your-api-endpoint.com
```

If unset, defaults to the bundled dev endpoint.
