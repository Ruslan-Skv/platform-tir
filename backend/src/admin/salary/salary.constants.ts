import type { Prisma } from '@prisma/client';

/** Должности, участвующие в расчёте з/п (для подписей на фронте). */
export const SALARY_ROLE_LABELS: Record<string, string> = {
  MANAGER: 'Менеджер',
  SURVEYOR: 'Замерщик',
  LEAD_SPECIALIST: 'Ведущий специалист (ВС)',
  BRIGADIER: 'Бригадир / бригада',
};

/** Категории по умолчанию — переносятся из Google-таблицы «Новая таблица 2025». */
export const DEFAULT_SALARY_CATEGORIES: ReadonlyArray<{
  code: string;
  name: string;
  vsPercent: number;
  splitSign: number;
  splitClose: number;
  managerPercent: number;
  surveyorPercent: number;
  brigadierPercent: number;
  sortOrder: number;
}> = [
  {
    code: 'WINDOWS',
    name: 'Окна',
    vsPercent: 1.5,
    splitSign: 0.7,
    splitClose: 0.3,
    managerPercent: 3,
    surveyorPercent: 3,
    brigadierPercent: 0,
    sortOrder: 10,
  },
  {
    code: 'DOORS_CEILINGS',
    name: 'Двери + потолки',
    vsPercent: 2,
    splitSign: 0.7,
    splitClose: 0.3,
    managerPercent: 3,
    surveyorPercent: 3,
    brigadierPercent: 0,
    sortOrder: 20,
  },
  {
    code: 'BLINDS',
    name: 'Жалюзи',
    vsPercent: 2,
    splitSign: 0.7,
    splitClose: 0.3,
    managerPercent: 3,
    surveyorPercent: 3,
    brigadierPercent: 0,
    sortOrder: 30,
  },
  {
    code: 'REPAIR',
    name: 'Ремонт',
    vsPercent: 1,
    splitSign: 0.7,
    splitClose: 0.3,
    managerPercent: 5,
    surveyorPercent: 0,
    brigadierPercent: 8.5,
    sortOrder: 40,
  },
  {
    code: 'REPAIR_5050',
    name: 'Ремонт 50/50',
    vsPercent: 1,
    splitSign: 0.5,
    splitClose: 0.5,
    managerPercent: 5,
    surveyorPercent: 0,
    brigadierPercent: 8.5,
    sortOrder: 50,
  },
  {
    code: 'FURNITURE',
    name: 'Мебель',
    vsPercent: 2,
    splitSign: 0.7,
    splitClose: 0.3,
    managerPercent: 2,
    surveyorPercent: 0,
    brigadierPercent: 0,
    sortOrder: 60,
  },
  {
    code: 'AURORA',
    name: 'Аврора',
    vsPercent: 0,
    splitSign: 0.8,
    splitClose: 0.2,
    managerPercent: 3,
    surveyorPercent: 0,
    brigadierPercent: 0,
    sortOrder: 70,
  },
];

/** Decimal из Prisma → number для JSON-ответов. */
export function toNum(value: Prisma.Decimal | number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return typeof value === 'number' ? value : Number(value);
}

/** Округление до копеек. */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Дата (без времени) → 'YYYY-MM-DD'. */
export function toDateIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

/** 'YYYY-MM-DD' → Date (полдень UTC, чтобы избегать сдвигов таймзон при сравнении дат). */
export function fromDateIso(value: string): Date {
  return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
}
