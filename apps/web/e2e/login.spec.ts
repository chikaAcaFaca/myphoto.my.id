import { test, expect } from '@playwright/test';

test.describe('Login Page', () => {
  test('should load login page correctly', async ({ page }) => {
    await page.goto('/login');

    // Check page loaded
    await expect(page).toHaveTitle(/MyPhoto/);

    // Check login form elements exist
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible();

    console.log('✅ Login page loads correctly');
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    // Fill in invalid credentials
    await page.fill('input[type="email"]', 'invalid@test.com');
    await page.fill('input[type="password"]', 'wrongpassword123');

    // Click sign in
    await page.click('button[type="submit"]');

    // Wait for error message
    await expect(page.locator('.bg-red-50, .text-red-600, [class*="error"]')).toBeVisible({ timeout: 10000 });

    console.log('✅ Invalid credentials show error');
  });

  test('should open Google sign-in popup', async ({ page, context }) => {
    await page.goto('/login');

    // Listen for popup
    const popupPromise = context.waitForEvent('page', { timeout: 10000 });

    // Click Google sign-in button
    await page.click('button:has-text("Continue with Google")');

    try {
      const popup = await popupPromise;
      const popupUrl = popup.url();

      // Check it's a Google auth URL (either direct or via Firebase handler)
      const isGoogleAuth = popupUrl.includes('accounts.google.com') ||
                           popupUrl.includes('firebaseapp.com/__/auth/handler');
      expect(isGoogleAuth).toBeTruthy();
      console.log('✅ Google sign-in popup opens correctly');
      console.log('   Popup URL:', popupUrl);

      await popup.close();
    } catch (error) {
      // If no popup, check for error on page
      const errorText = await page.locator('.bg-red-50, .text-red-600').textContent().catch(() => null);
      if (errorText) {
        console.log('❌ Google sign-in error:', errorText);
        throw new Error(`Google sign-in failed: ${errorText}`);
      }
      throw error;
    }
  });

  test('should check Firebase connection', async ({ page }) => {
    await page.goto('/login');

    // Wait for page to fully load and Firebase to initialize
    await page.waitForTimeout(2000);

    // Check for any Firebase errors in console
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Try to interact with the page
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword');
    await page.click('button[type="submit"]');

    // Wait for response
    await page.waitForTimeout(3000);

    // Check for offline errors
    const pageContent = await page.content();
    const hasOfflineError = pageContent.includes('offline') || pageContent.includes('client is offline');

    if (hasOfflineError) {
      console.log('❌ Firebase Firestore is offline');
      throw new Error('Firestore connection failed - client is offline');
    }

    // Check console errors
    const firebaseErrors = consoleErrors.filter(e =>
      e.includes('Firebase') || e.includes('firestore') || e.includes('offline')
    );

    if (firebaseErrors.length > 0) {
      console.log('❌ Firebase console errors:', firebaseErrors);
    } else {
      console.log('✅ No Firebase connection errors detected');
    }
  });
});

test.describe('Homepage', () => {
  test('should load homepage', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/MyPhoto/);
    console.log('✅ Homepage loads correctly');
  });
});

test.describe('Health Check', () => {
  test('should return healthy status', async ({ request }) => {
    const response = await request.get('/api/health');

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.status).toBe('ok');
    expect(data.timestamp).toBeDefined();

    console.log('✅ Health check passed:', data);
  });
});
