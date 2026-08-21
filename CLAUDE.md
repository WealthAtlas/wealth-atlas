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

- `src/domain/` — Pure business logic. Entities (`entities/`), domain services (`services/`), validation (`validation/`), AI import logic (`import/`), utilities. No external dependencies.
- `src/data/` — Repository pattern over Dexie. Schema migrations (`migrations/`), optional sync to a configurable AWS API (`VITE_SYNC_API_URL`), LLM provider transport (`llm/`).
- `src/app/` — React UI: containers, pages, dialogs, views, providers, routing.

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
- Entity validation lives in `src/domain/validation/`, never inline in a dialog — forms and the AI importer share the same rules.
- Report user-visible failures through `useNotification()`; `Logger` is for diagnostics only. No `alert()`.

**Persistence invariants:**
- `Currency` is stored as an ISO code (`INR`), never a symbol. Symbols come from `CURRENCY_SYMBOLS`/`getCurrencySymbol`.
- `IInvestment.totalAmount` is the **total** transaction value and is always positive; buy/sell direction lives in `type` (see `Investment.getSignedAmount`).
- Any change to a persisted row shape needs a Dexie `version()` bump in `src/data/database.ts`, a transform in `src/data/migrations/`, a `SNAPSHOT_VERSION` bump in `src/data/sync/Syncer.ts`, and a `BACKUP_VERSION` bump in `BackupService` — all four, or a sync/restore will corrupt data.
- Rows arriving via JSON (backup, sync snapshot) must go through `rehydrateSnapshotDates` before being written; otherwise Date columns land as strings.
- Every preference the Settings page edits lives in the `settings` singleton (`ISettings`), so it travels through sync and backup: base currency, the currency list (rates in `currencyRates`), and the AI provider config (`settings.ai`). Only the sync identity itself is device-local — key id, passphrase, auto-sync toggle in `src/data/sync/state.ts`. `settings.ai.apiKey` is the one exception to symmetry: it rides the encrypted sync snapshot but `BackupService` strips it from the export, because that file is plaintext on the user's disk.
- `src/data/llm/state.ts` reads `settings.ai` from a synchronous in-memory cache filled in Dexie's `ready` handler. Any code path that replaces the settings row (sync pull, backup restore) must call `hydrateAiProviderSettings()` afterwards.
- `AutoSyncService.startListening()` hooks a hardcoded table list. A new table has to be added there too, or edits to it never wake a push.

**Testing:** Only complex domain logic (Vitest). Skip UI and repository tests. Schema migrations are covered too — they are pure and high-risk.

## Domain Model Summary

Six bounded contexts: **Assets** (stocks, real estate, funds, FDs, gold — with three valuation strategies: market-based, fixed-income, maturity-based), **Transactions** (buy/sell, quantity + total amount), **SIPs** (scheduled recurring investments, auto-converted to transactions on startup), **Expenses** (categorised spending with essential/non-essential flag), **Loans** (payment schedules via EMIs, overdue detection, IRR via Newton-Raphson), and **Goals** (percentage-based asset allocations, inflation-adjusted targets).

**Assistant (`src/domain/chat/`)** — an in-app chat that answers questions about the user's own
records and suggests next steps, using the provider configured for AI import. It reads through a
registry of tools (`ChatTools.ts`) built on the same domain services the pages use, so a figure it
quotes matches the page that shows it. The prompt's tool catalogue is generated from the registry
(`ChatPromptBuilder.ts`), the way `ImportPromptBuilder` generates its enum lists — adding a tool
needs no prompt edit. Multi-turn transport is `chatJsonTurns` in `src/data/llm/LlmClient.ts`; the
agent loop is `ChatLoop.ts`, pure apart from an injected transport so it is testable without a
network. Conversations are in-memory only, deliberately: nothing is persisted, so no Dexie version
bump. There is **no income entity**, so surplus cannot be computed — the assistant reasons from
committed SIP/EMI outflow, spending and goal shortfalls, and asks the user for the amount available.

The assistant has no route of its own. It opens as a 92dvh bottom sheet (`ChatSheetView`) whose
state lives in `MainPage`, so the tab underneath stays mounted and dismissing returns the user
where they were with no refetch; the "Ask" FAB in `MainLayout` is the only way in. Replies render
through a hand-written markdown subset (`MarkdownBlocks.ts` → `ChatMarkdownView`) rather than a
library — `react-markdown` and `marked` are both 403 on this project's registry, and a full
renderer would allow HTML passthrough from model output. Names of the user's own assets, loans and
goals are turned into links by `EntityLinks.ts`, detected against the real record list rather than
requested of the model, and conservatively: whole-word, longest-first, nothing under four
characters, never inside code.

Note: `.github/domain-patterns.md` describes a **Scheduled Expenses** context. It is not implemented — there is no such entity, table or service. Treat those sections as aspirational.

Extended domain patterns: `.github/domain-patterns.md`  
Technical standards (lint/TS config): `.github/technical-guide.md`  
Developer workflow: `.github/workflow-guide.md`
