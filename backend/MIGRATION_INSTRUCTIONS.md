# Инструкция по применению изменений в базе данных

## Шаги для применения миграции

### 1. Создание и применение миграции Prisma

Выполните следующие команды в терминале из директории `backend`:

```bash
cd backend
npx prisma migrate dev --name add_product_components
```

Эта команда:
- Создаст новую миграцию с изменениями схемы
- Применит миграцию к базе данных
- Обновит Prisma Client

### 2. Альтернативный способ (если migrate dev не работает)

Если команда `migrate dev` не работает, используйте `db push`:

```bash
cd backend
npx prisma db push
```

Затем создайте миграцию вручную:

```bash
npx prisma migrate dev --create-only --name add_product_components
```

И примените её:

```bash
npx prisma migrate deploy
```

### 3. Генерация Prisma Client

После применения миграции убедитесь, что Prisma Client обновлен:

```bash
npx prisma generate
```

### 4. Перезапуск серверов

После применения миграции:

1. **Backend**: Перезапустите NestJS сервер
   ```bash
   cd backend
   npm run start:dev
   ```

2. **Frontend**: Перезапустите Next.js сервер (если нужно)
   ```bash
   cd frontend
   npm run dev
   ```

## Что было добавлено в базу данных

1. **Новая таблица `product_components`**:
   - `id` - уникальный идентификатор
   - `productId` - связь с товаром
   - `name` - наименование (коробка, наличник, добор, притворная планка)
   - `type` - конкретный тип комплектующей
   - `price` - стоимость за 1 шт.
   - `stock` - количество на складе
   - `isActive` - активен ли компонент
   - `sortOrder` - порядок сортировки

2. **Изменения в таблице `cart_items`**:
   - Добавлено поле `componentId` (опциональное)
   - Добавлены индексы для оптимизации запросов

## Проверка после миграции

После применения миграции проверьте:

1. Таблица `product_components` создана в базе данных
2. Поле `componentId` добавлено в таблицу `cart_items`
3. Backend сервер запускается без ошибок
4. API endpoints для комплектующих работают:
   - `GET /api/v1/product-components`
   - `POST /api/v1/product-components/product/:productId`
   - и т.д.

## Если возникли проблемы

1. **Ошибка при миграции**: Проверьте подключение к базе данных в `.env`
2. **Ошибка Prisma Client**: Выполните `npx prisma generate`
3. **Ошибка типов TypeScript**: Перезапустите TypeScript сервер в IDE
