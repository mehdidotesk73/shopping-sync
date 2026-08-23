import { ref, watch } from 'vue'
import { loadExtraStores, saveExtraStores } from './stores'

/**
 * Stores a user has registered even before any item uses them, so "Add store" in the
 * item grid makes a store selectable immediately. Merge with `allStores(items)` for the
 * full known-store list.
 */
export function useKnownStores() {
  const extraStores = ref<string[]>(loadExtraStores())

  watch(extraStores, (val) => saveExtraStores(val), { deep: true })

  function addStore(name: string): void {
    const trimmed = name.trim()
    if (!trimmed) return
    const exists = extraStores.value.some((s) => s.toLowerCase() === trimmed.toLowerCase())
    if (!exists) extraStores.value.push(trimmed)
  }

  return { extraStores, addStore }
}
