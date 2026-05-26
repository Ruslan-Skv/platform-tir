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
