import type { ListMeta } from './types'

const LISTS_KEY = 'shopping-sync:lists'
const ACTIVE_LIST_KEY = 'shopping-sync:activeListId'

export function loadLists(): ListMeta[] {
  try {
    const raw = localStorage.getItem(LISTS_KEY)
    return raw ? (JSON.parse(raw) as ListMeta[]) : []
  } catch {
    return []
  }
}

export function saveLists(lists: ListMeta[]): void {
  try {
    localStorage.setItem(LISTS_KEY, JSON.stringify(lists))
  } catch {
    // Storage unavailable — in-memory only for this session.
  }
}

export function loadActiveListId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_LIST_KEY)
  } catch {
    return null
  }
}

export function saveActiveListId(id: string | null): void {
  try {
    if (id) localStorage.setItem(ACTIVE_LIST_KEY, id)
    else localStorage.removeItem(ACTIVE_LIST_KEY)
  } catch {
    // Storage unavailable — in-memory only for this session.
  }
}
