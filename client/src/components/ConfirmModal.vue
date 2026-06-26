<!-- client/src/components/ConfirmModal.vue -->
<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 bg-surface/80 flex items-center justify-center z-50"
      data-testid="confirm-modal"
    >
      <div class="bg-panel border border-border rounded p-6 w-full max-w-md mx-4">
        <div class="font-mono text-sm font-semibold text-text mb-3">{{ title }}</div>
        <div class="font-mono text-sm text-dim mb-6 leading-relaxed">{{ message }}</div>
        <div class="flex gap-3 justify-end">
          <button
            @click="cancel"
            class="border border-border text-dim font-mono text-sm px-4 py-2 rounded hover:text-text transition-colors"
          >
            cancel
          </button>
          <button
            @click="confirm"
            class="bg-danger text-surface font-mono text-sm px-4 py-2 rounded hover:opacity-90 transition-opacity"
          >
            {{ confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
  }>(),
  {
    confirmLabel: 'confirm',
  }
);

const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();

function confirm() {
  emit('confirm');
}

function cancel() {
  emit('cancel');
}
</script>
