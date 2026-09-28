import type { PackageFormData } from '../../../platform/form/packageForm';
import type { ProductAddendumSpecificationLine } from '../addendum/addendumSpecification';
import { newProductAddendumSpecificationLine } from '../addendum/addendumSpecification';
import {
  type DoorsSpecificationLine,
  doorsSpecificationLineHasContent,
} from './doorsSpecification';

/** Отображаемое наименование позиции для строк Д/с: «Добор · 150х100 · к ДО ЛАЙТ». */
export function composeDoorsLineDisplayName(line: DoorsSpecificationLine): string {
  return [line.name, line.size, line.color, line.openingSide]
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .join(' · ');
}

function parseLineQuantity(line: DoorsSpecificationLine): number {
  const t = line.quantity.trim().replace(/\s/g, '').replace(',', '.');
  if (!t) return 0;
  const n = Number.parseFloat(t);
  return Number.isFinite(n) ? n : 0;
}

/** Число в поле «Кол-во» строки Д/с: без хвостовых нулей (2, а не 2.000). */
function formatQuantityNumber(value: number): string {
  return String(Math.round(value * 1000) / 1000);
}

export type DoorsSupplierRequestAddendumDiff = {
  /** Позиции к добавлению в заказ (увеличение количества и новые товары). */
  added: ProductAddendumSpecificationLine[];
  /** Позиции к исключению из заказа (уменьшение количества и удалённые товары). */
  excluded: ProductAddendumSpecificationLine[];
};

function toAddendumLine(input: {
  line: DoorsSpecificationLine;
  quantity: number;
}): ProductAddendumSpecificationLine {
  return {
    ...newProductAddendumSpecificationLine(),
    name: composeDoorsLineDisplayName(input.line) || input.line.name.trim(),
    quantity: formatQuantityNumber(input.quantity),
    unit: 'шт.',
    price: input.line.unitPrice,
  };
}

/**
 * Разница между неизменной Спецификацией и отредактированной Заявкой:
 * строки сопоставляются по id (панель правки предзаполняется строками Спецификации).
 */
export function diffDoorsSpecificationForSupplierRequest(
  specLines: DoorsSpecificationLine[],
  requestLines: DoorsSpecificationLine[]
): DoorsSupplierRequestAddendumDiff {
  const added: ProductAddendumSpecificationLine[] = [];
  const excluded: ProductAddendumSpecificationLine[] = [];

  const specById = new Map(
    specLines.filter(doorsSpecificationLineHasContent).map((line) => [line.id, line])
  );
  const seenSpecIds = new Set<string>();

  for (const line of requestLines) {
    if (!doorsSpecificationLineHasContent(line)) continue;
    const specLine = specById.get(line.id);
    if (!specLine) {
      added.push(toAddendumLine({ line, quantity: parseLineQuantity(line) }));
      continue;
    }
    seenSpecIds.add(specLine.id);
    const delta = parseLineQuantity(line) - parseLineQuantity(specLine);
    if (delta > 0) {
      added.push(toAddendumLine({ line, quantity: delta }));
    } else if (delta < 0) {
      excluded.push(toAddendumLine({ line: specLine, quantity: -delta }));
    }
  }

  for (const specLine of specById.values()) {
    if (!seenSpecIds.has(specLine.id)) {
      excluded.push(toAddendumLine({ line: specLine, quantity: parseLineQuantity(specLine) }));
    }
  }

  return { added, excluded };
}

export type DoorsSupplierRequestApplyResult = {
  form: PackageFormData;
  /** Номер созданного/обновлённого Д/с (1–5); null — Д/с не потребовалось или слоты заняты. */
  addendumSlotOrdinal: number | null;
  /** Все 5 слотов Д/с заняты — доп. соглашение создать не удалось. */
  addendumSlotsExhausted: boolean;
};

/** Д/с, в котором оформлены изменения заявки: последний открытый связанный, иначе последний связанный. */
export function resolveDoorsSupplierRequestAddendumOrdinal(form: PackageFormData): number | null {
  let lastOrdinal: number | null = null;
  let openOrdinal: number | null = null;
  for (let i = 0; i < Math.min(form.addendumSlotCount, 5); i++) {
    if (form.addendumSlots[i].supplierRequestLinked) {
      lastOrdinal = i + 1;
      if (form.addendumSlots[i].status === 'OPEN') openOrdinal = i + 1;
    }
  }
  return openOrdinal ?? lastOrdinal;
}

/**
 * Сохранение правок Заявки: обновляет перечень заявки и переносит разницу с неизменной
 * Спецификацией в доп. соглашение. Черновик связанного неподписанного Д/с обновляется на месте;
 * если оно подписано/оплачено или ещё не создавалось — создаётся новое Д/с.
 */
export function applyDoorsSupplierRequestLines(
  form: PackageFormData,
  requestLines: DoorsSpecificationLine[],
  todayDdMmYyyy: string
): DoorsSupplierRequestApplyResult {
  const diff = diffDoorsSpecificationForSupplierRequest(form.doorsSpecificationLines, requestLines);

  const slots = [...form.addendumSlots] as PackageFormData['addendumSlots'];
  let slotCount = form.addendumSlotCount;
  const dates = [...form.addendumDocumentDates] as PackageFormData['addendumDocumentDates'];

  let targetIdx = -1;
  for (let i = Math.min(slotCount, 5) - 1; i >= 0; i--) {
    if (slots[i].supplierRequestLinked && slots[i].status === 'OPEN') {
      targetIdx = i;
      break;
    }
  }

  const hasDiff = diff.added.length > 0 || diff.excluded.length > 0;
  let exhausted = false;

  if (targetIdx < 0) {
    if (!hasDiff) {
      return {
        form: { ...form, doorsSupplierRequestLines: requestLines },
        addendumSlotOrdinal: null,
        addendumSlotsExhausted: false,
      };
    }
    if (slotCount >= 5) {
      exhausted = true;
    } else {
      targetIdx = slotCount;
      slotCount += 1;
      if (!dates[targetIdx]?.trim()) dates[targetIdx] = todayDdMmYyyy;
    }
  }

  if (!exhausted) {
    slots[targetIdx] = {
      ...slots[targetIdx],
      specificationAddedLines: diff.added,
      specificationExcludedLines: diff.excluded,
      supplierRequestLinked: true,
    };
  }

  return {
    form: {
      ...form,
      doorsSupplierRequestLines: requestLines,
      addendumSlots: slots,
      addendumSlotCount: slotCount,
      addendumDocumentDates: dates,
    },
    addendumSlotOrdinal: exhausted ? null : targetIdx + 1,
    addendumSlotsExhausted: exhausted,
  };
}
