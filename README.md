# Shopping Sync

A mobile-friendly shopping list manager. Add, edit, and remove items, optionally tag them with a
category (produce, frozen, etc.) and one or more preferred stores (Costco, Trader Joe's, etc.).
Adding a duplicate item is blocked — you're prompted to edit the existing one instead. Start a
shopping session for the whole list or for a single store; either way, items are grouped by
category so you can shop in order.

**Screens:**
- List view — all items, with add/edit/remove, category, and store tags
- Add/Edit item — name, category, store(s)
- Start session — pick "All items" or a specific store
- Session view — items grouped by category, checkable as you shop

Built with Vue 3 + TypeScript + Vite (PWA). Everything is stored on-device — no external services.

## Local Development

```bash
npm install
npm run dev           # Start dev server (http://localhost:5173)
npm run build         # Type-check + bundle
npm run preview       # Test production build locally
```

## Live

- **Production:** https://shopping-sync.netlify.app (once Netlify is connected)
- **Previews:** every branch/PR gets its own Netlify Deploy Preview

## Docs

- [`docs/TODO.md`](./docs/TODO.md) — backlog
- [`docs/experience.md`](./docs/experience.md) — lessons learned + version history
- [`docs/system-design.md`](./docs/system-design.md) — technical architecture
- [`docs/concepts/`](./docs/concepts/) — user-facing help docs
