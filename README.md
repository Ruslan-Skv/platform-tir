# Platform TIR (Территория интерьерных решений)

Многофункциональная платформа для интерьерных решений на Next.js 16 + NestJS.

## Структура проекта
- `/frontend` — Next.js 16 приложение (App Router)
- `/backend` — NestJS API (PostgreSQL, Elasticsearch, Prisma)
- `/nginx` — конфигурация reverse proxy для production
- `/scripts` — скрипты деплоя (SSL, бэкап)
- `/docs` — документация

## Документация

| Документ | Содержание |
|----------|------------|
| [DEPLOYMENT.md](DEPLOYMENT.md) | Production-деплой |
| [DOCKER.md](DOCKER.md) | Локальная разработка в Docker |
| [docs/CATALOG.md](docs/CATALOG.md) | **Каталог товаров** — API, SSR, фильтры, SEO, кэш |
| [docs/TESTING.md](docs/TESTING.md) | Тестирование |
| [docs/PWA.md](docs/PWA.md) | PWA |

## Быстрый старт

**Локальная разработка:** `DOCKER.md`  
**Деплой на сервер:** `DEPLOYMENT.md`

## Установка на смартфон (PWA)

Сайт доступен как **PWA**: пользователь может добавить его на главный экран из браузера (Chrome/Edge — «Установить», Safari — «На экран „Домой“»). Манифест и мета-теги уже настроены. Иконки 192×192 и 512×512 (PNG) для лучшей поддержки — в `frontend/public/icons/` (см. README там). Подробнее: **`docs/PWA.md`**.

## Этапы разработки
1. Базовый корпоративный сайт (SSG)
2. Личные кабинеты и E-commerce
3. Квизы-конструкторы (окна, потолки, жалюзи)
4. 3D-конструктор мебели
5. Маркетплейс
6. Мобильные приложения
