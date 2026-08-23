<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { ShoppingItem, Store } from '../lib/types'
import { tagColor } from '../lib/tagColor'
import { logDebug } from '../debug'

interface Row {
  key: string
  sourceId: string | null
  name: string
  category: string
  stores: string[] // Store ids
  quantity: string
}

interface SavedRow {
  sourceId: string | null
  name: string
  category: string
  stores: string[] // Store ids
  quantity: string
}

interface Props {
  open: boolean
  initialItems: ShoppingItem[]
  savedItems: ShoppingItem[]
  knownCategories: string[]
  stores: Store[]
  resolveStore: (name: string) => Store
}

interface Emits {
  (e: 'save', rows: SavedRow[]): void
  (e: 'cancel'): void
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
const storeFilter = ref('')
const showAddStore = ref(false)
const newStoreName = ref('')
const editingField = ref<{ key: string; field: 'category' | 'quantity' } | null>(null)
const editBuffer = ref('')

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    rows.value = props.initialItems.length ? props.initialItems.map(rowFromItem) : [blankRow()]
    openStorePicker.value = null
    storeFilter.value = ''
    showAddStore.value = false
    newStoreName.value = ''
    editingField.value = null
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

const canAddRow = computed(() => {
  const last = rows.value[rows.value.length - 1]
  return !last || last.name.trim().length > 0
})

function addRow() {
  if (!canAddRow.value) return
  rows.value.push(blankRow())
}

function removeRow(key: string) {
  rows.value = rows.value.filter((r) => r.key !== key)
  if (openStorePicker.value === key) openStorePicker.value = null
  if (editingField.value?.key === key) editingField.value = null
}

function toggleStorePicker(key: string) {
  if (openStorePicker.value === key) {
    openStorePicker.value = null
  } else {
    openStorePicker.value = key
    storeFilter.value = ''
  }
}

function toggleStoreOnRow(row: Row, storeId: string) {
  const i = row.stores.indexOf(storeId)
  if (i === -1) row.stores.push(storeId)
  else row.stores.splice(i, 1)
}

function storeName(id: string): string {
  return props.stores.find((s) => s.id === id)?.name ?? '(removed store)'
}

// Only candidates not already on the open row, so the dropdown is purely "add a store" —
// removing one happens via the tag's own ⊖, not by re-toggling it in this list.
const filteredStores = computed(() => {
  const openRow = rows.value.find((r) => r.key === openStorePicker.value)
  const selectedIds = new Set(openRow?.stores ?? [])
  const f = storeFilter.value.trim().toLowerCase()
  return props.stores.filter((s) => !selectedIds.has(s.id) && (!f || s.name.toLowerCase().includes(f)))
})

function selectStore(row: Row, store: Store) {
  if (!row.stores.includes(store.id)) row.stores.push(store.id)
  openStorePicker.value = null
  storeFilter.value = ''
}

function addAndSelectStore(row: Row, name: string) {
  const trimmed = name.trim()
  if (!trimmed) return
  const store = props.resolveStore(trimmed)
  if (!row.stores.includes(store.id)) row.stores.push(store.id)
  openStorePicker.value = null
  storeFilter.value = ''
}

function startEditCategory(row: Row) {
  editingField.value = { key: row.key, field: 'category' }
  editBuffer.value = row.category
}

function startEditQuantity(row: Row) {
  editingField.value = { key: row.key, field: 'quantity' }
  editBuffer.value = row.quantity
}

function isEditing(row: Row, field: 'category' | 'quantity'): boolean {
  return editingField.value?.key === row.key && editingField.value.field === field
}

function commitEdit(row: Row) {
  if (!editingField.value || editingField.value.key !== row.key) return
  const value = editBuffer.value.trim()
  if (editingField.value.field === 'category') row.category = value
  else row.quantity = value
  editingField.value = null
}

// Blur fires synchronously as part of the same tap that moves focus elsewhere (e.g. onto
// the Save button). Committing immediately shrinks the row right then, and on iOS Safari a
// DOM mutation mid-gesture can suppress that tap's click entirely. Deferring the commit to
// the next tick lets the tap's own click finish dispatching first.
function deferCommit(row: Row) {
  setTimeout(() => commitEdit(row), 0)
}

function cancelEdit() {
  editingField.value = null
}

function confirmAddStore() {
  const name = newStoreName.value.trim()
  if (!name) return
  props.resolveStore(name)
  newStoreName.value = ''
  showAddStore.value = false
}

const canSave = computed(
  () => rows.value.some((r) => r.name.trim()) && !rows.value.some((r) => isDuplicateInGrid(r)),
)

function save() {
  logDebug(`Save tapped: canSave=${canSave.value}, rows=${rows.value.length}`)
  if (!canSave.value) return
  try {
    const payload: SavedRow[] = rows.value
      .filter((r) => r.name.trim())
      .map((r) => ({
        sourceId: r.sourceId,
        name: r.name.trim(),
        category: r.category.trim(),
        stores: [...r.stores],
        quantity: r.quantity.trim(),
      }))
    logDebug(`Emitting save with ${payload.length} row(s)`)
    emit('save', payload)
  } catch (e) {
    logDebug(`Save threw: ${e instanceof Error ? e.message : String(e)}`, 'error')
  }
}
</script>

<template>
  <div v-if="open" class="modal-overlay" @click="emit('cancel')">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2 class="modal-title">Add / edit items</h2>
        <div class="add-store">
          <button v-if="!showAddStore" class="btn-secondary" @click="showAddStore = true">
            ⊕ Add store
          </button>
          <template v-else>
            <input
              v-model="newStoreName"
              type="text"
              placeholder="Store name"
              autofocus
              @keyup.enter="confirmAddStore"
              @keyup.esc="showAddStore = false"
            />
            <button class="btn-secondary" @click="confirmAddStore">Add</button>
            <button class="btn-secondary" @click="showAddStore = false">Cancel</button>
          </template>
        </div>
      </div>

