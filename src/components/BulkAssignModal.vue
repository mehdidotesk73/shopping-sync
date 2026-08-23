<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { ShoppingItem } from '../lib/types'
import { groupByCategory } from '../lib/items'

interface Props {
  open: boolean
  items: ShoppingItem[]
  mode: 'store' | 'category'
  storeId?: string
  storeLabel?: string
  knownCategories?: string[]
  presetCategory?: string
}

interface Emits {
  (e: 'save-store', payload: { storeId: string; itemIds: string[] }): void
  (e: 'save-category', payload: { category: string; itemIds: string[] }): void
  (e: 'close'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const categoryInput = ref('')
const selected = ref<Set<string>>(new Set())

function itemMatches(item: ShoppingItem): boolean {
  if (props.mode === 'store') return item.stores.includes(props.storeId ?? '')
  const target = categoryInput.value.trim()
  return target.length > 0 && item.category === target
}

function resetSelection() {
  selected.value = new Set(props.items.filter(itemMatches).map((i) => i.id))
}

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    categoryInput.value = props.presetCategory ?? ''
    resetSelection()
  },
)

// Retyping the category re-derives which items already carry it, so switching from "Produce"
// to "Frozen" mid-session shows that category's own membership rather than the previous one's.
watch(categoryInput, resetSelection)

const groups = computed(() => groupByCategory(props.items))
const showChecklist = computed(() => props.mode === 'store' || categoryInput.value.trim().length > 0)
const canSave = computed(() => props.mode === 'store' || categoryInput.value.trim().length > 0)

function toggle(id: string) {
  if (selected.value.has(id)) selected.value.delete(id)
  else selected.value.add(id)
}

function selectAll() {
  selected.value = new Set(props.items.map((i) => i.id))
}

function deselectAll() {
  selected.value = new Set()
}

function save() {
  if (!canSave.value) return
  if (props.mode === 'store') {
    emit('save-store', { storeId: props.storeId ?? '', itemIds: [...selected.value] })
  } else {
    emit('save-category', { category: categoryInput.value.trim(), itemIds: [...selected.value] })
  }
}
</script>

<template>
  <div v-if="open" class="modal-overlay" @click="emit('close')">
    <div class="modal-content" @click.stop>
      <h2 class="modal-title">
        {{
          mode === 'store'
            ? `Assign items to ${storeLabel}`
            : categoryInput.trim()
              ? `Assign items to ${categoryInput.trim()}`
              : 'Bulk assign category'
        }}
      </h2>

      <div v-if="mode === 'category'" class="category-input-row">
        <input
          v-model="categoryInput"
          type="text"
          list="bulk-category-options"
          placeholder="Type or pick a category"
          autofocus
        />
        <datalist id="bulk-category-options">
          <option v-for="c in knownCategories" :key="c" :value="c" />
        </datalist>
      </div>

      <p v-if="mode === 'category' && !showChecklist" class="modal-hint">
        Type or pick a category above to see and select items.
      </p>
      <template v-else>
        <div class="select-all-row">
          <p class="modal-hint">
            {{ selected.size }} of {{ items.length }} selected. Items already carrying it are
            pre-checked — uncheck to remove it.
          </p>
          <div class="select-all-actions">
            <button type="button" class="link-btn" @click="selectAll">Select all</button>
            <button type="button" class="link-btn" @click="deselectAll">Deselect all</button>
          </div>
        </div>
      </template>

      <div v-if="showChecklist" class="group-list">
        <div v-for="group in groups" :key="group.category" class="category-group">
          <h3 class="category-title">{{ group.category }}</h3>
          <ul class="check-list">
            <li
              v-for="item in group.items"
              :key="item.id"
              class="check-row"
              @click="toggle(item.id)"
            >
              <input type="checkbox" :checked="selected.has(item.id)" @click.stop="toggle(item.id)" />
              <span class="item-name">{{ item.name }}</span>
            </li>
          </ul>
        </div>
        <p v-if="!items.length" class="empty">No items yet.</p>
      </div>

      <div class="modal-actions">
        <button class="btn-secondary" @click="emit('close')">Cancel</button>
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
  margin: 0 0 0.5rem;
  font-size: 1.15rem;
}

.category-input-row {
  margin-bottom: 0.75rem;
}

.category-input-row input {
  width: 100%;
  min-height: 2.75rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  background: var(--bg);
  color: var(--text);
  font-size: 1rem;
}

.modal-hint {
  margin: 0 0 0.75rem;
  color: var(--text-muted);
  font-size: 0.85rem;
}

.select-all-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.select-all-row .modal-hint {
  flex: 1;
  min-width: 0;
}

.select-all-actions {
  display: flex;
  flex-shrink: 0;
  gap: 0.5rem;
}

.link-btn {
  border: none;
  background: transparent;
  color: var(--accent-blue);
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0;
  white-space: nowrap;
}

.group-list {
  margin-bottom: 1rem;
  max-height: 50vh;
  overflow-y: auto;
}

.category-group {
  margin-bottom: 1rem;
}

.category-title {
  margin: 0 0 0.3rem;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--text-muted);
}

.check-list {
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 0.6rem;
  overflow: hidden;
}

.check-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 2.75rem;
  padding: 0.5rem 0.9rem;
  background: var(--bg-elev);
  border-bottom: 1px solid var(--border);
}

.check-row:last-child {
  border-bottom: none;
}

.check-row input[type='checkbox'] {
  width: 1.3rem;
  height: 1.3rem;
  flex-shrink: 0;
}

.item-name {
  font-size: 0.95rem;
}

.empty {
  color: var(--text-muted);
  padding: 1rem 0;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
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
