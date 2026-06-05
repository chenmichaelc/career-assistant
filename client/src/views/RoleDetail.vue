<template>
  <div v-if="loading" class="font-mono text-dim text-sm">loading...</div>
  <div v-else-if="error" class="font-mono text-danger text-sm">{{ error }}</div>
  <div v-else-if="role">

    <!-- Back + Actions -->
    <div class="flex items-center justify-between mb-6">
      <router-link to="/" class="font-mono text-dim text-sm hover:text-text transition-colors">← roles</router-link>
      <div class="flex gap-3">
        <button @click="showExport = true" class="border border-border text-dim font-mono text-sm px-3 py-1.5 rounded hover:text-text transition-colors">export</button>
        <button @click="showDelete = true" class="border border-danger text-danger font-mono text-sm px-3 py-1.5 rounded hover:bg-danger/10 transition-colors">delete</button>
      </div>
    </div>

    <!-- Header -->
    <div class="mb-8">
      <div class="flex items-start gap-4">
        <div class="flex-1">
          <h1 class="font-mono text-2xl font-semibold text-text mb-1">{{ role.company }}</h1>
          <p class="font-mono text-dim text-base">{{ role.title }}</p>
        </div>
        <span :class="statusClass(role.role_status)" class="px-3 py-1 rounded font-mono text-sm font-medium shrink-0">
          {{ role.role_status }}
        </span>
      </div>
    </div>

    <!-- Meta grid -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <div class="bg-panel border border-border rounded p-4">
        <div class="font-mono text-xs text-dim mb-1">candidacy</div>
        <div class="font-mono text-sm text-text">{{ role.candidacy ?? '—' }}</div>
      </div>
      <div class="bg-panel border border-border rounded p-4">
        <div class="font-mono text-xs text-dim mb-1">applied</div>
        <div class="font-mono text-sm text-text">{{ role.applied_date ?? '—' }}</div>
      </div>
      <div class="bg-panel border border-border rounded p-4">
        <div class="font-mono text-xs text-dim mb-1">salary</div>
        <div class="font-mono text-sm text-text">
          {{ role.salary_min ? `$${(role.salary_min/1000).toFixed(0)}K` : '?' }}
          —
          {{ role.salary_max ? `$${(role.salary_max/1000).toFixed(0)}K` : '?' }}
        </div>
      </div>
      <div class="bg-panel border border-border rounded p-4">
        <div class="font-mono text-xs text-dim mb-1">url</div>
        <a v-if="role.url" :href="role.url" target="_blank" class="font-mono text-xs text-accent hover:underline truncate block">{{ role.url }}</a>
        <div v-else class="font-mono text-sm text-dim">—</div>
      </div>
    </div>

    <!-- Notes -->
    <div v-if="role.notes" class="bg-panel border border-border rounded p-4 mb-6">
      <div class="font-mono text-xs text-dim mb-2">notes</div>
      <div class="font-mono text-sm text-text whitespace-pre-wrap">{{ role.notes }}</div>
    </div>

    <!-- Update Status -->
    <div class="bg-panel border border-border rounded p-4 mb-6">
      <div class="font-mono text-xs text-dim mb-3">update status</div>
      <div class="flex gap-3 flex-wrap">
        <select v-model="newStatus" class="bg-surface border border-border text-text font-mono text-sm px-3 py-2 rounded focus:outline-none focus:border-accent">
          <option value="">select status...</option>
          <option v-for="s in VALID_STATUSES" :key="s" :value="s">{{ s }}</option>
        </select>
        <button @click="handleStatusUpdate" :disabled="!newStatus" class="bg-accent text-surface font-mono text-sm px-4 py-2 rounded hover:opacity-90 disabled:opacity-40 transition-opacity">
          update
        </button>
      </div>
      <div v-if="statusError" class="font-mono text-danger text-xs mt-2">{{ statusError }}</div>
      <div v-if="statusSuccess" class="font-mono text-success text-xs mt-2">{{ statusSuccess }}</div>
    </div>

    <!-- Skip Reasons -->
    <div v-if="role.skip_reasons?.length" class="bg-panel border border-border rounded p-4 mb-6">
      <div class="font-mono text-xs text-dim mb-3">skip reasons</div>
      <div v-for="sr in role.skip_reasons" :key="sr.id" class="flex items-center justify-between py-2 border-b border-border last:border-0">
        <div>
          <span class="font-mono text-sm text-text">{{ sr.reason }}</span>
          <span v-if="sr.note" class="font-mono text-xs text-dim ml-2">— {{ sr.note }}</span>
        </div>
        <button @click="deleteSkipReason(sr.id)" class="font-mono text-xs text-danger hover:opacity-80 transition-opacity ml-4">
          [{{ sr.id }}] delete
        </button>
      </div>
    </div>

    <!-- Add Skip Reason (visible when role is Skipped) -->
    <div v-if="role.role_status === 'Skipped'" class="bg-panel border border-border rounded p-4 mb-6">
      <div class="font-mono text-xs text-dim mb-3">add skip reason</div>
      <div class="flex gap-3 flex-wrap">
        <select v-model="addSkipReasonValue" class="bg-surface border border-border text-text font-mono text-sm px-3 py-2 rounded focus:outline-none focus:border-accent">
          <option value="">select reason...</option>
          <option v-for="r in VALID_SKIP_REASONS" :key="r" :value="r">{{ r }}</option>
        </select>
        <input v-model="addSkipReasonNote" placeholder="note (optional)" class="bg-surface border border-border text-text font-mono text-sm px-3 py-2 rounded focus:outline-none focus:border-accent flex-1" />
        <button @click="submitAddSkipReason" :disabled="!addSkipReasonValue" class="bg-accent text-surface font-mono text-sm px-4 py-2 rounded hover:opacity-90 disabled:opacity-40 transition-opacity">
          add
        </button>
      </div>
      <div v-if="addSkipReasonError" class="font-mono text-danger text-xs mt-2">{{ addSkipReasonError }}</div>
    </div>

    <!-- Termination Reasons -->
    <div v-if="role.termination_reasons?.length" class="bg-panel border border-border rounded p-4 mb-6">
      <div class="font-mono text-xs text-dim mb-3">termination reasons</div>
      <div v-for="tr in role.termination_reasons" :key="tr.id" class="flex items-center justify-between py-2 border-b border-border last:border-0">
        <div>
          <span class="font-mono text-sm text-text">{{ tr.reason }}</span>
          <span v-if="tr.note" class="font-mono text-xs text-dim ml-2">— {{ tr.note }}</span>
        </div>
        <button @click="deleteTerminationReason(tr.id)" class="font-mono text-xs text-danger hover:opacity-80 transition-opacity ml-4">
          [{{ tr.id }}] delete
        </button>
      </div>
    </div>

    <!-- Add Termination Reason (visible when role is Closed) -->
    <div v-if="role.role_status === 'Closed'" class="bg-panel border border-border rounded p-4 mb-6">
      <div class="font-mono text-xs text-dim mb-3">add termination reason</div>
      <div class="flex gap-3 flex-wrap">
        <select v-model="addTerminationReasonValue" class="bg-surface border border-border text-text font-mono text-sm px-3 py-2 rounded focus:outline-none focus:border-accent">
          <option value="">select reason...</option>
          <option v-for="r in VALID_TERMINATION_REASONS" :key="r" :value="r">{{ r }}</option>
        </select>
        <input v-model="addTerminationReasonNote" placeholder="note (optional)" class="bg-surface border border-border text-text font-mono text-sm px-3 py-2 rounded focus:outline-none focus:border-accent flex-1" />
        <button @click="submitAddTerminationReason" :disabled="!addTerminationReasonValue" class="bg-accent text-surface font-mono text-sm px-4 py-2 rounded hover:opacity-90 disabled:opacity-40 transition-opacity">
          add
        </button>
      </div>
      <div v-if="addTerminationReasonError" class="font-mono text-danger text-xs mt-2">{{ addTerminationReasonError }}</div>
    </div>

    <!-- Job Description -->
    <div class="bg-panel border border-border rounded p-4 mb-6">
      <div class="font-mono text-xs text-dim mb-3">job description</div>
      <div v-if="role.jd" class="font-mono text-sm text-text whitespace-pre-wrap leading-relaxed">{{ role.jd }}</div>
      <div v-else class="font-mono text-sm text-dim">No job description recorded.</div>
    </div>

    <!-- Reason Modal (Skipped / Closed transition) -->
    <div v-if="showReasonModal" class="fixed inset-0 bg-surface/80 flex items-center justify-center z-50">
      <div class="bg-panel border border-border rounded p-6 w-full max-w-md mx-4">
        <div class="font-mono text-sm font-semibold text-text mb-1">reason required</div>
        <div class="font-mono text-xs text-dim mb-5">provide at least one reason to continue</div>

        <div class="font-mono text-xs text-dim mb-1">new status</div>
        <div class="bg-surface border border-border text-dim font-mono text-sm px-3 py-2 rounded mb-4 opacity-70">{{ pendingStatus }}</div>

        <div class="font-mono text-xs text-dim mb-1">reason <span class="text-danger">*</span></div>
        <select v-model="modalReason" class="w-full bg-surface border border-border text-text font-mono text-sm px-3 py-2 rounded focus:outline-none focus:border-accent mb-4">
          <option value="">select reason...</option>
          <option v-for="r in modalReasonOptions" :key="r" :value="r">{{ r }}</option>
        </select>

        <div class="font-mono text-xs text-dim mb-1">note <span class="text-dim">(optional)</span></div>
        <input v-model="modalNote" placeholder="optional note..." class="w-full bg-surface border border-border text-text font-mono text-sm px-3 py-2 rounded focus:outline-none focus:border-accent mb-5" />

        <div v-if="modalError" class="font-mono text-danger text-xs mb-3">{{ modalError }}</div>

        <div class="flex gap-3 justify-end">
          <button @click="cancelModal" class="border border-border text-dim font-mono text-sm px-4 py-2 rounded hover:text-text transition-colors">cancel</button>
          <button @click="confirmModal" :disabled="!modalReason" class="bg-accent text-surface font-mono text-sm px-4 py-2 rounded hover:opacity-90 disabled:opacity-40 transition-opacity">confirm</button>
        </div>
      </div>
    </div>

    <!-- Export Modal -->
    <div v-if="showExport" class="fixed inset-0 bg-surface/80 flex items-center justify-center z-50">
      <div class="bg-panel border border-border rounded p-6 w-full max-w-2xl mx-4">
        <div class="font-mono text-sm font-semibold text-text mb-4">export role</div>
        <div class="flex gap-3 mb-4">
          <button @click="exportFormat = 'simple'" :class="exportFormat === 'simple' ? 'bg-accent text-surface' : 'border border-border text-dim'" class="font-mono text-sm px-3 py-1.5 rounded transition-colors">simple</button>
          <button @click="exportFormat = 'rich'"   :class="exportFormat === 'rich'   ? 'bg-accent text-surface' : 'border border-border text-dim'" class="font-mono text-sm px-3 py-1.5 rounded transition-colors">rich</button>
        </div>
        <pre class="bg-surface border border-border text-text font-mono text-xs p-4 rounded overflow-auto max-h-96 whitespace-pre-wrap">{{ exportContent }}</pre>
        <div class="flex gap-3 mt-4">
          <button @click="copyExport" class="bg-accent text-surface font-mono text-sm px-4 py-2 rounded hover:opacity-90 transition-opacity">copy</button>
          <button @click="showExport = false" class="border border-border text-dim font-mono text-sm px-4 py-2 rounded hover:text-text transition-colors">close</button>
        </div>
      </div>
    </div>

    <!-- Delete Modal -->
    <div v-if="showDelete" class="fixed inset-0 bg-surface/80 flex items-center justify-center z-50">
      <div class="bg-panel border border-border rounded p-6 w-full max-w-lg mx-4">
        <div class="font-mono text-sm font-semibold text-danger mb-4">delete role {{ role.id }}</div>
        <div class="font-mono text-sm text-text mb-2">{{ role.company }} — {{ role.title }}</div>
        <div class="font-mono text-xs text-dim mb-4">
          Dependents: {{ role.skip_reasons?.length ?? 0 }} skip reasons,
          {{ role.termination_reasons?.length ?? 0 }} termination reasons,
          1 job description
        </div>
        <div class="flex gap-3">
          <button @click="confirmDelete(false)" class="border border-danger text-danger font-mono text-sm px-4 py-2 rounded hover:bg-danger/10 transition-colors">delete if clean</button>
          <button @click="confirmDelete(true)"  class="bg-danger text-surface font-mono text-sm px-4 py-2 rounded hover:opacity-90 transition-opacity">force delete all</button>
          <button @click="showDelete = false"   class="border border-border text-dim font-mono text-sm px-4 py-2 rounded hover:text-text transition-colors">cancel</button>
        </div>
        <div v-if="deleteError" class="font-mono text-danger text-xs mt-3">{{ deleteError }}</div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter }             from 'vue-router';