      <datalist id="grid-category-suggestions">
        <option v-for="c in knownCategories" :key="c" :value="c" />
      </datalist>

      <div class="grid-rows">
        <div
          v-for="row in rows"
          :key="row.key"
          class="grid-row"
          :class="{ duplicate: isDuplicateInGrid(row), linked: row.sourceId && !isDuplicateInGrid(row) }"
        >
          <div class="row-line1">
            <button
              type="button"
              class="icon-btn remove-icon"
              title="Remove row"
              @click="removeRow(row.key)"
            >
              ⊖
            </button>
            <input v-model="row.name" type="text" class="name-input" placeholder="Item name" />
            <span v-if="isDuplicateInGrid(row)" class="status-icon duplicate-icon" title="Duplicate name in this grid">
              ⚠
            </span>
            <button
              v-else-if="existingMatch(row)"
              type="button"
              class="icon-btn status-icon pull-icon"
              title="An item with this name already exists — tap to edit it instead"
              @click="pullExisting(row)"
            >
              ⇄
            </button>
          </div>

          <div class="tag-row">
            <!-- Category -->
            <span v-if="isEditing(row, 'category')" class="inline-edit-group">
              <input
                v-model="editBuffer"
                type="text"
                class="inline-edit"
                list="grid-category-suggestions"
                placeholder="Category"
                autofocus
                @keyup.enter="commitEdit(row)"
                @keyup.esc="cancelEdit"
                @blur="deferCommit(row)"
              />
              <button type="button" class="inline-edit-cancel" title="Cancel" @click="cancelEdit">
                ⊗
              </button>
            </span>
            <button
              v-else-if="!row.category"
              type="button"
              class="tag type-tag category-type"
              title="Add category"
              @click="startEditCategory(row)"
            >
              Category ⊕
            </button>
            <span
              v-else
              class="tag color-tag"
              :style="tagColor(row.category)"
              @click="startEditCategory(row)"
            >
              {{ row.category }}
              <button type="button" class="tag-remove" title="Remove category" @click.stop="row.category = ''">
                ⊖
              </button>
            </span>

            <!-- Store(s) -->
            <span
              v-for="storeId in row.stores"
              :key="storeId"
              class="tag color-tag"
              :style="tagColor(storeId)"
            >
              {{ storeName(storeId) }}
              <button
                type="button"
                class="tag-remove"
                title="Remove store"
                @click.stop="toggleStoreOnRow(row, storeId)"
              >
                ⊖
              </button>
            </span>
            <div class="store-picker">
              <button
                type="button"
                class="tag type-tag store-type"
                title="Add store"
                @click="toggleStorePicker(row.key)"
              >
                Store ⊕
              </button>
              <div v-if="openStorePicker === row.key" class="store-popover">
                <input
                  v-model="storeFilter"
                  type="text"
                  class="store-filter"
                  placeholder="Filter or add store"
                  autofocus
                />
                <button
                  v-for="store in filteredStores"
                  :key="store.id"
                  type="button"
                  class="store-option"
                  @click="selectStore(row, store)"
                >
                  {{ store.name }}
                </button>
                <button
                  v-if="!filteredStores.length && storeFilter.trim()"
                  type="button"
                  class="store-option store-add-new"
                  @click="addAndSelectStore(row, storeFilter)"
                >
                  ⊕ Add "{{ storeFilter.trim() }}" as store
                </button>
                <p v-else-if="!filteredStores.length" class="store-empty">
                  Type a name to add a new store.
                </p>
              </div>
            </div>

            <!-- Quantity -->
            <span v-if="isEditing(row, 'quantity')" class="inline-edit-group">
              <input
                v-model="editBuffer"
                type="text"
                class="inline-edit"
                placeholder="Qty"
                autofocus
                @keyup.enter="commitEdit(row)"
                @keyup.esc="cancelEdit"
                @blur="deferCommit(row)"
              />
              <button type="button" class="inline-edit-cancel" title="Cancel" @click="cancelEdit">
                ⊗
              </button>
            </span>
            <button
              v-else-if="!row.quantity"
              type="button"
              class="tag type-tag quantity-type"
              title="Add quantity"
              @click="startEditQuantity(row)"
            >
              Quantity ⊕
            </button>
            <span v-else class="tag neutral-tag" @click="startEditQuantity(row)">
              {{ row.quantity }}
              <button type="button" class="tag-remove" title="Remove quantity" @click.stop="row.quantity = ''">
                ⊖
              </button>
            </span>
          </div>
        </div>
      </div>

