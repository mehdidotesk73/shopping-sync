const STORAGE_KEY = 'shopping-sync:stores'

export function loadExtraStores(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

export function saveExtraStores(stores: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stores))
  } catch {
    // Storage unavailable — in-memory only for this session.
  }
}
