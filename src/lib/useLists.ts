import { ref, watch } from 'vue'
import type { ListMeta } from './types'
import { loadLists, saveLists, loadActiveListId, saveActiveListId } from './lists'

function makeId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function useLists() {
  const lists = ref<ListMeta[]>(loadLists())
  const activeListId = ref<string | null>(loadActiveListId())

  watch(lists, (val) => saveLists(val), { deep: true })
  watch(activeListId, (val) => saveActiveListId(val))

  function createList(name: string): ListMeta {
    const list: ListMeta = { id: makeId(), name: name.trim() || 'Untitled list', shared: false }
    lists.value.push(list)
    return list
  }

  function renameList(id: string, name: string): void {
    const list = lists.value.find((l) => l.id === id)
    if (list && name.trim()) list.name = name.trim()
  }

  /** Removes the list from this device's registry only — never deletes shared server data. */
  function removeList(id: string): void {
    lists.value = lists.value.filter((l) => l.id !== id)
    if (activeListId.value === id) activeListId.value = null
  }

  function markShared(id: string): void {
    const list = lists.value.find((l) => l.id === id)
    if (list) list.shared = true
  }

  /** Registers a list this device is joining via a share link, if not already known. */
  function registerSharedList(id: string, name: string): void {
    if (lists.value.some((l) => l.id === id)) return
    lists.value.push({ id, name, shared: true })
  }

  return {
    lists,
    activeListId,
    createList,
    renameList,
    removeList,
    markShared,
    registerSharedList,
  }
}
