export interface Store {
  id: string
  name: string
}

export interface ShoppingItem {
  id: string
  name: string
  category: string
  stores: string[] // Store ids, not names — rename a Store and every item stays linked
  quantity: string
  checked: boolean // Picked-up state from the last shopping session it was finished in
}

export interface ListMeta {
  id: string
  name: string
  shared: boolean // false = local-only (localStorage); true = Supabase-backed + realtime
}
