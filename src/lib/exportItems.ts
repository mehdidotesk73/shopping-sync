import type { ShoppingItem } from './types'

function sortedByName(items: ShoppingItem[]): ShoppingItem[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name))
}

// Reflects each item's checked state as of the last shopping session it was finished in.
export function itemsToMarkdown(items: ShoppingItem[], storeName: (id: string) => string): string {
  return sortedByName(items)
    .map((item) => {
      const details = [item.quantity, item.category, ...item.stores.map(storeName)].filter(Boolean)
      const suffix = details.length ? ` (${details.join(', ')})` : ''
      return `- [${item.checked ? 'x' : ' '}] ${item.name}${suffix}`
    })
    .join('\n')
}

export function itemsToJson(items: ShoppingItem[], storeName: (id: string) => string): string {
  const plain = sortedByName(items).map((item) => ({
    name: item.name,
    category: item.category || null,
    quantity: item.quantity || null,
    stores: item.stores.map(storeName),
    checked: item.checked,
  }))
  return JSON.stringify(plain, null, 2)
}
