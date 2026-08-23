<script setup lang="ts">
import { ref } from 'vue'
import type { ListMeta } from '../lib/types'

interface Props {
  lists: ListMeta[]
}

interface Emits {
  (e: 'open', id: string): void
  (e: 'rename', payload: { id: string; name: string }): void
  (e: 'remove', id: string): void
  (e: 'create', name: string): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const editingId = ref<string | null>(null)
const editBuffer = ref('')
const pendingRemoveId = ref<string | null>(null)
const newListName = ref('')

function startEdit(list: ListMeta) {
  pendingRemoveId.value = null
  editingId.value = list.id
  editBuffer.value = list.name
}

function cancelEdit() {
  editingId.value = null
}

function commitRename() {
  if (!editingId.value) return
  const name = editBuffer.value.trim()
  if (name) emit('rename', { id: editingId.value, name })
  editingId.value = null
}

function askRemove(list: ListMeta) {
  editingId.value = null
  pendingRemoveId.value = list.id
}

function cancelRemove() {
  pendingRemoveId.value = null
}

function confirmRemove(list: ListMeta) {
  emit('remove', list.id)
  pendingRemoveId.value = null
}

function createList() {
  const name = newListName.value.trim()
  if (!name) return
  emit('create', name)
  newListName.value = ''
}
</script>

<template>
  <div class="list-switcher">
    <h2 class="switcher-title">Your lists</h2>

    <ul class="lists">
      <li v-for="list in lists" :key="list.id" class="list-row">
        <template v-if="pendingRemoveId === list.id">
          <p class="confirm-text">
            Remove "{{ list.name }}" from your lists?
            <span v-if="list.shared">Anyone else with the link keeps their access.</span>
          </p>
          <div class="row-actions">
            <button class="btn-secondary" @click="cancelRemove">Cancel</button>
            <button class="btn-danger" @click="confirmRemove(list)">Remove</button>
          </div>
        </template>
        <template v-else-if="editingId === list.id">
          <input
            v-model="editBuffer"
            type="text"
            class="edit-input"
            autofocus
            @keyup.enter="commitRename"
            @keyup.esc="cancelEdit"
          />
          <div class="row-actions">
            <button class="btn-secondary" @click="cancelEdit">Cancel</button>
            <button class="btn-primary" @click="commitRename">Save</button>
          </div>
        </template>
        <template v-else>
          <button class="list-open-btn" @click="emit('open', list.id)">
            {{ list.name }}
            <span v-if="list.shared" class="shared-badge">🔗 Shared</span>
          </button>
          <div class="row-actions">
            <button type="button" class="icon-btn rename-icon" title="Rename list" @click="startEdit(list)">
              ✎
            </button>
            <button type="button" class="icon-btn remove-icon" title="Remove list" @click="askRemove(list)">
              ⊖
            </button>
          </div>
        </template>
      </li>
      <li v-if="!lists.length" class="empty">No lists yet — create one below.</li>
    </ul>

    <div class="add-row">
      <input
        v-model="newListName"
        type="text"
        placeholder="New list name"
        @keyup.enter="createList"
      />
      <button type="button" class="btn-secondary" @click="createList">⊕ New list</button>
    </div>
  </div>
</template>

<style scoped>
.list-switcher {
  padding: 0.5rem 0;
}

.switcher-title {
  margin: 0 0 1rem;
  font-size: 1.15rem;
}

.lists {
  list-style: none;
  margin: 0 0 1rem;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 0.6rem;
  overflow: hidden;
}

.list-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
  min-height: 3.25rem;
  padding: 0.6rem 0.9rem;
  background: var(--bg-elev);
  border-bottom: 1px solid var(--border);
}

.list-row:last-child {
  border-bottom: none;
}

.list-open-btn {
  flex: 1;
  min-width: 0;
  text-align: left;
  background: transparent;
  border: none;
  color: var(--text);
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  overflow-wrap: anywhere;
}

.shared-badge {
  font-size: 0.72rem;
  font-weight: 600;
  color: #29b6f6;
  white-space: nowrap;
}

.row-actions {
  display: flex;
  gap: 0.2rem;
  flex-shrink: 0;
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

.remove-icon:hover {
  color: var(--danger);
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

.confirm-text {
  flex: 1;
  min-width: 10rem;
  margin: 0;
  font-size: 0.88rem;
}

.empty {
  padding: 1rem 0.9rem;
  color: var(--text-muted);
  font-size: 0.9rem;
}

.add-row {
  display: flex;
  gap: 0.4rem;
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
