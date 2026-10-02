<template>
  <div v-if="loading" class="font-mono text-dim text-sm">loading...</div>
  <div v-else-if="loadError" class="font-mono text-danger text-sm">{{ loadError }}</div>
  <div v-else-if="stub">
    <!-- Back -->
    <div class="mb-6">
      <router-link to="/triage" class="font-mono text-dim text-sm hover:text-text transition-colors"
        >← triage</router-link
      >
    </div>

    <!-- Header -->
    <div class="mb-8">
      <a
        :href="stub.url"
        target="_blank"
        rel="noopener noreferrer"
        class="font-mono text-base text-accent hover:underline break-all"
        data-testid="stub-url"
        >{{ stub.url }}</a
      >
    </div>

    <!-- Status -->
    <div class="bg-panel border border-border rounded p-4 mb-6" data-testid="status-card">
      <div class="font-mono text-xs text-dim mb-3">
        status: <span class="text-text" data-testid="status-value">{{ stub.status }}</span>
      </div>
      <div class="flex gap-3 flex-wrap">
        <select
          v-model="newStatus"
          class="bg-surface border border-border text-text font-mono text-sm px-3 py-2 rounded focus:outline-none focus:border-accent"
        >
          <option value="">select status...</option>
          <option v-for="status in VALID_JOB_STUB_STATUSES" :key="status" :value="status">
            {{ status }}
          </option>
        </select>
        <button
          @click="handleStatusUpdate"
          :disabled="!newStatus"
          class="bg-accent text-surface font-mono text-sm px-4 py-2 rounded hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          update
        </button>
      </div>
    </div>

    <!-- Raw content -->
    <div class="bg-panel border border-border rounded p-4 mb-6" data-testid="raw-content-section">
      <div class="font-mono text-xs text-dim mb-2">raw content</div>
      <textarea
        v-model="form.raw_content"
        class="input w-full h-64 font-mono text-xs"
        placeholder="Paste the full job posting text here."
        data-testid="raw-content-textarea"
      />
    </div>

    <!-- Import LLM JSON -->
    <div class="bg-panel border border-border rounded p-4 mb-6" data-testid="import-section">
      <div class="font-mono text-xs text-dim mb-2">paste LLM structured output (JSON)</div>
      <textarea
        v-model="importText"
        class="input w-full h-32 font-mono text-xs"
        placeholder='{"company": "Acme", "title": "Engineer", ...}'
        data-testid="import-textarea"
      />
      <div class="flex gap-3 mt-3">
        <button
          @click="handleImport"
          :disabled="!importText || importing"
          class="bg-accent text-surface font-mono text-sm px-4 py-2 rounded hover:opacity-90 disabled:opacity-40 transition-opacity"
          data-testid="import-button"
        >
          {{ importing ? 'importing...' : 'import' }}
        </button>
      </div>
      <div v-if="importError" class="font-mono text-danger text-xs mt-2" data-testid="import-error">
        {{ importError }}
      </div>
    </div>

    <!-- Parsed fields -->
    <div class="bg-panel border border-border rounded p-4 mb-6" data-testid="parsed-fields-section">
      <div class="font-mono text-xs text-dim mb-3">parsed fields</div>

      <div class="space-y-4">
        <div>
          <label class="font-mono text-xs text-dim block mb-1">Company</label>
          <input v-model="form.company" class="input w-full" data-testid="parsed-company-input" />
        </div>
        <div>
          <label class="font-mono text-xs text-dim block mb-1">Title</label>
          <input v-model="form.title" class="input w-full" data-testid="parsed-title-input" />
        </div>
        <div>
          <label class="font-mono text-xs text-dim block mb-1">Description</label>
          <textarea v-model="form.description" class="input w-full h-32" />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="font-mono text-xs text-dim block mb-1">Salary Minimum</label>
            <input v-model.number="form.salary_min" type="number" class="input w-full" />
          </div>
          <div>
            <label class="font-mono text-xs text-dim block mb-1">Salary Maximum</label>
            <input v-model.number="form.salary_max" type="number" class="input w-full" />
          </div>
        </div>
        <div>
          <label class="font-mono text-xs text-dim block mb-1">Candidacy</label>
          <select v-model="form.candidacy" class="input w-full">
            <option value="">—</option>
            <option v-for="option in VALID_CANDIDACIES" :key="option" :value="option">
              {{ option }}
            </option>
          </select>
        </div>
        <div>
          <label class="font-mono text-xs text-dim block mb-1">Role Status</label>
          <select
            v-model="form.role_status"
            class="input w-full"
            data-testid="parsed-role-status-select"
          >
            <option value="">—</option>
            <option v-for="option in VALID_STATUSES" :key="option" :value="option">
              {{ option }}
            </option>
          </select>
        </div>
        <div>
          <label class="font-mono text-xs text-dim block mb-1">Location</label>
          <input v-model="form.location" class="input w-full" />
        </div>
        <div>
          <label class="font-mono text-xs text-dim block mb-1">In-Office Expectation</label>
          <select v-model="form.in_office_expectation" class="input w-full">
            <option value="">—</option>
            <option v-for="option in VALID_IN_OFFICE_EXPECTATIONS" :key="option" :value="option">
              {{ option }}
            </option>
          </select>
        </div>

        <!-- Skip Reasons -->
        <div>
          <label class="font-mono text-xs text-dim block mb-1">Skip Reasons</label>
          <div v-if="form.skip_reasons.length === 0" class="font-mono text-xs text-dim">
            None recorded.
          </div>
          <div
            v-for="(skipReason, index) in form.skip_reasons"
            :key="index"
            class="flex items-center justify-between py-2 border-b border-border last:border-0"
            data-testid="skip-reason-row"
          >
            <div>
              <span class="font-mono text-sm text-text">{{ skipReason.reason }}</span>
              <span v-if="skipReason.note" class="font-mono text-xs text-dim ml-2">
                — {{ skipReason.note }}
              </span>
            </div>
            <button
              @click="form.skip_reasons.splice(index, 1)"
              class="font-mono text-xs text-danger hover:opacity-80 transition-opacity ml-4"
              data-testid="remove-skip-reason-button"
            >
              delete
            </button>
          </div>

          <div class="flex gap-3 flex-wrap mt-2" data-testid="add-skip-reason-section">
            <select
              v-model="addSkipReasonValue"
              class="bg-surface border border-border text-text font-mono text-sm px-3 py-2 rounded focus:outline-none focus:border-accent"
            >
              <option value="">select reason...</option>
              <option
                v-for="skipReason in VALID_SKIP_REASONS"
                :key="skipReason"
                :value="skipReason"
              >
                {{ skipReason }}
              </option>
            </select>
            <input
              v-model="addSkipReasonNote"
              placeholder="note (optional)"
              class="bg-surface border border-border text-text font-mono text-sm px-3 py-2 rounded focus:outline-none focus:border-accent flex-1"
            />
            <button
              @click="submitAddSkipReason"
              :disabled="!addSkipReasonValue"
              class="bg-accent text-surface font-mono text-sm px-4 py-2 rounded hover:opacity-90 disabled:opacity-40 transition-opacity"
              data-testid="add-skip-reason-button"
            >
              add
            </button>
          </div>
        </div>

        <!-- Termination Reasons -->
        <div>
          <label class="font-mono text-xs text-dim block mb-1">Termination Reasons</label>
          <div v-if="form.termination_reasons.length === 0" class="font-mono text-xs text-dim">
            None recorded.
          </div>
          <div
            v-for="(terminationReason, index) in form.termination_reasons"
            :key="index"
            class="flex items-center justify-between py-2 border-b border-border last:border-0"
            data-testid="termination-reason-row"
          >
            <div>
              <span class="font-mono text-sm text-text">{{ terminationReason.reason }}</span>
              <span v-if="terminationReason.note" class="font-mono text-xs text-dim ml-2">
                — {{ terminationReason.note }}
              </span>
            </div>
            <button
              @click="form.termination_reasons.splice(index, 1)"
              class="font-mono text-xs text-danger hover:opacity-80 transition-opacity ml-4"
              data-testid="remove-termination-reason-button"
            >
              delete
            </button>
          </div>

          <div class="flex gap-3 flex-wrap mt-2" data-testid="add-termination-reason-section">
            <select
              v-model="addTerminationReasonValue"
              class="bg-surface border border-border text-text font-mono text-sm px-3 py-2 rounded focus:outline-none focus:border-accent"
            >
              <option value="">select reason...</option>
              <option
                v-for="terminationReason in VALID_TERMINATION_REASONS"
                :key="terminationReason"
                :value="terminationReason"
              >
                {{ terminationReason }}
              </option>
            </select>
            <input
              v-model="addTerminationReasonNote"
              placeholder="note (optional)"
              class="bg-surface border border-border text-text font-mono text-sm px-3 py-2 rounded focus:outline-none focus:border-accent flex-1"
            />
            <button
              @click="submitAddTerminationReason"
              :disabled="!addTerminationReasonValue"
              class="bg-accent text-surface font-mono text-sm px-4 py-2 rounded hover:opacity-90 disabled:opacity-40 transition-opacity"
              data-testid="add-termination-reason-button"
            >
              add
            </button>
          </div>
        </div>
      </div>

      <div class="flex gap-3 mt-4">
        <button
          @click="handleSaveFields"
          :disabled="!hasChanges || saving"
          class="bg-accent text-surface font-mono text-sm px-4 py-2 rounded hover:opacity-90 disabled:opacity-40 transition-opacity"
          data-testid="save-fields-button"
        >
          {{ saving ? 'saving...' : 'save changes' }}
        </button>
      </div>
      <div v-if="saveError" class="font-mono text-danger text-xs mt-2" data-testid="save-error">
        {{ saveError }}
      </div>
      <div
        v-if="saveSuccess"
        class="font-mono text-success text-xs mt-2"
        data-testid="save-success"
      >
        {{ saveSuccess }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { apiFetch } from '@/composables/useApi';
import {
  VALID_STATUSES,
  VALID_CANDIDACIES,
  VALID_IN_OFFICE_EXPECTATIONS,
  VALID_JOB_STUB_STATUSES,
  VALID_SKIP_REASONS,
  VALID_TERMINATION_REASONS,
} from '@/constants';

const route = useRoute();

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- job stub shape not yet shared with client; tracked in CAR-4
const stub = ref<any>(null);
const loading = ref(false);
const loadError = ref('');

interface ReasonEntry {
  reason: string;
  note: string | null;
}

interface JobStubForm {
  raw_content: string;
  company: string;
  title: string;
  description: string;
  salary_min: number | null;
  salary_max: number | null;
  candidacy: string;
  role_status: string;
  location: string;
  in_office_expectation: string;
  skip_reasons: ReasonEntry[];
  termination_reasons: ReasonEntry[];
}

const emptyForm: JobStubForm = {
  raw_content: '',
  company: '',
  title: '',
  description: '',
  salary_min: null,
  salary_max: null,
  candidacy: '',
  role_status: '',
  location: '',
  in_office_expectation: '',
  skip_reasons: [],
  termination_reasons: [],
};

const form = ref<JobStubForm>({ ...emptyForm });
const original = ref<JobStubForm>({ ...emptyForm });

// ─── Status update ────────────────────────────────────────────────────────────

const newStatus = ref('');

// ─── Import ───────────────────────────────────────────────────────────────────

const importText = ref('');
const importing = ref(false);
const importError = ref('');

// ─── Add reason controls ──────────────────────────────────────────────────────

const addSkipReasonValue = ref('');
const addSkipReasonNote = ref('');
const addTerminationReasonValue = ref('');
const addTerminationReasonNote = ref('');

// ─── Save parsed fields ───────────────────────────────────────────────────────

const saving = ref(false);
const saveError = ref('');
const saveSuccess = ref('');

const hasChanges = computed(() => JSON.stringify(form.value) !== JSON.stringify(original.value));

// ─── Load ─────────────────────────────────────────────────────────────────────

function parseReasons(raw: string | null): ReasonEntry[] {
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- job stub shape not yet shared with client; tracked in CAR-4
function toForm(loadedStub: any): JobStubForm {
  return {
    raw_content: loadedStub.raw_content ?? '',
    company: loadedStub.parsed_company ?? '',
    title: loadedStub.parsed_title ?? '',
    description: loadedStub.parsed_description ?? '',
    salary_min: loadedStub.parsed_salary_min ?? null,
    salary_max: loadedStub.parsed_salary_max ?? null,
    candidacy: loadedStub.parsed_candidacy ?? '',
    role_status: loadedStub.parsed_role_status ?? '',
    location: loadedStub.parsed_location ?? '',
    in_office_expectation: loadedStub.parsed_in_office_expectation ?? '',
    skip_reasons: parseReasons(loadedStub.parsed_skip_reasons ?? null),
    termination_reasons: parseReasons(loadedStub.parsed_termination_reasons ?? null),
  };
}

async function load() {
  loading.value = true;
  loadError.value = '';
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- job stub shape not yet shared with client; tracked in CAR-4
    stub.value = await apiFetch<any>(`/api/job-stubs/${route.params.id}`);
    form.value = toForm(stub.value);
    original.value = toForm(stub.value);
  } catch (err) {
    loadError.value = (err as Error).message;
  } finally {
    loading.value = false;
  }
}

// ─── Status update ────────────────────────────────────────────────────────────

async function handleStatusUpdate() {
  if (!newStatus.value) return;
  try {
    await apiFetch(`/api/job-stubs/${route.params.id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus.value }),
    });
    newStatus.value = '';
    await load();
  } catch (err) {
    loadError.value = (err as Error).message;
  }
}

// ─── Import ───────────────────────────────────────────────────────────────────

async function handleImport() {
  importError.value = '';

  let payload: unknown;
  try {
    payload = JSON.parse(importText.value);
  } catch {
    importError.value = 'Not valid JSON.';
    return;
  }

  importing.value = true;
  try {
    await apiFetch(`/api/job-stubs/${route.params.id}/import`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    importText.value = '';
    await load();
  } catch (err) {
    importError.value = (err as Error).message;
  } finally {
    importing.value = false;
  }
}

// ─── Add reason ───────────────────────────────────────────────────────────────

function submitAddSkipReason() {
  if (!addSkipReasonValue.value) return;
  form.value.skip_reasons.push({
    reason: addSkipReasonValue.value,
    note: addSkipReasonNote.value || null,
  });
  addSkipReasonValue.value = '';
  addSkipReasonNote.value = '';
}

function submitAddTerminationReason() {
  if (!addTerminationReasonValue.value) return;
  form.value.termination_reasons.push({
    reason: addTerminationReasonValue.value,
    note: addTerminationReasonNote.value || null,
  });
  addTerminationReasonValue.value = '';
  addTerminationReasonNote.value = '';
}

// ─── Save parsed fields ───────────────────────────────────────────────────────

const FORM_TO_JSON_FIELD: Record<string, string> = {
  company: 'company',
  title: 'title',
  description: 'description',
  salary_min: 'salary_min',
  salary_max: 'salary_max',
  candidacy: 'candidacy',
  role_status: 'role_status',
  location: 'location',
  in_office_expectation: 'in_office_expectation',
  skip_reasons: 'skip_reasons',
  termination_reasons: 'termination_reasons',
};

function buildParsedFieldsPayload(): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  for (const key of Object.keys(FORM_TO_JSON_FIELD) as (keyof JobStubForm)[]) {
    const currentValue = form.value[key];
    const originalValue = original.value[key];
    if (JSON.stringify(currentValue) === JSON.stringify(originalValue)) continue;

    const jsonField = FORM_TO_JSON_FIELD[key];
    payload[jsonField] = currentValue === '' ? null : currentValue;
  }

  return payload;
}

async function handleSaveFields() {
  saveError.value = '';
  saveSuccess.value = '';

  saving.value = true;
  try {
    if (form.value.raw_content !== original.value.raw_content) {
      await apiFetch(`/api/job-stubs/${route.params.id}/raw-content`, {
        method: 'PATCH',
        body: JSON.stringify({ raw_content: form.value.raw_content }),
      });
    }

    const parsedFieldsPayload = buildParsedFieldsPayload();
    if (Object.keys(parsedFieldsPayload).length > 0) {
      await apiFetch(`/api/job-stubs/${route.params.id}/parsed-fields`, {
        method: 'PATCH',
        body: JSON.stringify(parsedFieldsPayload),
      });
    }

    saveSuccess.value = 'Saved.';
    await load();
  } catch (err) {
    saveError.value = (err as Error).message;
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
@reference "../style.css";

.input {
  @apply bg-panel border border-border text-text font-mono text-sm px-3 py-2 rounded focus:outline-none focus:border-accent;
}
</style>
