# Проектирование CRM в админке платформы ТИР

## Обзор

Данный документ описывает структуру CRM, которая заменит текущий учёт на Google Sheets. В проекте уже есть базовая модель `Customer`, `Order` (интернет-магазин) и `Payment`. Новая CRM ориентирована на **договорной учёт**: замеры → оформление договоров → оплаты по договорам.

---

## Бизнес-процесс

```
[Заявка/Замер] → [Выполнение замера] → [Заключение договора] → [Оплаты] → [Доставка/Монтаж] → [Акты]
```

---

## 1. Справочники и сущности

### 1.1 Направление (Direction)
Общая сущность для замеров и договоров (двери, окна, потолки, мебель и т.п.).

| Поле | Тип | Описание |
|------|-----|----------|
| id | cuid | |
| name | string | Название (например, "Двери", "Окна", "Натяжные потолки") |
| slug | string | Для URL |
| isActive | boolean | |
| sortOrder | int | |

Связать с `HomeDirection` или создать отдельную таблицу `CrmDirection`.

### 1.2 Сотрудники (User)
Менеджеры, замерщики, монтажники — это пользователи системы с ролями. Используем существующую модель `User`. Рекомендуется добавить роли/метки: `MANAGER`, `SURVEYOR`, `INSTALLER`, `DELIVERY`.

---

## 2. Замеры (Measurement)

Отдельная сущность для учёта замеров, соответствующая вашей таблице.

| Поле | Тип | Обязательное | Описание |
|------|-----|--------------|----------|
| id | cuid | ✓ | |
| managerId | string | ✓ | FK → User |
| receptionDate | DateTime | ✓ | Дата приёма замера |
| executionDate | DateTime? | | Дата выполнения замера |
| surveyorId | string? | | FK → User (Замерщик) |
| directionId | string? | | FK → Direction (Направление) |
| customerName | string | ✓ | ФИО заказчика |
| customerAddress | string | | Адрес заказчика |
| customerPhone | string | ✓ | Телефон заказчика |
| comments | string? | | Комментарии к замеру |
| status | enum | ✓ | См. MeasurementStatus |
| customerId | string? | | FK → Customer (если уже есть в CRM) |
| contractId | string? | | FK → Contract (если замер перешёл в договор) |
| createdAt, updatedAt | DateTime | | |

**MeasurementStatus:**
- `NEW` — Новый
- `ASSIGNED` — Назначен замерщику
- `IN_PROGRESS` — Выполняется
- `COMPLETED` — Выполнен
- `CANCELLED` — Отменён
- `CONVERTED` — Превращён в договор

---

## 3. Договоры (Contract)

Отдельная сущность для учёта оформленных заказов по договорам (не путать с Order — интернет-магазин).

| Поле | Тип | Обязательное | Описание |
|------|-----|--------------|----------|
| id | cuid | ✓ | |
| contractNumber | string | ✓ | Номер договора |
| contractDate | DateTime | ✓ | Дата заключения договора |
| status | enum | ✓ | ContractStatus |
| directionId | string? | | Направление |
| managerId | string? | | Менеджер |
| deliveryId | string? | | Доставка (User или справочник) |
| installers | string[] | | Массив id монтажников (User) |
| surveyorId | string? | | Замерщик |
| validityStart | DateTime? | | Дата начала срока по договору |
| validityEnd | DateTime? | | Дата окончания договора |
| installationDate | DateTime? | | Дата монтажа |
| deliveryDate | DateTime? | | Дата доставки |
| customerName | string | ✓ | ФИО заказчика |
| customerAddress | string | | Адрес |
| customerPhone | string | | Телефон |
| customerId | string? | | FK → Customer (если есть) |
| discount | Decimal | | Скидка на заказ |
| totalAmount | Decimal | ✓ | Стоимость заказа |
| advanceAmount | Decimal | | Сумма аванса (текущая) |
| notes | string? | | Примечание |
| source | string? | | Откуда заказчик узнал о нас |
| preferredExecutorId | string? | | Конкретный исполнитель по просьбе клиента |
| measurementId | string? | | Связь с замером |
| actWorkStartDate | DateTime? | | Дата подписания акта начала работ |
| actWorkEndDate | DateTime? | | Дата подписания акта сдачи работ |
| goodsTransferDate | DateTime? | | Дата подписания накладной на передачу товаров |
| createdAt, updatedAt | DateTime | | |

