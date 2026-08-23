# Experience — Lessons & History

Record what you learn as you build: patterns that work, ideas that didn't pan out, and a version history of major changes.

## What Didn't Work (Gotchas & Dead Ends)

### The Pre-Merge Doc Gate Got Skipped Because the PR Kept Growing

PR #5 started as "import a list + copy as Markdown/JSON," then grew through several more rounds in
the same open PR — a menu consolidation, a `checked` property and Finish session, two icon swaps —
each shipped as its own commit and hand-off. By the time the user said "works great" and merged it,
the branch had drifted a long way from what the original PR description described, and the
pre-merge `AskUserQuestion` doc gate that's supposed to run right before every merge was never
triggered — it only fires around "opening/finalizing the PR," and this PR was never re-finalized
after the early rounds, it just kept getting pushed to and then merged.

Lesson: the gate needs to fire based on "is this about to be merged," not "am I opening a PR right
now." A PR that's grown well past its original scope through iterative feedback is exactly the case
most likely to slip through, because there's no single obvious "finalize" moment — just one push
after another until the user decides they're happy and merges. Treat any merge — including one the
user does without an explicit hand-off from me first — as a trigger to check whether the gate ran
for everything in the PR, not just the last round.

### A Small Pending PR Left Open While a Big One Was Built Went Stale

PR #2 (remove-confirm + a cancel button, two files) was small, already confirmed working
on-device, and ready to merge. Instead of saying so and asking for it to be merged first, a much
larger feature (shareable/live lists, ~20 files, several rounds) was built as a separate branch off
the same, now-increasingly-stale `main`. By the time the big PR merged, #2 had a real conflict in a
file both touched (`ShoppingList.vue`) and needed a manual merge-and-resolve that would have been
zero effort if #2 had simply landed first.

Rule worth keeping: when a small, ready PR is sitting open and the next request is unrelated and
substantially larger, say so and suggest merging the small one first — either the user agrees and
it's merged before the new branch is even cut, or they say no and at least it was a deliberate
choice rather than an oversight that surfaces as a conflict later.

### "Save Does Nothing" — No Console Means No Root Cause Without a Log

The Save button in the item grid stopped working for the user on-device, across a couple of
iterations, with no error visible anywhere. First guess: committing an inline category/quantity
edit synchronously on `blur` could mutate the DOM mid-tap and suppress that same tap's click on iOS
Safari (a real, documented WebKit quirk) — so that commit was deferred by one tick as a defensive
fix. That shipped without confirming it was the actual cause, because there was no way to see what
was actually happening on the user's phone.

The real fix was adding a global error catcher: `installGlobalErrorLogging()` (window `error` /
`unhandledrejection`) plus `app.config.errorHandler` in `main.ts`, both routed into the existing
on-screen debug log. Once that shipped, the user reported it working — but never sent the log, so
which of the two changes (the defer, or something the error handler would have caught and that
happened to get fixed in the same batch of edits) actually mattered is still unknown.

Lesson: for a user who can't open devtools, a plausible-sounding guess shipped without
instrumentation is a coin flip. The debug panel already existed for exactly this reason
(`docs/CLAUDE.md`'s "Debugging on device" section) but only had scattered manual `logDebug()` calls
— nothing caught an actual uncaught exception. That gap is what made this take multiple rounds
instead of one: add the global catcher *first*, before guessing at a fix, any time a bug reports as
silent failure with no visible cause.

### A Hover Tooltip Explains Nothing on a Touch Device

The disabled "⊕ Add row" button carried a `title` attribute explaining why it was disabled (no name
in the current row yet). On desktop that's a helpful tooltip; on a phone there's no hover state to
trigger it at all, so the button just looked broken — disabled with zero explanation. The user
reported it as a bug before confirming (when asked) that it was actually the intended guard working
correctly, just invisible. Fixed by replacing the tooltip with a plain visible line of text next to
the button. General rule for this app: anything explained only via `title`/hover needs a real,
on-screen fallback, since the target device never hovers.

### A Build Stamp Nobody Double-Checked — "dev" Was Never Real

`vite.config.ts` falls back to `'dev'` for `__BUILD_ID__` when `VITE_BUILD_ID` isn't set, and
`netlify.toml`'s build command never set it — so every single deploy, preview or production, from
the very first one, has shown "build dev" in the footer. The workflow's own instructions (this
file included) said to "confirm the live build matches the commit you pushed" using that stamp,
and that check had silently never verified anything, the entire time. It surfaced only when the
user pasted a debug-log copy that happened to include the build line, and the "dev" looked wrong in
context of a fresh deploy. Fixed by wiring Netlify's automatic `COMMIT_REF` through the build
command. Lesson: a verification step that always reads the same placeholder value looks identical
to one that's actually verifying something — worth occasionally checking that a "confirm X"
instruction is checking real data, not a constant.

