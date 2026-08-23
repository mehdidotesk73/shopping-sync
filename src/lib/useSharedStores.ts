import { ref, onMounted, onBeforeUnmount } from 'vue'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { Store } from './types'
import { supabase } from './supabaseClient'
import { logDebug } from '../debug'

function makeId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function normalize(name: string): string {
  return name.trim().toLowerCase()
}

interface StoreRow {
  id: string
  name: string
}

/** Supabase-backed store registry for one shared list, kept live via a realtime subscription. */
export function useSharedStores(listId: string) {
  const stores = ref<Store[]>([])
  const connected = ref(false)
  const error = ref<string | null>(null)

  function upsertLocal(store: Store) {
    const i = stores.value.findIndex((s) => s.id === store.id)
    if (i === -1) stores.value.push(store)
    else stores.value[i] = store
  }

  function removeLocal(id: string) {
    stores.value = stores.value.filter((s) => s.id !== id)
  }

  let channel: RealtimeChannel | null = null

  onMounted(async () => {
    if (!supabase) {
      error.value = 'Sharing is not configured for this deploy.'
      return
    }
    const { data, error: fetchError } = await supabase.from('list_stores').select('*').eq('list_id', listId)
    if (fetchError) {
      error.value = fetchError.message
      logDebug(`useSharedStores fetch failed: ${fetchError.message}`, 'error')
      return
    }
    stores.value = (data ?? []).map((row: StoreRow) => ({ id: row.id, name: row.name }))
    connected.value = true

    channel = supabase
      .channel(`list_stores:${listId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'list_stores', filter: `list_id=eq.${listId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') removeLocal((payload.old as StoreRow).id)
          else {
            const row = payload.new as StoreRow
            upsertLocal({ id: row.id, name: row.name })
          }
        },
      )
      .subscribe()
  })

  onBeforeUnmount(() => {
    if (channel && supabase) supabase.removeChannel(channel)
  })

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
    upsertLocal(store)
    if (supabase) {
      supabase
        .from('list_stores')
        .insert({ id: store.id, list_id: listId, name: store.name })
        .then(({ error: insertError }) => {
          if (insertError && insertError.code !== '23505') {
            logDebug(`Shared addStore failed: ${insertError.message}`, 'error')
          }
        })
    }
    return store
  }

  /** No-ops if the new name collides with a different existing store. */
  function renameStore(id: string, name: string): boolean {
    const trimmed = name.trim()
    if (!trimmed || findByName(trimmed, id)) return false
    const store = stores.value.find((s) => s.id === id)
    if (!store) return false
    store.name = trimmed
    if (supabase) {
      supabase
        .from('list_stores')
        .update({ name: trimmed })
        .eq('id', id)
        .then(({ error: updateError }) => {
          if (updateError) logDebug(`Shared renameStore failed: ${updateError.message}`, 'error')
        })
    }
    return true
  }

  function removeStore(id: string): void {
    removeLocal(id)
    if (supabase) {
      supabase
        .from('list_stores')
        .delete()
        .eq('id', id)
        .then(({ error: deleteError }) => {
          if (deleteError) logDebug(`Shared removeStore failed: ${deleteError.message}`, 'error')
        })
    }
  }

  return { stores, addStore, renameStore, removeStore, connected, error }
}
