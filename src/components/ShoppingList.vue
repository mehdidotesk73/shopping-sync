<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ShoppingItem } from '../lib/types'
import { useLocalItems } from '../lib/useShoppingList'
import { useLocalStores } from '../lib/useStores'
import { useSharedItems } from '../lib/useSharedItems'
import { useSharedStores } from '../lib/useSharedStores'
import { shareList, shareUrl } from '../lib/shareList'
import { allCategories, findDuplicate, itemsForStore } from '../lib/items'
import { tagColor } from '../lib/tagColor'
import { itemsToMarkdown, itemsToJson } from '../lib/exportItems'
import ItemGridModal from './ItemGridModal.vue'
import StoreManagerModal from './StoreManagerModal.vue'
import ImportItemsModal from './ImportItemsModal.vue'
import SessionView from './SessionView.vue'
import { logDebug } from '../debug'

interface Props {
  listId: string
  listName: string
  shared: boolean
}

interface Emits {
  (e: 'back'): void
  (e: 'shared', link: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// props.shared is fixed for this component instance's lifetime — the parent forces a full
// remount (changing :key) when a list's shared flag flips, so exactly one branch here ever runs.
const {
  items,
  addItem,
  updateItem,
  removeItem,
  setChecked,
  connected: itemsConnected,
  error: itemsError,
} = props.shared ? useSharedItems(props.listId) : useLocalItems(props.listId)
const { stores, addStore, renameStore, removeStore } = props.shared
  ? useSharedStores(props.listId)
  : useLocalStores(props.listId)

const sharing = ref(false)
const shareError = ref<string | null>(null)
const linkCopied = ref(false)

async function handleShare() {
  if (props.shared || sharing.value) return
  sharing.value = true
  shareError.value = null
  const result = await shareList(props.listId, props.listName, items.value, stores.value)
  sharing.value = false
  if (!result.ok) {
    shareError.value = result.error
    logDebug(`Share failed: ${result.error}`, 'error')
    return
  }
  logDebug(`Shared list: ${props.listName}`)
  emit('shared', shareUrl(props.listId))
}

// The link is just a deterministic function of the list id, so it can always be regenerated —
// no need to have copied it the first time it was shown.
async function copyShareLink() {
  try {
    await navigator.clipboard.writeText(shareUrl(props.listId))
    linkCopied.value = true
    setTimeout(() => (linkCopied.value = false), 1500)
  } catch {
    logDebug('clipboard copy failed', 'error')
  }
}

type View = 'list' | 'session-start' | 'session'
const view = ref<View>('list')

const showGrid = ref(false)
const gridInitialItems = ref<ShoppingItem[]>([])
const showStoreManager = ref(false)
const showImport = ref(false)
const mdCopied = ref(false)
const jsonCopied = ref(false)
const showMenu = ref(false)

function openImportFromMenu() {
  showMenu.value = false
  showImport.value = true
}

const knownCategories = computed(() => allCategories(items.value))

const sortedItems = computed(() =>
  [...items.value].sort((a, b) => a.name.localeCompare(b.name)),
)

function storeName(id: string): string {
  return stores.value.find((s) => s.id === id)?.name ?? '(removed store)'
}

function openAdd() {
  gridInitialItems.value = []
  showGrid.value = true
}

function openEdit(item: ShoppingItem) {
  gridInitialItems.value = [item]
  showGrid.value = true
}

function closeGrid() {
  showGrid.value = false
}

type GridRow = { sourceId: string | null; name: string; category: string; stores: string[]; quantity: string }

async function handleGridSave(rows: GridRow[]) {
  logDebug(`handleGridSave: received ${rows.length} row(s)`)
  for (const row of rows) {
    try {
      // A row whose (possibly just-typed or just-renamed) name matches a different saved
      // item is treated as an edit of *that* item — same guarantee as the pull-to-edit icon,
      // so saving never creates a duplicate or silently no-ops even if the user ignored it.
      const targetId = findDuplicate(items.value, row.name, row.sourceId ?? undefined)?.id ?? row.sourceId ?? null
      const input = { name: row.name, category: row.category, stores: row.stores, quantity: row.quantity }
      const result = targetId ? await updateItem(targetId, input) : await addItem(input)
      if (result.ok) logDebug(`${targetId ? 'Updated' : 'Added'} item: ${row.name}`)
      else logDebug(`Blocked "${row.name}": duplicate of "${result.duplicate.name}"`, 'warn')
    } catch (e) {
      logDebug(`Row save failed for "${row.name}": ${e instanceof Error ? e.message : String(e)}`, 'error')
    }
  }
  logDebug(`handleGridSave: done, items now ${items.value.length}`)
  closeGrid()
}

async function handleImport(names: string[]) {
  let added = 0
  for (const name of names) {
    const result = await addItem({ name, category: '', stores: [], quantity: '' })
    if (result.ok) added += 1
    else logDebug(`Import skipped "${name}": duplicate of "${result.duplicate.name}"`, 'warn')
  }
  logDebug(`Imported ${added} item(s)`)
  showImport.value = false
}

async function copyMarkdown() {
  try {
    await navigator.clipboard.writeText(itemsToMarkdown(sortedItems.value, storeName))
    mdCopied.value = true
    setTimeout(() => (mdCopied.value = false), 1500)
  } catch {
    logDebug('clipboard copy failed', 'error')
  }
}

async function copyJson() {
  try {
    await navigator.clipboard.writeText(itemsToJson(sortedItems.value, storeName))
    jsonCopied.value = true
    setTimeout(() => (jsonCopied.value = false), 1500)
  } catch {
    logDebug('clipboard copy failed', 'error')
  }
}

// Each item's armed/not-armed state is independent — a Set of ids, not one shared "current"
// id — so arming one row's remove button can never affect any other row's.
const armedRemoveIds = ref<Set<string>>(new Set())
const armTimers = new Map<string, ReturnType<typeof setTimeout>>()

async function handleRemoveTap(item: ShoppingItem) {
  const existingTimer = armTimers.get(item.id)
  if (existingTimer) clearTimeout(existingTimer)
  armTimers.delete(item.id)

  if (armedRemoveIds.value.has(item.id)) {
    armedRemoveIds.value.delete(item.id)
    await removeItem(item.id)
    logDebug(`Removed item: ${item.name}`)
    return
  }

  armedRemoveIds.value.add(item.id)
  armTimers.set(
    item.id,
    setTimeout(() => {
      armedRemoveIds.value.delete(item.id)
      armTimers.delete(item.id)
    }, 3000),
  )
}

function handleRenameStore(payload: { id: string; name: string }) {
  renameStore(payload.id, payload.name)
  logDebug(`Renamed store to: ${payload.name}`)
}

async function handleRemoveStore(id: string) {
  const name = storeName(id)
  for (const item of items.value.filter((i) => i.stores.includes(id))) {
    await updateItem(item.id, {
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      stores: item.stores.filter((s) => s !== id),
    })
  }
  removeStore(id)
  logDebug(`Deleted store: ${name}`)
}

const sessionStore = ref<string | null>(null)
const sessionStoreName = computed(() => (sessionStore.value ? storeName(sessionStore.value) : null))

function startSessionFlow() {
  view.value = 'session-start'
}

function beginSession(storeId: string | null) {
  sessionStore.value = storeId
  view.value = 'session'
}

const sessionItems = computed(() => itemsForStore(sortedItems.value, sessionStore.value))

function endSession() {
  view.value = 'list'
  sessionStore.value = null
}

async function finishSession(updates: { id: string; checked: boolean }[]) {
  await setChecked(updates)
  logDebug(`Finished session: saved checked state for ${updates.length} item(s)`)
  endSession()
}
</script>

<template>
  <div class="shopping-list">
    <template v-if="view === 'list'">
      <div class="list-title-row">
        <button class="back-btn" @click="emit('back')">← Lists</button>
        <h2 class="list-title">
          {{ listName }}
          <span v-if="shared" class="shared-badge">🔗 Shared</span>
        </h2>
        <div class="menu-wrapper">
          <button
            class="menu-btn"
            aria-label="List actions"
            @click="showMenu = !showMenu"
          >
            ⮺
          </button>
          <div v-if="showMenu" class="menu-backdrop" @click="showMenu = false"></div>
          <div v-if="showMenu" class="menu-panel">
            <button
              v-if="!shared"
              class="menu-item"
              :disabled="sharing"
              @click="handleShare"
            >
              {{ sharing ? 'Sharing…' : '🔗 Share list' }}
            </button>
            <button v-else class="menu-item" @click="copyShareLink">
              {{ linkCopied ? 'Copied ✓' : '🔗 Copy share link' }}
            </button>
            <button class="menu-item" @click="openImportFromMenu">⊕ Import list</button>
            <button class="menu-item" :disabled="!items.length" @click="copyMarkdown">
              {{ mdCopied ? 'Copied ✓' : '⧉ Copy as Markdown' }}
            </button>
            <button class="menu-item" :disabled="!items.length" @click="copyJson">
              {{ jsonCopied ? 'Copied ✓' : '⧉ Copy as JSON' }}
            </button>
          </div>
        </div>
      </div>

      <div class="list-header">
        <button class="btn-primary" @click="openAdd">⊕ Add item</button>
        <button class="btn-secondary" :disabled="!items.length" @click="startSessionFlow">
          Start shopping
        </button>
        <button class="btn-secondary" @click="showStoreManager = true">Edit stores</button>
      </div>

      <p v-if="shareError" class="share-error">Couldn't share: {{ shareError }}</p>
      <p v-if="itemsError" class="share-error">Couldn't connect to this shared list: {{ itemsError }}</p>
      <p v-else-if="shared && !itemsConnected" class="connecting">Connecting to shared list…</p>

      <p v-if="!items.length && (!shared || itemsConnected)" class="empty">
        No items yet — tap <strong>⊕ Add item</strong> to get started.
      </p>

      <ul v-else class="item-list">
        <li v-for="item in sortedItems" :key="item.id" class="item-row" @click="openEdit(item)">
          <div class="item-info">
            <span class="item-name">
              {{ item.name }}
              <span v-if="item.quantity" class="item-qty">({{ item.quantity }})</span>
            </span>
            <div class="item-tags">
              <span v-if="item.category" class="tag" :style="tagColor(item.category)">{{ item.category }}</span>
              <span v-for="storeId in item.stores" :key="storeId" class="tag" :style="tagColor(storeId)">{{ storeName(storeId) }}</span>
            </div>
          </div>
          <button
            class="remove-btn"
            :class="{ confirming: armedRemoveIds.has(item.id) }"
            aria-label="Remove item"
            @click.stop="handleRemoveTap(item)"
          >
            <span v-if="armedRemoveIds.has(item.id)">Tap again to remove ⊖</span>
            <span v-else>⊖</span>
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
        v-for="store in stores"
        :key="store.id"
        class="option-row"
        @click="beginSession(store.id)"
      >
        {{ store.name }}
      </button>
      <p v-if="!stores.length" class="empty">
        Add a preferred store to an item to shop by store.
      </p>
    </template>

    <SessionView
      v-else-if="view === 'session'"
      :items="sessionItems"
      :store="sessionStoreName"
      @end="endSession"
      @finish="finishSession"
    />

    <ItemGridModal
      :open="showGrid"
      :initial-items="gridInitialItems"
      :saved-items="items"
      :known-categories="knownCategories"
      :stores="stores"
      :resolve-store="addStore"
      @save="handleGridSave"
      @cancel="closeGrid"
    />

    <StoreManagerModal
      :open="showStoreManager"
      :stores="stores"
      :items="items"
      @rename="handleRenameStore"
      @remove="handleRemoveStore"
      @add="addStore"
      @close="showStoreManager = false"
    />

    <ImportItemsModal
      :open="showImport"
      :saved-items="items"
      @import="handleImport"
      @close="showImport = false"
    />
  </div>
</template>

<style scoped>
.shopping-list {
  padding: 0.5rem 0;
}

.list-header {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 1rem;
}

.btn-primary,
.btn-secondary {
  min-height: 2rem;
  padding: 0.3rem 0.75rem;
  border-radius: 0.4rem;
  font-size: 0.78rem;
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

.list-title-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.75rem;
}

.back-btn {
  min-height: 2.5rem;
  padding: 0.3rem 0.7rem;
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  background: var(--bg-elev-2);
  color: var(--text);
  font-size: 0.85rem;
  flex-shrink: 0;
}

.list-title {
  flex: 1;
  margin: 0;
  font-size: 1.15rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  overflow-wrap: anywhere;
}

.shared-badge {
  font-size: 0.75rem;
  font-weight: 600;
  color: #29b6f6;
  white-space: nowrap;
}

.menu-wrapper {
  position: relative;
  flex-shrink: 0;
}

.menu-btn {
  width: 2.25rem;
  height: 2.25rem;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 0.4rem;
  background: var(--bg-elev-2);
  color: var(--text);
  font-size: 1.1rem;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.menu-backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
}

.menu-panel {
  position: absolute;
  top: calc(100% + 0.35rem);
  right: 0;
  min-width: 12rem;
  background: var(--bg-elev);
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
  overflow: hidden;
  z-index: 50;
}

.menu-item {
  display: block;
  width: 100%;
  min-height: 2.75rem;
  padding: 0.5rem 0.9rem;
  text-align: left;
  background: var(--bg-elev);
  color: var(--text);
  font-size: 0.88rem;
  font-weight: 600;
  border: none;
  border-bottom: 1px solid var(--border);
  white-space: nowrap;
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-item:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.share-error {
  color: var(--danger);
  font-size: 0.88rem;
  margin: 0 0 0.75rem;
}

.connecting {
  color: var(--text-muted);
  font-size: 0.88rem;
  margin: 0 0 0.75rem;
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

.item-qty {
  font-size: 0.85rem;
  color: var(--text-muted);
  font-weight: 400;
}

.item-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}

.tag {
  font-size: 0.72rem;
  padding: 0.05rem 0.35rem;
  border-radius: 999px;
  border: 1px solid hsl(var(--tag-hue), 60%, var(--tag-lightness));
  color: hsl(var(--tag-hue), 60%, var(--tag-lightness));
  background: transparent;
  white-space: nowrap;
}

.remove-btn {
  flex-shrink: 0;
  min-width: 10rem;
  height: 2.5rem;
  padding: 0 0.6rem;
  border: none;
  border-radius: 0.4rem;
  background: transparent;
  color: var(--text-muted);
  font-size: 0.85rem;
  font-weight: 600;
  white-space: nowrap;
  text-align: right;
  transition: color 0.2s ease;
}

/* Only for real pointer devices — on touch, a tap leaves :hover "stuck" until the next tap
   lands elsewhere, which (using the same red as .confirming) looks exactly like the wrong
   row's remove button being armed. */
@media (hover: hover) and (pointer: fine) {
  .remove-btn:hover {
    color: var(--danger);
  }
}

.remove-btn.confirming {
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