### Mobile-First Design Constraints

Touch targets need to be at least 44×44px. Avoid hover-only interactions — users on mobile have no hover. Rethink interactions like "expand on hover" as "toggle on tap" or always-expanded. Test regularly on actual mobile devices, not just the browser's responsive mode.

### Service-Worker Caching & Stale Builds

A PWA caches aggressively to work offline. If a user opens your app, then you deploy a new version, the old bundle may keep serving until they:
- Manually tap "Reload latest" (we surface this in the footer)
- Force-refresh (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)
- Open in a private/incognito tab
- Wait for the service worker to auto-update (can take hours)

Always surface a visual "update ready" affordance so users know to reload. See `App.vue` for the implementation.

### Pure Logic vs. Components

Logic lives in `src/lib/` as plain functions over the already-loaded data. They recompute instantly with no API refetch. Keep components thin — they should mostly render. This separation makes logic testable and reusable without rebuild cycles.

### Don't Hand-Write a Static `public/manifest.json`

`vite-plugin-pwa` generates `manifest.webmanifest` and injects its own `<link rel="manifest">`. A second static `public/manifest.json` linked from `index.html` produces two competing manifest links in the built HTML, and the static one wins in some browsers — pointing at icons the build never processed. Define the manifest once, in the `VitePWA({ manifest: ... })` block.

### `npm ci` Needs a Committed Lockfile

The CI workflow runs `npm ci`, which fails outright ("can only install packages when your package.json and package-lock.json are in sync") if `package-lock.json` isn't committed. It's tempting to gitignore lockfiles; don't. Commit it whenever dependencies change.

### `declaration: true` in an App's tsconfig

Emitting declarations for an *app* makes `vue-tsc` demand exported names for every type used in a component's public surface — a `defineProps` interface that isn't exported fails with `TS4082: Default export of the module has or is using private name 'Props'`. Declarations matter for libraries, not apps. Dropping `declaration`/`declarationMap` is the fix, not exporting every internal interface.

### Ambient Types for Build-Time Constants

`__BUILD_ID__` and `__BUILD_TIME__` are injected by Vite's `define`, and `virtual:pwa-register` only exists at build time. TypeScript knows about none of them without an `src/env.d.ts` declaring the constants and referencing `vite/client` and `vite-plugin-pwa/client`. Without it the build fails with `TS2304: Cannot find name '__BUILD_ID__'`.

## Version History

(Record major releases here as you merge features. Example format below.)

### v0.3.0 — 2026-08-23
- **Added:** Import a pasted list (Apple Notes checklist, plain bullets/numbers, one-per-line, or
  comma-separated) into item names, with a preview flagging already-on-list and repeated-in-paste
  names before you confirm. Copy the current list to the clipboard as Markdown (a checklist) or
  JSON. A shopping session now offers **Finish session** alongside **End session** — Finish writes
  each item's picked-up state back to the list (a new `checked` property), so starting another
  session resumes from it instead of starting blank; End still just discards.
- **UI:** Share list/Copy share link, Import list, and both copy actions moved off the header into
  one `⧉` menu button next to the list title.
