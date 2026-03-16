import { expect, test } from '@playwright/test';

/**
 * E2E: каталог товаров и каталог услуг — доступность страниц и элементов.
 * Полный сценарий "добавить в корзину → отправить заказ" требует авторизации и API.
 */
test.describe('Каталог товаров', () => {
  test('страница каталога товаров открывается', async ({ page }) => {
    await page.goto('/catalog/products');
    await expect(page).toHaveURL(/\/catalog\/products/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('страница категории каталога открывается', async ({ page }) => {
    await page.goto('/catalog/products');
    await expect(page).toHaveURL(/\/catalog\/products/);
    const firstCategoryLink = page.locator('a[href*="/catalog/products/"]').first();
    const count = await firstCategoryLink.count();
    if (count > 0) {
      const href = await firstCategoryLink.getAttribute('href');
      if (href && href !== '/catalog/products') {
        await page.goto(href.startsWith('http') ? href : new URL(href, page.url()).toString());
        await expect(page).toHaveURL(/\/catalog\/products/);
      }
    }
  });
});

test.describe('Каталог услуг', () => {
  test('страница каталога услуг открывается', async ({ page }) => {
    await page.goto('/catalog/services');
    await expect(page).toHaveURL(/\/catalog\/services/);
    await expect(page.locator('body')).toBeVisible();
  });
});
