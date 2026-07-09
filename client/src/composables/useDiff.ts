// client/src/composables/useDiff.ts

import { ref, computed } from 'vue';
import { diffLines, type Change } from 'diff';

export type DiffPart = Change;

export function useDiff() {
  const oldText = ref('');
  const newText = ref('');

  const diffParts = computed<DiffPart[]>(() => diffLines(oldText.value, newText.value));

  return { oldText, newText, diffParts };
}
