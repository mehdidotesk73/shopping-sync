<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { ShoppingItem } from '../lib/types'
import type { ItemInput } from '../lib/useShoppingList'

interface Props {
  open: boolean
  editing: ShoppingItem | null
  knownCategories: string[]
  knownStores: string[]
  duplicate: ShoppingItem | null
}

interface Emits {
  (e: 'save', input: ItemInput): void
  (e: 'cancel'): void
  (e: 'edit-duplicate'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const name = ref('')
const category = ref('')
const selectedStores = ref<string[]>([])
const newStoreName = ref('')

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    name.value = props.editing?.name ?? ''
    category.value = props.editing?.category ?? ''
    selectedStores.value = props.editing ? [...props.editing.stores] : []
    newStoreName.value = ''
  },
  { immediate: true },
)

const title = computed(() => (props.editing ? 'Edit item' : 'Add item'))

function toggleStore(store: string) {
  const i = selectedStores.value.indexOf(store)
  if (i === -1) selectedStores.value.push(store)
  else selectedStores.value.splice(i, 1)
}

function addNewStore() {
  const store = newStoreName.value.trim()
  if (!store) return
  if (!selectedStores.value.includes(store)) selectedStores.value.push(store)
  newStoreName.value = ''
}

function save() {
  if (!name.value.trim()) return
  emit('save', {
    name: name.value,
    category: category.value,
    stores: selectedStores.value,
  })
}
</script>

<template>
  <div v-if="open" class="modal-overlay" @click="emit('cancel')">
    <div class="modal-content" @click.stop>
      <h2 class="modal-title">{{ title }}</h2>

      <label class="field">
        <span class="field-label">Name</span>
        <input v-model="name" type="text" placeholder="e.g. Milk" autofocus @keyup.enter="save" />
      </label>

      <div v-if="duplicate" class="duplicate-warning">
        <p>An item named "{{ duplicate.name }}" already exists.</p>
        <button class="btn-secondary" @click="emit('edit-duplicate')">Edit existing item instead</button>
      </div>

      <label class="field">
        <span class="field-label">Category (optional)</span>
        <input v-model="category" type="text" list="category-suggestions" placeholder="e.g. Produce" />
        <datalist id="category-suggestions">
          <option v-for="c in knownCategories" :key="c" :value="c" />
        </datalist>
      </label>

      <div class="field">
        <span class="field-label">Preferred store(s) (optional)</span>
        <div class="store-chips">
          <button
            v-for="store in knownStores"
            :key="store"
            type="button"
            class="chip"
            :class="{ selected: selectedStores.includes(store) }"
            @click="toggleStore(store)"
          >
            {{ store }}
          </button>
          <button
            v-for="store in selectedStores.filter((s) => !knownStores.includes(s))"
            :key="store"
            type="button"
            class="chip selected"
            @click="toggleStore(store)"
          >
            {{ store }}
          </button>
        </div>
        <div class="add-store-row">
          <input
            v-model="newStoreName"
            type="text"
            placeholder="Add a store (e.g. Costco)"
            @keyup.enter="addNewStore"
          />
          <button type="button" class="btn-secondary" @click="addNewStore">Add</button>
        </div>
      </div>

      <div class="modal-actions">
        <button class="btn-secondary" @click="emit('cancel')">Cancel</button>
        <button class="btn-primary" :disabled="!name.trim()" @click="save">Save</button>
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
  max-width: 32rem;
  max-height: 90vh;
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

.field {
  display: block;
  margin-bottom: 1rem;
}

.field-label {
  display: block;
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-bottom: 0.3rem;
}

.field input[type='text'] {
  width: 100%;
  min-height: 2.75rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  background: var(--bg);
  color: var(--text);
  font-size: 1rem;
}

.duplicate-warning {
  background: var(--bg-elev-2);
  border: 1px solid var(--danger);
  border-radius: 0.5rem;
  padding: 0.6rem 0.75rem;
  margin-bottom: 1rem;
}

.duplicate-warning p {
  margin: 0 0 0.5rem;
  font-size: 0.9rem;
}

.store-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 0.5rem;
}

.chip {
  min-height: 2.5rem;
  padding: 0.4rem 0.8rem;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text);
  font-size: 0.9rem;
}

.chip.selected {
  background: var(--accent-blue);
  border-color: var(--accent-blue);
  color: #fff;
}

.add-store-row {
  display: flex;
  gap: 0.4rem;
}

.add-store-row input {
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
  gap: 0.6rem;
  margin-top: 1.25rem;
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
