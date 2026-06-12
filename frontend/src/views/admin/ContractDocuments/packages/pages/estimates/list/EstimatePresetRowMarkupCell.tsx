'use client';

import cdEstimateTab from '@/views/admin/ContractDocuments/styles/estimate-tab.module.css';
import cdEstimatesList from '@/views/admin/ContractDocuments/styles/estimates-list.module.css';

import type { EstimatePresetTableRowProps } from './EstimatePresetTableRow';
import { isUsageLocked } from './estimatesListUtils';

export type EstimatePresetRowMarkupCellProps = Pick<
  EstimatePresetTableRowProps,
  'preset' | 'saving' | 'usageByEstimateId' | 'onPresetMarkupChange'
>;

export function EstimatePresetRowMarkupCell({
  preset: it,
  saving,
  usageByEstimateId,
  onPresetMarkupChange,
}: EstimatePresetRowMarkupCellProps) {
  const usages = usageByEstimateId.get(it.id) ?? [];
  const hasLockedUsage = usages.some((u) => isUsageLocked(u));

  return (
    <td className={cdEstimatesList.estimatesListMarkupCell}>
      <label
        className={`${cdEstimateTab.field} ${cdEstimatesList.estimatesListInlineField}`}
        title={
          hasLockedUsage
            ? 'Нельзя менять наценку: расчёт закрыт для изменений (прикреплён к пакету со статусом «Договор подписан» или к подписанному Д/с).'
            : 'Доп. наценка к расчёту, %. Пусто — для расчёта в объекте действует наценка объекта; иначе +% к цене каждой позиции при прикреплении к смете.'
        }
      >
        <span className={cdEstimatesList.estimatesListVisuallyHidden}>Наценка, %</span>
        <input
          key={`${it.id}:markup:${it.additionalMarkupPercent ?? 'none'}`}
          type="number"
          min={0}
          max={999}
          step={0.1}
          defaultValue={
            typeof it.additionalMarkupPercent === 'number'
              ? String(it.additionalMarkupPercent)
              : '0'
          }
          disabled={saving || hasLockedUsage}
          onFocus={(e) => {
            e.currentTarget.dataset.markupAtFocus = e.currentTarget.value;
          }}
          onBlur={(e) => {
            if (e.currentTarget.dataset.markupAtFocus === e.currentTarget.value) return;
            onPresetMarkupChange(it.id, e.target.value);
          }}
        />
      </label>
    </td>
  );
}
