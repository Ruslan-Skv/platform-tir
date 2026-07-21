import type {
  ContractDocumentPackageKind,
  ContractEstimateGroup,
  ContractEstimatePreset,
} from '@/shared/api/admin-contract-document-packages';

import { amountToRussianWords } from '../../../core/amountToRussianWords';
import { todayContractDateDdMmYyyy } from '../../../core/contractDateFormat';
import { packageUsesLineSpecification } from '../../config';
import { isProductDirectionPackageKind } from '../../config/productDirectionPackageKind';
import {
  buildWindowsAddendumPrintHtml,
  windowsAddendumSlotHasAccountOrderContent,
  windowsAddendumSlotHasAnyPrintContent,
} from '../../families/product-like/addendum/addendumSpecification';
import { productContractCostFieldsForTemplate } from '../../families/product-like/cost/productContractCostBreakdown';
import { buildWindowsWorkOrderAddendumForTemplate } from '../../families/product-like/print/productWorkOrder';
import { buildDoorsDeliveryNoteProductsHtml } from '../../families/product-like/specification/doorsSpecification';
import {
  buildEstimateDiscountTotalsBlockHtml,
  buildEstimateDocPrintEmbedHtml,
  buildEstimateDocPrintFooterHtml,
  buildEstimateSectionsFromPresetIds,
} from '../estimates/packageEstimateDocPrintEmbedHtml';
import { computePackagePayableBreakdown } from '../payments/packagePaymentTotals';
import {
  enrichPackageCustomerForTemplate,
  packageCustomerTemplateContextFromTab,
} from './customerTemplateFields';
import { buildEstimateRoomsHtmlFromSnapshot } from './estimateHtml';
import { resolveExecutorBankFields } from './executorBankFields';
import { buildPackageInvoiceTemplateExtras } from './invoiceTemplateFields';
import type {
  PackageContractBlock,
  PackageEstimateBlock,
  PackageExecutorBlock,
  PackageFormData,
  PackageWorkOrderBlock,
} from './types';
import {
  buildWorkOrderRoomsHtmlFromComputed,
  buildWorkOrderRoomsHtmlFromSnapshot,
  formatMoney,
  resolveWorkOrderComputedForTemplate,
  toPercentValue,
} from './workOrderHtml';