import { apiFetch }                        from '@/composables/useApi';
import {
  VALID_STATUSES,
  VALID_SKIP_REASONS,
  VALID_TERMINATION_REASONS,
}                                          from '@/constants';

const REASON_REQUIRED_STATUSES = ['Skipped', 'Closed'];

const route  = useRoute();
const router = useRouter();

// ─── Role state ───────────────────────────────────────────────────────────────

const role    = ref<any>(null);
const loading = ref(false);
const error   = ref('');

// ─── Status update ────────────────────────────────────────────────────────────

const newStatus     = ref('');
const statusError   = ref('');
const statusSuccess = ref('');

// ─── Reason modal ─────────────────────────────────────────────────────────────

const showReasonModal = ref(false);
const pendingStatus   = ref('');
const modalReason     = ref('');
const modalNote       = ref('');
const modalError      = ref('');

const modalReasonOptions = computed(() => {
  if (pendingStatus.value === 'Skipped') return VALID_SKIP_REASONS;
  if (pendingStatus.value === 'Closed')  return VALID_TERMINATION_REASONS;
  return [];
});

// ─── Add reason controls ──────────────────────────────────────────────────────

const addSkipReasonValue        = ref('');
const addSkipReasonNote         = ref('');
const addSkipReasonError        = ref('');
const addTerminationReasonValue = ref('');
const addTerminationReasonNote  = ref('');
const addTerminationReasonError = ref('');

