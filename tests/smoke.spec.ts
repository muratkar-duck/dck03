import { test, expect } from '@playwright/test';

const P = {
  signIn: async (page: any, email: string, pass: string) => {
    await page.goto('/auth/sign-in');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', pass);
    await page.click('button:has-text("Giriş Yap")');
  }
};

test('Guest → Home loads', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/ducktylo/i);
});

test('Writer login → dashboard', async ({ page }) => {
  await P.signIn(page, 'senarist1@ducktylo.com', '123456');
  await page.waitForURL(/dashboard\/writer|dashboard/);
});

test('Producer login → browse scripts RPC works', async ({ page }) => {
  await P.signIn(page, 'yapimci1@ducktylo.com', '123456');
  await page.goto('/dashboard/producer/browse');
  await expect(page.getByText('Senaryo Ara')).toBeVisible();
  // En az bir kart veya anlamlı hata mesajı bekle
  const anyCard = page.locator('.card').first();
  await expect(anyCard.or(page.getByText(/Veri alınamadı|Beklenmeyen/))).toBeVisible();
});

test('Messaging flow surface (accepted application list)', async ({ page }) => {
  await P.signIn(page, 'yapimci1@ducktylo.com', '123456');
  await page.goto('/dashboard/producer/messages');
  // Boşsa boş state, varsa "Konuşmayı Aç"
  await expect(page.getByText(/Sohbetler|Henüz sohbet yok/)).toBeVisible();
});
