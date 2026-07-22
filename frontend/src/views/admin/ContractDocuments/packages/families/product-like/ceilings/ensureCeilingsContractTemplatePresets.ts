import type { ContractTemplatePreset } from '@/shared/api/admin-contract-document-packages';
import { putContractDocumentTemplatePresets } from '@/shared/api/admin-contract-document-packages';

import { packageLibraryTemplateTabIdFromPreset } from '../../../platform/tabs/packageLibraryTemplateTabs';
import { ceilingsTemplateContract } from '../../../templates/ceilingsTemplateContract';
import { ceilingsTemplateMemo } from '../../../templates/ceilingsTemplateMemo';

/** Общий fallback «Ремонт / Окна» — не должен оставаться дефолтом для Потолков. */
export function isGenericRepairContractHtml(html: string | undefined | null): boolean {
  const h = (html ?? '').toLowerCase();
  return (
    h.includes('наименование работ') &&
    h.includes('подрядчик') &&
    (h.includes('локальными сметами') || h.includes('estimate.roomshtml'))
  );
}

/** Старый потолочный шаблон без тире в перечислениях — нужно обновить HTML. */
export function isOutdatedCeilingsContractHtml(html: string | undefined | null): boolean {
  const h = html ?? '';
  if (!/натяжного потолка/i.test(h)) return false;
  if (!/договор подряда \(с элементами купли-продажи\)/i.test(h)) return false;
  return !h.includes('— Изготовить и передать в собственность');
}

function listCeilingsPresetsByTab(
  items: ContractTemplatePreset[],
  tabId: 'contract' | 'memo'
): ContractTemplatePreset[] {
  return items.filter(
    (it) =>
      !it.archived &&
      packageLibraryTemplateTabIdFromPreset(it.tabId) === tabId &&
      Boolean(it.html?.trim())
  );
}

function shouldReplaceCeilingsContractHtml(html: string | undefined | null): boolean {
  return isGenericRepairContractHtml(html) || isOutdatedCeilingsContractHtml(html);
}

/** Чужой/заглушечный HTML памятки — заменить на текст для натяжных потолков. */
export function shouldReplaceCeilingsMemoHtml(html: string | undefined | null): boolean {
  const h = html ?? '';
  if (!h.trim()) return true;
  if (/памятка по эксплуатации натяжных потолков/i.test(h)) return false;
  return (
    /межкомнатных и входных дверей/i.test(h) ||
    /настройте полный текст памятки/i.test(h) ||
    /пвх-окон/i.test(h) ||
    /памятка по эксплуатации жалюзи/i.test(h)
  );
}

/**
 * Гарантирует для CEILINGS пресеты договора и памятки:
 * — если пресетов нет — создаёт дефолтные;
 * — если договоры «ремонтные»/устаревшие или памятка чужая/заглушка — подменяет HTML.
 */
export async function ensureCeilingsContractTemplatePresets(
  items: ContractTemplatePreset[]
): Promise<{ items: ContractTemplatePreset[]; changed: boolean }> {
  let next = items.map((it) => ({ ...it }));
  let changed = false;

  const contracts = listCeilingsPresetsByTab(next, 'contract');
  if (contracts.length === 0) {
    next = [
      ...next,
      {
        id: `tpl_ceilings_contract_${Date.now()}`,
        title: 'Договор подряда (натяжные потолки)',
        tabId: 'contract',
        html: ceilingsTemplateContract,
        isDefault: true,
        archived: false,
      },
    ];
    changed = true;
  } else {
    const replaceable = contracts.filter((it) => shouldReplaceCeilingsContractHtml(it.html));
    if (replaceable.length > 0) {
      const replaceIds = new Set(replaceable.map((it) => it.id));
      next = next.map((it) => {
        if (!replaceIds.has(it.id)) return it;
        changed = true;
        return {
          ...it,
          title: it.title?.trim() ? it.title : 'Договор подряда (натяжные потолки)',
          html: ceilingsTemplateContract,
          isDefault: it.isDefault || contracts[0]?.id === it.id,
        };
      });
    }
  }

  const memos = listCeilingsPresetsByTab(next, 'memo');
  if (memos.length === 0) {
    next = [
      ...next,
      {
        id: `tpl_ceilings_memo_${Date.now()}`,
        title: 'Памятка по эксплуатации натяжных потолков',
        tabId: 'memo',
        html: ceilingsTemplateMemo,
        isDefault: true,
        archived: false,
      },
    ];
    changed = true;
  } else {
    const replaceableMemos = memos.filter((it) => shouldReplaceCeilingsMemoHtml(it.html));
    if (replaceableMemos.length > 0) {
      const replaceIds = new Set(replaceableMemos.map((it) => it.id));
      next = next.map((it) => {
        if (!replaceIds.has(it.id)) return it;
        changed = true;
        return {
          ...it,
          title: it.title?.trim() ? it.title : 'Памятка по эксплуатации натяжных потолков',
          html: ceilingsTemplateMemo,
          isDefault: it.isDefault || memos[0]?.id === it.id,
        };
      });
    }
  }

  if (!changed) return { items, changed: false };

  await putContractDocumentTemplatePresets({ kind: 'CEILINGS', items: next });
  return { items: next, changed: true };
}
