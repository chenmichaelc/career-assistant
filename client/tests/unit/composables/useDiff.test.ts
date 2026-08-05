// client/tests/unit/composables/useDiff.test.ts

import { describe, test, expect } from 'vitest';
import { useDiff } from '../../../src/composables/useDiff';

describe('useDiff — line-level diff computation', () => {
  test('identical inputs produce a single unchanged part', () => {
    const { oldText, newText, diffParts } = useDiff();
    oldText.value = 'line one\nline two\nline three';
    newText.value = 'line one\nline two\nline three';

    expect(diffParts.value).toHaveLength(1);
    expect(diffParts.value[0].added).toBe(false);
    expect(diffParts.value[0].removed).toBe(false);
    expect(diffParts.value[0].value).toBe('line one\nline two\nline three');
  });

  test('pure addition — a trailing line is appended', () => {
    const { oldText, newText, diffParts } = useDiff();
    oldText.value = 'line one\nline two\n';
    newText.value = 'line one\nline two\nline three\n';

    expect(diffParts.value).toHaveLength(2);
    expect(diffParts.value[0]).toMatchObject({ added: false, removed: false });
    expect(diffParts.value[1]).toMatchObject({
      added: true,
      removed: false,
      value: 'line three\n',
    });
  });

  test('pure removal — a line is dropped from the middle', () => {
    const { oldText, newText, diffParts } = useDiff();
    oldText.value = 'line one\nline two\nline three\n';
    newText.value = 'line one\nline three\n';

    expect(diffParts.value).toHaveLength(3);
    expect(diffParts.value[0]).toMatchObject({ added: false, removed: false, value: 'line one\n' });
    expect(diffParts.value[1]).toMatchObject({ added: false, removed: true, value: 'line two\n' });
    expect(diffParts.value[2]).toMatchObject({
      added: false,
      removed: false,
      value: 'line three\n',
    });
  });

  test('mixed changes — a line is replaced between unchanged lines', () => {
    const { oldText, newText, diffParts } = useDiff();
    oldText.value = 'keep this\nremove this\nkeep this too';
    newText.value = 'keep this\nadd this instead\nkeep this too';

    expect(diffParts.value).toHaveLength(4);
    expect(diffParts.value[0]).toMatchObject({
      added: false,
      removed: false,
      value: 'keep this\n',
    });
    expect(diffParts.value[1]).toMatchObject({
      added: false,
      removed: true,
      value: 'remove this\n',
    });
    expect(diffParts.value[2]).toMatchObject({
      added: true,
      removed: false,
      value: 'add this instead\n',
    });
    expect(diffParts.value[3]).toMatchObject({
      added: false,
      removed: false,
      value: 'keep this too',
    });
  });

  test('empty-string inputs produce no diff parts', () => {
    const { oldText, newText, diffParts } = useDiff();
    oldText.value = '';
    newText.value = '';

    expect(diffParts.value).toHaveLength(0);
  });

  test('empty old text against non-empty new text is treated as a pure addition', () => {
    const { oldText, newText, diffParts } = useDiff();
    oldText.value = '';
    newText.value = 'first line\nsecond line';

    expect(diffParts.value).toHaveLength(1);
    expect(diffParts.value[0]).toMatchObject({
      added: true,
      removed: false,
      value: 'first line\nsecond line',
    });
  });

  test('diffParts is reactive to subsequent input changes', () => {
    const { oldText, newText, diffParts } = useDiff();
    oldText.value = 'a';
    newText.value = 'a';
    expect(diffParts.value.every((part) => !part.added && !part.removed)).toBe(true);

    newText.value = 'b';
    expect(diffParts.value.some((part) => part.added || part.removed)).toBe(true);
  });
});

describe('useDiff — word-level diff computation', () => {
  test('identical inputs produce a single unchanged word-level part', () => {
    const { oldText, newText, wordDiffParts } = useDiff();
    oldText.value = 'the quick fox';
    newText.value = 'the quick fox';

    expect(wordDiffParts.value).toHaveLength(1);
    expect(wordDiffParts.value[0]).toMatchObject({
      added: false,
      removed: false,
      value: 'the quick fox',
    });
  });

  test('wordDiffParts is independent of diffParts — a single-word change within one line is a full-line replace in line mode but an isolated word swap in word mode', () => {
    const { oldText, newText, diffParts, wordDiffParts } = useDiff();
    oldText.value = 'Owned the migration process';
    newText.value = 'Owns the migration process';

    // Line mode: no line break present, so the whole line is removed and re-added.
    expect(diffParts.value).toHaveLength(2);
    expect(diffParts.value[0]).toMatchObject({
      added: false,
      removed: true,
      value: 'Owned the migration process',
    });
    expect(diffParts.value[1]).toMatchObject({
      added: true,
      removed: false,
      value: 'Owns the migration process',
    });

    // Word mode: only the changed word is flagged; the rest is unchanged.
    expect(wordDiffParts.value).toHaveLength(3);
    expect(wordDiffParts.value[0]).toMatchObject({ added: false, removed: true, value: 'Owned' });
    expect(wordDiffParts.value[1]).toMatchObject({ added: true, removed: false, value: 'Owns' });
    expect(wordDiffParts.value[2]).toMatchObject({
      added: false,
      removed: false,
      value: ' the migration process',
    });
  });

  test('a case where line mode shows a full remove/add pair but word mode shows only an appended fragment with no removal at all', () => {
    const { oldText, newText, diffParts, wordDiffParts } = useDiff();
    oldText.value = 'the quick fox';
    newText.value = 'the quick brown fox';

    // Line mode: single line differs, so it registers as a full remove + full add.
    expect(diffParts.value).toHaveLength(2);
    expect(diffParts.value.some((part) => part.removed)).toBe(true);

    // Word mode: purely an insertion — no removed part appears anywhere.
    expect(wordDiffParts.value.some((part) => part.removed)).toBe(false);
    expect(wordDiffParts.value).toHaveLength(3);
    expect(wordDiffParts.value[0]).toMatchObject({
      added: false,
      removed: false,
      value: 'the quick ',
    });
    expect(wordDiffParts.value[1]).toMatchObject({ added: true, removed: false, value: 'brown ' });
    expect(wordDiffParts.value[2]).toMatchObject({ added: false, removed: false, value: 'fox' });
  });

  test('empty-string inputs produce no word-level diff parts', () => {
    const { oldText, newText, wordDiffParts } = useDiff();
    oldText.value = '';
    newText.value = '';

    expect(wordDiffParts.value).toHaveLength(0);
  });

  test('wordDiffParts is reactive to subsequent input changes', () => {
    const { oldText, newText, wordDiffParts } = useDiff();
    oldText.value = 'a';
    newText.value = 'a';
    expect(wordDiffParts.value.every((part) => !part.added && !part.removed)).toBe(true);

    newText.value = 'b';
    expect(wordDiffParts.value.some((part) => part.added || part.removed)).toBe(true);
  });
});
