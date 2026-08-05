<!-- client/src/views/DiffVisualizer.vue -->
<template>
  <div class="max-w-4xl" data-testid="diff-visualizer-view">
    <div class="flex items-center justify-between mb-6">
      <h1 class="font-mono text-2xl font-semibold text-text">Diff Visualizer</h1>
      <div class="flex items-center gap-3">
        <span class="font-mono text-xs text-dim">line mode</span>
        <button
          type="button"
          @click="wordMode = !wordMode"
          :class="wordMode ? 'bg-accent border-accent' : 'bg-surface border-border'"
          class="relative w-10 h-5 border rounded-full transition-colors overflow-hidden"
          data-testid="diff-mode-toggle"
        >
          <span
            :class="wordMode ? 'translate-x-5.5 bg-surface' : 'translate-x-0.5 bg-dim'"
            class="absolute left-0 top-0.5 w-4 h-4 rounded-full transition-transform"
          />
        </button>
        <span class="font-mono text-xs text-dim">word mode</span>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-4 mb-6">
      <div id="diff-original-input-region">
        <label class="font-mono text-xs text-dim block mb-1">original</label>
        <textarea
          v-model="oldText"
          class="w-full h-64 bg-panel border border-border text-text font-mono text-sm px-4 py-3 rounded focus:outline-none focus:border-accent resize-y"
          placeholder="Paste the original version here…"
        />
      </div>
      <div id="diff-new-input-region">
        <label class="font-mono text-xs text-dim block mb-1">new</label>
        <textarea
          v-model="newText"
          class="w-full h-64 bg-panel border border-border text-text font-mono text-sm px-4 py-3 rounded focus:outline-none focus:border-accent resize-y"
          placeholder="Paste the new version here…"
        />
      </div>
    </div>

    <div data-testid="diff-render">
      <div
        v-if="!hasBothInputs"
        class="font-mono text-sm text-dim bg-panel border border-border rounded px-4 py-3"
      >
        Paste text into both fields above to see a diff.
      </div>

      <div
        v-else-if="wordMode"
        data-testid="diff-word-mode"
        class="font-mono text-sm bg-panel border border-border rounded px-4 py-3 whitespace-pre-wrap wrap-break-word"
      >
        <span
          v-for="(part, index) in wordDiffParts"
          :key="index"
          :class="wordPartClass(part)"
          :data-testid="
            part.added ? 'diff-word-added' : part.removed ? 'diff-word-removed' : undefined
          "
          >{{ part.value }}</span
        >
      </div>

      <div
        v-else
        data-testid="diff-line-mode"
        class="font-mono text-sm bg-panel border border-border rounded py-2"
      >
        <div
          v-for="(line, index) in renderedLines"
          :key="index"
          :class="lineClass(line.type)"
          :data-testid="`diff-line-${line.type}`"
          class="px-4 whitespace-pre-wrap wrap-break-word"
        >
          <span>{{ linePrefix(line.type) }}{{ line.text }}</span
          ><span
            v-if="line.trailingWhitespace"
            class="text-warning bg-warning/10"
            data-testid="diff-trailing-whitespace"
            >{{ visualizeWhitespace(line.trailingWhitespace) }}</span
          >
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useDiff, type DiffPart } from '@/composables/useDiff';

const { oldText, newText, diffParts, wordDiffParts } = useDiff();

const wordMode = ref(false);

const hasBothInputs = computed(() => oldText.value.trim() !== '' && newText.value.trim() !== '');

type LineType = 'added' | 'removed' | 'context';

interface RenderedLine {
  text: string;
  trailingWhitespace: string;
  type: LineType;
}

function splitTrailingWhitespace(text: string): { main: string; trailing: string } {
  const main = text.trimEnd();
  return { main, trailing: text.slice(main.length) };
}

function visualizeWhitespace(whitespace: string): string {
  return [...whitespace]
    .map((char) => {
      if (char === ' ') return '·';
      if (char === '\t') return '→';

      return '□';
    })
    .join('');
}

const renderedLines = computed<RenderedLine[]>(() => {
  const lines: RenderedLine[] = [];
  for (const part of diffParts.value) {
    const type: LineType = part.added ? 'added' : part.removed ? 'removed' : 'context';
    const partLines = part.value.split('\n');
    if (partLines[partLines.length - 1] === '') partLines.pop();
    for (const rawLine of partLines) {
      const { main, trailing } = splitTrailingWhitespace(rawLine);
      lines.push({ text: main, trailingWhitespace: trailing, type });
    }
  }
  return lines;
});

function lineClass(type: LineType): string {
  if (type === 'added') return 'bg-success/10 text-success';
  if (type === 'removed') return 'bg-danger/10 text-danger';
  return 'text-text';
}

function linePrefix(type: LineType): string {
  if (type === 'added') return '+ ';
  if (type === 'removed') return '- ';
  return '  ';
}

function wordPartClass(part: DiffPart): string {
  if (part.added) return 'bg-success/20 text-success underline decoration-success';
  if (part.removed) return 'bg-danger/20 text-danger line-through';
  return 'text-text';
}
</script>
