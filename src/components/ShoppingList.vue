<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ShoppingItem } from '../lib/types'
import { useShoppingList } from '../lib/useShoppingList'
import { useStores } from '../lib/useStores'
import { migrateLegacyStoreData } from '../lib/migrateStores'
import { allCategories, findDuplicate, itemsForStore } from '../lib/items'
import { tagColor } from '../lib/tagColor'
import ItemGridModal from './ItemGridModal.vue'
import StoreManagerModal from './StoreManagerModal.vue'
import SessionView from './SessionView.vue'
import { logDebug } from '../debug'

migrateLegacyStoreData()

const { items, addItem, updateItem, removeItem } = useShoppingList()
const { stores, addStore, renameStore, removeStore } = useStores()

type View = 'list' | 'session-start' | 'session'
const view = ref<View>('list')

const showGrid = ref(false)
const gridInitialItems = ref<ShoppingItem[]>([])
const showStoreManager = ref(false)

const knownCategories = computed(() => allCategories(items.value))

const sortedItems = computed(() =>
  [...items.value].sort((a, b) => a.name.localeCompare(b.name)),
)

function storeName(id: string): string {
  return stores.value.find((s) => s.id === id)?.name ?? '(removed store)'
}

function openAdd() {
  gridInitialItems.value = []
  showGrid.value = true
}

function openEdit(item: ShoppingItem) {
  gridInitialItems.value = [item]
  showGrid.value = true
}

function closeGrid() {
  showGrid.value = false
}

type GridRow = { sourceId: string | null; name: string; category: string; stores: string[]; quantity: string }

function handleGridSave(rows: GridRow[]) {
  for (const row of rows) {
    // A row whose (possibly just-typed or just-renamed) name matches a different saved
    // item is treated as an edit of *that* item — same guarantee as the pull-to-edit icon,
    // so saving never creates a duplicate or silently no-ops even if the user ignored it.
    const targetId = findDuplicate(items.value, row.name, row.sourceId ?? undefined)?.id ?? row.sourceId ?? null
    const input = { name: row.name, category: row.category, stores: row.stores, quantity: row.quantity }
    const result = targetId ? updateItem(targetId, input) : addItem(input)
    if (result.ok) logDebug(`${targetId ? 'Updated' : 'Added'} item: ${row.name}`)
  }
  closeGrid()
}

function handleRemove(item: ShoppingItem) {
  removeItem(item.id)
  logDebug(`Removed item: ${item.name}`)
}

function handleRenameStore(payload: { id: string; name: string }) {
  renameStore(payload.id, payload.name)
  logDebug(`Renamed store to: ${payload.name}`)
}

function handleRemoveStore(id: string) {
  const name = storeName(id)
  for (const item of items.value) {
    const i = item.stores.indexOf(id)
    if (i !== -1) item.stores.splice(i, 1)
  }
  removeStore(id)
  logDebug(`Deleted store: ${name}`)
}

const sessionStore = ref<string | null>(null)
const sessionStoreName = computed(() => (sessionStore.value ? storeName(sessionStore.value) : null))

function startSessionFlow() {
  view.value = 'session-start'
}

function beginSession(storeId: string | null) {
  sessionStore.value = storeId
  view.value = 'session'
}

const sessionItems = computed(() => itemsForStore(sortedItems.value, sessionStore.value))

function endSession() {
  view.value = 'list'
  sessionStore.value = null
}
</script>

