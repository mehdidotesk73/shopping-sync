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

- **Shareable, live lists (v0.2.0):** Multiple named lists (`ListSwitcher.vue`, `src/lib/useLists.ts`),
  each either local (localStorage, offline, as before) or shared (Supabase-backed, realtime,
  requires a connection) — `ShoppingList.vue` picks the right composables per-list and the parent
  forces a remount when a list's shared flag flips. **🔗 Share list** uploads a local list's items/
  stores to Supabase under its own id and hands back a link; **🔗 Copy share link** regenerates that
  link anytime after. Joining works two ways — opening the link (`?list=<id>`, auto-detected) or
  pasting it into **🔗 Join shared list** on the list switcher — both go through one
  `joinListById()`. Realtime sync via Supabase `postgres_changes` subscriptions, with optimistic
  local writes so your own edits feel instant. Existing single-list data migrates automatically into
  a "My List" entry (`src/lib/migrateToLists.ts`). Also fixed: `netlify.toml` never set
  `VITE_BUILD_ID`, so the footer's build stamp had silently shown "dev" on every deploy since day
  one — it now carries the real commit SHA.

- **Remove-confirm + inline-edit cancel (v0.2.1):** The saved list's ⊖ remove button now arms
  ("Tap again to remove ⊖", red text only) on first tap and only removes on a second tap within 3s,
  independently per row (`armedRemoveIds: Set<string>` in `ShoppingList.vue`, keyed by item id so one
  row's state can never bleed into another's). The grid's category/quantity inline editors gained a
  ⊗ cancel button. Also fixed a real bug this surfaced: `.remove-icon`/`.remove-btn`/
  `.inline-edit-cancel` all used the same red for both `:hover` and the real armed/confirming state,
  and mobile Safari leaves `:hover` stuck on a tapped element until the next tap lands elsewhere — so
  an untapped row could visually appear armed right after a delete. Fixed by wrapping every such
  `:hover` rule in `@media (hover: hover) and (pointer: fine)` across `ShoppingList.vue`,
  `ItemGridModal.vue`, `ListSwitcher.vue`, `StoreManagerModal.vue`.

- **Import/export + Finish session (v0.3.0):** `ImportItemsModal.vue` parses text pasted from
  elsewhere — an Apple Notes checklist (`- [ ] Item` / `- [x] Item`), a plain bullet or numbered
  list, one name per line, or a single comma-separated line (`src/lib/importItems.ts`) — into bare
  item names, previews which are new vs. already-on-the-list vs. repeated within the paste, and
  imports only the genuinely new ones. `src/lib/exportItems.ts` copies the current list to the
  clipboard as Markdown (a checklist, `[x]` for picked-up items) or JSON. Share list/Copy share
  link, Import list, and both copy actions now live behind one `⧉` menu button next to the list
  title instead of separate header buttons. `ShoppingItem` gained a `checked` boolean
  (`src/lib/types.ts`) — sessions now offer **Finish session** alongside **End session**;
  Finish writes each item's checked/unchecked state back to the list (`setChecked` on both
  `useLocalItems`/`useSharedItems`) so a later session resumes from it instead of starting blank.
  Shared lists needed a real Supabase migration for this (`alter table list_items add column
  checked boolean not null default false`) — already run. The previously-recommended
  `unique index on (list_id, lower(name))` has also now been run.

- **Bulk-assign stores/categories (v0.4.0):** Edit stores and a new **Edit categories** manager
  (`CategoryManagerModal.vue`) now live behind one `☰` sub-menu next to Add item/Start shopping,
  replacing the standalone "Edit stores" header button. Both offer an "Assign items" action that
  opens a shared `BulkAssignModal.vue` (a `store`/`category` mode over the same UI): a checklist of
  every item grouped by category, pre-checked with whichever items already carry that store/category,
  plus Select all/Deselect all. Saving only writes the items whose membership actually changed, via
  the existing per-item `updateItem` — same code path for local and shared lists. Edit categories
  lists categories actually in use (via `groupByCategory`, excluding the "Uncategorized" display
  bucket) with a count each, plus a free-text row to bulk-assign a brand-new category. Solves
  "imported 50 bare-name items, now tag them" without opening each one individually.

## Next (Current Sprint)

(Nothing queued right now.)

## Docs

(Documentation gaps, missing help content, outdated instructions)

## UI / UX

(Design improvements, accessibility, mobile issues)

## DevOps / Build

(CI/CD, deployment, build process improvements)

## Known Issues

(Bugs, edge cases, platform-specific quirks)

## Ideas / Backlog (Low Priority)

- Session progress still isn't saved until you explicitly tap **Finish session** — closing the tab
  or tapping **End session** mid-shop still loses it. (Picked-up state itself is now persisted once
  you do finish — see v0.3.0 above — this is just about the in-progress case.)
- Reorder/pin categories instead of always alphabetical (with Uncategorized last).
- Categories are still plain strings, not a first-class entity like stores — Edit categories
  (v0.4.0) covers bulk-assigning a category to a selection of items, but there's still no one-step
  "rename this category everywhere" or "delete this category everywhere" the way stores have.
- No "unshare" — once a list is shared it stays shared; only removing it from your own device's
  registry is supported.
- A shared list's *name* isn't synced live — the owner renaming it locally doesn't update what
  other joined devices see (they keep whatever name they fetched at join time).
- Offline queue + sync for shared lists was explicitly decided against for now (shared lists just
  require a connection) — revisit if that trade-off turns out to matter in practice.
