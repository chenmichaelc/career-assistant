// tests/unit/client/src/composables/useDiff.test.ts

import { describe, test, expect } from 'vitest';
import { useDiff } from '../../../../../client/src/composables/useDiff';

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
