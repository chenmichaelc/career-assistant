// client/src/composables/useDiff.ts
// CAR-212 — line-level diff engine integration. Rendering is CAR-213's concern;
// this composable only exposes reactive input refs and the computed diff parts.

import { ref, computed } from 'vue';
import { diffLines, type Change } from 'diff';

export type DiffPart = Change;

export function useDiff() {
  const oldText = ref('');
  const newText = ref('');

  // Recomputed on every keystroke via Vue's computed — no debounce.
  // diffLines is cheap enough at resume-length text that a debounce would be
  // premature; revisit if profiling ever shows otherwise.
  const diffParts = computed<DiffPart[]>(() => diffLines(oldText.value, newText.value));

  return { oldText, newText, diffParts };
}
