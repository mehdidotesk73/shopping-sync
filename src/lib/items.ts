import type { ShoppingItem } from './types'

export const UNCATEGORIZED = 'Uncategorized'

export const COMMON_CATEGORIES = [
  'Produce',
  'Dairy',
  'Meat',
  'Frozen',
  'Bakery',
  'Pantry',
  'Household',
  'Other',
]

export function normalizeName(name: string): string {
  return name.trim().toLowerCase()
}

export function findDuplicate(
  items: ShoppingItem[],
  name: string,
  excludeId?: string,
): ShoppingItem | undefined {
  const target = normalizeName(name)
  if (!target) return undefined
  return items.find((item) => item.id !== excludeId && normalizeName(item.name) === target)
}

export interface CategoryGroup {
  category: string
  items: ShoppingItem[]
}

export function groupByCategory(items: ShoppingItem[]): CategoryGroup[] {
  const map = new Map<string, ShoppingItem[]>()
  for (const item of items) {
    const key = item.category.trim() || UNCATEGORIZED
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }
  return [...map.entries()]
    .sort(([a], [b]) => {
      if (a === UNCATEGORIZED) return 1
      if (b === UNCATEGORIZED) return -1
      return a.localeCompare(b)
    })
    .map(([category, groupItems]) => ({
      category,
      items: [...groupItems].sort((a, b) => a.name.localeCompare(b.name)),
    }))
}

export function itemsForStore(items: ShoppingItem[], storeId: string | null): ShoppingItem[] {
  if (!storeId) return items
  return items.filter((item) => item.stores.includes(storeId))
}

export function allCategories(items: ShoppingItem[]): string[] {
  const set = new Set<string>(COMMON_CATEGORIES)
  for (const item of items) {
    if (item.category.trim()) set.add(item.category.trim())
  }
  return [...set].sort((a, b) => a.localeCompare(b))
}
