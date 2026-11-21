import { test, expect } from '@playwright/test';

test('add to cart, change quantity, remove', async ({ page }) => {
  await page.goto('/products/lectric-xp-black');

  const title = (await page.getByRole('heading', { level: 1 }).first().innerText()).trim();

  const addButton = page.getByTestId('add-to-cart');
  // If this fails, the default variant is sold out or needs an option selected.
  await expect(addButton).toHaveText('Add to cart');
  await expect(addButton).toBeEnabled();
  await addButton.click();

  const drawer = page.getByTestId('cart-drawer');
  await expect(drawer).toBeVisible();

  const lines = drawer.getByTestId('cart-line');
  await expect(lines).toHaveCount(1);
  await expect(lines.first()).toContainText(title);
  await expect(drawer.locator('.cart-count-badge')).toHaveText('1');

  await lines.first().getByRole('button', { name: /^Increase quantity/ }).click();
  await expect(drawer.locator('.cart-count-badge')).toHaveText('2');

  await lines.first().getByRole('button', { name: /^Remove/ }).click();
  await expect(lines).toHaveCount(0);
  await expect(drawer.getByText('Your cart is empty.')).toBeVisible();
});