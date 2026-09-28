# Seed-данные Prisma

## Библиотека шаблонов договоров (все направления)

Файлы в этом каталоге — снимок активных пресетов из локальной библиотеки
(`/admin/contract-documents/templates`). На проде они становятся дефолтами.

| Файл                                   | Направление      |
| -------------------------------------- | ---------------- |
| `repair-library-templates.seed.json`   | Ремонт           |
| `windows-library-templates.seed.json`  | Окна             |
| `doors-library-templates.seed.json`    | Двери            |
| `blinds-library-templates.seed.json`   | Жалюзи           |
| `ceilings-library-templates.seed.json` | Натяжные потолки |

### Обновить снимок из локальной БД

```bash
cd backend
npx ts-node -r tsconfig-paths/register scripts/export-local-library-templates.ts
```

Либо в UI супер-админа: **«Выгрузка шаблонов на прод»** по каждому направлению
и положить скачанные JSON сюда с теми же именами.

### Залить на прод (перезаписать библиотеку)

Режим `replace-library` архивирует старые активные пресеты направления и вставляет
ваши seed-шаблоны как дефолтные. Старые автосгенерированные stubs больше не нужны.

```bash
cd backend
# DATABASE_URL должен указывать на прод

$env:REPAIR_TEMPLATES_SEED_MODE="replace-library"
$env:WINDOWS_TEMPLATES_SEED_MODE="replace-library"
$env:DOORS_TEMPLATES_SEED_MODE="replace-library"
$env:BLINDS_TEMPLATES_SEED_MODE="replace-library"
$env:CEILINGS_TEMPLATES_SEED_MODE="replace-library"
npm run prisma:seed-all-contract-templates
```

Или по одному направлению:

```bash
$env:REPAIR_TEMPLATES_SEED_MODE="replace-library"
npm run prisma:seed-repair-contract-templates
```

Приоритет HTML: `*-library-templates.seed.json` → fallback `.ts` из frontend
(недостающие вкладки, например согласие у потолков, добираются из `.ts`).

Режим по умолчанию (`fill-missing`) только добавляет пресет, если на вкладке
ещё нет активного — существующие не трогает.

### Залить на прод через контейнер backend

`npm run prisma:seed-*-contract-templates` на сервере не работает: прод-образ
не содержит `.ts`-скриптов и ts-node, а Postgres не публикует порты наружу
(`DATABASE_URL` с хостом `postgres` резолвится только внутри docker-сети).
Используйте самодостаточный `.cjs` (включён в образ, читает `prisma/seed-data`):

```bash
docker compose -f docker-compose.infra.yml -f docker-compose.prod.yml \
  exec backend node prisma/seed-contract-template-presets.cjs DOORS CEILINGS BLINDS
```

Направления передаются аргументами (без них — все пять). Режим тот же:
`{KIND}_TEMPLATES_SEED_MODE` или `TEMPLATES_SEED_MODE` (`fill-missing` по умолчанию).
В образах, собранных до появления этого скрипта, его можно положить в работающий
контейнер через `docker cp` (файл + `prisma/seed-data`).
