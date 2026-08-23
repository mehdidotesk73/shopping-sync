# CLAUDE.md

Guidance for any Claude session working in this repo. Read this first. The
repeatable procedures live in `.claude/skills/` — `finish-setup` for one-time
setup, `ship-feature` for every change after that.

## What this is

A Vue 3 + TypeScript + Vite single-page app (also a PWA) that is a shopping list manager — add,
edit, and remove items, tag them with a category and preferred store(s), and shop via organized
sessions. UI structure:

- **List view** — all items, with add/edit/remove, category, and store tags. Adding an item whose
  name already exists is blocked; the user is prompted to edit the existing item instead.
- **Add/Edit item** — name, category, store(s)
- **Start session** — pick "All items" or a specific store
- **Session view** — items grouped by category, checkable as you shop

The entire app is wrapped inside a header and footer. The header provides the app title, a Help button that opens the conceptual-docs modal, and an "Update available" affordance that surfaces when a newer PWA build is live. The footer provides the current build id/timestamp, version-check status against the live origin, a "Reload latest" button to force-refresh a stale cache, and a collapsible debug log with copy-to-clipboard support. See `docs/system-design.md` §2 for the full wrapper template and implementation details.

The user previews on a **phone** (mobile Safari), so favour mobile-friendly layouts and remember there's no dev console on device — see Debugging below.

## Getting Started

**Setup not finished?** Check the checklist under **Next** in `docs/TODO.md`. If
anything there is unticked, run the **`finish-setup`** skill — it's resumable and
does only what's outstanding.

**Ready to build?** Every change goes through **`ship-feature`**. See below.

## Development lifecycle

Every change — feature, fix, or tweak — goes through the **`ship-feature`** skill
(`.claude/skills/ship-feature/SKILL.md`): branch off `main`, build before each
commit, push, wait for the Netlify preview, run the pre-merge doc gate, open the
PR, hand the user preview + live + merge links, then watch the production deploy
after they merge.

Two rules that hold regardless:

- **Never work on `main`.** It's protected; pushes are rejected. If you find
  yourself on it, branch before doing anything.
- **The user merges, not you.** They can't merge what they can't find, so a PR
  turn always ends with the links.

## Build & verify

- **Type-check + build:** `npm run build` (runs `vue-tsc -b && vite build`).
  This is the gate — it catches TS errors _and_ Vue template parse errors.
  **Run it before every commit.** A broken build has reached history before
  because nothing ran it; don't let that happen.
- **CI runs the same build on every PR** (`.github/workflows/ci.yml`, check name `build`), and the
  branch ruleset requires it to pass before merge. That's a backstop, not a substitute: run
  `npm run build` locally before pushing rather than letting CI find it — a red check on the user's
  PR is noise they have to interpret.
- There is **no test suite** yet. A passing build is the bar.
- This app has **no external data dependencies** — everything is stored on-device (localStorage),
  so there's nothing that needs live network access to reproduce or verify.

## Deploys

- **Netlify does both jobs** (`netlify.toml`): pushes to `main` build the **production** site at
  `https://shopping-sync.netlify.app`; every other branch/PR gets its own **Deploy Preview**
  at `deploy-preview-<n>--shopping-sync.netlify.app`. One host, one build pipeline — nothing
  else to configure for hosting.
- **`.github/workflows/ci.yml` only runs the build check on PRs** — it doesn't deploy anything. Its
  sole job is the `build` status check the branch ruleset requires (see Build & verify).
- **`package-lock.json` is committed and must stay that way** — CI runs
  `npm ci`, which fails outright without a lockfile in sync with
  `package.json`. Commit the lockfile whenever you change dependencies.

## Repo structure

```
src/
  App.vue                  header/footer shell (see docs/system-design.md §2) + tab/page content
  main.ts, pwa.ts          bootstrap; service-worker auto-update + reload
  debug.ts                 logDebug() → on-screen log (mobile has no console)
  env.d.ts                 ambient types: vite/client, PWA virtual module, __BUILD_ID__/__BUILD_TIME__
  lib/                     pure computation — list/session logic, plain functions over stored data
  components/
    HelpModal.vue          renders docs/concepts/*.md into the Help modal
    <feature components>   list view, add/edit item, session start, session view
docs/
  TODO.md                  living backlog (Done / Next branch / Housekeeping)
  experience.md            what didn't work + per-merge version history
  system-design.md         developer/system docs (§2 has wrapper template)
  concepts/*.md            per-page user docs (rendered into the Help modal)
public/
  favicon.svg, logo-192.png, logo-512.png   placeholder icons — replace with real branding
.github/workflows/ci.yml       build check on every PR (required by the branch ruleset)
netlify.toml                   preview-deploy config (Netlify)
package-lock.json               committed — CI runs `npm ci` and needs it
```

## Conventions & gotchas

- **Pure logic lives in `src/lib/`** as plain functions over the stored list data — they recompute
  instantly with no fetch. Keep new computation there (duplicate detection, category grouping,
  session assembly) and keep components thin.
- **Duplicate detection is case-insensitive, trimmed-whitespace matching** on item name. When a user
  tries to add a name that already exists, surface an "edit existing item" prompt instead of adding
  a second entry.
- **Mobile-first:** the user is on a phone. Keep controls tappable.

## Debugging on device (no console)

- `logDebug(msg)` from `src/debug.ts` appends to the **on-screen log panel**
  (expand via the footer build stamp). There's a **Copy log** button so the user
  can paste values back.
- When something's invisible/not-working on device, add a **one-shot, guarded**
  diagnostic (in `onMounted`, wrapped in try/catch) and ask the user to copy the
  log. Remove or quiet noisy logs before merge.

## Reference docs

- `.claude/skills/finish-setup/SKILL.md` — scaffold personalization + one-time hosting setup (resumable).
- `.claude/skills/ship-feature/SKILL.md` — the loop for every change.
- `.claude/skills/add-github-pages/SKILL.md` — optional Netlify-independent mirror, on request.
- `docs/TODO.md` — current backlog and what's been done.
- `docs/experience.md` — dead ends (with reasons) + version history.
- `docs/system-design.md` — developer/system documentation; §2 contains the wrapper template.
- `docs/concepts/*.md` — per-page user docs, also rendered into the Help modal.
