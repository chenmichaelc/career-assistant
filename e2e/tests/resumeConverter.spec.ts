// e2e/tests/resumeConverter.spec.ts

import { test, expect } from '@playwright/test';
import { ResumeConverterPage } from '../pages/resumeConverterPage';

const MINIMAL_RESUME = `John H. Watson
London, UK NW1 6XE  |  +44 20 7946 0958

SUMMARY
Physician and consulting investigator with 20+ years of experience.

EXPERIENCE
Holmes Consulting  London, UK\t1881 – Present
Consulting Partner
    • Assisted with an investigation.`;

test.beforeEach(async ({ page }) => {
  const resumeConverterPage = new ResumeConverterPage(page);
  await resumeConverterPage.goto();
});

test('Converting a well-formed resume triggers a .docx download', async ({ page }) => {
  const resumeConverterPage = new ResumeConverterPage(page);

  await test.step('Act: paste a well-formed resume', async () => {
    await resumeConverterPage.resumeTextArea.fill(MINIMAL_RESUME);
  });

  await test.step('Assert: clicking convert triggers a .docx download', async () => {
    const downloadPromise = page.waitForEvent('download');
    await resumeConverterPage.convertButton.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.docx$/);
  });

  await test.step('Assert: no error is shown on success', async () => {
    await expect(resumeConverterPage.conversionError).toHaveCount(0);
  });
});

test('Empty input shows an inline error instead of downloading', async ({ page }) => {
  const resumeConverterPage = new ResumeConverterPage(page);

  await test.step('Act: click convert with no input', async () => {
    await resumeConverterPage.convertButton.click();
  });

  await test.step('Assert: an inline error is shown', async () => {
    await expect(resumeConverterPage.conversionError).toContainText('Paste your resume text');
  });
});

test('Unparseable input (no recognized sections) shows an inline error, not a blank download', async ({
  page,
}) => {
  const resumeConverterPage = new ResumeConverterPage(page);

  await test.step('Act: paste text with no name/section structure at all', async () => {
    await resumeConverterPage.resumeTextArea.fill(
      'asdkjfh alskdjfh with no resume structure at all'
    );
  });

  await test.step('Act: click convert', async () => {
    await resumeConverterPage.convertButton.click();
  });

  await test.step('Assert: an inline error is shown, since every section came back empty', async () => {
    await expect(resumeConverterPage.conversionError).toContainText("Couldn't find a name");
  });
});
