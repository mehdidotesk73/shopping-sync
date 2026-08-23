<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ShoppingItem } from '../lib/types'
import { useShoppingList } from '../lib/useShoppingList'
import { useKnownStores } from '../lib/useKnownStores'
import { allCategories, allStores, findDuplicate } from '../lib/items'
import { tagColor } from '../lib/tagColor'
import ItemGridModal from './ItemGridModal.vue'
import SessionView from './SessionView.vue'
import { logDebug } from '../debug'

const { items, addItem, updateItem, removeItem } = useShoppingList()
const { extraStores, addStore } = useKnownStores()

type View = 'list' | 'session-start' | 'session'
const view = ref<View>('list')

const showGrid = ref(false)
const gridInitialItems = ref<ShoppingItem[]>([])

const knownCategories = computed(() => allCategories(items.value))
const knownStores = computed(() => {
  const set = new Set<string>(extraStores.value)
  for (const store of allStores(items.value)) set.add(store)
  return [...set].sort((a, b) => a.localeCompare(b))
})

const sortedItems = computed(() =>
  [...items.value].sort((a, b) => a.name.localeCompare(b.name)),
)

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

function handleAddStore(name: string) {
  addStore(name)
  logDebug(`Added store: ${name}`)
}

function handleRemove(item: ShoppingItem) {
  removeItem(item.id)
  logDebug(`Removed item: ${item.name}`)
}

const sessionStore = ref<string | null>(null)

function startSessionFlow() {
  view.value = 'session-start'
}

function beginSession(store: string | null) {
  sessionStore.value = store
  view.value = 'session'
}

const sessionItems = computed(() => {
  if (!sessionStore.value) return sortedItems.value
  return sortedItems.value.filter((i) => i.stores.includes(sessionStore.value as string))
})

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
              <span v-for="store in item.stores" :key="store" class="tag" :style="tagColor(store)">{{ store }}</span>
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
        v-for="store in knownStores"
        :key="store"
        class="option-row"
        @click="beginSession(store)"
      >
        {{ store }}
      </button>
      <p v-if="!knownStores.length" class="empty">
        Add a preferred store to an item to shop by store.
      </p>
    </template>

    <SessionView
      v-else-if="view === 'session'"
      :items="sessionItems"
      :store="sessionStore"
      @end="endSession"
    />

    <ItemGridModal
      :open="showGrid"
      :initial-items="gridInitialItems"
      :saved-items="items"
      :known-categories="knownCategories"
      :known-stores="knownStores"
      @save="handleGridSave"
      @cancel="closeGrid"
      @add-store="handleAddStore"
    />
  </div>
</template>

<style scoped>
.shopping-list {
  padding: 0.5rem 0;
}

.list-header {
  display: flex;
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
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
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