/** Данные для подстановки в HTML: добавляет вычисляемое поле `executor.innKppRegLine`. */
export function packageFormForTemplate(
  form: PackageFormData,
  options?: {
    templateTab?: string;
    estimatePresets?: ContractEstimatePreset[];
    estimateGroups?: ContractEstimateGroup[];
    packageKind?: ContractDocumentPackageKind;
    windowsWorkOrderMarkupPercent?: number;
  }
): PackageFormData & {
  meta: { currentDate: string };
  contract: PackageContractBlock & {
    grandTotalAmount: string;
    grandTotalAmountWords: string;
    contractCost: string;
    productsCost: string;
    worksCost: string;
  };
  executor: PackageExecutorBlock & { innKppRegLine: string };
  estimate: PackageEstimateBlock & {
    total: string;
    rooms: string;
    roomsHtml: string;
    roomsCount: string;
    linesCount: string;
  };
  workOrder: PackageWorkOrderBlock & {
    showLineAmounts: boolean;
    roomsHtml: string;
    categoryTotalsHtml: string;
    totalBeforeDeductions: string;
    taxPercentNormalized: string;
    markupPercentNormalized: string;
    taxAmount: string;
    markupAmount: string;
    totalReduction: string;
    totalAfterDeductions: string;
    roomsCount: string;
    linesCount: string;
  };
  workOrderAddendum?: {
    slotNumber: string;
    roomsHtml: string;
    categoryTotalsHtml: string;
    totalAfterDeductions: string;
  };
  addendum?: {
    headerMain: string;
    headerSub: string;
    /** Склейка для старых шаблонов с одним плейсхолдером. */
    headerTitle: string;
    documentDate: string;
    /** Доп. класс на `.docPrint` (напр. компактная печать для «Окна»). */
    printDocClass: string;
    roomsHtml: string;
    workPeriodIncreaseSentence: string;
    /** Абзац про увеличение срока или пустая строка (без плейсхолдера «__________»). */
    workPeriodIncreaseHtml: string;
  };
  /** Накладная «Двери»: таблица изделий из спецификации. */
  deliveryNote?: {
    productsHtml: string;
  };
} {
  const estimateGroupsForTpl = options?.estimateGroups ?? [];
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

  const roomsHtml = buildEstimateRoomsHtmlFromSnapshot(snapshot, form.contract.discountPercent);

  const prepaymentRaw = form.contract.prepaymentAmount.trim();
  const prepaymentAmountWords = prepaymentRaw
    ? amountToRussianWords(form.contract.prepaymentAmount)
    : '';

  const { grandTotalRub } = computePackagePayableBreakdown(form);
  const grandTotalAmount =
    grandTotalRub != null && Number.isFinite(grandTotalRub) ? formatMoney(grandTotalRub) : '';
  const grandTotalAmountWords = grandTotalAmount ? amountToRussianWords(grandTotalAmount) : '';

  const addendumTabMatch =
    options?.templateTab && /^(?:addendum|workOrderAddendum)([1-5])$/.exec(options.templateTab);
  const addendumSlot = addendumTabMatch ? Number(addendumTabMatch[1]) : null;
  const addendumSlotSnap =
    addendumSlot !== null && addendumSlot >= 1 && addendumSlot <= 5
      ? (form.addendumSlots[addendumSlot - 1]?.snapshot ?? null)
      : null;
  const addendumSlotIdx =
    addendumSlot !== null && addendumSlot >= 1 && addendumSlot <= 5 ? addendumSlot - 1 : null;
  const addendumPresetIds =
    addendumSlotIdx !== null ? form.addendumSlots[addendumSlotIdx]?.selectedPresetIds : undefined;
  const addendumSections = buildEstimateSectionsFromPresetIds(
    addendumPresetIds,
    options?.estimatePresets ?? [],
    estimateGroupsForTpl
  );
  const addendumExcludedPresetIds =
    addendumSlotIdx !== null
      ? form.addendumSlots[addendumSlotIdx]?.excludedSelectedPresetIds
      : undefined;
  const addendumExcludedSections = buildEstimateSectionsFromPresetIds(
    addendumExcludedPresetIds,
    options?.estimatePresets ?? [],
    estimateGroupsForTpl
  );
  const addendumExcludedSnap =
    addendumSlot !== null && addendumSlot >= 1 && addendumSlot <= 5
      ? (form.addendumSlots[addendumSlot - 1]?.excludedSnapshot ?? null)
      : null;
  const addendumSlotForPrint =
    addendumSlotIdx !== null ? form.addendumSlots[addendumSlotIdx] : undefined;
  const buildAddendumEstimateRoomsHtml = () => {
    if (!addendumSlotSnap && !addendumExcludedSnap) return '';
    const additionalHtml = addendumSlotSnap
      ? buildEstimateDocPrintEmbedHtml({
          sections: addendumSections,
          snapshot: addendumSlotSnap,
          directorName: form.executor.directorName,
          customerFullName: form.customer.fullName,
          includeFooter: false,
          includeTotals: false,
        })
      : '';
    const excludedHtml = addendumExcludedSnap
      ? buildEstimateDocPrintEmbedHtml({
          sections: addendumExcludedSections,
          snapshot: addendumExcludedSnap,
          directorName: form.executor.directorName,
          customerFullName: form.customer.fullName,
          includeFooter: false,
          includeTotals: false,
        })
      : '';
    const additionalTotal = addendumSlotSnap?.total ?? 0;
    const excludedTotal = addendumExcludedSnap?.total ?? 0;
    const summaryTotal = additionalTotal - excludedTotal;
    const sectionsHtml: string[] = [];
    if (additionalHtml) {
      sectionsHtml.push(
        `<section><h2 class="packageAddendumEstimateHeading">Смета дополнительных ремонтно-отделочных работ</h2>${additionalHtml}</section>`
      );
    }
    if (excludedHtml) {
      sectionsHtml.push(
        `<section><h2 class="packageAddendumEstimateHeading">Непроводимые ремонтно-отделочные работы</h2>${excludedHtml}</section>`
      );
    }
    if (sectionsHtml.length === 0) return '';
    const totalsAndFooterHtml = `<div class="estimateA4DocPrintEmbed">${buildEstimateDiscountTotalsBlockHtml(
      {
        grossTotal: summaryTotal,
        contractDiscountPercent: form.contract.discountPercent,
      }
    )}${buildEstimateDocPrintFooterHtml({
      directorName: form.executor.directorName,
      customerFullName: form.customer.fullName,
    })}</div>`;
    return [...sectionsHtml, totalsAndFooterHtml].join('');
  };
  const buildWindowsAddendumRoomsHtml = () => {
    if (!addendumSlotForPrint || !windowsAddendumSlotHasAnyPrintContent(addendumSlotForPrint)) {
      return '';
    }
    const additionalHtml = addendumSlotSnap
      ? buildEstimateDocPrintEmbedHtml({
          sections: addendumSections,
          snapshot: addendumSlotSnap,
          directorName: form.executor.directorName,
          customerFullName: form.customer.fullName,
          includeFooter: false,
          includeTotals: false,
        })
      : '';
    const excludedHtml = addendumExcludedSnap
      ? buildEstimateDocPrintEmbedHtml({
          sections: addendumExcludedSections,
          snapshot: addendumExcludedSnap,
          directorName: form.executor.directorName,
          customerFullName: form.customer.fullName,
          includeFooter: false,
          includeTotals: false,
        })
      : '';
    return buildWindowsAddendumPrintHtml({
      slot: addendumSlotForPrint,
      additionalEmbedHtml: additionalHtml,
      excludedEmbedHtml: excludedHtml,
      accountAdditionalTotal: addendumSlotSnap?.total ?? 0,
      accountExcludedTotal: addendumExcludedSnap?.total ?? 0,
      contractDiscountPercent: form.contract.discountPercent,
      directorName: form.executor.directorName,
      customerFullName: form.customer.fullName,
    });
  };
  const addendumRoomsHtml =
    addendumSlot && isProductDirectionPackageKind(options?.packageKind)
      ? buildWindowsAddendumRoomsHtml()
      : addendumSlot
        ? buildAddendumEstimateRoomsHtml()
        : '';
  const addendumForTemplate =
    addendumSlot !== null && Number.isFinite(addendumSlot) && addendumSlot >= 1 && addendumSlot <= 5
      ? (() => {
          const headerMain = `Дополнительное соглашение №${addendumSlot}`;
          const contractRef = `№ ${form.contract.number.trim()} от ${form.contract.date.trim()}`;
          const headerSub = isProductDirectionPackageKind(options?.packageKind)
            ? `к Договору подряда (с элементами купли-продажи) ${contractRef}`
            : `к договору на проведение ремонтно-отделочных работ с использованием материалов заказчика ${contractRef}`;
          const increaseRaw =
            form.addendumSlots[addendumSlot - 1]?.workPeriodIncreaseDays?.trim() ?? '';
          const increaseDays = Number.parseInt(increaseRaw, 10);
          const workPeriodIncreaseSentence =
            Number.isFinite(increaseDays) && increaseDays > 0
              ? `В связи с увеличением объема работ, срок по договору увеличивается на ${increaseDays} рабочих дней.`
              : '';
          const workPeriodIncreaseHtml = workPeriodIncreaseSentence
            ? `<p style="margin: 10pt 0 0;">${workPeriodIncreaseSentence}</p>`
            : '';
          return {
            headerMain,
            headerSub,
            headerTitle: `${headerMain} ${headerSub}`,
            documentDate: form.addendumDocumentDates[addendumSlot - 1] ?? '',
            printDocClass: isProductDirectionPackageKind(options?.packageKind)
              ? ' windowsAddendumPrintCompactDoc'
              : '',
            roomsHtml: addendumRoomsHtml,
            workPeriodIncreaseSentence,
            workPeriodIncreaseHtml,
          };
        })()
      : undefined;
  const workOrderComputed = resolveWorkOrderComputedForTemplate(
    form.estimate.snapshot,
    form,
    options
  );
  const workOrderSections = buildEstimateSectionsFromPresetIds(
    form.estimate.selectedPresetIds,
    options?.estimatePresets ?? [],
    estimateGroupsForTpl
  );
  const workOrderAddendumForTemplate =
    addendumSlot !== null && Number.isFinite(addendumSlot) && addendumSlot >= 1 && addendumSlot <= 5
      ? (() => {
          const slotIdx = addendumSlot - 1;
          const slot = form.addendumSlots[slotIdx];
          if (isProductDirectionPackageKind(options?.packageKind)) {
            if (!slot || !windowsAddendumSlotHasAccountOrderContent(slot)) {
              return {
                slotNumber: String(addendumSlot),
                roomsHtml: '',
                categoryTotalsHtml: '',
                totalAfterDeductions: formatMoney(0),
              };
            }
            const showLineAmounts = form.workOrder.showLineAmounts;
            const additionalComputed = addendumSlotSnap
              ? resolveWorkOrderComputedForTemplate(addendumSlotSnap, form, options)
              : null;
            const excludedComputed = addendumExcludedSnap
              ? resolveWorkOrderComputedForTemplate(addendumExcludedSnap, form, options)
              : null;
            const additionalRoomsHtml =
              additionalComputed && additionalComputed.rooms.length > 0
                ? buildWorkOrderRoomsHtmlFromComputed(
                    additionalComputed,
                    addendumSections,
                    showLineAmounts
                  )
                : '';
            const excludedRoomsHtml =
              excludedComputed && excludedComputed.rooms.length > 0
                ? buildWorkOrderRoomsHtmlFromComputed(
                    excludedComputed,
                    addendumExcludedSections,
                    showLineAmounts
                  )
                : '';
            return buildWindowsWorkOrderAddendumForTemplate({
              slotNumber: addendumSlot,
              additionalRoomsHtml,
              excludedRoomsHtml,
              additionalAdjustedTotal: additionalComputed?.adjustedTotal ?? 0,
              excludedAdjustedTotal: excludedComputed?.adjustedTotal ?? 0,
              formatMoney,
            });
          }
          const workOrderAddendumComputed = resolveWorkOrderComputedForTemplate(
            slot?.snapshot ?? null,
            form,
            options
          );
          const workOrderAddendumSections = buildEstimateSectionsFromPresetIds(
            slot?.selectedPresetIds ?? [],
            options?.estimatePresets ?? [],
            estimateGroupsForTpl
          );
          const workOrderAddendumRoomsHtml = workOrderAddendumComputed
            ? buildWorkOrderRoomsHtmlFromSnapshot(
                slot?.snapshot ?? null,
                form.workOrder.taxPercent,
                form.workOrder.markupPercent,
                form.workOrder.gradeIncreasePercent,
                form.contract.discountPercent,
                workOrderAddendumSections,
                form.workOrder.showLineAmounts,
                workOrderAddendumComputed
              )
            : '';
          return {
            slotNumber: String(addendumSlot),
            roomsHtml: workOrderAddendumRoomsHtml,
            categoryTotalsHtml: '',
            totalAfterDeductions: formatMoney(workOrderAddendumComputed?.adjustedTotal ?? 0),
          };
        })()
      : undefined;

  const customerContext = packageCustomerTemplateContextFromTab(options?.templateTab);
  const customerForTemplate = enrichPackageCustomerForTemplate(form.customer, customerContext);

  const bankResolved = resolveExecutorBankFields(executor);
  const executorForTemplate = {
    ...executor,
    innKppRegLine,
    bankDetails: bankResolved.bankDetailsComposed || executor.bankDetails,
    bankName: bankResolved.bankName,
    bankBik: bankResolved.bankBik,
    bankCorrAccount: bankResolved.bankCorrAccountDisplay,
    bankSettlementAccount: bankResolved.bankSettlementAccountDisplay,
  };

  const isPaymentInvoiceTab = options?.templateTab === 'paymentInvoice';
  const invoiceExtras = isPaymentInvoiceTab
    ? buildPackageInvoiceTemplateExtras(executorForTemplate, form.customer, {
        invoiceNumber: form.contract.invoiceNumber,
        prepaymentDate: form.contract.prepaymentDate,
        prepaymentAmount: form.contract.prepaymentAmount,
        prepaymentAmountWords,
      })
    : null;

  const contractCostFields = productContractCostFieldsForTemplate(form);

  const deliveryNoteForTemplate = packageUsesLineSpecification(options?.packageKind)
    ? {
        productsHtml: buildDoorsDeliveryNoteProductsHtml(
          form.doorsSpecificationLines,
          options?.packageKind
        ),
      }
    : undefined;

  const contractForTemplate = {
    ...form.contract,
    prepaymentAmountWords,
    grandTotalAmount,
    grandTotalAmountWords,
    contractCost: contractCostFields.contractCost,
    productsCost: contractCostFields.productsCost,
    worksCost: contractCostFields.worksCost,
    ...(invoiceExtras
      ? {
          prepaymentAmountFormatted: invoiceExtras.prepaymentAmountFormatted,
          prepaymentAmountWordsInvoice: invoiceExtras.prepaymentAmountWordsInvoice,
          invoiceTitleLine: invoiceExtras.invoiceTitleLine,
        }
      : {}),
  };

  const customerWithInvoice =
    invoiceExtras != null
      ? { ...customerForTemplate, buyerLine: invoiceExtras.buyerLine }
      : customerForTemplate;

  return {
    ...form,
    customer: customerWithInvoice,
    ...(addendumForTemplate ? { addendum: addendumForTemplate } : {}),
    ...(workOrderAddendumForTemplate ? { workOrderAddendum: workOrderAddendumForTemplate } : {}),
    ...(deliveryNoteForTemplate ? { deliveryNote: deliveryNoteForTemplate } : {}),
    meta: {
      /** Текущая календарная дата в формате дд.мм.гггг (момент предпросмотра/печати). Шаблон: `{{meta.currentDate}}`. */
      currentDate: todayContractDateDdMmYyyy(),
    },
    contract: contractForTemplate,
    executor: {
      ...executorForTemplate,
      ...(invoiceExtras
        ? {
            supplierLine: invoiceExtras.supplierLine,
            buyerLine: invoiceExtras.buyerLine,
            bankName: invoiceExtras.bankName,
            bankBik: invoiceExtras.bankBik,
            bankCorrAccount: invoiceExtras.bankCorrAccount,
            bankSettlementAccount: invoiceExtras.bankSettlementAccount,
          }
        : {}),
    },
    estimate: {
      ...estimate,
      total,
      rooms,
      roomsHtml,
      roomsCount,
      linesCount,
    },
    workOrder: {
      ...form.workOrder,
      roomsHtml: buildWorkOrderRoomsHtmlFromSnapshot(
        form.estimate.snapshot,
        form.workOrder.taxPercent,
        form.workOrder.markupPercent,
        form.workOrder.gradeIncreasePercent,
        form.contract.discountPercent,
        workOrderSections,
        form.workOrder.showLineAmounts,
        workOrderComputed
      ),
      categoryTotalsHtml: '',
      showLineAmounts: form.workOrder.showLineAmounts,
      totalBeforeDeductions: formatMoney(workOrderComputed.originalTotal),
      taxPercentNormalized: toPercentValue(form.workOrder.taxPercent),
      markupPercentNormalized: toPercentValue(form.workOrder.markupPercent),
      taxAmount: formatMoney(workOrderComputed.taxAmount),
      markupAmount: formatMoney(workOrderComputed.markupAmount),
      totalReduction: formatMoney(workOrderComputed.reductionAmount),
      totalAfterDeductions: formatMoney(workOrderComputed.adjustedTotal),
      roomsCount: String(workOrderComputed.rooms.length),
      linesCount: String(workOrderComputed.rooms.reduce((sum, room) => sum + room.lines.length, 0)),
      gradeIncreasePercent: workOrderComputed.gradeIncreasePercent,
    },
  };
}
