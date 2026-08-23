<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ShoppingItem } from '../lib/types'
import { useShoppingList } from '../lib/useShoppingList'
import { allCategories, allStores } from '../lib/items'
import ItemFormModal from './ItemFormModal.vue'
import SessionView from './SessionView.vue'
import { logDebug } from '../debug'

const { items, addItem, updateItem, removeItem } = useShoppingList()

type View = 'list' | 'session-start' | 'session'
const view = ref<View>('list')

const showForm = ref(false)
const editing = ref<ShoppingItem | null>(null)
const duplicate = ref<ShoppingItem | null>(null)

const knownCategories = computed(() => allCategories(items.value))
const knownStores = computed(() => allStores(items.value))

const sortedItems = computed(() =>
  [...items.value].sort((a, b) => a.name.localeCompare(b.name)),
)

function openAdd() {
  editing.value = null
  duplicate.value = null
  showForm.value = true
}

function openEdit(item: ShoppingItem) {
  editing.value = item
  duplicate.value = null
  showForm.value = true
}

function closeForm() {
  showForm.value = false
  editing.value = null
  duplicate.value = null
}

function handleSave(input: { name: string; category: string; stores: string[] }) {
  const result = editing.value ? updateItem(editing.value.id, input) : addItem(input)
  if (!result.ok) {
    duplicate.value = result.duplicate
    return
  }
  logDebug(`${editing.value ? 'Updated' : 'Added'} item: ${input.name}`)
  closeForm()
}

function handleEditDuplicate() {
  if (!duplicate.value) return
  editing.value = duplicate.value
  duplicate.value = null
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
        <button class="btn-primary" @click="openAdd">+ Add item</button>
        <button class="btn-secondary" :disabled="!items.length" @click="startSessionFlow">
          Start shopping
        </button>
      </div>

      <p v-if="!items.length" class="empty">
        No items yet — tap <strong>+ Add item</strong> to get started.
      </p>

      <ul v-else class="item-list">
        <li v-for="item in sortedItems" :key="item.id" class="item-row" @click="openEdit(item)">
          <div class="item-info">
            <span class="item-name">{{ item.name }}</span>
            <div class="item-tags">
              <span v-if="item.category" class="tag category-tag">{{ item.category }}</span>
              <span v-for="store in item.stores" :key="store" class="tag store-tag">{{ store }}</span>
            </div>
          </div>
          <button class="remove-btn" aria-label="Remove item" @click.stop="handleRemove(item)">
            ✕
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

    <ItemFormModal
      :open="showForm"
      :editing="editing"
      :known-categories="knownCategories"
      :known-stores="knownStores"
      :duplicate="duplicate"
      @save="handleSave"
      @cancel="closeForm"
      @edit-duplicate="handleEditDuplicate"
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

.category-tag {
  background: var(--bg-elev-2);
  color: var(--text-muted);
}

.store-tag {
  background: var(--accent-blue);
  color: #fff;
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
