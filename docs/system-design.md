# System Design — Architecture & Patterns

Developer-facing documentation of how the app is structured, how data flows, and design decisions.

## §1 — System Overview

This is a Vue 3 + TypeScript + Vite single-page app (SPA) that works as a progressive web app (PWA). It provides:

- **Header/footer shell** — app title, Help modal, build/version info, reload affordance, debug panel
- **Service-worker caching** — offline capability, smart update detection
- **Mobile-first UX** — responsive, touch-optimized, no hover-only interactions
- **Pure computation layer** (`src/lib/`) — reusable logic separated from UI
- **Hot reload in dev** — instant feedback on code changes
- **Netlify** — production site and a live preview on every branch/PR, one host

### Architecture Diagram

```
┌─────────────────────────────────────────┐
│           Browser (PWA)                 │
│  ┌───────────────────────────────────┐  │
│  │  Service Worker (cache, updates)  │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │  App.vue (header/footer shell)    │  │
│  │  ├─ HelpModal                     │  │
│  │  ├─ DebugPanel                    │  │
│  │  ├─ UpdateAvailablePrompt         │  │
│  │  └─ ShoppingApp.vue               │  │
│  │     ├─ ListSwitcher.vue           │  │
│  │     └─ ShoppingList.vue           │  │
│  │        ├─ ItemGridModal.vue       │  │
│  │        ├─ StoreManagerModal.vue   │  │
│  │        └─ SessionView.vue         │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │  lib/ (pure functions + state)    │  │
│  │  ├─ types.ts (ShoppingItem,       │  │
│  │  │             Store, ListMeta)   │  │
│  │  ├─ storage.ts, stores.ts,        │  │
│  │  │   lists.ts (localStorage)      │  │
│  │  ├─ migrateStores.ts,             │  │
│  │  │   migrateToLists.ts (one-time  │  │
│  │  │   upgrades of old saved data)  │  │
│  │  ├─ items.ts    (dup/group/etc.)  │  │
│  │  ├─ tagColor.ts (ghost-tag hue)   │  │
│  │  ├─ useShoppingList.ts,           │  │
│  │  │   useStores.ts (local/         │  │
│  │  │   localStorage-backed)         │  │
│  │  ├─ useLists.ts (list registry)   │  │
│  │  ├─ supabaseClient.ts             │  │
│  │  ├─ useSharedItems.ts,            │  │
│  │  │   useSharedStores.ts (Supabase │  │
│  │  │   + realtime-backed)           │  │
│  │  └─ shareList.ts (upload, share   │  │
│  │      links, join-by-id/link)      │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │  Supabase (hosted, opt-in)        │  │
│  │  lists / list_items / list_stores │  │
│  │  — realtime, public RLS by id     │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

## §2 — Header/Footer Wrapper Template

This is the shell that wraps every page/tab. It provides version checking, update affordances, Help modal, and debug logging. See `src/App.vue` for the full implementation.

### Key Features

1. **Header** — app title (centered), Help button (top-right), "Update available" button (top-left when new version detected)
2. **Footer** — build ID/timestamp (clickable to expand debug log), "Reload latest" button, version status
3. **Debug panel** — collapsible log of on-screen messages (no console on mobile)
4. **Help modal** — renders markdown docs from `docs/concepts/*.md`
5. **Update detection** — background check against live origin, prompts user when new build is available

### Version Checking Logic

- On load, `useVersionCheck()` compares the loaded build ID against what's live at the origin
- States: "current" (up to date), "update-ready" (new build is live), "checking" (in progress)
- "Reload latest" button: checks again, then reloads if a new version exists
- Service worker auto-updates in the background; the version check surfaces this to the user

### Styling

Uses CSS custom properties (`--bg-elev`, `--text`, `--border`, `--tag-hue`, `--tag-lightness`, etc.)
for theming. Dark/light mode via `prefers-color-scheme` media query, with `--tag-lightness` set per
theme so hash-colored ghost tags (§4) stay readable in both. Mobile-safe padding with
`safe-area-inset` for notch/bottom-bar devices.

### Global error logging

`src/debug.ts` exports `installGlobalErrorLogging()`, called once from `main.ts`, which pipes
`window`'s `error` and `unhandledrejection` events into the same on-screen `logDebug()` panel.
`main.ts` also sets `app.config.errorHandler` so an error thrown inside a template event handler
(e.g. a button's `@click`) surfaces there too — otherwise Vue only `console.error()`s it, which is
invisible with no console on a phone. This is why "the app looks like it's doing nothing" is
diagnosable: expand the debug panel and copy the log.

## §3 — Data Model & Storage

No external data — everything lives in `localStorage`, under three keys: `shopping-sync:items`,
`shopping-sync:stores`, and (legacy, migrated away — see below) the old plain-string stores list.

```typescript
// src/lib/types.ts
interface Store {
  id: string
  name: string
}

interface ShoppingItem {
  id: string
  name: string
  category: string   // '' means uncategorized; plain string, not an entity
  stores: string[]   // Store ids, not names — rename a Store and every item stays linked
  quantity: string    // '' means unspecified; free text (e.g. "2", "1 dozen", "2 lbs")
}
```

**Stores are entities, items are not tags.** A `Store` is created once (via the item grid's picker,
its "+ Add store", or the "Edit stores" manager) and referenced by `id` from every item that uses
it. Renaming a store is a single field update — no item needs to change. Deleting a store removes
the `Store` record *and* strips its id out of every item's `stores` array (`ShoppingList.vue`'s
`handleRemoveStore`); an item is never left holding a dangling reference. Categories, by contrast,
stay plain strings typed per item — there's no category registry to rename/delete through.

`src/lib/storage.ts` (items) and `src/lib/stores.ts` (stores) each hold the two functions that
touch `localStorage` directly (`load*`/`save*`), wrapped in try/catch so private-browsing or quota
failures degrade to in-memory-only rather than throwing.

**`src/lib/migrateStores.ts`** — `migrateLegacyStoreData()`, called once at the top of
`ShoppingList.vue`'s setup (before either composable reads storage). Stores used to be a plain
`string[]` of names, and items referenced stores *by name*. This upgrades both in place: wraps each
legacy name in a `Store{id, name}` (de-duplicating case-insensitively) and rewrites every item's
`stores` array from names to the matching ids. A no-op once data is already in the new shape.

## §4 — Shared Logic (lib/)

Pure functions over in-memory arrays. These recompute instantly, no refetch/no I/O:

```
src/lib/
  types.ts             ShoppingItem, Store interfaces
  storage.ts            localStorage load/save for items
  stores.ts             localStorage load/save for stores
  migrateStores.ts      one-time upgrade from the pre-Store-object save format
  items.ts              normalizeName, findDuplicate, groupByCategory,
                        itemsForStore, allCategories, COMMON_CATEGORIES
  tagColor.ts           tagColor(text) → deterministic --tag-hue for ghost-style tags
  useShoppingList.ts    reactive `items` ref + addItem/updateItem/removeItem
  useStores.ts          reactive `stores` ref + addStore/renameStore/removeStore
```

**Duplicate detection** (`findDuplicate` in `items.ts`) is case-insensitive and trims whitespace.
`addItem`/`updateItem` in `useShoppingList.ts` call it before mutating state; on a match they
return `{ ok: false, duplicate }` instead of writing, and the caller (`ShoppingList.vue`) surfaces
an "Edit existing item instead" prompt rather than silently failing. `useStores.ts`'s
`addStore`/`renameStore` apply the same case-insensitive-name guard so two stores can never collide.

**Category grouping** (`groupByCategory`) buckets items by `category.trim() || 'Uncategorized'`,
sorts categories alphabetically with Uncategorized always last, and sorts items within each group
by name. Used by `SessionView.vue` to render the shop-by-category layout. `itemsForStore(items, id)`
filters to one store (or returns everything for a `null` id) — used for "start a session by store".

**`tagColor(text)`** hashes a string to a hue (0–359) and returns it as a `--tag-hue` CSS custom
property, rather than a literal color — the actual color is `hsl(var(--tag-hue), 60%,
var(--tag-lightness))`, letting `--tag-lightness` (§2) adapt per theme. Category tags hash the
category string; store tags hash the store's `id` (not its name), so a tag's color survives a
rename.

Keep functions **pure** — same input → same output, no side effects. The two `use*` composables are
the exception (stateful, not pure functions) — see §5.

## §5 — Composables

```typescript
const { items, addItem, updateItem, removeItem } = useShoppingList()
const { stores, addStore, renameStore, removeStore } = useStores()
```

- `items` / `stores` — reactive refs seeded from `loadItems()`/`loadStores()` on creation
- a `watch(..., { deep: true })` on each persists on every mutation — components never touch
  `localStorage` directly
- `addItem`/`updateItem` return `{ ok: true }` or `{ ok: false, duplicate }` (see §4)
- `addStore(name)` returns the existing `Store` if the name is already known, else creates one —
  this is what lets the grid modal's "add a new store" flow and the top-level "+ Add store" button
  share one code path and never create two stores for the same name
- `renameStore(id, name)` returns `false` (no-op) on a name collision with a different store
- `removeStore(id)` only removes the `Store` record; cascading it out of every item's `stores`
  array is the caller's job (`ShoppingList.vue`'s `handleRemoveStore`), since that composable only
  knows about stores, not items

## §6 — Components

Organized by feature. Keep them thin — mostly templating, logic lives in `lib/` and composables.

```
src/components/
  HelpModal.vue          renders docs/concepts/overview.md (loaded via a Vite `?raw` import)
  ShoppingApp.vue         top-level: owns useLists(), the ?list= URL auto-join, the "just shared"
                          link banner, and switches between ListSwitcher.vue and ShoppingList.vue
  ListSwitcher.vue        create/rename/remove-from-device lists; "🔗 Join shared list" (paste a
                          link or bare id — see §7)
  ShoppingList.vue        owns view state ('list' | 'session-start' | 'session'), picks local vs.
                          shared item/store composables (see §7), and the store-id ↔ name
                          resolution the other components need
  ItemGridModal.vue       bulk add/edit grid: name input + category/store/quantity as tags (§4's
                          tagColor for category/store, a neutral ghost tag for quantity). Empty-state
                          triggers render as labeled tags too ("Category ⊕" gray, "Store ⊕" light
                          blue, "Quantity ⊕" orange). Store selection is tap-to-add from a filterable
                          popover (via a `resolveStore` prop shared with ShoppingList.vue), not a
                          multi-select checkbox list. A row matching a saved item by name shows a
                          pull-to-edit affordance; two rows matching each other in-grid block Save.
  StoreManagerModal.vue   "Edit stores": rename (✎, blocked on a collision) and delete (⊖, with an
                          inline confirm naming how many items reference the store) any Store
  SessionView.vue         renders one session: groupByCategory(items) + per-item checkbox + progress
```

## §7 — Multi-List & Sharing (Supabase)

### Data model

`ListMeta { id, name, shared }` (`src/lib/types.ts`) is the registry entry for one list, persisted
via `src/lib/lists.ts` under `shopping-sync:lists` (array) and `shopping-sync:activeListId`. A
**local** list's items/stores live under per-list keys — `shopping-sync:list:<id>:items` /
`:stores` (helpers `listItemsKey`/`listStoresKey` in `src/lib/migrateToLists.ts`, used by
`storage.ts`/`stores.ts`) — and never leave the device. A **shared** list's data lives in Supabase
instead; once shared, that list always needs a connection (no offline mode for it, by design).

### Choosing local vs. shared composables

`ShoppingList.vue` picks `useLocalItems`/`useLocalStores` or `useSharedItems`/`useSharedStores`
based on its `shared` prop, once, at `setup()`. That prop is guaranteed constant for the
component instance's whole lifetime because the parent (`ShoppingApp.vue`) forces a full remount
(`:key="`${id}:${shared}`"`) whenever a list's shared flag flips — which is what lets a plain
ternary select one composable without breaking Vue's rule against calling composables
conditionally on something that can change mid-lifecycle.

### Sharing a list

`shareList()` (`src/lib/shareList.ts`) uploads a local list's current items/stores into Supabase in
one shot, using the list's own (already-UUID) id as the `lists.id` primary key — no id remapping
needed anywhere else. `ShoppingList.vue`'s `handleShare()` calls this, then emits `'shared'` with
the resulting URL; `ShoppingApp.vue` sets that list's `ListMeta.shared = true` (triggering the
remount above) and shows the link in a dismissible banner. `shareUrl(listId)` is a pure function of
the id, so **"Copy share link"** can regenerate it any time afterward — nothing has to be
remembered from the moment of sharing.

### Realtime sync

`useSharedItems`/`useSharedStores` fetch the list's rows once on mount, then subscribe to a
Supabase Realtime channel filtered to that `list_id` (`postgres_changes` on `list_items`/
`list_stores`). That channel is the **single source of truth** — `items`/`stores` only ever change
via `upsertLocal`/`removeLocal`, called either by the realtime callback or optimistically by a local
write, so your own edits feel instant and the realtime echo of your own write is a harmless
no-op re-apply by id. `addItem`/`updateItem`/`removeItem` are `async` here (a real network call);
the local composables' equivalents are `async` too, purely for interface parity, so
`ShoppingList.vue`'s save/duplicate-detection logic is identical regardless of which is live.

### Joining a list

Two entry points, one function: `ShoppingApp.vue`'s `joinListById(id)`. Opening a share link
(`?list=<id>`) triggers it from `onMounted`; the **🔗 Join shared list** field on
`ListSwitcher.vue` triggers it after `extractListId()` pulls an id out of either a pasted full link
or a bare id. Either way: an already-known list just switches; an unknown one is looked up via
`fetchSharedListName()` and registered locally (`useLists().registerSharedList`) before switching.

### Supabase schema

Three tables — `lists`, `list_items`, `list_stores` — with RLS enabled but fully public
(`using (true)` on every policy): the security model is "anyone who has the list's id can read/
write it," matching the "link-only, no login" decision made for this feature. `list_items.store_ids`
is `uuid[]`. A recommended (optional) `unique index on (list_id, lower(name))` on `list_items`
backstops the client-side duplicate check against a race between two simultaneous writers.

### Configuration

Requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as build-time env vars (Netlify: Site
configuration → Environment variables). `src/lib/supabaseClient.ts` exports `null` if either is
missing, and every shared-list function checks for that and fails gracefully (a message via
`logDebug`, not a crash) instead of assuming they're set.

## §8 — Build, Deploy & Conventions

**Local dev:** `npm run dev` (hot reload at http://localhost:5173)

**Build before commit:** `npm run build` (catches TS errors + template parse errors)

**Production and preview, both via Netlify** (see `netlify.toml`): `main` pushes build production; every other branch/PR gets its own Deploy Preview. The build command passes Netlify's automatic `COMMIT_REF` through as `VITE_BUILD_ID`, which is what makes the footer's build stamp show the real deployed commit instead of vite.config.ts's `'dev'` fallback.

**PR build check:** `.github/workflows/ci.yml` runs `npm run build` on every PR — this is the `build` status check the branch ruleset requires. It doesn't deploy anything.

**Conventions:**
- Components: PascalCase, one per file
- Functions/vars: camelCase
- CSS: BEM or utility classes (avoid specificity wars)
- Types: keep in component file or `types/` folder

## §9 — PWA & Service Worker

`pwa.ts` handles:
- Service worker registration
- Auto-update on new deploys
- Offline detection
- Update available → reload prompt

`main.ts` bootstraps the Vue app + PWA setup.

Service worker is generated by Vite + `vite-plugin-pwa` (auto-configured).

## §10 — Glossary

- **SPA** — Single-Page App (no server-side rendering, runs entirely in the browser)
- **PWA** — Progressive Web App (works offline, installable like a native app)
- **Service Worker** — Background script that handles caching and network requests
- **Deploy Preview** — Netlify's term for a per-branch temporary deploy
- **Build ID** — Git commit SHA, shown in footer for debugging
- **Reload latest** — Force-refresh service worker cache and reload the page

---

**When you change architecture or add a major feature, update the relevant section above + the diagram.**
