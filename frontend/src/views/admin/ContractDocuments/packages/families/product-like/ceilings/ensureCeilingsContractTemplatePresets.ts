import type { ContractTemplatePreset } from '@/shared/api/admin-contract-document-packages';
import { putContractDocumentTemplatePresets } from '@/shared/api/admin-contract-document-packages';

import { packageLibraryTemplateTabIdFromPreset } from '../../../platform/tabs/packageLibraryTemplateTabs';
import { ceilingsTemplateContract } from '../../../templates/ceilingsTemplateContract';

/** Общий fallback «Ремонт / Окна» — не должен оставаться дефолтом для Потолков. */
export function isGenericRepairContractHtml(html: string | undefined | null): boolean {
  const h = (html ?? '').toLowerCase();
  return (
    h.includes('на выполнение работ') &&
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

function listCeilingsContractPresets(items: ContractTemplatePreset[]): ContractTemplatePreset[] {
  return items.filter(
    (it) =>
      !it.archived &&
      packageLibraryTemplateTabIdFromPreset(it.tabId) === 'contract' &&
      Boolean(it.html?.trim())
  );
}

function shouldReplaceCeilingsContractHtml(html: string | undefined | null): boolean {
  return isGenericRepairContractHtml(html) || isOutdatedCeilingsContractHtml(html);
}

/**
 * Гарантирует для CEILINGS пресет договора с текстом натяжных потолков:
 * — если пресетов договора нет — создаёт дефолтный;
 * — если договоры «ремонтные» или устаревшие (без тире) — подменяет HTML.
 */
export async function ensureCeilingsContractTemplatePresets(
  items: ContractTemplatePreset[]
): Promise<{ items: ContractTemplatePreset[]; changed: boolean }> {
  const contracts = listCeilingsContractPresets(items);
  let next = items.map((it) => ({ ...it }));
  let changed = false;

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

  if (!changed) return { items, changed: false };

  await putContractDocumentTemplatePresets({ kind: 'CEILINGS', items: next });
  return { items: next, changed: true };
}
