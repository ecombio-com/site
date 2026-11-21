import { test, expect } from '@playwright/test';

const routes = [
  { name: 'collection', path: '/collections/electric-bikes' },
  { name: 'product', path: '/products/lectric-xp-black' },
  { name: 'cart', path: '/cart' },
];

for (const { name, path } of routes) {
  test(`${name} page loads without errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    const response = await page.goto(path);
    expect(response?.ok()).toBeTruthy();
    await expect(page.locator('body')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();

    expect(errors).toEqual([]);
  });
}