<template>
  <div class="shopping-list">
    <template v-if="view === 'list'">
      <div class="list-header">
        <button class="btn-primary" @click="openAdd">⊕ Add item</button>
        <button class="btn-secondary" :disabled="!items.length" @click="startSessionFlow">
          Start shopping
        </button>
        <button class="btn-secondary" @click="showStoreManager = true">Edit stores</button>
      </div>

      <p v-if="!items.length" class="empty">
        No items yet — tap <strong>⊕ Add item</strong> to get started.
      </p>

      <ul v-else class="item-list">
        <li v-for="item in sortedItems" :key="item.id" class="item-row" @click="openEdit(item)">
          <div class="item-info">
            <span class="item-name">
              {{ item.name }}
              <span v-if="item.quantity" class="item-qty">({{ item.quantity }})</span>
            </span>
            <div class="item-tags">
              <span v-if="item.category" class="tag" :style="tagColor(item.category)">{{ item.category }}</span>
              <span v-for="storeId in item.stores" :key="storeId" class="tag" :style="tagColor(storeId)">{{ storeName(storeId) }}</span>
            </div>
          </div>
          <button class="remove-btn" aria-label="Remove item" @click.stop="handleRemove(item)">
            ⊖
          </button>
        </li>
      </ul>
    </template>

    <template v-else-if="view === 'session-start'">
      <div class="session-start-header">
        <h2 class="session-title">Start shopping</h2>
        <button class="btn-secondary" @click="view = 'list'">Back</button>
      </div>
      <button class="option-row" @click="beginSession(null)">All items</button>
      <button
        v-for="store in stores"
        :key="store.id"
        class="option-row"
        @click="beginSession(store.id)"
      >
        {{ store.name }}
      </button>
      <p v-if="!stores.length" class="empty">
        Add a preferred store to an item to shop by store.
      </p>
    </template>

    <SessionView
      v-else-if="view === 'session'"
      :items="sessionItems"
      :store="sessionStoreName"
      @end="endSession"
    />

    <ItemGridModal
      :open="showGrid"
      :initial-items="gridInitialItems"
      :saved-items="items"
      :known-categories="knownCategories"
      :stores="stores"
      :resolve-store="addStore"
      @save="handleGridSave"
      @cancel="closeGrid"
    />

    <StoreManagerModal
      :open="showStoreManager"
      :stores="stores"
      :items="items"
      @rename="handleRenameStore"
      @remove="handleRemoveStore"
      @add="addStore"
      @close="showStoreManager = false"
    />
  </div>
</template>

<style scoped>
.shopping-list {
  padding: 0.5rem 0;
}

.list-header {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-bottom: 1rem;
}

.btn-primary,
.btn-secondary {
  min-height: 2.75rem;
  padding: 0.5rem 1.1rem;
  border-radius: 0.5rem;
  font-size: 0.95rem;
  font-weight: 600;
  border: 1px solid var(--border);
}

.btn-primary {
  background: var(--accent-blue);
  border-color: var(--accent-blue);
  color: #fff;
}

.btn-secondary {
  background: var(--bg-elev-2);
  color: var(--text);
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.empty {
  color: var(--text-muted);
  padding: 1rem 0;
}

.item-list {
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 0.6rem;
  overflow: hidden;
}

.item-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  min-height: 3.25rem;
  padding: 0.6rem 0.9rem;
  background: var(--bg-elev);
  border-bottom: 1px solid var(--border);
}

.item-row:last-child {
  border-bottom: none;
}

.item-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}

.item-name {
  font-size: 1rem;
}

.item-qty {
  font-size: 0.85rem;
  color: var(--text-muted);
  font-weight: 400;
}

.item-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}

.tag {
  font-size: 0.72rem;
  padding: 0.05rem 0.35rem;
  border-radius: 999px;
  border: 1px solid hsl(var(--tag-hue), 60%, var(--tag-lightness));
  color: hsl(var(--tag-hue), 60%, var(--tag-lightness));
  background: transparent;
  white-space: nowrap;
}

.remove-btn {
  flex-shrink: 0;
  width: 2.5rem;
  height: 2.5rem;
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 1.1rem;
}

.remove-btn:hover {
  color: var(--danger);
}

.session-start-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.session-title {
  margin: 0;
  font-size: 1.1rem;
}

.option-row {
  display: block;
  width: 100%;
  min-height: 3rem;
  margin-bottom: 0.5rem;
  padding: 0.6rem 0.9rem;
  text-align: left;
  font-size: 1rem;
  background: var(--bg-elev);
  border: 1px solid var(--border);
  border-radius: 0.6rem;
  color: var(--text);
}

.option-row:hover {
  border-color: var(--accent-blue);
}
</style>
