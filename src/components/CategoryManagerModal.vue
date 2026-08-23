<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ShoppingItem } from '../lib/types'
import { groupByCategory, UNCATEGORIZED } from '../lib/items'

interface Props {
  open: boolean
  items: ShoppingItem[]
}

interface Emits {
  (e: 'assign', category: string): void
  (e: 'close'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const newCategoryName = ref('')

// Uncategorized is a display bucket for a blank category, not a real assignable value — listing
// it here would let someone "assign" the literal string "Uncategorized" to items.
const categories = computed(() =>
  groupByCategory(props.items)
    .filter((g) => g.category !== UNCATEGORIZED)
    .map((g) => ({ name: g.category, count: g.items.length })),
)

function assignNew() {
  const name = newCategoryName.value.trim()
  if (!name) return
  emit('assign', name)
  newCategoryName.value = ''
}
</script>

<template>
  <div v-if="open" class="modal-overlay" @click="emit('close')">
    <div class="modal-content" @click.stop>
      <h2 class="modal-title">Edit categories</h2>

      <ul class="category-list">
        <li v-for="cat in categories" :key="cat.name" class="category-row">
          <span class="category-name">
            {{ cat.name }}
            <span class="category-count">({{ cat.count }})</span>
          </span>
          <button type="button" class="btn-secondary assign-btn" @click="emit('assign', cat.name)">
            Assign items
          </button>
        </li>
        <li v-if="!categories.length" class="empty">No categories in use yet.</li>
      </ul>

      <div class="add-row">
        <input
          v-model="newCategoryName"
          type="text"
          placeholder="New or existing category name"
          @keyup.enter="assignNew"
        />
        <button type="button" class="btn-secondary" @click="assignNew">Assign items</button>
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

.category-list {
  list-style: none;
  margin: 0 0 0.75rem;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 0.6rem;
  overflow: hidden;
}

.category-row {
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

.category-row:last-child {
  border-bottom: none;
}

.category-name {
  font-size: 0.95rem;
}

.category-count {
  color: var(--text-muted);
  font-size: 0.82rem;
}

.assign-btn {
  min-height: 2rem;
  padding: 0.25rem 0.6rem;
  font-size: 0.75rem;
  white-space: nowrap;
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
</style>
