<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { ShoppingItem } from '../lib/types'

interface Row {
  key: string
  sourceId: string | null
  name: string
  category: string
  stores: string[]
  quantity: string
}

interface SavedRow {
  sourceId: string | null
  name: string
  category: string
  stores: string[]
  quantity: string
}

interface Props {
  open: boolean
  initialItems: ShoppingItem[]
  savedItems: ShoppingItem[]
  knownCategories: string[]
  knownStores: string[]
}

interface Emits {
  (e: 'save', rows: SavedRow[]): void
  (e: 'cancel'): void
  (e: 'add-store', name: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

function makeKey(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function blankRow(): Row {
  return { key: makeKey(), sourceId: null, name: '', category: '', stores: [], quantity: '' }
}

function rowFromItem(item: ShoppingItem): Row {
  return {
    key: makeKey(),
    sourceId: item.id,
    name: item.name,
    category: item.category,
    stores: [...item.stores],
    quantity: item.quantity,
  }
}

const rows = ref<Row[]>([blankRow()])
const openStorePicker = ref<string | null>(null)
const showAddStore = ref(false)
const newStoreName = ref('')

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    rows.value = props.initialItems.length
      ? props.initialItems.map(rowFromItem)
      : [blankRow()]
    openStorePicker.value = null
    showAddStore.value = false
    newStoreName.value = ''
  },
  { immediate: true },
)

function normalize(name: string): string {
  return name.trim().toLowerCase()
}

const duplicateNames = computed(() => {
  const counts = new Map<string, number>()
  for (const row of rows.value) {
    const n = normalize(row.name)
    if (!n) continue
    counts.set(n, (counts.get(n) ?? 0) + 1)
  }
  return new Set([...counts.entries()].filter(([, count]) => count > 1).map(([n]) => n))
})

function isDuplicateInGrid(row: Row): boolean {
  const n = normalize(row.name)
  return !!n && duplicateNames.value.has(n)
}

function existingMatch(row: Row): ShoppingItem | undefined {
  const n = normalize(row.name)
  if (!n) return undefined
  return props.savedItems.find((item) => item.id !== row.sourceId && normalize(item.name) === n)
}

function pullExisting(row: Row) {
  const match = existingMatch(row)
  if (!match) return
  row.sourceId = match.id
  row.name = match.name
  row.category = match.category
  row.stores = [...match.stores]
  row.quantity = match.quantity
}

function addRow() {
  rows.value.push(blankRow())
}

function removeRow(key: string) {
  rows.value = rows.value.filter((r) => r.key !== key)
  if (openStorePicker.value === key) openStorePicker.value = null
}

function toggleStorePicker(key: string) {
  openStorePicker.value = openStorePicker.value === key ? null : key
}

function toggleStoreOnRow(row: Row, store: string) {
  const i = row.stores.indexOf(store)
  if (i === -1) row.stores.push(store)
  else row.stores.splice(i, 1)
}

function confirmAddStore() {
  const name = newStoreName.value.trim()
  if (!name) return
  emit('add-store', name)
  newStoreName.value = ''
  showAddStore.value = false
}

const canSave = computed(
  () => rows.value.some((r) => r.name.trim()) && !rows.value.some((r) => isDuplicateInGrid(r)),
)

function save() {
  if (!canSave.value) return
  const payload: SavedRow[] = rows.value
    .filter((r) => r.name.trim())
    .map((r) => ({
      sourceId: r.sourceId,
      name: r.name.trim(),
      category: r.category.trim(),
      stores: [...r.stores],
      quantity: r.quantity.trim(),
    }))
  emit('save', payload)
}
</script>

<template>
  <div v-if="open" class="modal-overlay" @click="emit('cancel')">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2 class="modal-title">Add / edit items</h2>
        <div class="add-store">
          <button v-if="!showAddStore" class="btn-secondary" @click="showAddStore = true">
            + Add store
          </button>
          <template v-else>
            <input
              v-model="newStoreName"
              type="text"
              placeholder="Store name"
              autofocus
              @keyup.enter="confirmAddStore"
            />
            <button class="btn-secondary" @click="confirmAddStore">Add</button>
            <button class="btn-secondary" @click="showAddStore = false">Cancel</button>
          </template>
        </div>
      </div>

      <datalist id="grid-category-suggestions">
        <option v-for="c in knownCategories" :key="c" :value="c" />
      </datalist>

