'use client';

import { useCallback, useEffect, useState } from 'react';

import Link from 'next/link';

import { useAuth } from '@/features/auth';
import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';
import {
  applyRepairWorkPeriodToAllPackages,
  applyWindowsWorkPeriodToAllPackages,
  getContractDocumentRepairSettings,
  getContractDocumentWindowsSettings,
  putContractDocumentRepairSettings,
  putContractDocumentWindowsSettings,
} from '@/shared/api/admin-contract-document-packages';

import cdBase from '../../../styles/base.module.css';
import cdHub from '../../../styles/contracts-list-hub.module.css';
import cdChrome from '../../../styles/editor-chrome.module.css';
import cdEstimateTab from '../../../styles/estimate-tab.module.css';
import cdWorkspace from '../../../styles/estimates-workspace.module.css';
import cdTemplates from '../../../styles/templates-library.module.css';
import {
  DEFAULT_PACKAGE_CONTRACT_WORK_PERIOD_DAYS,
  DEFAULT_PRODUCT_CONTRACT_WORK_PERIOD_DAYS,
  formatPackageWorkPeriodDays,
  normalizePackageWorkPeriodInput,
  parsePackageWorkPeriodInput,
} from '../../platform/form/contractWorkPeriod';

type WorkPeriodSettingsKind = Extract<ContractDocumentPackageKind, 'REPAIR' | 'WINDOWS'>;

type ApplyWorkPeriodToAllResult = {
  updated: number;
  skippedSigned?: number;
  skippedManual?: number;
};

function formatApplyWorkPeriodResult(res: ApplyWorkPeriodToAllResult, title: string): string {
  const parts = [`Обновлено договоров «${title}»: ${res.updated}.`];
  if ((res.skippedSigned ?? 0) > 0) {
    parts.push(`Пропущено подписанных или отказных: ${res.skippedSigned}.`);
  }
  if ((res.skippedManual ?? 0) > 0) {
    parts.push(`Пропущено с ручным сроком в карточке: ${res.skippedManual}.`);
  }
  return parts.join(' ');
}

const WORK_PERIOD_KIND_CONFIG: Record<
  WorkPeriodSettingsKind,
  {
    title: string;
    inputId: string;
    fallbackDays: number;
    load: () => Promise<{ defaultWorkPeriodDays: number; updatedAt: string | null }>;
    save: (body: { defaultWorkPeriodDays: number }) => Promise<{
      defaultWorkPeriodDays: number;
      updatedAt: string | null;
    }>;
    applyToAll: (body: { workPeriodDays: number }) => Promise<ApplyWorkPeriodToAllResult>;
    applyConfirm: (days: number) => string;
    saveOk: string;
  }
> = {
  REPAIR: {
    title: 'Ремонт',
    inputId: 'package_repair_default_work_period',
    fallbackDays: DEFAULT_PACKAGE_CONTRACT_WORK_PERIOD_DAYS,
    load: getContractDocumentRepairSettings,
    save: putContractDocumentRepairSettings,
    applyToAll: applyRepairWorkPeriodToAllPackages,
    applyConfirm: (days) =>
      `Установить срок ${days} рабочих дней во всех неподписанных договорах «Ремонт» без ручного срока? Подписанные договоры и договоры, где суперадмин задал срок в карточке, не изменятся.`,
    saveOk:
      'Срок по умолчанию для «Ремонт» сохранён. Новые договоры и договоры без ручного срока получат его при открытии (если не задан свой срок).',
  },
  WINDOWS: {
    title: 'Окна',
    inputId: 'package_windows_default_work_period',
    fallbackDays: DEFAULT_PRODUCT_CONTRACT_WORK_PERIOD_DAYS,
    load: getContractDocumentWindowsSettings,
    save: putContractDocumentWindowsSettings,
    applyToAll: applyWindowsWorkPeriodToAllPackages,
    applyConfirm: (days) =>
      `Установить срок ${days} рабочих дней во всех неподписанных договорах «Окна» без ручного срока? Подписанные договоры и договоры, где суперадмин задал срок в карточке, не изменятся.`,
    saveOk:
      'Срок по умолчанию для «Окна» сохранён. Новые договоры и договоры без ручного срока получат его при открытии (если не задан свой срок).',
  },
};

