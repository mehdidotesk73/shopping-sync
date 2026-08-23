import type { ShoppingItem } from './types'
import { listItemsKey } from './migrateToLists'

export function loadItems(listId: string): ShoppingItem[] {
  try {
    const raw = localStorage.getItem(listItemsKey(listId))
    return raw ? (JSON.parse(raw) as ShoppingItem[]) : []
  } catch {
    return []
  }
}

export function saveItems(listId: string, items: ShoppingItem[]): void {
  try {
    localStorage.setItem(listItemsKey(listId), JSON.stringify(items))
  } catch {
    // Storage unavailable (private mode, quota) — in-memory state still works for this session.
  }
}