- **Infrastructure:** Shared lists needed a real Supabase migration (`list_items.checked`, plus the
  previously-recommended unique index on `(list_id, lower(name))`) — both now run. Local lists
  needed nothing; missing `checked` on old saved data just defaults to unchecked.
- **Docs:** This entry and the "pre-merge doc gate got skipped" lesson above were both written
  after the merge, not before — see that entry for why.

### v0.2.1 — 2026-08-23
- **Fixed:** The saved list's remove-confirm button (and the grid's inline-edit cancel/remove
  icons) could show the wrong row as "armed"/red, both right after a delete and lingering past the
  3-second auto-reset. Root cause was mobile Safari's stuck-`:hover` behavior — a tap leaves `:hover`
  active until a later tap lands elsewhere — combined with those buttons using the same red for
  `:hover` as for the real confirming state. A full rewrite of the arm/confirm state from a single
  shared "current id" to a per-row `Set<string>` did not fix it, which was the tell that the bug was
  never in the state logic; wrapping the `:hover` rules in
  `@media (hover: hover) and (pointer: fine)` (so touch devices never receive them) did. Confirmed
  fixed on-device.
- **UI:** Remove-confirm text is now red-text-only, no background fill, per explicit request; the
  button's size stays fixed across both states so only the text changes.

### v0.2.0 — 2026-08-23
- **Added:** Multiple named lists, and sharing — any list can go live via Supabase (real-time
  sync, no accounts, link-only access) while staying fully offline-capable until you choose to
  share it. Share a list to get a link; anyone with it sees and edits the same list, changes
  appearing on both sides within a second or two. Join a shared list either by opening its link or
  by pasting the link into a "🔗 Join shared list" field. "🔗 Copy share link" lets you get a
  shared list's link again anytime, not just at the moment you shared it.
- **UI:** Header action buttons (Add item, Start shopping, Edit stores, Share) restyled as small,
  moderately-rounded tag-style chips. The saved list's remove button now requires two taps
  (arms red, "Tap again to remove") instead of removing on one accidental tap. The grid's category/
  quantity inline editors gained a ⊗ cancel button.
- **Fixed:** The footer's build stamp had shown "dev" on every deploy since the project began — see
  the dead-end entry above. Now shows the real deployed commit.
- **Defaults:** A list stays local (localStorage, offline) unless you explicitly share it. Once
  shared, always requires a connection — no offline queue for shared lists. No "unshare."
- **Docs:** system-design, concepts overview, TODO all updated for the multi-list/sharing model.

### v0.1.0 — 2026-08-23
- **Added:** Core shopping list. Items (name, category, store(s), quantity) are added/edited in
  bulk through a compact grid (`ItemGridModal.vue`) — category/store/quantity render as color-coded
  ghost tags rather than full-width inputs, so rows fit a phone screen, with ⊕/⊖ unicode icons used
  for every add/remove action throughout the app. Duplicate protection works two ways: two rows
  with the same name within the grid block Save, and a row matching an item already on the list
  offers to edit that item instead (and resolves to it at save time even if ignored, so a real
  duplicate can never be created). Stores are first-class entities (`{ id, name }`, not
  derived from item usage) — an **Edit stores** manager lets you rename a store (updates every item
  instantly) or delete one (removed from every item that had it, after an inline confirm naming how
  many). Shopping sessions group items by category with a checkbox to mark each off, for "All
  items" or one specific store. Help modal renders real content from `docs/concepts/overview.md`.
- **Infrastructure:** Uncaught errors and Vue event-handler errors now route into the on-screen
  debug log (no console on a phone otherwise). A one-time migration upgrades any data saved before
  stores became id-based objects.
- **Defaults:** Everything persists to `localStorage`; no accounts, no sync between devices yet.
- **Setup:** Initial scaffold, header/footer wrapper, Netlify (production + preview deploys),
  branch-protected `main` requiring the `build` check.
- **Docs:** TODO, experience, system-design, concepts overview all personalized for this app.

---

*Tip: When you abandon a branch or realize something didn't work, add a short "What didn't work" entry above so future-you (or a teammate) doesn't re-walk the same dead end.*