      <div class="grid-scroll">
        <table class="grid">
          <thead>
            <tr>
              <th class="col-name">Name</th>
              <th class="col-category">Category</th>
              <th class="col-store">Store</th>
              <th class="col-qty">Qty</th>
              <th class="col-actions"></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in rows"
              :key="row.key"
              :class="{ duplicate: isDuplicateInGrid(row), linked: row.sourceId && !isDuplicateInGrid(row) }"
            >
              <td class="col-name">
                <input v-model="row.name" type="text" placeholder="Item name" />
              </td>
              <td class="col-category">
                <input
                  v-model="row.category"
                  type="text"
                  list="grid-category-suggestions"
                  placeholder="Category"
                />
              </td>
              <td class="col-store">
                <div class="store-picker">
                  <button type="button" class="store-btn" @click="toggleStorePicker(row.key)">
                    {{ row.stores.length ? row.stores.join(', ') : 'Store' }}
                  </button>
                  <div v-if="openStorePicker === row.key" class="store-popover">
                    <label v-for="store in knownStores" :key="store" class="store-option">
                      <input
                        type="checkbox"
                        :checked="row.stores.includes(store)"
                        @change="toggleStoreOnRow(row, store)"
                      />
                      {{ store }}
                    </label>
                    <p v-if="!knownStores.length" class="store-empty">
                      No stores yet — use "+ Add store" above.
                    </p>
                  </div>
                </div>
              </td>
              <td class="col-qty">
                <input v-model="row.quantity" type="text" placeholder="Qty" />
              </td>
              <td class="col-actions">
                <span v-if="isDuplicateInGrid(row)" class="status duplicate-status">Duplicate</span>
                <button
                  v-else-if="existingMatch(row)"
                  type="button"
                  class="status pull-status"
                  title="An item with this name already exists — tap to edit it instead"
                  @click="pullExisting(row)"
                >
                  ● Edit existing
                </button>
                <button
                  type="button"
                  class="remove-row-btn"
                  aria-label="Remove row"
                  @click="removeRow(row.key)"
                >
                  ✕
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <button type="button" class="btn-secondary add-row-btn" @click="addRow">+ Add row</button>

      <div class="modal-actions">
        <button class="btn-secondary" @click="emit('cancel')">Cancel</button>
        <button class="btn-primary" :disabled="!canSave" @click="save">Save</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 100;
}

.modal-content {
  width: 100%;
  max-width: 46rem;
  max-height: 92vh;
  overflow-y: auto;
  background: var(--bg-elev);
  border-radius: 1rem 1rem 0 0;
  padding: 1.25rem;
  padding-bottom: max(1.25rem, env(safe-area-inset-bottom));
  box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.3);
}

@media (min-width: 30rem) {
  .modal-overlay {
    align-items: center;
  }
  .modal-content {
    border-radius: 1rem;
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.modal-title {
  margin: 0;
  font-size: 1.15rem;
}

.add-store {
  display: flex;
  gap: 0.4rem;
}

.add-store input {
  min-height: 2.5rem;
  padding: 0.4rem 0.6rem;
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  background: var(--bg);
  color: var(--text);
  font-size: 0.9rem;
  width: 9rem;
}

.grid-scroll {
  overflow-x: auto;
  border: 1px solid var(--border);
  border-radius: 0.6rem;
  margin-bottom: 0.6rem;
}

.grid {
  width: 100%;
  min-width: 40rem;
  border-collapse: collapse;
}

.grid th {
  text-align: left;
  font-size: 0.78rem;
  color: var(--text-muted);
  font-weight: 600;
  padding: 0.5rem 0.6rem;
  background: var(--bg-elev-2);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
}

.grid td {
  padding: 0.4rem 0.6rem;
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
}

.grid tbody tr:last-child td {
  border-bottom: none;
}

.grid tr.duplicate td {
  background: rgba(211, 47, 47, 0.12);
}

.grid tr.linked td {
  background: rgba(0, 102, 204, 0.06);
}

.col-name {
  width: 30%;
}

.col-category {
  width: 22%;
}

.col-store {
  width: 22%;
}

.col-qty {
  width: 10%;
}

.col-actions {
  width: 16%;
  white-space: nowrap;
}

.grid input[type='text'] {
  width: 100%;
  min-height: 2.5rem;
  padding: 0.4rem 0.5rem;
  border: 1px solid var(--border);
  border-radius: 0.4rem;
  background: var(--bg);
  color: var(--text);
  font-size: 0.9rem;
}

.store-picker {
  position: relative;
}

.store-btn {
  width: 100%;
  min-height: 2.5rem;
  padding: 0.4rem 0.5rem;
  border: 1px solid var(--border);
  border-radius: 0.4rem;
  background: var(--bg);
  color: var(--text);
  font-size: 0.85rem;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.store-popover {
  position: absolute;
  top: calc(100% + 0.25rem);
  left: 0;
  z-index: 110;
  min-width: 10rem;
  max-height: 12rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  padding: 0.5rem;
  background: var(--bg-elev);
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
}

.store-option {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  white-space: nowrap;
}

.store-empty {
  font-size: 0.78rem;
  color: var(--text-muted);
  margin: 0;
  white-space: normal;
  max-width: 10rem;
}

.status {
  display: inline-flex;
  align-items: center;
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 999px;
  border: none;
  white-space: nowrap;
  margin-right: 0.3rem;
}

.duplicate-status {
  background: var(--danger);
  color: #fff;
}

.pull-status {
  background: #ffb300;
  color: #1a1a1a;
  font-weight: 600;
}

.remove-row-btn {
  width: 2.25rem;
  height: 2.25rem;
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 1rem;
}

.remove-row-btn:hover {
  color: var(--danger);
}

.add-row-btn {
  width: 100%;
  margin-bottom: 1rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
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

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--bg-elev-2);
  color: var(--text);
}
</style>
