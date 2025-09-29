import { expect, test } from '@playwright/test';

const writerEmail = process.env.NEXT_PUBLIC_E2E_WRITER_EMAIL ?? 'writer@ducktylo.test';
const producerEmail =
  process.env.NEXT_PUBLIC_E2E_PRODUCER_EMAIL ?? 'producer@ducktylo.test';

const scriptTitle = 'Göbeklitepe Günlükleri';
const listingTitle = 'Festival İçin Duygusal Uzun Metraj';

test.describe('Writer → Producer pipeline harness', () => {
  test('completes the scripted flow end-to-end', async ({ page }) => {
    await page.goto('/test/pipeline');

    await expect(page.getByTestId('pipeline-heading')).toContainText(
      'Ducktylo E2E Pipeline Harness',
    );

    await page.getByTestId('login-writer').click();
    await expect(page.getByTestId('current-role')).toContainText('Writer');

    await page.getByTestId('writer-script-title').fill(scriptTitle);
    await page.getByTestId('writer-script-genre').selectOption('dram');
    await page.getByTestId('writer-script-price').fill('5200');
    await page.getByTestId('writer-script-submit').click();

    await expect(page.getByTestId('pipeline-summary')).toContainText(
      'Writer senaryosu oluşturur',
    );
    await expect(page.getByTestId('step-writer-script-status')).toContainText('✓');

    await page.getByTestId('login-producer').click();
    await expect(page.getByTestId('current-role')).toContainText('Producer');

    await page.getByTestId('producer-listing-title').fill(listingTitle);
    await page.getByTestId('producer-listing-genre').selectOption('dram');
    await page.getByTestId('producer-listing-budget').fill('82000');
    await page.getByTestId('producer-listing-description').fill(
      'Festival seçkisi için duygusal uzun metraj senaryo arıyoruz.',
    );
    await page.getByTestId('producer-listing-submit').click();

    await expect(page.getByTestId('step-producer-listing-status')).toContainText(
      '✓',
    );

    await page.getByTestId('login-writer').click();
    await expect(page.getByTestId('current-role')).toContainText('Writer');

    await page.getByTestId('application-script-select').selectOption({ label: scriptTitle });
    await page.getByTestId('application-listing-select').selectOption({ label: listingTitle });
    await page.getByTestId('application-submit').click();

    await expect(page.getByTestId('step-writer-application-status')).toContainText(
      '✓',
    );

    await page.getByTestId('login-producer').click();
    await expect(page.getByTestId('current-role')).toContainText('Producer');

    const pendingApplication = page.getByTestId(/application-accept-/);
    await expect(pendingApplication).toHaveCount(1);
    await pendingApplication.first().click();

    await expect(page.getByTestId('step-producer-acceptance-status')).toContainText(
      '✓',
    );

    await expect(page.getByTestId('pipeline-final-status')).toContainText(
      'Pipeline doğrulandı',
    );

    await expect(page.getByTestId('event-log')).toContainText(writerEmail);
    await expect(page.getByTestId('event-log')).toContainText(producerEmail);
  });
});
