'use client';

import { useCallback, useEffect, useState } from 'react';

import Link from 'next/link';

import { useAuth } from '@/features/auth';
import {
  applyRepairWorkPeriodToAllPackages,
  getContractDocumentRepairSettings,
  putContractDocumentRepairSettings,
} from '@/shared/api/admin-contract-document-packages';

import styles from './ContractDocuments.module.css';
import {
  DEFAULT_REPAIR_CONTRACT_WORK_PERIOD_DAYS,
  formatRepairWorkPeriodDays,
  normalizeRepairWorkPeriodInput,
  parseRepairWorkPeriodInput,
} from './repair/repairContractWorkPeriod';

export function ContractDocumentsRepairSettingsPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applyingAll, setApplyingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [defaultDaysInput, setDefaultDaysInput] = useState(
    String(DEFAULT_REPAIR_CONTRACT_WORK_PERIOD_DAYS)
  );
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getContractDocumentRepairSettings();
      setDefaultDaysInput(formatRepairWorkPeriodDays(res.defaultWorkPeriodDays));
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

  const parsedDefaultDays = parseRepairWorkPeriodInput(defaultDaysInput);

  const handleSaveDefault = async () => {
    if (!isSuperAdmin) return;
    if (parsedDefaultDays === null) {
      setError('Укажите срок от 1 до 3650 календарных дней (целое число).');
      return;
    }
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      const res = await putContractDocumentRepairSettings({
        defaultWorkPeriodDays: parsedDefaultDays,
      });
      setDefaultDaysInput(formatRepairWorkPeriodDays(res.defaultWorkPeriodDays));
      setUpdatedAt(res.updatedAt);
      setOk('Срок по умолчанию сохранён. Новые договоры получат это значение.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  };

  const handleApplyToAll = async () => {
    if (!isSuperAdmin) return;
    const days = parsedDefaultDays;
    if (days === null) {
      setError('Сначала укажите корректный срок в поле выше.');
      return;
    }
    const confirmed = window.confirm(
      `Установить срок ${days} календарных дней во всех договорах ремонта (вкладка «Данные»)? Это перезапишет поле «Срок дог.» у каждого пакета.`
    );
    if (!confirmed) return;
    setApplyingAll(true);
    setError(null);
    setOk(null);
    try {
      const res = await applyRepairWorkPeriodToAllPackages({ workPeriodDays: days });
      setOk(`Срок обновлён в ${res.updated} договор(ах).`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось применить ко всем');
    } finally {
      setApplyingAll(false);
    }
  };

  return (
    <div className={styles.page}>
      <Link className={styles.backLink} href="/admin/contract-documents">
        ← Оформление договоров
      </Link>
      <h1 className={styles.title}>Настройки договоров «Ремонт»</h1>
      <p className={styles.subtitle}>
        Срок договора в календарных днях подставляется в поле «Срок дог.» и в шаблон{' '}
        <code>{'{{contract.workPeriod}}'}</code>. Менеджеры не редактируют срок в карточке договора
        — только суперадмин задаёт значение по умолчанию здесь или в конкретном договоре.
      </p>

      {error ? <p className={styles.error}>{error}</p> : null}
      {ok ? <p className={styles.hint}>{ok}</p> : null}

      {loading ? (
        <p className={styles.hint}>Загрузка…</p>
      ) : (
        <section className={styles.repairSettingsCard}>
          <div className={styles.field}>
            <label htmlFor="repair_default_work_period">Срок договора по умолчанию (дней)</label>
            <input
              id="repair_default_work_period"
              inputMode="numeric"
              value={defaultDaysInput}
              onChange={(e) => setDefaultDaysInput(normalizeRepairWorkPeriodInput(e.target.value))}
              disabled={!isSuperAdmin}
              readOnly={!isSuperAdmin}
              autoComplete="off"
            />
            {updatedAt ? (
              <span className={styles.hint}>
                Обновлено: {new Date(updatedAt).toLocaleString('ru-RU')}
              </span>
            ) : null}
          </div>

          {isSuperAdmin ? (
            <div className={styles.repairSettingsActions}>
              <button
                type="button"
                className={styles.primaryBtn}
                disabled={saving || parsedDefaultDays === null}
                onClick={() => void handleSaveDefault()}
              >
                {saving ? 'Сохранение…' : 'Сохранить по умолчанию'}
              </button>
              <button
                type="button"
                className={styles.secondaryBtn}
                disabled={applyingAll || parsedDefaultDays === null}
                onClick={() => void handleApplyToAll()}
              >
                {applyingAll ? 'Применение…' : 'Применить ко всем договорам ремонта'}
              </button>
            </div>
          ) : (
            <p className={styles.hint}>
              Изменить срок по умолчанию или применить ко всем договорам может только суперадмин.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
