import type { ListMeta } from './types'

const OLD_ITEMS_KEY = 'shopping-sync:items'
const OLD_STORES_KEY = 'shopping-sync:stores'
const LISTS_KEY = 'shopping-sync:lists'
const ACTIVE_LIST_KEY = 'shopping-sync:activeListId'

function makeId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function listItemsKey(listId: string): string {
  return `shopping-sync:list:${listId}:items`
}

export function listStoresKey(listId: string): string {
  return `shopping-sync:list:${listId}:stores`
}

/**
 * One-time upgrade from the single-implicit-list model (everything under fixed
 * `shopping-sync:items`/`shopping-sync:stores` keys) to named, possibly-shared lists. Must run
 * after `migrateLegacyStoreData()` (which shapes that old data into Store objects) and before
 * `useLists()` reads the lists registry, so a returning user's existing list survives as
 * "My List" instead of silently vanishing.
 */
export function migrateToLists(): void {
  try {
    if (localStorage.getItem(LISTS_KEY)) return // already on the new model

    const oldItems = localStorage.getItem(OLD_ITEMS_KEY)
    const oldStores = localStorage.getItem(OLD_STORES_KEY)
    if (!oldItems && !oldStores) return // brand-new user, nothing to carry over

    const id = makeId()
    const list: ListMeta = { id, name: 'My List', shared: false }
    localStorage.setItem(LISTS_KEY, JSON.stringify([list]))
    localStorage.setItem(ACTIVE_LIST_KEY, id)
    if (oldItems) localStorage.setItem(listItemsKey(id), oldItems)
    if (oldStores) localStorage.setItem(listStoresKey(id), oldStores)
    localStorage.removeItem(OLD_ITEMS_KEY)
    localStorage.removeItem(OLD_STORES_KEY)
  } catch {
    // Best-effort migration only — loadLists()/loadItems() already fail safe (empty) if a
    // value turns out to be unreadable.
  }
}
