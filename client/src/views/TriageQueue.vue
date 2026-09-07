<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="font-mono text-2xl font-semibold text-text">Triage</h1>
      <span class="font-mono text-sm text-dim">{{ stubs.length }} queued</span>
    </div>

    <!-- Quick-add stub -->
    <div class="flex gap-3 mb-4" data-testid="quick-add-stub">
      <input
        v-model="stubUrl"
        @keyup.enter="queueStub"
        placeholder="paste a job posting URL to queue for triage"
        class="bg-panel border border-border text-text font-mono text-sm px-3 py-2 rounded flex-1 focus:outline-none focus:border-accent"
      />
      <button
        @click="queueStub"
        :disabled="queueing || !stubUrl"
        class="bg-accent text-surface font-mono text-sm px-4 py-2 rounded hover:opacity-90 disabled:opacity-40 transition-opacity"
      >
        {{ queueing ? 'queuing...' : 'queue' }}
      </button>
    </div>

    <div
      v-if="error"
      class="bg-panel border border-danger text-danger font-mono text-sm px-4 py-3 rounded mb-4"
    >
      {{ error }}
    </div>

    <div v-if="loading" class="font-mono text-dim text-sm">loading...</div>

    <div v-else-if="stubs.length === 0" class="font-mono text-dim text-sm">No stubs queued.</div>

    <div v-else class="space-y-2" data-testid="stub-list">
      <div
        v-for="stub in stubs"
        :key="stub.id"
        class="bg-panel border border-border rounded px-4 py-3 flex items-center justify-between gap-4"
        data-testid="stub-row"
      >
        <a
          :href="stub.url"
          target="_blank"
          rel="noopener noreferrer"
          class="font-mono text-sm text-text truncate hover:text-accent transition-colors"
        >
          {{ stub.url }}
        </a>
        <div class="flex items-center gap-3 shrink-0">
          <button
            @click="promote(stub)"
            class="bg-accent text-surface font-mono text-sm px-4 py-1.5 rounded hover:opacity-90 transition-opacity"
          >
            promote
          </button>
          <button
            @click="requestDelete(stub)"
            class="border border-border text-dim font-mono text-sm px-4 py-1.5 rounded hover:text-danger transition-colors"
          >
            delete
          </button>
        </div>
      </div>
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
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { apiFetch } from '@/composables/useApi';
import { useConfirmModal } from '@/composables/useConfirmModal';
import ConfirmModal from '@/components/ConfirmModal.vue';
import { validateUrl } from '@/utils/validateUrl';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- job stub shape not yet shared with client; tracked in CAR-4
type Stub = any;

const router = useRouter();
const stubs = ref<Stub[]>([]);
const loading = ref(false);
const error = ref('');
const confirmModal = useConfirmModal();
const stubUrl = ref('');
const queueing = ref(false);

onMounted(load);

async function load() {
  loading.value = true;
  error.value = '';
  try {
    stubs.value = await apiFetch<Stub[]>('/api/job-stubs');
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    loading.value = false;
  }
}

async function queueStub() {
  if (!stubUrl.value) return;
  error.value = '';

  const urlValidation = validateUrl(stubUrl.value);
  if (!urlValidation.valid) {
    error.value = urlValidation.message;
    return;
  }

  queueing.value = true;
  try {
    await apiFetch('/api/job-stubs', {
      method: 'POST',
      body: JSON.stringify({ url: stubUrl.value }),
    });
    stubUrl.value = '';
    await load();
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    queueing.value = false;
  }
}

function promote(stub: Stub) {
  router.push({ path: '/add', query: { url: stub.url } });
}

async function requestDelete(stub: Stub) {
  const confirmed = await confirmModal.prompt('delete stub', `Remove ${stub.url} from the queue?`);
  if (!confirmed) return;

  try {
    await apiFetch(`/api/job-stubs/${stub.id}`, { method: 'DELETE' });
    stubs.value = stubs.value.filter((s) => s.id !== stub.id);
  } catch (err) {
    error.value = (err as Error).message;
  }
}
</script>
