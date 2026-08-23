import type { Store } from './types'
import { listStoresKey } from './migrateToLists'

export function loadStores(listId: string): Store[] {
  try {
    const raw = localStorage.getItem(listStoresKey(listId))
    return raw ? (JSON.parse(raw) as Store[]) : []
  } catch {
    return []
  }
}

export function saveStores(listId: string, stores: Store[]): void {
  try {
    localStorage.setItem(listStoresKey(listId), JSON.stringify(stores))
  } catch {
    // Storage unavailable — in-memory only for this session.
  }
}
