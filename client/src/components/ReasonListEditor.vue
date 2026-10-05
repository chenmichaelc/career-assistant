<!-- client/src/components/ReasonListEditor.vue -->
<template>
  <div :data-testid="`${kind}-reasons-editor`">
    <label class="font-mono text-xs text-dim block mb-1">{{ label }}</label>
    <div v-if="reasons.length === 0" class="font-mono text-xs text-dim">None recorded.</div>
    <div
      v-for="(entry, index) in reasons"
      :key="index"
      class="flex items-center justify-between py-2 border-b border-border last:border-0"
      :data-testid="`${kind}-reason-row`"
    >
      <div>
        <span class="font-mono text-sm text-text">{{ entry.reason }}</span>
        <span v-if="entry.note" class="font-mono text-xs text-dim ml-2">— {{ entry.note }}</span>
      </div>
      <button
        @click="removeReason(index)"
        class="font-mono text-xs text-danger hover:opacity-80 transition-opacity ml-4"
      >
        delete
      </button>
    </div>

    <div class="flex gap-3 flex-wrap mt-2" :data-testid="`add-${kind}-reason-section`">
      <select
        v-model="newReason"
        :aria-label="`${kind} reason`"
        class="bg-surface border border-border text-text font-mono text-sm px-3 py-2 rounded focus:outline-none focus:border-accent"
      >
        <option value="">select reason...</option>
        <option v-for="option in options" :key="option" :value="option">
          {{ option }}
        </option>
      </select>
      <input
        v-model="newNote"
        placeholder="note (optional)"
        :aria-label="`${kind} reason note`"
        class="bg-surface border border-border text-text font-mono text-sm px-3 py-2 rounded focus:outline-none focus:border-accent flex-1"
      />
      <button
        @click="addReason"
        :disabled="!newReason"
        class="bg-accent text-surface font-mono text-sm px-4 py-2 rounded hover:opacity-90 disabled:opacity-40 transition-opacity"
      >
        add
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { ReasonEntry } from '@/utils/storedReasons';

defineProps<{
  label: string;
  kind: 'skip' | 'termination';
  options: readonly string[];
}>();

const reasons = defineModel<ReasonEntry[]>({ required: true });

const newReason = ref('');
const newNote = ref('');

function addReason() {
  if (!newReason.value) return;
  reasons.value = [...reasons.value, { reason: newReason.value, note: newNote.value || null }];
  newReason.value = '';
  newNote.value = '';
}

function removeReason(index: number) {
  reasons.value = reasons.value.filter((_entry, entryIndex) => entryIndex !== index);
}
</script>
