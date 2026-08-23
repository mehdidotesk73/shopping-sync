import { ref, watch } from 'vue'
import type { Store } from './types'
import { loadStores, saveStores } from './stores'

function makeId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function normalize(name: string): string {
  return name.trim().toLowerCase()
}

export function useStores() {
  const stores = ref<Store[]>(loadStores())

  watch(stores, (val) => saveStores(val), { deep: true })

  function findByName(name: string, excludeId?: string): Store | undefined {
    const n = normalize(name)
    if (!n) return undefined
    return stores.value.find((s) => s.id !== excludeId && normalize(s.name) === n)
  }

  /** Returns the existing store if the (trimmed, case-insensitive) name is already known. */
  function addStore(name: string): Store {
    const existing = findByName(name)
    if (existing) return existing
    const store: Store = { id: makeId(), name: name.trim() }
    stores.value.push(store)
    return store
  }

  /** No-ops if the new name collides with a different existing store. */
  function renameStore(id: string, name: string): boolean {
    const trimmed = name.trim()
    if (!trimmed || findByName(trimmed, id)) return false
    const store = stores.value.find((s) => s.id === id)
    if (!store) return false
    store.name = trimmed
    return true
  }

  function removeStore(id: string): void {
    stores.value = stores.value.filter((s) => s.id !== id)
  }

  return { stores, addStore, renameStore, removeStore }
}
