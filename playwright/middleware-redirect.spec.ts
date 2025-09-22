import { test, expect } from '@playwright/test';

const cookieHeader = (role: string) => `dt_role=${role}`;

test.describe('dashboard middleware redirects', () => {
  test('writer is redirected away from producer dashboard', async ({ request }) => {
    const response = await request.get('/dashboard/producer', {
      headers: { Cookie: cookieHeader('writer') },
      maxRedirects: 0,
      failOnStatusCode: false,
    });

    expect(response.status()).toBe(307);
    expect(response.headers()['location']).toContain('/dashboard/writer');
  });

  test('producer is redirected away from writer dashboard', async ({ request }) => {
    const response = await request.get('/dashboard/writer', {
      headers: { Cookie: cookieHeader('producer') },
      maxRedirects: 0,
      failOnStatusCode: false,
    });

    expect(response.status()).toBe(307);
    expect(response.headers()['location']).toContain('/dashboard/producer');
  });
});
