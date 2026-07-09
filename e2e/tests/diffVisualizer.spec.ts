// e2e/tests/diffVisualizer.spec.ts

import { test, expect } from '@playwright/test';
import { DiffVisualizerPage } from '../pages/diffVisualizerPage';

test.beforeEach(async ({ page }) => {
  const diffVisualizerPage = new DiffVisualizerPage(page);
  await diffVisualizerPage.goto();
});

test('Empty inputs show the neutral placeholder, not a diff', async ({ page }) => {
  const diffVisualizerPage = new DiffVisualizerPage(page);

  await test.step('Assert: placeholder is shown before any input', async () => {
    await expect(diffVisualizerPage.diffRender).toContainText(
      'Paste text into both fields above to see a diff.'
    );
  });
});

test('Only one side filled in still shows the placeholder', async ({ page }) => {
  const diffVisualizerPage = new DiffVisualizerPage(page);

  await test.step('Act: fill only the "original" field', async () => {
    await diffVisualizerPage.originalTextArea.fill('line one\nline two');
  });

  await test.step('Assert: placeholder is still shown', async () => {
    await expect(diffVisualizerPage.diffRender).toContainText(
      'Paste text into both fields above to see a diff.'
    );
  });
});

test('Identical inputs render as all-context, no additions or removals', async ({ page }) => {
  const diffVisualizerPage = new DiffVisualizerPage(page);
  const text = 'line one\nline two\nline three';

  await test.step('Act: paste identical text into both fields', async () => {
    await diffVisualizerPage.setInputs(text, text);
  });

  await test.step('Assert: all three lines render as context, no additions or removals', async () => {
    const contextLines = diffVisualizerPage.diffRender.getByTestId('diff-line-context');
    await expect(contextLines).toHaveCount(3);
    await expect(contextLines.nth(0)).toHaveText('  line one');
    await expect(contextLines.nth(1)).toHaveText('  line two');
    await expect(contextLines.nth(2)).toHaveText('  line three');
    await expect(diffVisualizerPage.diffRender.getByTestId('diff-line-added')).toHaveCount(0);
    await expect(diffVisualizerPage.diffRender.getByTestId('diff-line-removed')).toHaveCount(0);
  });
});

test('Differing inputs render a git-diff-style added/removed breakdown', async ({ page }) => {
  const diffVisualizerPage = new DiffVisualizerPage(page);

  await test.step('Act: paste two different text versions', async () => {
    await diffVisualizerPage.setInputs(
      'line one\nline two\nline three',
      'line one\nline two changed\nline three\nline four'
    );
  });

  await test.step('Assert: removed lines are shown with a "-" prefix', async () => {
    const removedLines = diffVisualizerPage.diffRender.getByTestId('diff-line-removed');
    await expect(removedLines).toHaveCount(2);
    await expect(removedLines.nth(0)).toHaveText('- line two');
    await expect(removedLines.nth(1)).toHaveText('- line three');
  });

  await test.step('Assert: added lines are shown with a "+" prefix', async () => {
    const addedLines = diffVisualizerPage.diffRender.getByTestId('diff-line-added');
    await expect(addedLines).toHaveCount(3);
    await expect(addedLines.nth(0)).toHaveText('+ line two changed');
    await expect(addedLines.nth(1)).toHaveText('+ line three');
    await expect(addedLines.nth(2)).toHaveText('+ line four');
  });

  await test.step('Assert: the unchanged leading line renders as context', async () => {
    const contextLines = diffVisualizerPage.diffRender.getByTestId('diff-line-context');
    await expect(contextLines).toHaveCount(1);
    await expect(contextLines.nth(0)).toHaveText('  line one');
  });
});

test('Trailing whitespace is visualized instead of causing a silent phantom diff', async ({
  page,
}) => {
  const diffVisualizerPage = new DiffVisualizerPage(page);

  await test.step('Act: paste two versions differing only by a trailing space', async () => {
    await diffVisualizerPage.setInputs('line one\nline two', 'line one\nline two ');
  });

  await test.step('Assert: the line still renders as one removed + one added, since a trailing-space-only change is a real (if minor) diff', async () => {
    await expect(diffVisualizerPage.diffRender.getByTestId('diff-line-removed')).toHaveCount(1);
    await expect(diffVisualizerPage.diffRender.getByTestId('diff-line-added')).toHaveCount(1);
  });

  await test.step('Assert: exactly one trailing-whitespace marker is shown, on the added line only', async () => {
    await expect(diffVisualizerPage.trailingWhitespaceMarkers).toHaveCount(1);
    await expect(diffVisualizerPage.trailingWhitespaceMarkers.first()).toHaveText('·');
  });
});
