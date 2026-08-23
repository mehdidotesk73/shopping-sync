import type { ShoppingItem } from './types'
import { listItemsKey } from './migrateToLists'

export function loadItems(listId: string): ShoppingItem[] {
  try {
    const raw = localStorage.getItem(listItemsKey(listId))
    if (!raw) return []
    // `checked` postdates this format — data saved before it existed just gets false.
    const parsed = JSON.parse(raw) as Array<Omit<ShoppingItem, 'checked'> & { checked?: boolean }>
    return parsed.map((item) => ({ ...item, checked: item.checked ?? false }))
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