**ContractStatus:**
- `DRAFT` — Черновик
- `ACTIVE` — Активный
- `IN_PROGRESS` — В работе
- `COMPLETED` — Завершён
- `EXPIRED` — Истёк
- `CANCELLED` — Отменён

### 3.1 Авансы по заказу (ContractAdvance)

Несколько авансов — отдельная таблица.

| Поле | Тип | Описание |
|------|-----|----------|
| id | cuid | |
| contractId | string | FK → Contract |
| amount | Decimal | Сумма |
| paidAt | DateTime | Дата оплаты |
| notes | string? | |

### 3.2 Дополнительные соглашения (ContractAmendment)

До 5 шт. на договор.

| Поле | Тип | Описание |
|------|-----|----------|
| id | cuid | |
| contractId | string | FK → Contract |
| amount | Decimal | Стоимость д/с |
| date | DateTime | Дата |
| extendsValidityTo | DateTime? | Увеличение срока договора по д/с |
| notes | string? | |

---

## 4. Оплаты по договорам (ContractPayment)

Отдельная таблица для учёта оплат по договорам.

| Поле | Тип | Обязательное | Описание |
|------|-----|--------------|----------|
| id | cuid | ✓ | |
| contractId | string | ✓ | FK → Contract |
| paymentDate | DateTime | ✓ | Дата оплаты |
| amount | Decimal | ✓ | Сумма оплаты |
| paymentForm | enum | ✓ | CASH / TERMINAL / QR / INVOICE |
| paymentType | enum | ✓ | PREPAYMENT / ADVANCE / FINAL / AMENDMENT |
| managerId | string? | | Менеджер |
| notes | string? | | |
| createdAt | DateTime | | Дата учёта (текущая при внесении) |

**PaymentForm:** `CASH` (наличные), `TERMINAL` (терминал), `QR` (QR-код), `INVOICE` (по счёту)

**PaymentType:** `PREPAYMENT` (предоплата), `ADVANCE` (аванс), `FINAL` (окончательный расчёт), `AMENDMENT` (оплата доп. соглашения)

---

## 5. Связь с Customer

- Замер и Договор могут ссылаться на `Customer` (опционально).
- При создании замера/договора можно создавать клиента автоматически или привязывать к существующему (по телефону/ФИО).
- В карточке клиента — вкладки: Замеры, Договоры, Оплаты.

---

## 6. Структура навигации в админке

### CRM (раздел)

```
CRM
├── Обзор / Дашборд          /admin/crm
├── Замеры                   /admin/crm/measurements
├── Договоры                 /admin/crm/contracts
├── Оплаты по договорам      /admin/crm/contract-payments
├── Клиенты                  /admin/crm/customers
├── Заявки с форм            /admin/forms
├── Чат поддержки            /admin/support
├── Воронка продаж           /admin/crm/funnel
├── Сделки                   /admin/crm/deals
└── Задачи                   /admin/crm/tasks
```

### Заказы (интернет-магазин)

Раздел «Заказы» оставить для интернет-заказов:
- Все заказы
- Доставка
- Оплаты (для интернет-заказов)

---

## 7. Страницы и функционал

### 7.1 Замеры (`/admin/crm/measurements`)

