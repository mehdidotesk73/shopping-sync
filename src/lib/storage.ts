import type { ShoppingItem } from './types'

const STORAGE_KEY = 'shopping-sync:items'

export function loadItems(): ShoppingItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as ShoppingItem[]) : []
  } catch {
    return []
  }
}

export function saveItems(items: ShoppingItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    // Storage unavailable (private mode, quota) — in-memory state still works for this session.
  }
}
