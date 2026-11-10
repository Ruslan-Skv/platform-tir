'use client';

import { useEffect, useState } from 'react';

import { getContractDocumentRepairSettings } from '@/shared/api/admin-contract-document-packages';
import { AdminSaveNotice } from '@/shared/ui/admin/AdminSaveNotice';
import { PACKAGE_WORK_START_MIN_CONTRACT_PAY_PCT } from '@/views/admin/ContractDocuments/packages/platform/hub/pipeline/packagePipeline';
import {
  saveWorkStartMinPayPct,
  useWorkStartMinPayPct,
} from '@/views/admin/ContractDocuments/packages/platform/settings/workStartMinPayPctStore';

import panelStyles from './SettingsPanels.module.css';

function parsePct(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number.parseInt(t, 10);
  if (!Number.isFinite(n) || n < 1 || n > 100) return null;
  return n;
}

/**
 * Настройка порога оплаты для Акта начала работ по «Ремонту»
 * (активность кнопки «Зафиксировать „В работе“» и статус «В работе»).
 */
export function WorkStartMinPaySettingsPanel() {
  const currentPct = useWorkStartMinPayPct();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successVisible, setSuccessVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getContractDocumentRepairSettings()
      .then((settings) => {
        if (cancelled) return;
        const pct =
          typeof settings.workStartMinPayPercent === 'number'
            ? settings.workStartMinPayPercent
            : PACKAGE_WORK_START_MIN_CONTRACT_PAY_PCT;
        setInput(String(pct));
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Не удалось загрузить настройку');
          setInput(String(currentPct));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // Загружаем один раз при монтировании вкладки.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const parsed = parsePct(input);
  const dirty = parsed !== null && parsed !== currentPct;

  const handleSave = async () => {
    if (parsed === null) {
      setError('Укажите целое число от 1 до 100.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const saved = await saveWorkStartMinPayPct(parsed);
      setInput(String(saved));
      setSuccessVisible(true);
      window.setTimeout(() => setSuccessVisible(false), 2800);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить настройку');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={panelStyles.panelRoot}>
      <div className={panelStyles.panelHead}>
        <div className={panelStyles.panelHeadMain}>
          <span className={panelStyles.panelCount}>
            Сейчас: {currentPct}% (по умолчанию {PACKAGE_WORK_START_MIN_CONTRACT_PAY_PCT}%)
          </span>
          <AdminSaveNotice visible={successVisible}>Порог сохранён</AdminSaveNotice>
        </div>
      </div>

      {error ? <p className={panelStyles.panelError}>{error}</p> : null}

      <div className={panelStyles.panelFieldGrid}>
        <label htmlFor="contract_work_start_min_pay_pct">
          Минимальная оплата для Акта начала работ, %
        </label>
        <input
          id="contract_work_start_min_pay_pct"
          className={panelStyles.panelInput}
          type="number"
          min={1}
          max={100}
          step={1}
          inputMode="numeric"
          value={input}
          disabled={loading || saving}
          autoComplete="off"
          onChange={(e) => {
            setError(null);
            setInput(e.target.value);
          }}
        />
      </div>

      <p className={panelStyles.panelHint}>
        По договорам «Ремонта»: кнопка «Зафиксировать „В работе“» (прикрепление подписанного Акта
        начала работ) и статус «В работе» доступны, когда оплата по журналу достигает этого порога
        от суммы договора. На продуктовые направления (окна, двери, жалюзи, потолки) настройка не
        влияет — у них предоплата фиксирована на {PACKAGE_WORK_START_MIN_CONTRACT_PAY_PCT}%.
      </p>

      <div className={panelStyles.panelActions}>
        <button
          data-admin-mutation
          type="button"
          className={panelStyles.panelPrimaryBtn}
          disabled={saving || loading || !dirty}
          onClick={() => void handleSave()}
        >
          {saving ? 'Сохранение…' : 'Сохранить'}
        </button>
      </div>
    </div>
  );
}
