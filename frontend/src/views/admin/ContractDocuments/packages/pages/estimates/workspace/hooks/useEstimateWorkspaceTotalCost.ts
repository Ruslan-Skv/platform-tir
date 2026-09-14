import { useEffect, useState } from 'react';

import { apiFetch } from '@/shared/lib/api-fetch';
import { getApiBaseUrl } from '@/shared/lib/auth-session';

import { parseDraftRooms } from '../../../../platform/estimates/contractDocumentsEstimateSnapshot';
import {
  parseCustomItemsNoMarkupFromDraft,
  parseEstimateCustomItemsFromDraft,
  splitDraftLineItems,
} from '../../../../platform/estimates/estimateCustomWorkItems';
import { calculatorDraftStorageKey } from '../estimateWorkspaceUtils';

const POLL_INTERVAL_MS = 1000;

export type EstimateWorkspaceTotalCost = {
  /** Общая стоимость всех позиций без наценки. */
  total: number;
  /** Часть стоимости, к которой не применяется наценка расчёта («Дополнительные виды работ»). */
  noMarkupTotal: number;
};

function joinApiPath(path: string): string {
  const base = getApiBaseUrl().replace(/\/$/, '');
  const p = path.replace(/^\//, '');
  return `${base}/${p}`;
}

/**
 * Общая расчётная стоимость всего расчёта (по черновикам калькулятора всех категорий).
 * Черновики читаются из localStorage и периодически проверяются на изменения —
 * калькулятор активной категории пишет их самостоятельно.
 */
export function useEstimateWorkspaceTotalCost(
  categorySlugs: string[]
): EstimateWorkspaceTotalCost | null {
  const [totalCost, setTotalCost] = useState<EstimateWorkspaceTotalCost | null>(null);

  useEffect(() => {
    let disposed = false;
    let lastDraftsKey = '';
    let recomputeGen = 0;

    const readDrafts = (): string[] =>
      categorySlugs.map((slug) => {
        if (!slug) return '';
        try {
          return window.localStorage.getItem(calculatorDraftStorageKey(slug)) ?? '';
        } catch {
          return '';
        }
      });

    const recompute = async () => {
      const drafts = readDrafts();
      const draftsKey = drafts.join('\u0000');
      if (draftsKey === lastDraftsKey) return;
      lastDraftsKey = draftsKey;
      const gen = ++recomputeGen;

      const catalog: Array<{ itemId: string; quantity: number }> = [];
      let customTotal = 0;
      let noMarkupTotal = 0;
      let hasAnyItems = false;
      for (const draft of drafts) {
        if (!draft) continue;
        const customItems = parseEstimateCustomItemsFromDraft(draft);
        const customNoMarkup = parseCustomItemsNoMarkupFromDraft(draft);
        for (const room of parseDraftRooms(draft)) {
          const { catalog: roomCatalog, custom } = splitDraftLineItems(room.items, customItems);
          catalog.push(...roomCatalog);
          const roomCustomTotal = custom.reduce((sum, c) => sum + c.def.price * c.quantity, 0);
          customTotal += roomCustomTotal;
          if (customNoMarkup) noMarkupTotal += roomCustomTotal;
          hasAnyItems = true;
        }
      }
      if (!hasAnyItems) {
        if (!disposed && gen === recomputeGen) setTotalCost(null);
        return;
      }

      let result = customTotal;
      if (catalog.length > 0) {
        try {
          const res = await apiFetch(joinApiPath('service-catalog/calculate'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: catalog }),
          });
          if (!res.ok) return;
          const data = (await res.json()) as { total?: number };
          if (typeof data.total === 'number') result += data.total;
        } catch {
          return;
        }
      }
      if (!disposed && gen === recomputeGen) setTotalCost({ total: result, noMarkupTotal });
    };

    void recompute();
    const timer = window.setInterval(() => void recompute(), POLL_INTERVAL_MS);
    const flushHandler = () => void recompute();
    window.addEventListener('estimate-calculator-flush-draft', flushHandler);

    return () => {
      disposed = true;
      window.clearInterval(timer);
      window.removeEventListener('estimate-calculator-flush-draft', flushHandler);
    };
  }, [categorySlugs]);

  return totalCost;
}

/** Наценка расчёта из поля ввода, % (0 — «наценка объекта» / не задана). */
export function parseAdditionalMarkupPercent(raw: string): number {
  const parsed = Number((raw ?? '').replace(',', '.').trim());
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.min(parsed, 999);
}
