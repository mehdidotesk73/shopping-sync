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
}
