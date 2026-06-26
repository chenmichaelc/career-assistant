// client/src/composables/useConfirmModal.ts

import { ref } from 'vue';

export function useConfirmModal() {
  const isOpen = ref(false);
  const title = ref('');
  const message = ref('');

  let resolvePromise: ((value: boolean) => void) | null = null;

  function prompt(promptTitle: string, promptMessage: string): Promise<boolean> {
    title.value = promptTitle;
    message.value = promptMessage;
    isOpen.value = true;

    return new Promise((resolve) => {
      resolvePromise = resolve;
    });
  }

  function confirm() {
    isOpen.value = false;
    resolvePromise?.(true);
    resolvePromise = null;
  }

  function cancel() {
    isOpen.value = false;
    resolvePromise?.(false);
    resolvePromise = null;
  }

  return { isOpen, title, message, confirm, cancel, prompt };
}
