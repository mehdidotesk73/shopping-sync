# TODO — Project Backlog

Track feature development, improvements, and known issues here. Move completed work to **Done**, queue new ideas under **Next**, and record blockers in **Blocked**.

## Done

- **Setup:** Netlify connected (production + preview deploys at `shopping-sync.netlify.app`),
  `main` protected via branch ruleset requiring the `build` check.
- **Core shopping list (v0.1.0):** Item CRUD with a data model of `{ id, name, category, stores[] }`
  persisted to `localStorage` (`src/lib/storage.ts`). Duplicate detection is case-insensitive,
  trimmed-name matching (`findDuplicate` in `src/lib/items.ts`); attempting to add a name that
  already exists surfaces an "Edit existing item instead" prompt rather than creating a second
  entry. Reactive state lives in `useShoppingList()` (`src/lib/useShoppingList.ts`), which
  auto-persists on every change via a `watch`. Three views in `ShoppingList.vue`: **list** (all
  items, tap to edit, ✕ to remove, category/store chips), **session-start** (pick "All items" or a
  specific store), and **session** (`SessionView.vue` — items grouped by category via
  `groupByCategory()`, with a per-item checkbox and a progress count). Add/edit happens in a shared
  `ItemFormModal.vue` (name, free-text category with suggestions, multi-select store chips + add-new).
  Help modal now loads real content from `docs/concepts/overview.md` via a Vite `?raw` import.

## Next (Current Sprint)

(What are you working on next?)

## Docs

(Documentation gaps, missing help content, outdated instructions)

## UI / UX

(Design improvements, accessibility, mobile issues)

## DevOps / Build

(CI/CD, deployment, build process improvements)

## Known Issues

(Bugs, edge cases, platform-specific quirks)

## Ideas / Backlog (Low Priority)

- Persist which items are checked off mid-session (currently resets when a session ends), in case
  someone leaves the app and comes back mid-shop.
- A dedicated "manage stores" list so store names can be renamed/removed everywhere at once, instead
  of only ever being derived from whatever items currently reference them.
- Reorder/pin categories instead of always alphabetical (with Uncategorized last).
