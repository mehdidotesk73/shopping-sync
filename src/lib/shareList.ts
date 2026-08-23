import type { ShoppingItem, Store } from './types'
import { supabase } from './supabaseClient'

export type ShareResult = { ok: true } | { ok: false; error: string }

/**
 * Uploads a local list's current items/stores to Supabase under its own (already-UUID) id, so
 * sharing doesn't need to remap ids anywhere else in the app. One-shot — not meant to be called
 * again for the same list.
 */
export async function shareList(
  listId: string,
  listName: string,
  items: ShoppingItem[],
  stores: Store[],
): Promise<ShareResult> {
  if (!supabase) return { ok: false, error: 'Sharing is not configured for this deploy.' }

  const { error: listError } = await supabase.from('lists').insert({ id: listId, name: listName })
  if (listError) return { ok: false, error: listError.message }

  if (stores.length) {
    const { error: storesError } = await supabase
      .from('list_stores')
      .insert(stores.map((s) => ({ id: s.id, list_id: listId, name: s.name })))
    if (storesError) return { ok: false, error: storesError.message }
  }

  if (items.length) {
    const { error: itemsError } = await supabase.from('list_items').insert(
      items.map((i) => ({
        id: i.id,
        list_id: listId,
        name: i.name,
        category: i.category,
        quantity: i.quantity,
        store_ids: i.stores,
      })),
    )
    if (itemsError) return { ok: false, error: itemsError.message }
  }

  return { ok: true }
}

export function shareUrl(listId: string): string {
  const url = new URL(window.location.href)
  url.search = `?list=${listId}`
  url.hash = ''
  return url.toString()
}

export async function fetchSharedListName(listId: string): Promise<string | null> {
  if (!supabase) return null
  const { data, error } = await supabase.from('lists').select('name').eq('id', listId).single()
  if (error || !data) return null
  return data.name as string
}
