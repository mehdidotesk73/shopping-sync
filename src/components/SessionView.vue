<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ShoppingItem } from '../lib/types'
import { groupByCategory } from '../lib/items'

interface Props {
  items: ShoppingItem[]
  store: string | null
}

interface Emits {
  (e: 'end'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const checked = ref<Set<string>>(new Set())

function toggle(id: string) {
  if (checked.value.has(id)) checked.value.delete(id)
  else checked.value.add(id)
}

const groups = computed(() => groupByCategory(props.items))
const total = computed(() => props.items.length)
const doneCount = computed(() => props.items.filter((i) => checked.value.has(i.id)).length)
</script>

<template>
  <div class="session">
    <div class="session-header">
      <div>
        <h2 class="session-title">{{ store ? `Shopping — ${store}` : 'Shopping — All items' }}</h2>
        <p class="session-progress">{{ doneCount }} of {{ total }} picked up</p>
      </div>
      <button class="btn-secondary" @click="emit('end')">End session</button>
    </div>

    <p v-if="!total" class="empty">Nothing to shop for{{ store ? ` at ${store}` : '' }}.</p>

    <div v-for="group in groups" :key="group.category" class="category-group">
      <h3 class="category-title">{{ group.category }}</h3>
      <ul class="session-items">
        <li
          v-for="item in group.items"
          :key="item.id"
          class="session-item"
          :class="{ done: checked.has(item.id) }"
          @click="toggle(item.id)"
        >
          <input type="checkbox" :checked="checked.has(item.id)" @click.stop="toggle(item.id)" />
          <span class="item-name">{{ item.name }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.session {
  padding: 0.5rem 0;
}

.session-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.session-title {
  margin: 0;
  font-size: 1.1rem;
}

.session-progress {
  margin: 0.2rem 0 0;
  font-size: 0.85rem;
  color: var(--text-muted);
}

.category-group {
  margin-bottom: 1.25rem;
}

.category-title {
  margin: 0 0 0.4rem;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--text-muted);
}

.session-items {
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 0.6rem;
  overflow: hidden;
}

.session-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 3rem;
  padding: 0.5rem 0.9rem;
  background: var(--bg-elev);
  border-bottom: 1px solid var(--border);
}

.session-item:last-child {
  border-bottom: none;
}

.session-item input[type='checkbox'] {
  width: 1.3rem;
  height: 1.3rem;
  flex-shrink: 0;
}

.item-name {
  font-size: 1rem;
}

.session-item.done .item-name {
  text-decoration: line-through;
  color: var(--text-muted);
}

.empty {
  color: var(--text-muted);
  padding: 1rem 0;
}

.btn-secondary {
  min-height: 2.75rem;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.9rem;
  font-weight: 600;
  border: 1px solid var(--border);
  background: var(--bg-elev-2);
  color: var(--text);
  white-space: nowrap;
}
</style>