- **Таблица:** Менеджер, Дата приёма, Дата выполнения, Замерщик, Направление, ФИО, Адрес, Телефон, Статус, Комментарии
- **Фильтры:** Статус, Менеджер, Замерщик, Направление, период дат
- **Поиск:** ФИО, телефон, адрес
- **Действия:** Создать замер, Редактировать, Перевести в договор
- **Карточка замера:** все поля + кнопка «Создать договор» (копирует данные клиента)

### 7.2 Договоры (`/admin/crm/contracts`)

- **Таблица:** № договора, Дата заключения, Статус, Направление, Менеджер, ФИО, Адрес, Стоимость, Аванс, Остаток, Даты (монтаж, доставка)
- **Фильтры:** Статус, Менеджер, Направление, период
- **Карточка договора:**
  - Основные данные
  - Авансы (список с добавлением)
  - Доп. соглашения (до 5, CRUD)
  - Оплаты (список)
  - Даты актов (редактирование)

### 7.3 Оплаты по договорам (`/admin/crm/contract-payments`)

- **Таблица:** Дата оплаты, № договора, ФИО, Стоимость заказа, Сумма оплаты, Форма, Тип, Менеджер
- **Фильтры:** Период, Форма оплаты, Тип оплаты, Менеджер
- **Действия:** Добавить оплату (выбор договора, сумма, форма, тип)

### 7.4 Клиенты (`/admin/crm/customers`)

- Существующая страница, расширить:
  - В карточке клиента — вкладки: Замеры, Договоры, Оплаты, Взаимодействия, Задачи

---

## 8. Схема БД (Prisma)

```prisma
// Направления CRM (можно использовать HomeDirection или отдельно)
model CrmDirection {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  isActive  Boolean  @default(true)
  sortOrder Int      @default(0)
  measurements Measurement[]
  contracts   Contract[]

  @@map("crm_directions")
}

// Замеры
model Measurement {
  id             String            @id @default(cuid())
  managerId      String
  receptionDate  DateTime          @db.Date
  executionDate  DateTime?         @db.Date
  surveyorId     String?
  directionId    String?
  customerName   String
  customerAddress String?          @db.Text
  customerPhone  String
  comments       String?           @db.Text
  status         MeasurementStatus @default(NEW)
  customerId     String?
  contractId     String?
  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt

  manager    User       @relation("MeasurementManager", fields: [managerId], references: [id])
  surveyor   User?      @relation("MeasurementSurveyor", fields: [surveyorId], references: [id])
  direction  CrmDirection? @relation(fields: [directionId], references: [id])
  customer   Customer?  @relation(fields: [customerId], references: [id])
  contract   Contract?  @relation(fields: [contractId], references: [id])

  @@index([managerId])
  @@index([status])
  @@index([receptionDate])
  @@map("measurements")
}

enum MeasurementStatus {
  NEW
  ASSIGNED
  IN_PROGRESS
  COMPLETED
  CANCELLED
  CONVERTED
}

// Договоры
model Contract {
  id                  String        @id @default(cuid())
  contractNumber      String        @unique
  contractDate        DateTime      @db.Date
  status              ContractStatus @default(DRAFT)
  directionId         String?
  managerId           String?
  deliveryId          String?
  surveyorId          String?
  validityStart       DateTime?     @db.Date
  validityEnd         DateTime?     @db.Date
  installationDate    DateTime?     @db.Date
  deliveryDate        DateTime?     @db.Date
  customerName        String
  customerAddress     String?       @db.Text
  customerPhone       String?
  customerId          String?
  discount            Decimal       @default(0) @db.Decimal(12, 2)
  totalAmount         Decimal       @db.Decimal(12, 2)
  advanceAmount       Decimal       @default(0) @db.Decimal(12, 2)
  notes               String?       @db.Text
  source              String?
  preferredExecutorId String?
  measurementId       String?
  actWorkStartDate    DateTime?     @db.Date
  actWorkEndDate      DateTime?     @db.Date
  goodsTransferDate   DateTime?     @db.Date
  installers          String[]      @default([]) // User IDs
  createdAt           DateTime      @default(now())
  updatedAt           DateTime      @updatedAt

  direction    CrmDirection?     @relation(fields: [directionId], references: [id])
  manager      User?             @relation("ContractManager", fields: [managerId], references: [id])
  surveyor     User?             @relation("ContractSurveyor", fields: [surveyorId], references: [id])
  customer     Customer?         @relation(fields: [customerId], references: [id])
  measurement  Measurement?      @relation(fields: [measurementId], references: [id])
  advances     ContractAdvance[]
  amendments   ContractAmendment[]
  payments     ContractPayment[]

  @@index([managerId])
  @@index([status])
  @@index([contractDate])
  @@map("contracts")
}

enum ContractStatus {
  DRAFT
  ACTIVE
  IN_PROGRESS
  COMPLETED
  EXPIRED
  CANCELLED
}

model ContractAdvance {
  id         String   @id @default(cuid())
  contractId String
  amount     Decimal  @db.Decimal(12, 2)
  paidAt     DateTime @db.Date
  notes      String?  @db.Text
  contract   Contract @relation(fields: [contractId], references: [id], onDelete: Cascade)

  @@map("contract_advances")
}

model ContractAmendment {
  id               String    @id @default(cuid())
  contractId       String
  amount           Decimal   @db.Decimal(12, 2)
  date             DateTime  @db.Date
  extendsValidityTo DateTime? @db.Date
  notes            String?   @db.Text
  contract         Contract  @relation(fields: [contractId], references: [id], onDelete: Cascade)

  @@map("contract_amendments")
}

model ContractPayment {
  id           String        @id @default(cuid())
  contractId   String
  paymentDate  DateTime      @db.Date
  amount       Decimal       @db.Decimal(12, 2)
  paymentForm  PaymentForm
  paymentType  PaymentType
  managerId    String?
  notes        String?       @db.Text
  createdAt    DateTime      @default(now())

  contract Contract @relation(fields: [contractId], references: [id], onDelete: Cascade)
  manager  User?    @relation(fields: [managerId], references: [id])

  @@index([contractId])
  @@index([paymentDate])
  @@map("contract_payments")
}

enum PaymentForm {
  CASH
  TERMINAL
  QR
  INVOICE
}

enum PaymentType {
  PREPAYMENT
  ADVANCE
  FINAL
  AMENDMENT
}
```

