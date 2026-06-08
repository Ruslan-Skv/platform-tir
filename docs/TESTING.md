# Тестирование проекта

Обзор тестов бэкенда и фронтенда.

## Бэкенд (Jest)

**Расположение:** `backend/src/**/*.spec.ts`

**Запуск:**
```bash
cd backend
npm run test
```

Запуск конкретного модуля:
```bash
npm run test -- --testPathPattern=orders
npm run test -- --testPathPattern=auth
```

С покрытием:
```bash
npm run test:cov
```

### Покрытые модули

| Модуль | Файл | Сценарии |
|--------|------|----------|
| **AuthService** | `auth/auth.service.spec.ts` | validateUser (null при неверном пароле, возврат пользователя без пароля), login (токен и user), register (Conflict при занятом email, создание и login при новом email) |
| **CartService** | `cart/cart.service.spec.ts` | addToCart (NotFoundException при отсутствии товара, создание позиции, увеличение quantity), getCartItems (пустая корзина), removeCartItemById (NotFoundException) |
| **UsersService** | `users/users.service.spec.ts` | findOne (NotFoundException, возврат пользователя), findByEmail (нормализация email), create (хеширование пароля) |
| **OrdersService** | `orders/orders.service.spec.ts` | submitFromCart (пустая корзина, нет позиций, заказ только из услуг), create (расчёт суммы по товарам) |
| **ProductsService** | `products/products.service.spec.ts` | findOne (NotFoundException, возврат товара) |

Тесты используют моки (Prisma, другие сервисы) и не требуют реальной БД.

---

## Фронтенд

### Unit-тесты (Jest)

**Расположение:** `frontend/src/**/*.test.{ts,tsx}`

**Запуск:**
```bash
cd frontend
npm run test
```

С покрытием:
```bash
npm run test:coverage
```

**Покрытые модули:**
- `shared/lib/avatar.ts` — getAvatarUrl (null, data URL, абсолютный URL, относительный путь), getInitials (имя/фамилия, email, пустые данные)
- `shared/utils/category-utils.ts` — isInteriorDoorsCategory, isInteriorDoorsProduct, isInteriorDoorsCategoryById

### E2E (Playwright)

**Расположение:** `frontend/e2e/*.spec.ts`

**Запуск:**
```bash
cd frontend
npx playwright install   # один раз — установка браузеров
npm run test:e2e
```

С UI:
```bash
npm run test:e2e:ui
```

**Сценарии:**

| Файл | Описание |
|------|----------|
| **orders-checkout.spec.ts** | Корзина `/cart`, checkout без orderId и с несуществующим orderId |
| **catalog-to-cart.spec.ts** | Каталог товаров `/catalog/products`, категории, каталог услуг `/catalog/services` |
| **site-pages.spec.ts** | Главная `/`, логин `/login`, forgot-password, блог `/blog`, профиль `/profile`, избранное `/favorites`, сравнение `/compare` |

По умолчанию Playwright запускает dev-сервер фронтенда. Для запросов к API поднимите бэкенд: `cd backend && npm run start:dev`.

---

## Оформление заказов (детали)

Подробное описание тестов процесса оформления заказов из каталога товаров и услуг см. в [testing-orders.md](./testing-orders.md).

Архитектура каталога (API, SSR, фильтры, SEO): [CATALOG.md](./CATALOG.md).

---

## CI

Рекомендуется в CI запускать:

- **Backend:** `cd backend && npm run test`
- **Frontend unit:** `cd frontend && npm run test`
- **Frontend E2E:** `cd frontend && npx playwright install --with-deps && npm run test:e2e` (при наличии окружения с браузерами)
