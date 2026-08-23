import type { Store, ShoppingItem } from './types'

const STORES_KEY = 'shopping-sync:stores'
const ITEMS_KEY = 'shopping-sync:items'

function makeId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/**
 * One-time upgrade for data saved before stores became id-based objects: the stores list
 * used to be plain name strings, and items referenced stores by name instead of id. Must run
 * before the stores/items composables read localStorage, so both see the new shape on their
 * very first load — a stale item.stores entry would otherwise resolve to no store at all.
 */
export function migrateLegacyStoreData(): void {
  try {
    const rawStores = localStorage.getItem(STORES_KEY)
    const rawItems = localStorage.getItem(ITEMS_KEY)
    const parsedStores: unknown[] = rawStores ? JSON.parse(rawStores) : []
    const parsedItems: ShoppingItem[] = rawItems ? JSON.parse(rawItems) : []

    const storeIds = new Set(
      parsedStores
        .filter((s): s is Store => typeof s === 'object' && s !== null && 'id' in s && 'name' in s)
        .map((s) => s.id),
    )
    const alreadyMigrated = storeIds.size === parsedStores.length
    const itemsAlreadyReferenceIds = parsedItems.every((item) =>
      (item.stores ?? []).every((s) => storeIds.has(s)),
    )
    if (alreadyMigrated && itemsAlreadyReferenceIds) return

    const byName = new Map<string, Store>()
    const stores: Store[] = []

    function register(name: string): Store {
      const key = name.trim().toLowerCase()
      const existing = byName.get(key)
      if (existing) return existing
      const store: Store = { id: makeId(), name: name.trim() }
      byName.set(key, store)
      stores.push(store)
      return store
    }

    for (const s of parsedStores) {
      const name = typeof s === 'string' ? s : (s as Store)?.name
      if (name) register(name)
    }

    const items = parsedItems.map((item) => ({
      ...item,
      stores: (item.stores ?? []).map((s) => (storeIds.has(s) ? s : register(s).id)),
    }))

    localStorage.setItem(STORES_KEY, JSON.stringify(stores))
    localStorage.setItem(ITEMS_KEY, JSON.stringify(items))
  } catch {
    // Best-effort migration only — loadStores()/loadItems() already fail safe (empty array)
    // if a value turns out to be unreadable.
  }
}