// ─── Export / Delete ──────────────────────────────────────────────────────────

const showExport   = ref(false);
const showDelete   = ref(false);
const deleteError  = ref('');
const exportFormat = ref<'simple' | 'rich'>('simple');
const exportContent = ref('');

// ─── Load ─────────────────────────────────────────────────────────────────────

async function load() {
  loading.value = true;
  error.value   = '';
  try {
    role.value = await apiFetch<any>(`/api/roles/${route.params.id}`);
  }
  catch (err) {
    error.value = (err as Error).message;
  }
  finally {
    loading.value = false;
  }
}

// ─── Status update ────────────────────────────────────────────────────────────

function handleStatusUpdate() {
  if (!newStatus.value) return;

  if (REASON_REQUIRED_STATUSES.includes(newStatus.value)) {
    pendingStatus.value   = newStatus.value;
    modalReason.value     = '';
    modalNote.value       = '';
    modalError.value      = '';
    showReasonModal.value = true;
    return;
  }

  submitStatusUpdate(newStatus.value, [], []);
}

async function submitStatusUpdate(
  status:      string,
  reasons:     string[],
  termination: string[],
  note?:       string,
) {
  statusError.value   = '';
  statusSuccess.value = '';
  try {
    await apiFetch(`/api/roles/${route.params.id}/status`, {
      method: 'PATCH',
      body:   JSON.stringify({ status, reasons, termination, note }),
    });
    statusSuccess.value = `Status updated to "${status}"`;
    newStatus.value     = '';
    await load();
  }
  catch (err) {
    statusError.value = (err as Error).message;
  }
}

