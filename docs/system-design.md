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
│  │  └─ ShoppingList.vue              │  │
│  │     ├─ ItemFormModal.vue          │  │
│  │     └─ SessionView.vue            │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │  lib/ (pure functions + state)    │  │
│  │  ├─ types.ts    (ShoppingItem)    │  │
│  │  ├─ storage.ts  (localStorage)    │  │
│  │  ├─ items.ts    (dup/group/etc.)  │  │
│  │  └─ useShoppingList.ts (reactive) │  │
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

Uses CSS custom properties (`--bg-elev`, `--text`, `--border`, etc.) for theming. Dark/light mode via `prefers-color-scheme` media query. Mobile-safe padding with `safe-area-inset` for notch/bottom-bar devices.

## §3 — Data Model & Storage

This app has no external data — everything lives in `localStorage` under the key
`shopping-sync:items`.

```typescript
// src/lib/types.ts
interface ShoppingItem {
  id: string
  name: string
  category: string   // '' means uncategorized
  stores: string[]   // '' / [] means no preferred store
}
```

`src/lib/storage.ts` has the two functions that touch `localStorage` directly (`loadItems`,
`saveItems`), each wrapped in try/catch so private-browsing or quota failures degrade to
in-memory-only rather than throwing.

## §4 — Shared Logic (lib/)

Pure functions over the in-memory item array. These recompute instantly, no refetch/no I/O:

```
src/lib/
  types.ts             ShoppingItem interface
  storage.ts            localStorage load/save (the only I/O in the app)
  items.ts              normalizeName, findDuplicate, groupByCategory,
                        itemsForStore, allStores, allCategories, COMMON_CATEGORIES
  useShoppingList.ts    the one composable — reactive `items` ref + addItem/updateItem/removeItem
```

**Duplicate detection** (`findDuplicate` in `items.ts`) is case-insensitive and trims whitespace.
`addItem`/`updateItem` in `useShoppingList.ts` call it before mutating state; on a match they
return `{ ok: false, duplicate }` instead of writing, and the caller (`ShoppingList.vue`) surfaces
an "Edit existing item instead" prompt rather than silently failing.

**Category grouping** (`groupByCategory`) buckets items by `category.trim() || 'Uncategorized'`,
sorts categories alphabetically with Uncategorized always last, and sorts items within each group
by name. Used by `SessionView.vue` to render the shop-by-category layout.

Keep functions **pure** — same input → same output, no side effects. `useShoppingList.ts` is the
one exception (it's a stateful composable, not a pure function) — see §5.

## §5 — Composables

`useShoppingList()` (`src/lib/useShoppingList.ts`) is the app's single source of truth:

```typescript
const { items, addItem, updateItem, removeItem } = useShoppingList()
```

- `items` — a reactive `ref<ShoppingItem[]>`, seeded from `loadItems()` on creation
- a `watch(items, ..., { deep: true })` calls `saveItems()` on every mutation — components never
  touch `localStorage` directly
- `addItem`/`updateItem` return `{ ok: true }` or `{ ok: false, duplicate }` (see §4) so the caller
  can react to a blocked duplicate without throwing

## §6 — Components

Organized by feature. Keep them thin — mostly templating, logic lives in `lib/` and composables.

```
src/components/
  HelpModal.vue        renders docs/concepts/overview.md (loaded via a Vite `?raw` import)
  ShoppingList.vue      owns view state ('list' | 'session-start' | 'session') and useShoppingList()
  ItemFormModal.vue     add/edit form — name, category (datalist suggestions), store chips
  SessionView.vue       renders one session: groupByCategory(items) + per-item checkbox + progress
```

## §7 — Build, Deploy & Conventions

**Local dev:** `npm run dev` (hot reload at http://localhost:5173)

**Build before commit:** `npm run build` (catches TS errors + template parse errors)

**Production and preview, both via Netlify** (see `netlify.toml`): `main` pushes build production; every other branch/PR gets its own Deploy Preview.

**PR build check:** `.github/workflows/ci.yml` runs `npm run build` on every PR — this is the `build` status check the branch ruleset requires. It doesn't deploy anything.

**Conventions:**
- Components: PascalCase, one per file
- Functions/vars: camelCase
- CSS: BEM or utility classes (avoid specificity wars)
- Types: keep in component file or `types/` folder

## §8 — PWA & Service Worker

`pwa.ts` handles:
- Service worker registration
- Auto-update on new deploys
- Offline detection
- Update available → reload prompt

`main.ts` bootstraps the Vue app + PWA setup.

Service worker is generated by Vite + `vite-plugin-pwa` (auto-configured).

## §9 — Glossary

- **SPA** — Single-Page App (no server-side rendering, runs entirely in the browser)
- **PWA** — Progressive Web App (works offline, installable like a native app)
- **Service Worker** — Background script that handles caching and network requests
- **Deploy Preview** — Netlify's term for a per-branch temporary deploy
- **Build ID** — Git commit SHA, shown in footer for debugging
- **Reload latest** — Force-refresh service worker cache and reload the page

---

**When you change architecture or add a major feature, update the relevant section above + the diagram.**
