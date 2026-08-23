# About This App

## What is this app?

Shopping Sync is a shopping list manager. Add, edit, and remove items, optionally tag them with a category (produce, frozen, etc.), one or more preferred stores (Costco, Trader Joe's, etc.), and a quantity.

## How do I use it?

- **List view** — see everything on your list, with its category, store(s), and quantity shown as tags. Tap an item to edit it, or the ⊖ to remove it.
- **⊕ Add item** — opens a grid where you can add one or several items at once.
- Type the item's **name** directly in each row.
- Tap the gray **Category ⊕** tag to type a category (with suggestions from ones you've used before), or tap an existing category tag to change it.
- Tap the light-blue **Store ⊕** tag to pick from your stores — type to filter the list, tap a store to add it. If nothing matches what you typed, an **⊕ Add "..." as store** option lets you create it and link it in one tap. Each selected store shows as its own tag; tap its ⊖ to remove it.
- Tap the orange **Quantity ⊕** tag to type a quantity (e.g. "2", "1 dozen", "2 lbs").
- **⊕ Add row** adds another item to the grid (you need a name in the current row first). The ⊖ on the left of a row removes that row.
- **Duplicates** — if a row's name matches an item already on your list, an amber button appears offering to edit that existing item instead. Two rows in the same grid with the same name are marked Duplicate, and Save is blocked until one is removed — so you can never end up with two entries for the same item.
- **Edit stores** — manage your store list directly: rename a store (✎) and every item using it updates automatically, or delete one (⊖) — you'll be told how many items reference it, and it's removed from all of them.
- **Start shopping** — pick "All items" or a specific store. You'll get a session view with your items grouped by category, and a checkbox to mark each one off as you shop.

## Common Questions

**Q: Why is my change not showing?**

A: This is a progressive web app (PWA), which means it caches content locally to work offline. If you deployed a new version but see an old one, try tapping "Reload latest" in the footer or opening the app in a private/incognito tab.

**Q: Can I use this offline?**

A: Yes. Your list is stored on your device (in the browser's local storage), so it works without an internet connection once the app has loaded.

**Q: If I rename or delete a store, what happens to my items?**

A: Renaming updates instantly everywhere that store appears — nothing else changes. Deleting a store removes it from every item that had it selected; the items themselves stay on your list, just without that store tag.

**Q: How do I report a bug?**

A: Take a screenshot and share it with the developer. If the footer shows a debug log (tap the build timestamp), copy it and include that too — it helps debug issues.

**Q: What data is stored on my device?**

A: Your entire shopping list — item names, categories, quantities, and your stores — is stored locally in your browser. Nothing is sent to any server.

---

**Need more help?** Check this modal's other pages (if any) or reach out to the developer.