// ─── Reason modal ─────────────────────────────────────────────────────────────

async function confirmModal() {
  if (!modalReason.value) return;
  modalError.value = '';

  const reasons     = pendingStatus.value === 'Skipped' ? [modalReason.value] : [];
  const termination = pendingStatus.value === 'Closed'  ? [modalReason.value] : [];
  const note        = modalNote.value || undefined;

  try {
    await apiFetch(`/api/roles/${route.params.id}/status`, {
      method: 'PATCH',
      body:   JSON.stringify({ status: pendingStatus.value, reasons, termination, note }),
    });
    statusSuccess.value   = `Status updated to "${pendingStatus.value}"`;
    showReasonModal.value = false;
    newStatus.value       = '';
    await load();
  }
  catch (err) {
    modalError.value = (err as Error).message;
  }
}

function cancelModal() {
  showReasonModal.value = false;
  pendingStatus.value   = '';
  modalReason.value     = '';
  modalNote.value       = '';
  modalError.value      = '';
}

// ─── Add reason ───────────────────────────────────────────────────────────────

async function submitAddSkipReason() {
  addSkipReasonError.value = '';
  try {
    await apiFetch(`/api/roles/${route.params.id}/skip-reasons`, {
      method: 'POST',
      body:   JSON.stringify({
        reason: addSkipReasonValue.value,
        note:   addSkipReasonNote.value || undefined,
      }),
    });
    addSkipReasonValue.value = '';
    addSkipReasonNote.value  = '';
    await load();
  }
  catch (err) {
    addSkipReasonError.value = (err as Error).message;
  }
}

