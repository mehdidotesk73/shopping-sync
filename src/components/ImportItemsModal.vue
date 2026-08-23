<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { ShoppingItem } from '../lib/types'
import { parsePastedItems } from '../lib/importItems'
import { normalizeName } from '../lib/items'

interface Props {
  open: boolean
  savedItems: ShoppingItem[]
}

interface Emits {
  (e: 'import', names: string[]): void
  (e: 'close'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const pasted = ref('')

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    pasted.value = ''
  },
)

type RowStatus = 'new' | 'existing' | 'duplicate'
interface PreviewRow { name: string; status: RowStatus }

const preview = computed<PreviewRow[]>(() => {
  const parsed = parsePastedItems(pasted.value)
  const seen = new Set<string>()
  const rows: PreviewRow[] = []
  for (const name of parsed) {
    const key = normalizeName(name)
    const onSavedList = props.savedItems.some((item) => normalizeName(item.name) === key)
    const status: RowStatus = onSavedList ? 'existing' : seen.has(key) ? 'duplicate' : 'new'
    if (status === 'new') seen.add(key)
    rows.push({ name, status })
  }
  return rows
})

const newNames = computed(() => preview.value.filter((r) => r.status === 'new').map((r) => r.name))

function confirmImport() {
  if (!newNames.value.length) return
  emit('import', newNames.value)
}
</script>

<template>
  <div v-if="open" class="modal-overlay" @click="emit('close')">
    <div class="modal-content" @click.stop>
      <h2 class="modal-title">Import items</h2>
      <p class="modal-hint">
        Paste a list — one item per line, a checklist copied from Notes, or a comma-separated
        line. Only the names are used; add category/store/quantity afterward as usual.
      </p>

      <textarea
        v-model="pasted"
        class="paste-area"
        rows="6"
        placeholder="- [ ] Zucchini&#10;- [ ] Parmesan&#10;- [x] Naan Bread"
        autofocus
      ></textarea>

      <ul v-if="preview.length" class="preview-list">
        <li
          v-for="(row, i) in preview"
          :key="i"
          class="preview-row"
          :class="`status-${row.status}`"
        >
          <span class="preview-name">{{ row.name }}</span>
          <span v-if="row.status === 'existing'" class="preview-status">Already on list</span>
          <span v-else-if="row.status === 'duplicate'" class="preview-status">Repeated above</span>
        </li>
      </ul>

      <div class="modal-actions">
        <button class="btn-secondary" @click="emit('close')">Cancel</button>
        <button class="btn-primary" :disabled="!newNames.length" @click="confirmImport">
          Import {{ newNames.length }} item{{ newNames.length === 1 ? '' : 's' }}
        </button>
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

.modal-hint {
  margin: 0 0 0.75rem;
  color: var(--text-muted);
  font-size: 0.85rem;
}

.paste-area {
  width: 100%;
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  background: var(--bg);
  color: var(--text);
  font-size: 0.95rem;
  font-family: inherit;
  resize: vertical;
  margin-bottom: 0.75rem;
}

.preview-list {
  list-style: none;
  margin: 0 0 1rem;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 0.6rem;
  overflow: hidden;
  max-height: 40vh;
  overflow-y: auto;
}

.preview-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: var(--bg-elev);
  border-bottom: 1px solid var(--border);
  font-size: 0.9rem;
}

.preview-row:last-child {
  border-bottom: none;
}

.preview-row.status-existing,
.preview-row.status-duplicate {
  color: var(--text-muted);
}

.preview-status {
  flex-shrink: 0;
  font-size: 0.75rem;
  white-space: nowrap;
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
