<!-- client/src/App.vue -->
<template>
  <div class="min-h-screen bg-surface">
    <nav
      data-testid="menu-bar"
      class="border-b border-border px-6 py-4 flex items-center justify-between"
    >
      <router-link to="/" class="font-mono text-accent font-semibold tracking-tight text-lg">
        career-assistant
      </router-link>
      <div class="flex items-center gap-6 font-mono text-sm">
        <router-link
          to="/"
          class="text-dim hover:text-text transition-colors"
          active-class="text-text"
          >roles</router-link
        >
        <router-link
          to="/add"
          class="text-dim hover:text-text transition-colors"
          active-class="text-text"
          >add</router-link
        >
        <router-link
          to="/query"
          class="text-dim hover:text-text transition-colors"
          active-class="text-text"
          >query</router-link
        >
        <div class="relative" data-testid="admin-menu">
          <button
            @click="showAdmin = !showAdmin"
            class="text-dim hover:text-text transition-colors"
          >
            admin ▾
          </button>
          <div
            v-if="showAdmin"
            class="absolute right-0 mt-2 bg-panel border border-border rounded shadow-lg z-50 min-w-32"
          >
            <button
              @click="
                backup();
                showAdmin = false;
              "
              class="block w-full text-left px-4 py-2 font-mono text-sm text-dim hover:text-success hover:bg-surface transition-colors"
            >
              backup
            </button>
            <button
              @click="
                requestCleanup();
                showAdmin = false;
              "
              class="block w-full text-left px-4 py-2 font-mono text-sm text-dim hover:text-danger hover:bg-surface transition-colors"
            >
              cleanup
            </button>
          </div>
        </div>
        <div class="relative" data-testid="utilities-menu">
          <button
            @click="showUtilities = !showUtilities"
            class="text-dim hover:text-text transition-colors"
          >
            utilities ▾
          </button>
          <div
            v-if="showUtilities"
            class="absolute right-0 mt-2 bg-panel border border-border rounded shadow-lg z-50 min-w-40"
          >
            <router-link
              to="/utilities/diff"
              @click="showUtilities = false"
              class="block w-full text-left px-4 py-2 font-mono text-sm text-dim hover:text-text hover:bg-surface transition-colors"
            >
              diff
            </router-link>
            <router-link
              to="/utilities/resume-converter"
              @click="showUtilities = false"
              class="block w-full text-left px-4 py-2 font-mono text-sm text-dim hover:text-text hover:bg-surface transition-colors"
            >
              resume → docx
            </router-link>
          </div>
        </div>
      </div>
    </nav>
    <main class="px-6 py-8 max-w-7xl mx-auto">
      <router-view />
    </main>
    <div
      v-if="statusMsg"
      class="fixed bottom-4 right-4 bg-panel border border-success text-success font-mono text-sm px-4 py-2 rounded"
    >
      {{ statusMsg }}
    </div>

    <ConfirmModal
      :isOpen="confirmModal.isOpen.value"
      :title="confirmModal.title.value"
      :message="confirmModal.message.value"
      confirmLabel="delete"
      @confirm="confirmModal.confirm"
      @cancel="confirmModal.cancel"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import ConfirmModal from './components/ConfirmModal.vue';
import { useConfirmModal } from './composables/useConfirmModal';
import { TEST_COMPANIES } from '../../e2e/fixtures/roles';

const statusMsg = ref('');
const showAdmin = ref(false);
const showUtilities = ref(false);
const confirmModal = useConfirmModal();

function handleClickOutside(event: MouseEvent) {
  const adminMenu = document.querySelector('[data-testid="admin-menu"]');
  if (adminMenu && !adminMenu.contains(event.target as Node)) {
    showAdmin.value = false;
  }
  const utilitiesMenu = document.querySelector('[data-testid="utilities-menu"]');
  if (utilitiesMenu && !utilitiesMenu.contains(event.target as Node)) {
    showUtilities.value = false;
  }
}

onMounted(() => document.addEventListener('click', handleClickOutside));
onUnmounted(() => document.removeEventListener('click', handleClickOutside));

function toast(msg: string) {
  statusMsg.value = msg;
  setTimeout(() => (statusMsg.value = ''), 4000);
}

async function backup() {
  try {
    const res = await fetch('/api/backup', { method: 'POST' });
    const data = await res.json();
    toast(`Backup saved: ${data.timestamp}`);
  } catch (err) {
    console.error('[backup] failed:', err);
    toast('Backup failed.');
  }
}

async function requestCleanup() {
  const confirmed = await confirmModal.prompt(
    'cleanup test data',
    `This will permanently delete all roles with company names used for test data (${TEST_COMPANIES.join(', ')}) and their dependents. This cannot be undone.`
  );

  if (!confirmed) return;

  try {
    const res = await fetch('/api/admin/cleanup', { method: 'POST' });
    const data = await res.json();
    toast(`Cleanup complete: ${data.count} role(s) deleted.`);
  } catch (err) {
    console.error('[cleanup] failed:', err);
    toast('Cleanup failed.');
  }
}
</script>
