# TODO — Project Backlog

Track feature development, improvements, and known issues here. Move completed work to **Done**, queue new ideas under **Next**, and record blockers in **Blocked**.

## Done

- **Setup:** Netlify connected (production + preview deploys at `shopping-sync.netlify.app`),
  `main` protected via branch ruleset requiring the `build` check.
- **Core shopping list (v0.1.0):** Item CRUD (name, category, store(s), quantity), duplicate
  protection, and shopping sessions. Stores are first-class `{ id, name }` entities
  (`src/lib/useStores.ts`) — items reference them by id, so renaming a store updates every item
  instantly and deleting one (via the **Edit stores** manager, `StoreManagerModal.vue`) strips it
  from every item that had it, with an inline confirm naming how many. Items are added/edited in
  bulk through `ItemGridModal.vue`: a compact grid where category/store/quantity render as
  color-coded ghost tags rather than full-width inputs, with ⊕/⊖ unicode icons throughout. Duplicate
  detection (`findDuplicate` in `src/lib/items.ts`) is case-insensitive/trimmed and works two ways —
  within the grid (blocks Save) and against the saved list (offers to edit the existing item
  instead, and resolves to that edit at save time even if ignored). `useShoppingList.ts` and
  `useStores.ts` both auto-persist via a `watch`; `migrateStores.ts` upgrades any data saved before
  stores became id-based objects. Help modal loads real content from `docs/concepts/overview.md`
  via a Vite `?raw` import. Uncaught errors and Vue event-handler errors are routed into the
  on-screen debug log (`installGlobalErrorLogging()` + `app.config.errorHandler` in `main.ts`),
  since there's no console on a phone to catch them otherwise.

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
- Reorder/pin categories instead of always alphabetical (with Uncategorized last).
- Categories are still plain strings (no rename/delete-everywhere the way stores now have) — could
  get the same entity treatment if that turns out to matter in practice.
