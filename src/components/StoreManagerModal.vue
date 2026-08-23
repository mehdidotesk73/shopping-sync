<script setup lang="ts">
import { ref, watch } from 'vue'
import type { ShoppingItem, Store } from '../lib/types'

interface Props {
  open: boolean
  stores: Store[]
  items: ShoppingItem[]
}

interface Emits {
  (e: 'rename', payload: { id: string; name: string }): void
  (e: 'remove', id: string): void
  (e: 'add', name: string): void
  (e: 'assign', store: Store): void
  (e: 'close'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const editingId = ref<string | null>(null)
const editBuffer = ref('')
const editError = ref('')
const pendingDeleteId = ref<string | null>(null)
const newStoreName = ref('')

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    editingId.value = null
    editBuffer.value = ''
    editError.value = ''
    pendingDeleteId.value = null
    newStoreName.value = ''
  },
)

function itemCount(storeId: string): number {
  return props.items.filter((item) => item.stores.includes(storeId)).length
}

function startEdit(store: Store) {
  pendingDeleteId.value = null
  editingId.value = store.id
  editBuffer.value = store.name
  editError.value = ''
}

function cancelEdit() {
  editingId.value = null
  editError.value = ''
}

function isDuplicateName(name: string, excludeId: string): boolean {
  const n = name.trim().toLowerCase()
  return props.stores.some((s) => s.id !== excludeId && s.name.trim().toLowerCase() === n)
}

function commitRename() {
  if (!editingId.value) return
  const name = editBuffer.value.trim()
  if (!name) {
    editingId.value = null
    return
  }
  if (isDuplicateName(name, editingId.value)) {
    editError.value = `A store named "${name}" already exists.`
    return
  }
  emit('rename', { id: editingId.value, name })
  editingId.value = null
  editError.value = ''
}

function askDelete(store: Store) {
  editingId.value = null
  pendingDeleteId.value = store.id
}

function cancelDelete() {
  pendingDeleteId.value = null
}

function confirmDelete(store: Store) {
  emit('remove', store.id)
  pendingDeleteId.value = null
}

function addNewStore() {
  const name = newStoreName.value.trim()
  if (!name) return
  if (isDuplicateName(name, '')) return
  emit('add', name)
  newStoreName.value = ''
}
</script>

<template>
  <div v-if="open" class="modal-overlay" @click="emit('close')">
    <div class="modal-content" @click.stop>
      <h2 class="modal-title">Edit stores</h2>

      <ul class="store-list">
        <li v-for="store in stores" :key="store.id" class="store-row">
          <template v-if="pendingDeleteId === store.id">
            <p class="confirm-text">
              Delete "{{ store.name }}"? It will be removed from
              {{ itemCount(store.id) }} item{{ itemCount(store.id) === 1 ? '' : 's' }}.
            </p>
            <div class="confirm-actions">
              <button class="btn-secondary" @click="cancelDelete">Cancel</button>
              <button class="btn-danger" @click="confirmDelete(store)">Delete</button>
            </div>
          </template>
          <template v-else-if="editingId === store.id">
            <input
              v-model="editBuffer"
              type="text"
              class="edit-input"
              autofocus
              @keyup.enter="commitRename"
              @keyup.esc="cancelEdit"
            />
            <div class="confirm-actions">
              <button class="btn-secondary" @click="cancelEdit">Cancel</button>
              <button class="btn-primary" @click="commitRename">Save</button>
            </div>
            <p v-if="editError" class="edit-error">{{ editError }}</p>
          </template>
          <template v-else>
            <span class="store-name">
              {{ store.name }}
              <span class="store-count">({{ itemCount(store.id) }})</span>
            </span>
            <div class="row-actions">
              <button type="button" class="btn-secondary assign-btn" @click="emit('assign', store)">
                Assign items
              </button>
              <button type="button" class="icon-btn rename-icon" title="Rename store" @click="startEdit(store)">
                ✎
              </button>
              <button type="button" class="icon-btn remove-icon" title="Delete store" @click="askDelete(store)">
                ⊖
              </button>
            </div>
          </template>
        </li>
        <li v-if="!stores.length" class="empty">No stores yet.</li>
      </ul>

      <div class="add-row">
        <input
          v-model="newStoreName"
          type="text"
          placeholder="New store name"
          @keyup.enter="addNewStore"
        />
        <button type="button" class="btn-secondary" @click="addNewStore">⊕ Add</button>
      </div>

      <div class="modal-actions">
        <button class="btn-primary" @click="emit('close')">Done</button>
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
  max-width: 30rem;
  max-height: 85vh;
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

.modal-title {
  margin: 0 0 1rem;
  font-size: 1.15rem;
}

.store-list {
  list-style: none;
  margin: 0 0 0.75rem;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 0.6rem;
  overflow: hidden;
}

.store-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
  min-height: 3rem;
  padding: 0.5rem 0.75rem;
  background: var(--bg-elev);
  border-bottom: 1px solid var(--border);
}

.store-row:last-child {
  border-bottom: none;
}

.store-name {
  font-size: 0.95rem;
}

.store-count {
  color: var(--text-muted);
  font-size: 0.82rem;
}

.row-actions {
  display: flex;
  align-items: center;
  gap: 0.2rem;
}

.assign-btn {
  min-height: 2rem;
  padding: 0.25rem 0.6rem;
  font-size: 0.75rem;
  white-space: nowrap;
}

.icon-btn {
  border: none;
  background: transparent;
  font-size: 1.2rem;
  line-height: 1;
  min-width: 2.25rem;
  min-height: 2.25rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.rename-icon {
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

.edit-input {
  flex: 1;
  min-width: 8rem;
  min-height: 2.5rem;
  padding: 0.4rem 0.5rem;
  border: 1px solid var(--accent-blue);
  border-radius: 0.4rem;
  background: var(--bg);
  color: var(--text);
  font-size: 0.95rem;
}

.edit-error {
  width: 100%;
  margin: 0.3rem 0 0;
  font-size: 0.78rem;
  color: var(--danger);
}

.confirm-text {
  flex: 1;
  min-width: 10rem;
  margin: 0;
  font-size: 0.88rem;
}

.confirm-actions {
  display: flex;
  gap: 0.4rem;
  flex-shrink: 0;
}

.empty {
  padding: 1rem 0.75rem;
  color: var(--text-muted);
  font-size: 0.9rem;
}

.add-row {
  display: flex;
  gap: 0.4rem;
  margin-bottom: 1rem;
}

.add-row input {
  flex: 1;
  min-height: 2.75rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  background: var(--bg);
  color: var(--text);
  font-size: 1rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
}

.btn-primary,
.btn-secondary,
.btn-danger {
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

.btn-danger {
  background: var(--danger);
  border-color: var(--danger);
  color: #fff;
}
</style>