function WorkPeriodSettingsSection({
  kind,
  isSuperAdmin,
  onError,
  onOk,
}: {
  kind: WorkPeriodSettingsKind;
  isSuperAdmin: boolean;
  onError: (message: string | null) => void;
  onOk: (message: string | null) => void;
}) {
  const config = WORK_PERIOD_KIND_CONFIG[kind];
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applyingAll, setApplyingAll] = useState(false);
  const [defaultDaysInput, setDefaultDaysInput] = useState(String(config.fallbackDays));
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    const cfg = WORK_PERIOD_KIND_CONFIG[kind];
    setLoading(true);
    onError(null);
    try {
      const res = await cfg.load();
      setDefaultDaysInput(formatPackageWorkPeriodDays(res.defaultWorkPeriodDays));
      setUpdatedAt(res.updatedAt);
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Не удалось загрузить настройки');
    } finally {
      setLoading(false);
    }
  }, [kind, onError]);

  useEffect(() => {
    void load();
  }, [load]);

  const parsedDefaultDays = parsePackageWorkPeriodInput(defaultDaysInput);

  const handleSaveDefault = async () => {
    if (!isSuperAdmin) return;
    if (parsedDefaultDays === null) {
      onError('Укажите срок от 1 до 3650 рабочих дней (целое число).');
      return;
    }
    setSaving(true);
    onError(null);
    onOk(null);
    try {
      const res = await config.save({ defaultWorkPeriodDays: parsedDefaultDays });
      setDefaultDaysInput(formatPackageWorkPeriodDays(res.defaultWorkPeriodDays));
      setUpdatedAt(res.updatedAt);
      const applyNow = window.confirm(
        `Срок по умолчанию для «${config.title}» сохранён (${parsedDefaultDays} дн.).\n\nПрименить ко всем неподписанным договорам «${config.title}» без ручного срока в карточке?`
      );
      if (applyNow) {
        const applyRes = await config.applyToAll({ workPeriodDays: parsedDefaultDays });
        onOk(`${config.saveOk} ${formatApplyWorkPeriodResult(applyRes, config.title)}`);
      } else {
        onOk(config.saveOk);
      }
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  };

  const handleApplyToAll = async () => {
    if (!isSuperAdmin) return;
    const days = parsedDefaultDays;
    if (days === null) {
      onError('Сначала укажите корректный срок в поле выше.');
      return;
    }
    if (!window.confirm(config.applyConfirm(days))) return;
    setApplyingAll(true);
    onError(null);
    onOk(null);
    try {
      const res = await config.applyToAll({ workPeriodDays: days });
      onOk(formatApplyWorkPeriodResult(res, config.title));
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Не удалось применить ко всем');
    } finally {
      setApplyingAll(false);
    }
  };

  return (
    <section className={cdHub.packageSettingsCard}>
      <h2 className={cdEstimateTab.sectionTitle}>{config.title}</h2>
      {loading ? (
        <p className={cdTemplates.hint}>Загрузка…</p>
      ) : (
        <>
          <div className={cdEstimateTab.field}>
            <label htmlFor={config.inputId}>Срок договора по умолчанию (рабочих дней)</label>
            <input
              id={config.inputId}
              inputMode="numeric"
              value={defaultDaysInput}
              onChange={(e) => setDefaultDaysInput(normalizePackageWorkPeriodInput(e.target.value))}
              disabled={!isSuperAdmin}
              readOnly={!isSuperAdmin}
              autoComplete="off"
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
                disabled={saving || parsedDefaultDays === null}
                onClick={() => void handleSaveDefault()}
              >
                {saving ? 'Сохранение…' : 'Сохранить по умолчанию'}
              </button>
              <button
                type="button"
                className={cdWorkspace.secondaryBtn}
                disabled={applyingAll || parsedDefaultDays === null}
                onClick={() => void handleApplyToAll()}
              >
                {applyingAll ? 'Применение…' : `Применить ко всем договорам «${config.title}»`}
              </button>
            </div>
          ) : (
            <p className={cdTemplates.hint}>
              Изменить срок по умолчанию или применить ко всем договорам может только суперадмин.
            </p>
          )}
        </>
      )}
    </section>
  );
}

export function ContractDocumentsPackageSettingsPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  return (
    <div className={cdBase.page}>
      <Link className={cdChrome.backLink} href="/admin/contract-documents">
        ← Оформление договоров
      </Link>
      <h1 className={cdWorkspace.title}>Сроки договоров</h1>
      <p className={cdWorkspace.subtitle}>
        Срок в рабочих днях подставляется в поле «Срок дог.» на вкладке «Данные» и в шаблон{' '}
        <code>{'{{contract.workPeriod}}'}</code>. Менять срок (здесь, в карточке договора и массово)
        могут только пользователи с ролью суперадмин. После подписания договора срок изменить
        нельзя. До подписания суперадмин может задать срок в карточке (ручной режим) — такие
        договоры не затрагивает массовое обновление.
      </p>

      {error ? <p className={cdTemplates.error}>{error}</p> : null}
      {ok ? <p className={cdTemplates.hint}>{ok}</p> : null}

      <div className={cdHub.contractTermsSettingsStack}>
        <WorkPeriodSettingsSection
          kind="REPAIR"
          isSuperAdmin={isSuperAdmin}
          onError={setError}
          onOk={setOk}
        />
        <WorkPeriodSettingsSection
          kind="WINDOWS"
          isSuperAdmin={isSuperAdmin}
          onError={setError}
          onOk={setOk}
        />
      </div>
    </div>
  );
}
