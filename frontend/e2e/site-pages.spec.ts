import { expect, test } from '@playwright/test';

/**
 * E2E: основные страницы сайта — главная, логин, профиль, блог.
 */
test.describe('Главная и навигация', () => {
  test('главная страница открывается', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\//);
    await expect(page.locator('body')).toBeVisible();
  });

  test('страница логина открывается', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('страница восстановления пароля открывается', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page).toHaveURL(/\/forgot-password/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('страница блога открывается', async ({ page }) => {
    await page.goto('/blog');
    await expect(page).toHaveURL(/\/blog/);
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Профиль и избранное', () => {
  test('страница профиля открывается (редирект на логин при неавторизованном)', async ({
    page,
  }) => {
    await page.goto('/profile');
    await expect(page).toHaveURL(/\/(profile|login)/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('страница избранного открывается', async ({ page }) => {
    await page.goto('/favorites');
    await expect(page).toHaveURL(/\/favorites/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('страница сравнения открывается', async ({ page }) => {
    await page.goto('/compare');
    await expect(page).toHaveURL(/\/compare/);
    await expect(page.locator('body')).toBeVisible();
  });
});
