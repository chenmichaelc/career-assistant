<!-- client/src/views/ResumeConverter.vue -->
<template>
  <div class="max-w-4xl" data-testid="resume-converter-view">
    <h1 class="font-mono text-2xl font-semibold text-text mb-6">Resume → DOCX Converter</h1>

    <div id="resume-input-region">
      <label class="font-mono text-xs text-dim block mb-1">plain-text resume</label>
      <textarea
        v-model="resumeText"
        class="w-full h-96 bg-panel border border-border text-text font-mono text-sm px-4 py-3 rounded focus:outline-none focus:border-accent resize-y"
        placeholder="Paste your plain-text resume here…"
      />
    </div>

    <button
      type="button"
      :disabled="isConverting"
      class="mt-4 bg-accent text-surface font-mono text-sm px-6 py-2 rounded hover:opacity-90 disabled:opacity-40 transition-opacity"
      @click="handleConvert"
    >
      {{ isConverting ? 'converting...' : 'convert & download' }}
    </button>

    <div
      v-if="errorMessage"
      data-testid="conversion-error"
      role="alert"
      class="mt-4 font-mono text-sm text-danger bg-danger/10 border border-danger rounded px-4 py-3"
    >
      {{ errorMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Packer } from 'docx';
import { parseResumeText, type ParsedResume } from '@/utils/parseResumeText';
import { buildResumeDocx } from '@/utils/buildResumeDocx';

const resumeText = ref('');
const errorMessage = ref<string | null>(null);
const isConverting = ref(false);

function isUnusableParse(parsed: ParsedResume): boolean {
  const { sections } = parsed;
  return (
    sections.summary === null &&
    sections.experience.length === 0 &&
    sections.projects.length === 0 &&
    sections.education.length === 0 &&
    sections.skills.length === 0
  );
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

async function handleConvert(): Promise<void> {
  errorMessage.value = null;

  if (resumeText.value.trim() === '') {
    errorMessage.value = 'Paste your resume text before converting.';
    return;
  }

  const parsed = parseResumeText(resumeText.value);

  if (isUnusableParse(parsed)) {
    errorMessage.value =
      "Couldn't find a name or any recognized sections (SUMMARY, EXPERIENCE, PROJECTS, EDUCATION, SKILLS). Check that the pasted text matches the expected plain-text resume format.";
    return;
  }

  isConverting.value = true;
  try {
    const docxDocument = buildResumeDocx(parsed);
    const blob = await Packer.toBlob(docxDocument);
    downloadBlob(blob, `${parsed.name || 'resume'}.docx`);
  } catch (error) {
    errorMessage.value = `Something went wrong generating the document: ${
      error instanceof Error ? error.message : String(error)
    }`;
  } finally {
    isConverting.value = false;
  }
}
</script>
