<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useLists } from '../lib/useLists'
import { migrateLegacyStoreData } from '../lib/migrateStores'
import { migrateToLists } from '../lib/migrateToLists'
import { fetchSharedListName } from '../lib/shareList'
import ListSwitcher from './ListSwitcher.vue'
import ShoppingList from './ShoppingList.vue'
import { logDebug } from '../debug'

// Order matters: the first upgrades old data to the Store-object shape, the second wraps
// whatever's left into the named-lists model. Both are no-ops once already on the new shape.
migrateLegacyStoreData()
migrateToLists()

const { lists, activeListId, createList, renameList, removeList, markShared, registerSharedList } =
  useLists()

const joinError = ref<string | null>(null)
const justSharedLink = ref<string | null>(null)
const linkCopied = ref(false)

onMounted(async () => {
  const params = new URLSearchParams(window.location.search)
  const sharedId = params.get('list')
  if (!sharedId) return

  // Clean the URL either way — the list id now lives in this device's local registry, not the
  // address bar, and leaving it there would re-run this on every reload.
  window.history.replaceState({}, '', window.location.pathname)

  if (lists.value.some((l) => l.id === sharedId)) {
    activeListId.value = sharedId
    return
  }

  const name = await fetchSharedListName(sharedId)
  if (!name) {
    joinError.value = "That shared list link didn't work — it may have been removed."
    logDebug(`Failed to join shared list ${sharedId}`, 'error')
    return
  }
  registerSharedList(sharedId, name)
  activeListId.value = sharedId
  logDebug(`Joined shared list: ${name}`)
})

const activeList = computed(() => lists.value.find((l) => l.id === activeListId.value) ?? null)

function openList(id: string) {
  activeListId.value = id
}

function handleCreate(name: string) {
  const list = createList(name)
  activeListId.value = list.id
}

function handleShared(link: string) {
  if (activeListId.value) markShared(activeListId.value)
  justSharedLink.value = link
  linkCopied.value = false
}

async function copyShareLink() {
  if (!justSharedLink.value) return
  try {
    await navigator.clipboard.writeText(justSharedLink.value)
    linkCopied.value = true
    setTimeout(() => (linkCopied.value = false), 1500)
  } catch {
    logDebug('clipboard copy failed', 'error')
  }
}
</script>

<template>
  <div class="shopping-app">
    <p v-if="joinError" class="join-error">{{ joinError }}</p>

    <div v-if="justSharedLink" class="share-banner">
      <p>List shared! Anyone with this link can view and edit it live:</p>
      <code class="share-link">{{ justSharedLink }}</code>
      <div class="share-banner-actions">
        <button class="btn-secondary" @click="copyShareLink">
          {{ linkCopied ? 'Copied ✓' : 'Copy link' }}
        </button>
        <button class="btn-secondary" @click="justSharedLink = null">Dismiss</button>
      </div>
    </div>

    <ListSwitcher
      v-if="!activeList"
      :lists="lists"
      @open="openList"
      @rename="(payload) => renameList(payload.id, payload.name)"
      @remove="removeList"
      @create="handleCreate"
    />

    <ShoppingList
      v-else
      :key="`${activeList.id}:${activeList.shared}`"
      :list-id="activeList.id"
      :list-name="activeList.name"
      :shared="activeList.shared"
      @back="activeListId = null"
      @shared="handleShared"
    />
  </div>
</template>

<style scoped>
.shopping-app {
  padding: 0.5rem 0;
}

.join-error {
  color: var(--danger);
  font-size: 0.9rem;
  margin: 0 0 1rem;
}

.share-banner {
  background: var(--bg-elev-2);
  border: 1px solid var(--accent-blue);
  border-radius: 0.6rem;
  padding: 0.75rem;
  margin-bottom: 1rem;
}

.share-banner p {
  margin: 0 0 0.5rem;
  font-size: 0.9rem;
}

.share-link {
  display: block;
  word-break: break-all;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 0.4rem;
  padding: 0.5rem;
  font-size: 0.82rem;
  margin-bottom: 0.6rem;
}

.share-banner-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-secondary {
  min-height: 2.5rem;
  padding: 0.4rem 0.9rem;
  border-radius: 0.5rem;
  font-size: 0.9rem;
  font-weight: 600;
  border: 1px solid var(--border);
  background: var(--bg-elev-2);
  color: var(--text);
}
</style>
