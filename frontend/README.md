# Platform TIR Frontend

Next.js 16 приложение (App Router) для платформы интерьерных решений.

## Технологии

- Next.js 16, React
- TypeScript
- CSS Modules (`.module.css`) + глобальные токены в `app/globals.css`

## Разработка

```bash
npm install
npm run dev
```

Приложение: [http://localhost:3000](http://localhost:3000)

Требуется запущенный backend (см. `../backend/README.md`) и PostgreSQL, Elasticsearch.

## Архитектура

Правила слоёв, структуры `views/` и крупных модулей: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

```bash
npm run check-architecture   # проверка (входит в validate и pre-commit)
npm run validate             # type-check + lint + format + architecture
npm run commit               # git add + cz (hook: backend/.husky/pre-commit)
```

Pre-commit для всего монорепозитория: lint-staged (в т.ч. secretlint на staged) → backend validate:precommit → frontend validate:precommit. Подробнее: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

## Стили

Единый подход: **CSS Modules** + `app/globals.css`. SCSS, Tailwind и CSS-in-JS не используем.

- Общие правила (co-location, inline, `app/` без UI): [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) — раздел «Стили»
- Hybrid-модель для крупных feature (shared partials + co-located modules): [src/views/admin/ContractDocuments/styles/README.md](./src/views/admin/ContractDocuments/styles/README.md)

## Docker

См. `../DOCKER.md` — запуск всего стека через Docker Compose.

## Деплой

Образы собираются в GitHub Actions. На сервере: pull и `up -d`. См. `../DEPLOYMENT.md`.
