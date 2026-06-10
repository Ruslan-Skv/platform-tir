'use client';

import { useCallback, useEffect, useState } from 'react';

import Link from 'next/link';

import { useAuth } from '@/features/auth';
import {
  getContractDocumentWindowsWorkOrderMarkup,
  putContractDocumentWindowsWorkOrderMarkup,
} from '@/shared/api/admin-contract-document-packages';

import cdBase from '../../../styles/base.module.css';
import cdHub from '../../../styles/contracts-list-hub.module.css';
import cdChrome from '../../../styles/editor-chrome.module.css';
import cdEstimateTab from '../../../styles/estimate-tab.module.css';
import cdWorkspace from '../../../styles/estimates-workspace.module.css';
import cdTemplates from '../../../styles/templates-library.module.css';
import {
  DEFAULT_WINDOWS_WORK_ORDER_MARKUP_PERCENT,
  normalizeWindowsWorkOrderMarkupPercent,
} from '../../families/product-like/print/productWorkOrder';

function formatMarkupPercentInput(value: number): string {
  return String(normalizeWindowsWorkOrderMarkupPercent(value));
}

function parseMarkupPercentInput(raw: string): number | null {
  const trimmed = raw.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null;
  const n = Number.parseFloat(trimmed);
  if (!Number.isFinite(n) || n < 0 || n > 100) return null;
  return Math.trunc(n);
}

export function ContractDocumentsMarkupSettingsPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [markupInput, setMarkupInput] = useState(
    formatMarkupPercentInput(DEFAULT_WINDOWS_WORK_ORDER_MARKUP_PERCENT)
  );
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getContractDocumentWindowsWorkOrderMarkup();
      setMarkupInput(formatMarkupPercentInput(res.windowsWorkOrderMarkupPercent));
      setUpdatedAt(res.updatedAt);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить настройки');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const parsedMarkup = parseMarkupPercentInput(markupInput);

  const handleSave = async () => {
    if (!isSuperAdmin) return;
    if (parsedMarkup === null) {
      setError('Укажите наценку от 0 до 100 % (целое число).');
      return;
    }
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      const res = await putContractDocumentWindowsWorkOrderMarkup({
        windowsWorkOrderMarkupPercent: parsedMarkup,
      });
      setMarkupInput(formatMarkupPercentInput(res.windowsWorkOrderMarkupPercent));
      setUpdatedAt(res.updatedAt);
      setOk(
        `Наценка для заказ-нарядов «Окна» сохранена (${res.windowsWorkOrderMarkupPercent} %). Цена в заказ-наряде = цена в счёт-заказе минус эта доля.`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={cdBase.page}>
      <Link className={cdChrome.backLink} href="/admin/contract-documents">
        ← Оформление договоров
      </Link>
      <h1 className={cdWorkspace.title}>Наценки договоров</h1>
      <p className={cdWorkspace.subtitle}>
        Наценка при расчёте заказ-наряда по договорам «Окна». Сохранять значение может только
        суперадмин; остальные пользователи видят текущий процент.
      </p>

      {error ? <p className={cdTemplates.error}>{error}</p> : null}
      {ok ? <p className={cdTemplates.hint}>{ok}</p> : null}

      <section className={cdHub.packageSettingsCard}>
        <h2 className={cdEstimateTab.sectionTitle}>Окна — заказ-наряд</h2>
        {loading ? (
          <p className={cdTemplates.hint}>Загрузка…</p>
        ) : (
          <>
            <p className={cdTemplates.hint} style={{ marginBottom: 12 }}>
              При формировании заказ-наряда цена каждой позиции считается как цена в счёт-заказе
              минус указанный процент (по умолчанию {DEFAULT_WINDOWS_WORK_ORDER_MARKUP_PERCENT}
              %).
            </p>
            <div className={cdEstimateTab.field}>
              <label htmlFor="windows_work_order_markup_percent">
                Наценка при расчёте заказ-наряда, %
              </label>
              <input
                id="windows_work_order_markup_percent"
                type="text"
                inputMode="numeric"
                value={markupInput}
                disabled={!isSuperAdmin || saving}
                readOnly={!isSuperAdmin}
                autoComplete="off"
                onChange={(e) => setMarkupInput(e.target.value)}
              />
              {updatedAt ? (
                <span className={cdTemplates.hint}>
                  Обновлено: {new Date(updatedAt).toLocaleString('ru-RU')}
                </span>
              ) : null}
            </div>
            {isSuperAdmin ? (
              <div className={cdHub.packageSettingsActions}>
                <button
                  type="button"
                  className={cdWorkspace.primaryBtn}
                  disabled={saving || parsedMarkup === null}
                  onClick={() => void handleSave()}
                >
                  {saving ? 'Сохранение…' : 'Сохранить'}
                </button>
              </div>
            ) : (
              <p className={cdTemplates.hint}>Изменить наценку может только суперадмин.</p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
