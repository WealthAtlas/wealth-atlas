# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev              # Dev server at localhost:3000
pnpm build            # Production build
pnpm build:check      # TypeScript check + build
pnpm test:run         # Single test run
pnpm test             # Watch mode
pnpm lint             # ESLint (0 warnings allowed)
pnpm lint:fix         # Auto-fix ESLint issues
pnpm type-check       # TypeScript validation
pnpm quality          # type-check → lint → format:check (run before committing)
```

## Architecture

Wealth Atlas is a local-first React 18 PWA for personal wealth tracking. Stack: Vite, TypeScript, Material-UI, Dexie (IndexedDB). Strict DDD with three layers:

- `src/domain/` — Pure business logic. Entities (`entities/`), domain services (`services/`), utilities. No external dependencies.
- `src/data/` — Repository pattern over Dexie. Optional sync to a configurable AWS API (`VITE_SYNC_API_URL`).
- `src/app/` — React UI: containers, pages, dialogs, views, routing.

**Data flow:** Container → Service → Repository → Domain entity. Never skip a layer.

## Key Rules

**Container-presentational split (strict):**
- `*Container.tsx` — smart; fetches and mutates data via Services only, never repositories directly.
- `*Page.tsx`, `*Dialog.tsx`, `*View.tsx` — dumb; UI rendering only, no state or business logic.
- Large presentational components split into child views, each with its own container.

**Domain rules:**
- All portfolio/expense/asset calculations are runtime only — never stored in DB.
- Use existing domain classes; don't create new ones unless the domain model requires it.
- Use `Logger` utility instead of `console.*`.
- No custom CSS — Material-UI components exclusively.

**Testing:** Only complex domain logic (Vitest). Skip UI and repository tests.

## Domain Model Summary

Six bounded contexts: **Assets** (stocks, real estate, funds, FDs, gold — with three valuation strategies: market-based, fixed-income, maturity-based), **Transactions** (buy/sell with quantity + unit price), **SIPs** (scheduled recurring investments, auto-converted to transactions on startup), **Expenses** (categorised spending with essential/non-essential flag), **Scheduled Expenses** (recurring expenses, auto-generated on startup), **Loans** (payment schedules, overdue detection, IRR via Newton-Raphson), and **Goals** (percentage-based asset allocations, inflation-adjusted targets).

Extended domain patterns: `.github/domain-patterns.md`  
Technical standards (lint/TS config): `.github/technical-guide.md`  
Developer workflow: `.github/workflow-guide.md`
