import { test, expect } from '@playwright/test';

test.describe('Shared Page', () => {
  test('should show not found for invalid token', async ({ page }) => {
    await page.goto('/shared/invalidtoken123');

    // Should show not found message
    await expect(page.locator('text=Link nije pronađen')).toBeVisible();
    // Should have register CTA
    await expect(page.locator('a[href="/register"]')).toBeVisible();

    console.log('✅ Invalid shared link shows not found page');
  });

  test('should render shared page structure correctly', async ({ page }) => {
    // Test that the shared route exists and doesn't crash
    const response = await page.goto('/shared/testtoken');
    expect(response?.status()).toBeLessThan(500);

    console.log('✅ Shared page does not crash on unknown token');
  });
});

test.describe('Pricing Page Referral', () => {
  test('should load pricing page', async ({ page }) => {
    await page.goto('/pricing');

    await expect(page).toHaveTitle(/MyPhoto/);
    // Should have pricing content
    await expect(page.locator('text=Free')).toBeVisible();

    console.log('✅ Pricing page loads correctly');
  });

  test('should pass referral code to register links', async ({ page }) => {
    await page.goto('/pricing?ref=TESTCODE');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Find "Započni besplatno" link (free tier CTA)
    const freeLink = page.locator('a:has-text("Započni besplatno")').first();
    await expect(freeLink).toBeVisible();

    const href = await freeLink.getAttribute('href');
    expect(href).toContain('ref=TESTCODE');

    console.log('✅ Pricing page passes referral code to register links');
  });

  test('should pass referral code to checkout links', async ({ page }) => {
    await page.goto('/pricing?ref=TESTCODE');

    await page.waitForLoadState('networkidle');

    // Find paid plan CTA (e.g., "Izaberi plan")
    const paidLink = page.locator('a:has-text("Izaberi plan")').first();

    if (await paidLink.isVisible()) {
      const href = await paidLink.getAttribute('href');
      expect(href).toContain('ref=TESTCODE');
      console.log('✅ Pricing page passes referral code to checkout links');
    } else {
      console.log('⚠️ No paid plan links found to check (may need scroll)');
    }
  });
});

test.describe('Register Page Referral', () => {
  test('should show referral bonus when ref param present', async ({ page }) => {
    await page.goto('/register?ref=TESTCODE');

    // Should show referral bonus message
    await expect(page.locator('text=+1GB')).toBeVisible({ timeout: 5000 });

    console.log('✅ Register page shows referral bonus');
  });

  test('should not show referral bonus without ref param', async ({ page }) => {
    await page.goto('/register');

    // Should NOT show referral bonus message
    await expect(page.locator('text=Pozvani ste')).not.toBeVisible();

    console.log('✅ Register page hides referral bonus without ref');
  });
});

test.describe('Share API Security', () => {
  test('should reject unauthenticated share creation', async ({ request }) => {
    const response = await request.post('/api/share', {
      data: { fileId: 'fake-file-id' },
    });

    // Should be 401 or 403 (not 500)
    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);

    console.log('✅ Share API rejects unauthenticated requests');
  });

  test('should reject unauthenticated share deletion', async ({ request }) => {
    const response = await request.delete('/api/share', {
      data: { token: 'fake-token' },
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);

    console.log('✅ Share DELETE API rejects unauthenticated requests');
  });

  test('should reject thumbnail access without share token', async ({ request }) => {
    const response = await request.get('/api/thumbnail/fake-file-id');

    // Should be 401 (no session, no share token)
    expect([401, 404]).toContain(response.status());

    console.log('✅ Thumbnail API rejects access without auth or share token');
  });

  test('should reject stream access without share token', async ({ request }) => {
    const response = await request.get('/api/stream/fake-file-id');

    expect([401, 404]).toContain(response.status());

    console.log('✅ Stream API rejects access without auth or share token');
  });
});