async function submitAddTerminationReason() {
  addTerminationReasonError.value = '';
  try {
    await apiFetch(`/api/roles/${route.params.id}/termination-reasons`, {
      method: 'POST',
      body:   JSON.stringify({
        reason: addTerminationReasonValue.value,
        note:   addTerminationReasonNote.value || undefined,
      }),
    });
    addTerminationReasonValue.value = '';
    addTerminationReasonNote.value  = '';
    await load();
  }
  catch (err) {
    addTerminationReasonError.value = (err as Error).message;
  }
}

// ─── Delete reasons ───────────────────────────────────────────────────────────

async function deleteSkipReason(id: number) {
  if (!confirm(`Delete skip reason ${id}?`)) return;
  try {
    await apiFetch(`/api/roles/skip-reasons/${id}`, { method: 'DELETE' });
    await load();
  }
  catch (err) {
    error.value = (err as Error).message;
  }
}

async function deleteTerminationReason(id: number) {
  if (!confirm(`Delete termination reason ${id}?`)) return;
  try {
    await apiFetch(`/api/roles/termination-reasons/${id}`, { method: 'DELETE' });
    await load();
  }
  catch (err) {
    error.value = (err as Error).message;
  }
}

// ─── Delete role ──────────────────────────────────────────────────────────────

async function confirmDelete(force: boolean) {
  deleteError.value = '';
  try {
    await apiFetch(`/api/roles/${route.params.id}?force=${force}`, { method: 'DELETE' });
    router.push('/');
  }
  catch (err) {
    deleteError.value = (err as Error).message;
  }
}

// ─── Export ───────────────────────────────────────────────────────────────────

async function loadExport() {
  try {
    const data = await apiFetch<{ content: string }>(`/api/roles/${route.params.id}/export?format=${exportFormat.value}`);
    exportContent.value = data.content;
  }
  catch (err) {
    exportContent.value = (err as Error).message;
  }
}

async function copyExport() {
  await navigator.clipboard.writeText(exportContent.value);
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function statusClass(status: string): string {
  const map: Record<string, string> = {
    'Applied':        'bg-accent/20 text-accent',
    'Pending Triage': 'bg-warning/20 text-warning',
    'Skipped':        'bg-muted/40 text-dim',
    'Closed':         'bg-muted/40 text-dim',
    'In Interview':   'bg-success/20 text-success',
    'Offer Accepted': 'bg-success/20 text-success',
    'Offer Declined': 'bg-danger/20 text-danger',
    'Callback':       'bg-accent/20 text-accent',
    'On Hold':        'bg-warning/20 text-warning',
    'Resume Needed':  'bg-warning/20 text-warning',
    'Resume Ready':   'bg-accent/20 text-accent',
  };
  return map[status] ?? 'bg-muted/40 text-dim';
}

watch(showExport, (val) => { if (val) loadExport(); });
watch(exportFormat, () => { if (showExport.value) loadExport(); });
onMounted(load);
</script>