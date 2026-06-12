# Platform TIR Frontend

Next.js 16 приложение (App Router) для платформы интерьерных решений.

## Технологии

- Next.js 16, React
- TypeScript
- SASS

## Разработка

```bash
npm install
npm run dev
```

## Архитектура

Правила слоёв, структуры `views/` и крупных модулей: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

```bash
npm run check-architecture   # проверка (входит в validate и pre-commit)
npm run validate             # type-check + lint + format + architecture
npm run commit               # git add + cz (hook: backend/.husky/pre-commit)
```

Pre-commit для всего монорепозитория: lint-staged → backend validate → frontend validate. Подробнее: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

Приложение: [http://localhost:3000](http://localhost:3000)

Требуется запущенный backend (см. `../backend/README.md`) и PostgreSQL, Elasticsearch.

## Docker

См. `../DOCKER.md` — запуск всего стека через Docker Compose.

## Деплой

Образы собираются в GitHub Actions. На сервере: pull и `up -d`. См. `../DEPLOYMENT.md`.
