/** ЮЛ — ОГРН и КПП; ИП — ОГРНИП (КПП в форме обычно пустой). */
export type RepairExecutorKind = 'COMPANY' | 'ENTREPRENEUR';

/** Структура вкладки «Данные» для направления «Ремонт» (расширяйте по мере переноса полей из Excel). */
export interface RepairCustomerBlock {
  type: 'PERSON' | 'COMPANY' | 'ENTREPRENEUR';
  fullName: string;
  representativeFullNameNominative: string;
  representativeFullNameGenitive: string;
  organizationName: string;
  representativePositionNominative: string;
  representativePositionGenitive: string;
  inn: string;
  ogrn: string;
  address: string;
  phone: string;
  email: string;
  bankDetails: string;
  passportSeriesNumber: string;
  passportIssuedBy: string;
  passportIssueDate: string;
}

export interface RepairExecutorBlock {
  selectedProfileTitle: string;
  executorKind: RepairExecutorKind;
  companyName: string;
  inn: string;
  kpp: string;
  ogrn: string;
  ogrnip: string;
  legalAddress: string;
  actualAddress: string;
  bankDetails: string;
  email: string;
  /** Карточка из справочника «Подписанты». */
  selectedSignatoryProfileTitle: string;
  /** Id пользователя CRM из карточки подписанта (для связи с «Менеджерами»). */
  signatoryCrmUserId: string;
  directorNameNominative: string;
  directorNameGenitive: string;
  directorName: string;
  basis: string;
  salesOffice: string;
  officePhone: string;
}

export interface RepairObjectBlock {
  objectAddress: string;
  objectFloor: string;
  objectDescription: string;
}

export interface RepairContractBlock {
  number: string;
  date: string;
  totalAmount: string;
  recommendedPrepayment: string;
  totalAmountWords: string;
  prepaymentAmount: string;
  workPeriod: string;
}

export interface RepairEstimateBlock {
  /** ID сохранённого серверного расчёта из раздела «Расчёты». */
  selectedPresetId: string;
  /** IDs прикреплённых расчётов (для объединения нескольких смет в один договор). */
  selectedPresetIds: string[];
  /** Снимок расчёта для договора: сумма и строки по помещениям. */
  snapshot: {
    total: number;
    rooms: Array<{
      name: string;
      total: number;
      lines: Array<{
        name: string;
        unit: string;
        quantity: number;
        price: number;
        amount: number;
      }>;
    }>;
  } | null;
  /** Свободный текст комментария к выбранному расчёту. */
  notes: string;
}

export interface RepairPackageFormData {
  customer: RepairCustomerBlock;
  executor: RepairExecutorBlock;
  object: RepairObjectBlock;
  contract: RepairContractBlock;
  estimate: RepairEstimateBlock;
}

