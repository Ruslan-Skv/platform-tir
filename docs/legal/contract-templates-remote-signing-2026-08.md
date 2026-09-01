# Правки шаблонов индивидуальных договоров — дистанционное подписание (август 2026)

Источник логики: [`public-offers-remote-signing-2026-08.md`](./public-offers-remote-signing-2026-08.md).  
Публичные оферты вы уже обновили; здесь — **индивидуальные договоры** в пакетах документов (CRM).

> Не юридическая экспертиза — при необходимости согласуйте с юристом.

---

## Что добавлено

В раздел «Заключительные положения» (или п. 7.4–7.14 для ремонта) каждого направления:

1. **Мессенджеры** — WhatsApp, Telegram, MAX (единая формулировка).
2. **Определения** — ПЭП, Электронный документ.
3. **Направление документов** — e-mail, мессенджеры, персональная ссылка на Сайте.
4. **Процедура ПЭП** — ссылка → просмотр PDF → ФИО + OTP → согласие.
5. **Юридическая сила**, срок ссылки, отказ без исключения бумаги.
6. **Персональные данные** — отсылка к политике на сайте.

### Ремонт (вариант A)

Дополнительно **п. 7.13**: Акт начала работ может подписываться ПЭП, если направлен как Электронный документ (акцепт оферты по-прежнему через акт, см. оферту на ремонт).

---

## Где лежит код

| Файл | Назначение |
|------|------------|
| `frontend/.../contractTemplateRemoteSigningSection.ts` | Общие HTML-блоки для .ts-шаблонов |
| `frontend/.../ceilingsTemplateContract.ts` | Потолки (fallback) |
| `frontend/.../contract.ts` | Ремонт (fallback) |
| `backend/prisma/seed-data/*-library-templates.seed.json` | Актуальные шаблоны библиотеки (5 направлений) |
| `backend/prisma/scripts/patch-contract-remote-signing.mjs` | Скрипт патча seed (идемпотентный) |

---

## Как применить на prod

Шаблоны в БД **не обновятся сами** — нужен один из вариантов:

### A. Через seed (рекомендуется для чистой библиотеки)

```bash
# для каждого направления, ARCHIVE старые default-пресеты и вставить новые
CEILINGS_TEMPLATES_SEED_MODE=replace-library npm run prisma:seed-ceilings-contract-templates
DOORS_TEMPLATES_SEED_MODE=replace-library npm run prisma:seed-doors-contract-templates
WINDOWS_TEMPLATES_SEED_MODE=replace-library npm run prisma:seed-windows-contract-templates
BLINDS_TEMPLATES_SEED_MODE=replace-library npm run prisma:seed-blinds-contract-templates
REPAIR_TEMPLATES_SEED_MODE=replace-library npm run prisma:seed-repair-contract-templates
```

### B. Вручную в админке

**Договоры → Библиотека шаблонов** → вкладка «Договор» → открыть default-шаблон → вставить блок из этого документа или скопировать из dev после seed.

---

## Чеклист

- [ ] Seed или ручное обновление шаблонов «Договор» по всем 5 направлениям
- [ ] Проверить предпросмотр PDF в тестовом пакете
- [ ] Создать сессию «ЭП» и убедиться, что текст согласия на `/sign/...` соответствует договору
- [ ] При необходимости добавить аналогичную отсылку в шаблоны **актов** (сейчас покрыто общим п. «акты» в договоре)
