# Seed-данные Prisma

## Библиотека шаблонов «Ремонт»

Файл `repair-library-templates.seed.json` (опционально) — активные пресеты пяти вкладок:

- `contract`, `actStart`, `actAcceptance`, `cashOrder`, `productionLog`

Создайте файл кнопкой **«Экспорт для прода»** в библиотеке шаблонов (супер-админ).

```bash
cd backend
npm run prisma:seed-repair-contract-templates
```

Режимы:

- по умолчанию (`fill-missing`) — добавить пресет, если на вкладке нет активного; устаревшие `tabId` → в архив;
- `REPAIR_TEMPLATES_SEED_MODE=replace-library` — перезаписать HTML активных пресетов на вкладках из seed-файла или из `.ts` в репозитории.

## Библиотека шаблонов «Окна»

Стартовый пресет **«Акт сдачи-приёмки»** (`actAcceptance`, HTML из `windowsActAcceptance.ts`):

```bash
cd backend
npm run prisma:seed-windows-contract-templates
```

Режимы: `fill-missing` (по умолчанию), `WINDOWS_TEMPLATES_SEED_MODE=replace-library` — перезаписать активный пресет вкладки.
