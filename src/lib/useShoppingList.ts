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

export function useShoppingList() {
  const items = ref<ShoppingItem[]>(loadItems())

  watch(items, (val) => saveItems(val), { deep: true })

  function addItem(input: ItemInput): SaveResult {
    const name = input.name.trim()
    const duplicate = findDuplicate(items.value, name)
    if (duplicate) return { ok: false, duplicate }

    items.value.push({
      id: makeId(),
      name,
      category: input.category.trim(),
      stores: [...input.stores],
      quantity: input.quantity.trim(),
    })
    return { ok: true }
  }

  function updateItem(id: string, input: ItemInput): SaveResult {
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

  function removeItem(id: string): void {
    items.value = items.value.filter((i) => i.id !== id)
  }

  return { items, addItem, updateItem, removeItem }
}
