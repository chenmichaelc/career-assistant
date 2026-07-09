<!-- client/src/views/DiffVisualizer.vue -->
<!-- CAR-213 — dual text inputs + git-diff-style render, backed by CAR-212's useDiff composable. -->
<template>
  <div class="max-w-4xl" data-testid="diff-visualizer-view">
    <h1 class="font-mono text-2xl font-semibold text-text mb-6">Diff Visualizer</h1>

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

      <div v-else class="font-mono text-sm bg-panel border border-border rounded py-2">
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
import { computed } from 'vue';
import { useDiff } from '@/composables/useDiff';

const { oldText, newText, diffParts } = useDiff();

const hasBothInputs = computed(() => oldText.value.trim() !== '' && newText.value.trim() !== '');

type LineType = 'added' | 'removed' | 'context';

interface RenderedLine {
  text: string;
  trailingWhitespace: string;
  type: LineType;
}

function splitTrailingWhitespace(text: string): { main: string; trailing: string } {
  const match = text.match(/^(.*?)(\s*)$/);
  return match ? { main: match[1], trailing: match[2] } : { main: text, trailing: '' };
}

function visualizeWhitespace(whitespace: string): string {
  return whitespace.replace(/ /g, '·').replace(/\t/g, '→');
}

const renderedLines = computed<RenderedLine[]>(() => {
  const lines: RenderedLine[] = [];
  for (const part of diffParts.value) {
    const type: LineType = part.added ? 'added' : part.removed ? 'removed' : 'context';
    const partLines = part.value.split('\n');
    // split() on a value ending in '\n' produces a trailing '' entry that
    // isn't a real line — drop it.
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
</script>