---

## 9. Дополнения к User

В `User` добавить связи для новых ролей:

```prisma
// В модели User добавить:
managedMeasurements   Measurement[] @relation("MeasurementManager")
surveyedMeasurements  Measurement[] @relation("MeasurementSurveyor")
managedContracts      Contract[]    @relation("ContractManager")
surveyedContracts     Contract[]    @relation("ContractSurveyor")
contractPayments      ContractPayment[]
```

---

## 10. В Customer добавить

```prisma
measurements Measurement[]
contracts    Contract[]
```

---

## 11. Этапы реализации

1. **Миграция БД** — добавить модели в schema.prisma, выполнить миграцию
2. **Backend API** — CRUD для Measurements, Contracts, ContractPayments, CrmDirections
3. **Навигация** — обновить AdminSidebar (новые пункты CRM)
4. **Страницы** — MeasurementsPage, ContractsPage, ContractPaymentsPage
5. **Карточки** — MeasurementDetail, ContractDetail (с вкладками)
6. **Интеграция** — связь Замер → Договор, расчёт остатка по договору

---

## 12. Рекомендации

- **Направления** — можно взять из `HomeDirection` или категорий каталога, если структура подходит
- **Монтажники/Доставка** — хранить как массив `userId` или справочник; в таблице Contract — строку с именами для отображения
- **Импорт** — при переходе с Google Sheets реализовать импорт CSV/Excel для первичной загрузки данных
- **Права доступа** — учитывать роли: менеджер видит только свои замеры/договоры, администратор — все