      <button
        type="button"
        class="btn-secondary add-row-btn"
        :disabled="!canAddRow"
        @click="addRow"
      >
        ⊕ Add row
      </button>
      <p v-if="!canAddRow" class="add-row-hint">Enter a name above to add another row.</p>

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
  max-width: 40rem;
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

.grid-rows {
  border: 1px solid var(--border);
  border-radius: 0.6rem;
  margin-bottom: 0.6rem;
}

.grid-row {
  padding: 0.6rem;
  background: var(--bg-elev);
  border-bottom: 1px solid var(--border);
}

.grid-row:last-child {
  border-bottom: none;
}

.grid-row:first-child {
  border-radius: 0.6rem 0.6rem 0 0;
}

.grid-row:last-child {
  border-radius: 0 0 0.6rem 0.6rem;
}

.grid-row.duplicate {
  background: rgba(211, 47, 47, 0.12);
}

.grid-row.linked {
  background: rgba(0, 102, 204, 0.06);
}

.row-line1 {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 0.4rem;
}

.name-input {
  flex: 1;
  min-width: 0;
  min-height: 2.5rem;
  padding: 0.4rem 0.5rem;
  border: 1px solid var(--border);
  border-radius: 0.4rem;
  background: var(--bg);
  color: var(--text);
  font-size: 0.95rem;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
}

.icon-btn {
  border: none;
  background: transparent;
  font-size: 1.3rem;
  line-height: 1;
  padding: 0.15rem;
  min-width: 2.25rem;
  min-height: 2.25rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.add-icon {
  color: var(--accent-blue);
}

.remove-icon {
  color: var(--text-muted);
}

@media (hover: hover) and (pointer: fine) {
  .remove-icon:hover {
    color: var(--danger);
  }
}

.status-icon {
  font-size: 1.15rem;
}

.duplicate-icon {
  color: var(--danger);
}

.pull-icon {
  color: #ffb300;
}

.tag {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  font-size: 0.8rem;
  padding: 0.1rem 0.4rem;
  border-radius: 999px;
  border: 1px solid transparent;
  background: transparent;
  white-space: nowrap;
  cursor: pointer;
}

.color-tag {
  border-color: hsl(var(--tag-hue), 60%, var(--tag-lightness));
  color: hsl(var(--tag-hue), 60%, var(--tag-lightness));
}

.neutral-tag {
  border-color: var(--border);
  color: var(--text);
}

.type-tag {
  font-weight: 600;
}

.category-type {
  border-color: var(--text-muted);
  color: var(--text-muted);
}

.quantity-type {
  border-color: #fb8c00;
  color: #fb8c00;
}

.store-type {
  border-color: #29b6f6;
  color: #29b6f6;
}

.tag-remove {
  border: none;
  background: transparent;
  color: inherit;
  opacity: 0.8;
  font-size: 0.85rem;
  line-height: 1;
  padding: 0;
}

.tag-remove:hover {
  opacity: 1;
}

.inline-edit-group {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
}

.inline-edit {
  min-height: 2.3rem;
  padding: 0.3rem 0.5rem;
  border: 1px solid var(--accent-blue);
  border-radius: 0.4rem;
  background: var(--bg);
  color: var(--text);
  font-size: 0.85rem;
  width: 8rem;
}

.inline-edit-cancel {
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 1.2rem;
  line-height: 1;
  min-width: 2rem;
  min-height: 2.3rem;
  flex-shrink: 0;
}

@media (hover: hover) and (pointer: fine) {
  .inline-edit-cancel:hover {
    color: var(--danger);
  }
}

.store-picker {
  position: relative;
  display: inline-flex;
}

.store-popover {
  position: absolute;
  top: calc(100% + 0.25rem);
  left: 0;
  z-index: 110;
  min-width: 11rem;
  max-height: 13rem;
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

.store-filter {
  min-height: 2.2rem;
  padding: 0.3rem 0.5rem;
  border: 1px solid var(--border);
  border-radius: 0.4rem;
  background: var(--bg);
  color: var(--text);
  font-size: 0.85rem;
}

.store-option {
  display: block;
  width: 100%;
  text-align: left;
  padding: 0.4rem 0.5rem;
  border: none;
  border-radius: 0.4rem;
  background: transparent;
  color: var(--text);
  font-size: 0.85rem;
  white-space: nowrap;
}

.store-option:hover {
  background: var(--bg-elev-2);
}

.store-add-new {
  color: var(--accent-blue);
  font-weight: 600;
  white-space: normal;
}

.store-empty {
  font-size: 0.78rem;
  color: var(--text-muted);
  margin: 0;
  white-space: normal;
  max-width: 10rem;
}

.add-row-btn {
  width: 100%;
}

.add-row-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.add-row-hint {
  margin: 0.3rem 0 1rem;
  color: var(--text-muted);
  font-size: 0.78rem;
  text-align: center;
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