export function defaultRepairPackageFormData(): RepairPackageFormData {
  return {
    customer: {
      type: 'PERSON',
      fullName: '',
      representativeFullNameNominative: '',
      representativeFullNameGenitive: '',
      organizationName: '',
      representativePositionNominative: '',
      representativePositionGenitive: '',
      inn: '',
      ogrn: '',
      address: '',
      phone: '',
      email: '',
      bankDetails: '',
      passportSeriesNumber: '',
      passportIssuedBy: '',
      passportIssueDate: '',
    },
    executor: {
      selectedProfileTitle: '',
      executorKind: 'COMPANY',
      companyName: '',
      inn: '',
      kpp: '',
      ogrn: '',
      ogrnip: '',
      legalAddress: '',
      actualAddress: '',
      bankDetails: '',
      email: '',
      selectedSignatoryProfileTitle: '',
      signatoryCrmUserId: '',
      directorNameNominative: '',
      directorNameGenitive: '',
      directorName: '',
      basis: '',
      salesOffice: '',
      officePhone: '',
    },
    object: {
      objectAddress: '',
      objectFloor: '',
      objectDescription: '',
    },
    contract: {
      number: '',
      date: '',
      totalAmount: '',
      recommendedPrepayment: '',
      totalAmountWords: '',
      prepaymentAmount: '',
      workPeriod: '',
    },
    estimate: {
      selectedPresetId: '',
      selectedPresetIds: [],
      snapshot: null,
      notes: '',
    },
  };
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function mergeDeep<T extends Record<string, unknown>>(base: T, patch: Record<string, unknown>): T {
  const out = { ...base } as Record<string, unknown>;
  for (const key of Object.keys(patch)) {
    const pv = patch[key];
    const bv = out[key];
    if (isPlainObject(pv) && isPlainObject(bv)) {
      out[key] = mergeDeep(bv as Record<string, unknown>, pv);
    } else if (pv !== undefined) {
      out[key] = pv;
    }
  }
  return out as T;
}

export function mergeRepairPackageFormData(raw: unknown): RepairPackageFormData {
  const base = defaultRepairPackageFormData();
  if (!isPlainObject(raw)) return base;
  return mergeDeep(
    base as unknown as Record<string, unknown>,
    raw
  ) as unknown as RepairPackageFormData;
}

/** Данные для подстановки в HTML: добавляет вычисляемое поле `executor.innKppRegLine`. */
export function repairPackageFormForTemplate(form: RepairPackageFormData): RepairPackageFormData & {
  executor: RepairExecutorBlock & { innKppRegLine: string };
  estimate: RepairEstimateBlock & {
    total: string;
    rooms: string;
    roomsHtml: string;
    roomsCount: string;
    linesCount: string;
  };
} {
  const { executor } = form;
  const { estimate } = form;
  const isIp = executor.executorKind === 'ENTREPRENEUR';
  const innKppRegLine = isIp
    ? [
        executor.inn ? `ИНН ${executor.inn}` : '',
        executor.ogrnip ? `ОГРНИП ${executor.ogrnip}` : '',
      ]
        .filter(Boolean)
        .join(', ')
    : [
        executor.inn ? `ИНН ${executor.inn}` : '',
        executor.kpp ? `КПП ${executor.kpp}` : '',
        executor.ogrn ? `ОГРН ${executor.ogrn}` : '',
      ]
        .filter(Boolean)
        .join(', ');

  const snapshot = estimate.snapshot;
  const totalValue = snapshot?.total ?? 0;
  const total = totalValue > 0 ? totalValue.toFixed(2).replace('.', ',') : '';
  const roomsCount = String(snapshot?.rooms.length ?? 0);
  const linesCount = String(snapshot?.rooms.reduce((sum, room) => sum + room.lines.length, 0) ?? 0);
  const rooms = snapshot
    ? snapshot.rooms
        .map((room, roomIndex) => {
          const roomHeader = `${roomIndex + 1}. ${room.name} — ${room.total
            .toFixed(2)
            .replace('.', ',')}`;
          const roomLines = room.lines.map(
            (line) =>
              `- ${line.name}: ${line.quantity} ${line.unit} × ${line.price
                .toFixed(2)
                .replace('.', ',')} = ${line.amount.toFixed(2).replace('.', ',')}`
          );
          return [roomHeader, ...roomLines].join('\n');
        })
        .join('\n\n')
    : '';

  const escapeHtml = (value: string): string =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  const roomsHtml = snapshot
    ? `<table style="width:100%; border-collapse:collapse; margin:8pt 0;">
  <thead>
    <tr>
      <th style="border:1px solid #cbd5e1; padding:6px; text-align:left;">Помещение / позиция</th>
      <th style="border:1px solid #cbd5e1; padding:6px; text-align:right;">Кол-во</th>
      <th style="border:1px solid #cbd5e1; padding:6px; text-align:right;">Цена</th>
      <th style="border:1px solid #cbd5e1; padding:6px; text-align:right;">Сумма</th>
    </tr>
  </thead>
  <tbody>
    ${snapshot.rooms
      .map((room) => {
        const roomHeader = `<tr>
      <td colspan="4" style="border:1px solid #cbd5e1; padding:6px; font-weight:700; background:#f8fafc;">${escapeHtml(
        room.name
      )} — ${room.total.toFixed(2).replace('.', ',')}</td>
    </tr>`;
        const roomLines = room.lines
          .map(
            (line) => `<tr>
      <td style="border:1px solid #cbd5e1; padding:6px;">${escapeHtml(line.name)}</td>
      <td style="border:1px solid #cbd5e1; padding:6px; text-align:right;">${line.quantity} ${escapeHtml(line.unit)}</td>
      <td style="border:1px solid #cbd5e1; padding:6px; text-align:right;">${line.price.toFixed(2).replace('.', ',')}</td>
      <td style="border:1px solid #cbd5e1; padding:6px; text-align:right;">${line.amount.toFixed(2).replace('.', ',')}</td>
    </tr>`
          )
          .join('');
        return `${roomHeader}${roomLines}`;
      })
      .join('')}
    <tr>
      <td colspan="3" style="border:1px solid #cbd5e1; padding:6px; text-align:right; font-weight:700;">Итого</td>
      <td style="border:1px solid #cbd5e1; padding:6px; text-align:right; font-weight:700;">${snapshot.total
        .toFixed(2)
        .replace('.', ',')}</td>
    </tr>
  </tbody>
</table>`
    : '';

  return {
    ...form,
    executor: {
      ...executor,
      innKppRegLine,
    },
    estimate: {
      ...estimate,
      total,
      rooms,
      roomsHtml,
      roomsCount,
      linesCount,
    },
  };
}
