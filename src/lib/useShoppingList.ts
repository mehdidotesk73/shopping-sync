import { ref, watch } from 'vue'
import type { ShoppingItem } from './types'
import { loadItems, saveItems } from './storage'
import { findDuplicate } from './items'

function makeId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export type ItemInput = { name: string; category: string; stores: string[]; quantity: string }
export type SaveResult = { ok: true } | { ok: false; duplicate: ShoppingItem }

/**
 * Local (localStorage-backed) item store for one list. `addItem`/`updateItem`/`removeItem` are
 * async to match `useSharedItems`'s interface (a network call there) even though these resolve
 * immediately — callers can `await` either without caring which kind of list they're talking to.
 */
export function useLocalItems(listId: string) {
  const items = ref<ShoppingItem[]>(loadItems(listId))
  // Present for interface parity with useSharedItems, which really can be disconnected/erroring.
  const connected = ref(true)
  const error = ref<string | null>(null)

  watch(items, (val) => saveItems(listId, val), { deep: true })

  async function addItem(input: ItemInput): Promise<SaveResult> {
    const name = input.name.trim()
    const duplicate = findDuplicate(items.value, name)
    if (duplicate) return { ok: false, duplicate }

    items.value.push({
      id: makeId(),
      name,
      category: input.category.trim(),
      stores: [...input.stores],
      quantity: input.quantity.trim(),
      checked: false,
    })
    return { ok: true }
  }

  async function updateItem(id: string, input: ItemInput): Promise<SaveResult> {
    const name = input.name.trim()
    const duplicate = findDuplicate(items.value, name, id)
    if (duplicate) return { ok: false, duplicate }

    const item = items.value.find((i) => i.id === id)
    if (!item) return { ok: true }
    item.name = name
    item.category = input.category.trim()
    item.stores = [...input.stores]
    item.quantity = input.quantity.trim()
    return { ok: true }
  }

  async function removeItem(id: string): Promise<void> {
    items.value = items.value.filter((i) => i.id !== id)
  }

  // Written only by finishing a shopping session — not part of ItemInput/the grid, since
  // it's session-derived state rather than something edited directly.
  async function setChecked(updates: { id: string; checked: boolean }[]): Promise<void> {
    for (const { id, checked } of updates) {
      const item = items.value.find((i) => i.id === id)
      if (item) item.checked = checked
    }
  }

  return { items, addItem, updateItem, removeItem, setChecked, connected, error }
}
