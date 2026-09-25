# Starting up

Loaded when working in this directory. Project-wide rules are in the root `CLAUDE.md`.

**Starting up (`src/index.tsx`, `AppFailureBoundary`, `AppFailureView`)** — the app must never show
a blank page, and the reason is not polish. Records live in this device's IndexedDB, so a blank page
with no explanation leaves "clear the site data" as the only remedy a user can find unaided — and
that deletes every asset, transaction and expense. A failure to *read* then becomes a permanent loss,
by the user's own hand, with the app never having said a word. Telling them not to clear storage is the load-bearing sentence on
both screens; keep it whatever else changes.

Three layers, because the failures arrive by three different routes and none of them can see the
others. `openDatabase()` asks on purpose whether the store opens: Dexie opens lazily on the first
query, so an unopenable store otherwise surfaces as every screen failing at once, which looks exactly
like a blank app. It names `stale-build` separately because that case is not corruption — IndexedDB
refuses a database at a version above what the code asks for, which means *this bundle is older than
the data on this device*, and a PWA (`registerType: 'autoUpdate'`, precached) makes that ordinary.
`AppFailureBoundary` catches a render that throws, the only thing `componentDidCatch` can see, and
owns both because they end in the same screen. And `showBootFailure` in `index.tsx` is built out of
nothing — no imports, no React, no theme — because the original failure could not be caught by any
component: a precached build whose chunks the server no longer has, or a module that throws while
evaluating, leaves the page blank before anything mounts.

The recovery action is `reloadWithFreshBuild`: unregister the service worker, sweep `caches`, reload.
It touches **cached builds only, never IndexedDB or local storage** — it runs at the exact moment a
frightened user would be clearing those by hand, so it has to be provably incapable of doing it too.
