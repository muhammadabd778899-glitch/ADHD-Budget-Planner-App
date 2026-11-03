import { expect, test } from '@playwright/test';

test('onboards, adds an expense, and keeps it after reload', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByText(/Money, without the/)).toBeVisible();
  await page.getByRole('button', { name: /get started/i }).click();
  await expect(page.getByRole('heading', { name: /A snapshot of today/i })).toBeVisible();
  await page.getByRole('button', { name: /continue/i }).click();
  await expect(page.getByRole('heading', { name: /When does money arrive/i })).toBeVisible();
  await page.getByRole('button', { name: /open harbor/i }).click();

  await expect(page.getByRole('heading', { name: 'Today', level: 1 })).toBeVisible();
  await expect(page.getByText('Safe to spend')).toBeVisible();

  await page.getByRole('button', { name: /quick add/i }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: /add an expense/i })).toBeVisible();
  await dialog.getByLabel('Amount').fill('4.50');
  await dialog.getByLabel('Description').fill('Coffee with Sam');
  await dialog.getByRole('button', { name: /add expense/i }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText('Coffee with Sam')).toBeVisible();

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Today', level: 1 })).toBeVisible();
  await expect(page.getByText('Coffee with Sam')).toBeVisible();
});
