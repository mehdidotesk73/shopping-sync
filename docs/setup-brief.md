# Setup brief

Temporary. `finish-setup` reads this, personalizes the project from it, then deletes it.
If you're reading this, setup hasn't finished — run the `finish-setup` skill.

- **Repo:** mehdidotesk73/shopping-sync
- **Netlify site name:** shopping-sync  (reserve alternates: shopping-sync-mehdi, shopping-sync-app)
- **Purpose:** A shopping list manager — add/edit/remove items, tag with category and preferred store(s), and shop via organized sessions.
- **UI shape:**
  - List view — all items, with add/edit/remove, category, and store tags
  - Add/Edit item — name, category, store(s)
  - Start session — pick "All items" or a specific store
  - Session view — items grouped by category, checkable as you shop
- **External data:** none, self-contained — everything stored on the user's device (offline-friendly).
- **First feature they described:** the full item list with add/edit/remove, duplicate detection (suggest editing the existing item instead of adding a duplicate), and category/store tagging.

## What they said, verbatim

> My app will be a simple shopping list manager. users can add/remove/edit items and optionally assign categories like produce, frozen, etc. and optionally add a list of store(s) where they prefer to purchase the product from (like costco, trader joes, etc.). The user should be able to start a shopping session based on the entire list, or based on store. The session provides an organized list per category. Also, duplicate items should not be added to lists and if user tries to add duplicates, the edit option should be suggested.
>
> I want to call the netlify app shopping-sync
