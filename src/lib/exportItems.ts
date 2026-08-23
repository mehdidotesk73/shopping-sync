import type { ShoppingItem } from './types'

function sortedByName(items: ShoppingItem[]): ShoppingItem[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name))
}

// Unchecked, since this is the master list, not an in-progress session — checking an item off
// is a session-scoped concept and has no meaning here.
export function itemsToMarkdown(items: ShoppingItem[], storeName: (id: string) => string): string {
  return sortedByName(items)
    .map((item) => {
      const details = [item.quantity, item.category, ...item.stores.map(storeName)].filter(Boolean)
      const suffix = details.length ? ` (${details.join(', ')})` : ''
      return `- [ ] ${item.name}${suffix}`
    })
    .join('\n')
}

export function itemsToJson(items: ShoppingItem[], storeName: (id: string) => string): string {
  const plain = sortedByName(items).map((item) => ({
    name: item.name,
    category: item.category || null,
    quantity: item.quantity || null,
    stores: item.stores.map(storeName),
  }))
  return JSON.stringify(plain, null, 2)
}
