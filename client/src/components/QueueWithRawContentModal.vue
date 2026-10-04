<!-- client/src/components/QueueWithRawContentModal.vue -->
<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 bg-surface/80 flex items-center justify-center z-50"
      data-testid="queue-with-raw-content-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="queue-with-raw-content-title"
      @keydown.esc="emit('close')"
    >
      <div class="bg-panel border border-border rounded p-6 w-full max-w-2xl mx-4">
        <div
          id="queue-with-raw-content-title"
          class="font-mono text-sm font-semibold text-text mb-4"
        >
          queue with raw content
        </div>

        <label for="queue-modal-url" class="font-mono text-xs text-dim block mb-1">URL</label>
        <input
          id="queue-modal-url"
          ref="urlInput"
          v-model="stubUrl"
          placeholder="https://..."
          class="bg-surface border border-border text-text font-mono text-sm px-3 py-2 rounded w-full mb-4 focus:outline-none focus:border-accent"
        />

        <label for="queue-modal-raw-content" class="font-mono text-xs text-dim block mb-1"
          >Raw content</label
        >
        <textarea
          id="queue-modal-raw-content"
          v-model="rawContent"
          placeholder="Paste the full job posting text here."
          class="bg-surface border border-border text-text font-mono text-xs px-3 py-2 rounded w-full h-64 mb-4 focus:outline-none focus:border-accent"
        />

        <div v-if="error" role="alert" class="font-mono text-danger text-xs mb-3">
          {{ error }}
        </div>

        <div class="flex items-center gap-4 justify-end">
          <label class="font-mono text-xs text-dim flex items-center gap-2">
            <input v-model="createAnother" type="checkbox" />
            Create Another Stub
          </label>
          <button
            @click="emit('close')"
            class="border border-border text-dim font-mono text-sm px-4 py-2 rounded hover:text-text transition-colors"
          >
            cancel
          </button>
          <button
            @click="save"
            :disabled="saving"
            class="bg-accent text-surface font-mono text-sm px-4 py-2 rounded hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            {{ saving ? 'saving...' : 'save' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import { apiFetch } from '@/composables/useApi';
import { validateUrl } from '@/utils/validateUrl';

const props = defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  saved: [];
  close: [];
}>();

const stubUrl = ref('');
const rawContent = ref('');
const createAnother = ref(false);
const saving = ref(false);
const error = ref('');
const urlInput = ref<HTMLInputElement | null>(null);

function clearFields() {
  stubUrl.value = '';
  rawContent.value = '';
  error.value = '';
}

async function focusUrlInput() {
  await nextTick();
  urlInput.value?.focus();
}

watch(
  () => props.isOpen,
  (isOpen) => {
    if (!isOpen) return;
    clearFields();
    createAnother.value = false;
    focusUrlInput();
  }
);

async function save() {
  error.value = '';

  const urlValidation = validateUrl(stubUrl.value);
  if (!urlValidation.valid) {
    error.value = urlValidation.message;
    return;
  }
  if (rawContent.value.trim() === '') {
    error.value = 'Raw content is required.';
    return;
  }

  saving.value = true;
  try {
    await apiFetch('/api/job-stubs', {
      method: 'POST',
      body: JSON.stringify({ url: stubUrl.value, raw_content: rawContent.value }),
    });
  } catch (err) {
    error.value = (err as Error).message;
    return;
  } finally {
    saving.value = false;
  }

  emit('saved');
  if (createAnother.value) {
    clearFields();
    focusUrlInput();
  } else {
    emit('close');
  }
}
</script>
