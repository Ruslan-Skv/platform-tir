import { expect, test } from '@playwright/test';

/**
 * E2E: тестирование процесса оформления заказов.
 * - Страница корзины и переход к оформлению.
 * - Страница checkout (оформление заказа после проверки менеджером).
 *
 * Запуск: из папки frontend выполнить `npx playwright test`.
 * Для полного сценария (с API) нужны запущенные backend и frontend.
 */
test.describe('Оформление заказов', () => {
  test('страница корзины открывается', async ({ page }) => {
    await page.goto('/cart');
    await expect(page).toHaveURL(/\/cart/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('страница checkout без orderId показывает ошибку', async ({ page }) => {
    await page.goto('/checkout');
    await expect(page).toHaveURL(/\/checkout/);
    await expect(page.getByText(/оформление заказа/i).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/не указан заказ|заказ не найден/i)).toBeVisible({ timeout: 5000 });
    const link = page.getByRole('link', { name: /вернуться в корзину/i });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', '/cart');
  });

  test('страница checkout с несуществующим orderId показывает ошибку', async ({ page }) => {
    await page.goto('/checkout?orderId=non-existent-order-id-12345');
    await expect(page).toHaveURL(/\/checkout/);
    await expect(page.getByText(/оформление заказа/i).first()).toBeVisible({ timeout: 5000 });
    await expect(
      page.getByText(/не удалось загрузить заказ|заказ не найден|ещё не проверен/i)
    ).toBeVisible({ timeout: 10000 });
  });
});
