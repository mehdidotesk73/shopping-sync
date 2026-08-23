import type { Store } from './types'

const STORAGE_KEY = 'shopping-sync:stores'

export function loadStores(): Store[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Store[]) : []
  } catch {
    return []
  }
}

export function saveStores(stores: Store[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stores))
  } catch {
    // Storage unavailable — in-memory only for this session.
  }
}
