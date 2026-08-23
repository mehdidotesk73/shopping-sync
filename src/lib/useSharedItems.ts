import { ref, onMounted, onBeforeUnmount } from 'vue'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { ShoppingItem } from './types'
import type { ItemInput, SaveResult } from './useShoppingList'
import { supabase } from './supabaseClient'
import { findDuplicate } from './items'
import { logDebug } from '../debug'

function makeId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

interface ItemRow {
  id: string
  name: string
  category: string
  quantity: string
  store_ids: string[]
  checked: boolean | null
}

function rowToItem(row: ItemRow): ShoppingItem {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    quantity: row.quantity,
    stores: row.store_ids ?? [],
    checked: row.checked ?? false,
  }
}

/**
 * Supabase-backed item store for one shared list, kept live via a realtime subscription.
 * The realtime channel is the single source of truth for `items` — writes are optimistic
 * (applied locally immediately for a snappy feel on the writer's own device) but the
 * subscription's echo of that same write is what every other viewer actually sees, and a
 * duplicate echo on your own device is a harmless upsert-by-id, not a second entry.
 */
export function useSharedItems(listId: string) {
  const items = ref<ShoppingItem[]>([])
  const connected = ref(false)
  const error = ref<string | null>(null)

  function upsertLocal(item: ShoppingItem) {
    const i = items.value.findIndex((it) => it.id === item.id)
    if (i === -1) items.value.push(item)
    else items.value[i] = item
  }

  function removeLocal(id: string) {
    items.value = items.value.filter((it) => it.id !== id)
  }

  let channel: RealtimeChannel | null = null

  onMounted(async () => {
    if (!supabase) {
      error.value = 'Sharing is not configured for this deploy.'
      return
    }
    const { data, error: fetchError } = await supabase.from('list_items').select('*').eq('list_id', listId)
    if (fetchError) {
      error.value = fetchError.message
      logDebug(`useSharedItems fetch failed: ${fetchError.message}`, 'error')
      return
    }
    items.value = (data ?? []).map(rowToItem)
    connected.value = true

    channel = supabase
      .channel(`list_items:${listId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'list_items', filter: `list_id=eq.${listId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') removeLocal((payload.old as ItemRow).id)
          else upsertLocal(rowToItem(payload.new as ItemRow))
        },
      )
      .subscribe()
  })

  onBeforeUnmount(() => {
    if (channel && supabase) supabase.removeChannel(channel)
  })

  async function addItem(input: ItemInput): Promise<SaveResult> {
    const name = input.name.trim()
    const duplicate = findDuplicate(items.value, name)
    if (duplicate) return { ok: false, duplicate }
    if (!supabase) return { ok: true }

    const item: ShoppingItem = {
      id: makeId(),
      name,
      category: input.category.trim(),
      quantity: input.quantity.trim(),
      stores: [...input.stores],
      checked: false,
    }
    upsertLocal(item)

    const { error: insertError } = await supabase.from('list_items').insert({
      id: item.id,
      list_id: listId,
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      store_ids: item.stores,
      checked: item.checked,
    })
    if (insertError) {
      // A unique-name race with another viewer is expected occasionally — their insert
      // already won, and the realtime echo for it will bring items.value in sync shortly.
      if (insertError.code !== '23505') logDebug(`Shared addItem failed: ${insertError.message}`, 'error')
      removeLocal(item.id)
    }
    return { ok: true }
  }

  async function updateItem(id: string, input: ItemInput): Promise<SaveResult> {
    const name = input.name.trim()
    const duplicate = findDuplicate(items.value, name, id)
    if (duplicate) return { ok: false, duplicate }
    if (!supabase) return { ok: true }

    const item = items.value.find((i) => i.id === id)
    if (item) {
      item.name = name
      item.category = input.category.trim()
      item.quantity = input.quantity.trim()
      item.stores = [...input.stores]
    }

    const { error: updateError } = await supabase
      .from('list_items')
      .update({ name, category: input.category.trim(), quantity: input.quantity.trim(), store_ids: input.stores })
      .eq('id', id)
    if (updateError) logDebug(`Shared updateItem failed: ${updateError.message}`, 'error')
    return { ok: true }
  }

  async function removeItem(id: string): Promise<void> {
    removeLocal(id)
    if (!supabase) return
    const { error: deleteError } = await supabase.from('list_items').delete().eq('id', id)
    if (deleteError) logDebug(`Shared removeItem failed: ${deleteError.message}`, 'error')
  }

  // Written only by finishing a shopping session — not part of ItemInput/the grid, since
  // it's session-derived state rather than something edited directly.
  async function setChecked(updates: { id: string; checked: boolean }[]): Promise<void> {
    for (const { id, checked } of updates) {
      const item = items.value.find((i) => i.id === id)
      if (item) item.checked = checked
      if (!supabase) continue
      const { error: updateError } = await supabase.from('list_items').update({ checked }).eq('id', id)
      if (updateError) logDebug(`Shared setChecked failed: ${updateError.message}`, 'error')
    }
  }

  return { items, addItem, updateItem, removeItem, setChecked, connected, error }
}
