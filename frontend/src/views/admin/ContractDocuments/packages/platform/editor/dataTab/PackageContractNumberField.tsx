'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import Link from 'next/link';

import { useWorkDay } from '@/features/admin/work-day';
import {
  type ContractDocumentPackageKind,
  type ContractNumberPreview,
  allocateContractDocumentNumber,
  previewContractDocumentNumber,
} from '@/shared/api/admin-contract-document-packages';
import { type CrmUser, type Office, getCrmUsers, getOffices } from '@/shared/api/admin-crm';

import cdDataTab from '../../../../styles/data-tab.module.css';
import type { PackageFormData } from '../../form/packageForm';
import styles from './PackageContractNumberField.module.css';
import { DATA_AUTO_FILLED, DATA_FIELD } from './packageDataTabStyles';

const CUSTOM_VALUE = '__custom__';

type PackageContractNumberFieldProps = {
  form: PackageFormData;
  packageKind: ContractDocumentPackageKind;
  locked: boolean;
  fieldClassName?: string;
  updateContract: (key: keyof PackageFormData['contract'], value: string) => void;
  /** Только офис и замерщик (номер выдаётся в другом блоке, напр. ноги «Мебель»). */
  omitNumberField?: boolean;
};

function formatCrmUserLabel(u: CrmUser): string {
  const name = [u.lastName, u.firstName].filter(Boolean).join(' ').trim();
  const code = u.employeeCode?.trim();
  const base = name || u.email;
  return code ? `${base} (${code})` : base;
}

function shortenNumberingHint(message: string): string {
  const m = message.trim();
  if (m.length <= 90) return m;
  return `${m.slice(0, 87).trimEnd()}…`;
}

export function PackageContractNumberField({
  form,
  packageKind,
  locked,
  fieldClassName,
  updateContract,
  omitNumberField = false,
}: PackageContractNumberFieldProps) {
  const { status: workDayStatus } = useWorkDay();
  const [offices, setOffices] = useState<Office[]>([]);
  const [crmUsers, setCrmUsers] = useState<CrmUser[]>([]);
  const [preview, setPreview] = useState<ContractNumberPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [allocating, setAllocating] = useState(false);
  const [numberMode, setNumberMode] = useState<'recommended' | 'custom'>(
    form.contract.number ? 'custom' : 'recommended'
  );

  const managerUserId = form.executor.signatoryCrmUserId?.trim() || '';
  const officeId = form.contract.officeId?.trim() || '';
  const surveyorUserId = form.contract.surveyorUserId?.trim() || '';

  const openWorkDayOfficeId =
    workDayStatus?.todayWorkDay?.status === 'OPEN'
      ? (workDayStatus.todayWorkDay.officeId ?? workDayStatus.todayWorkDay.office?.id ?? '')
      : '';

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [officeList, users] = await Promise.all([
        getOffices().catch(() => [] as Office[]),
        getCrmUsers().catch(() => [] as CrmUser[]),
      ]);
      if (cancelled) return;
      setOffices(officeList.filter((o) => o.isActive !== false));
      setCrmUsers(users);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (locked) return;
    if (!form.contract.officeId && openWorkDayOfficeId) {
      updateContract('officeId', openWorkDayOfficeId);
    }
  }, [locked, form.contract.officeId, openWorkDayOfficeId, updateContract]);

  const canPreview = Boolean(managerUserId && surveyorUserId && officeId && packageKind);

  const refreshPreview = useCallback(async () => {
    if (!canPreview) {
      setPreview(null);
      setPreviewError(
        !managerUserId
          ? 'Выберите карточку менеджера'
          : !officeId
            ? 'Выберите офис заключения'
            : !surveyorUserId
              ? 'Выберите замерщика'
              : null
      );
      return;
    }
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const result = await previewContractDocumentNumber({
        managerUserId,
        surveyorUserId,
        officeId,
        kind: packageKind,
      });
      if (!result.ok || !result.recommendedNumber) {
        setPreview(null);
        setPreviewError(result.error || 'Не удалось получить номер');
        return;
      }
      setPreview(result);
    } catch (e) {
      setPreview(null);
      setPreviewError(e instanceof Error ? e.message : 'Не удалось получить номер');
    } finally {
      setPreviewLoading(false);
    }
  }, [canPreview, managerUserId, surveyorUserId, officeId, packageKind]);

  useEffect(() => {
    if (locked) return;
    const t = window.setTimeout(() => {
      void refreshPreview();
    }, 200);
    return () => window.clearTimeout(t);
  }, [locked, refreshPreview]);

  const selectValue = useMemo(() => {
    if (numberMode === 'custom') return CUSTOM_VALUE;
    if (preview?.recommendedNumber && form.contract.number === preview.recommendedNumber) {
      return preview.recommendedNumber;
    }
    if (form.contract.number && preview?.recommendedNumber !== form.contract.number) {
      return CUSTOM_VALUE;
    }
    return preview?.recommendedNumber ?? '';
  }, [numberMode, form.contract.number, preview]);

  const applyRecommended = async () => {
    if (!canPreview) return;
    setAllocating(true);
    setPreviewError(null);
    try {
      const allocated = await allocateContractDocumentNumber({
        managerUserId,
        surveyorUserId,
        officeId,
        kind: packageKind,
      });
      if (!allocated.ok || !allocated.recommendedNumber) {
        setPreviewError(allocated.error || 'Не удалось выдать номер');
        return;
      }
      setPreview(allocated);
      setNumberMode('recommended');
      updateContract('number', allocated.recommendedNumber);
    } catch (e) {
      setPreviewError(e instanceof Error ? e.message : 'Не удалось выдать номер');
    } finally {
      setAllocating(false);
    }
  };

  const onSelectChange = (value: string) => {
    if (value === CUSTOM_VALUE) {
      setNumberMode('custom');
      return;
    }
    if (value && value === preview?.recommendedNumber) {
      void applyRecommended();
      return;
    }
    if (value) {
      setNumberMode('recommended');
      updateContract('number', value);
    }
  };

  const usersWithCode = useMemo(
    () => crmUsers.filter((u) => Boolean(u.employeeCode?.trim())),
    [crmUsers]
  );

  const isBlockingError = Boolean(previewError && canPreview);
  const hintText = previewError && !locked ? previewError : null;

  return (
    <div className={styles.wrap}>
      <div className={`${cdDataTab.contractInlineRow} ${styles.numberingRow}`}>
        <div className={`${DATA_FIELD} ${cdDataTab.contractInlineField}`}>
          <label htmlFor="contract_office">Офис закл.</label>
          <select
            id="contract_office"
            value={officeId}
            onChange={(e) => updateContract('officeId', e.target.value)}
            disabled={locked}
            className={locked ? DATA_AUTO_FILLED : fieldClassName}
          >
            <option value="">— Офис —</option>
            {offices.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
                {o.prefix ? ` (${o.prefix})` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className={`${DATA_FIELD} ${cdDataTab.contractInlineField}`}>
          <label htmlFor="contract_surveyor">Замерщик</label>
          <select
            id="contract_surveyor"
            value={surveyorUserId}
            onChange={(e) => updateContract('surveyorUserId', e.target.value)}
            disabled={locked}
            className={locked ? DATA_AUTO_FILLED : fieldClassName}
          >
            <option value="">— Замерщик —</option>
            {(usersWithCode.length > 0 ? usersWithCode : crmUsers).map((u) => (
              <option key={u.id} value={u.id}>
                {formatCrmUserLabel(u)}
              </option>
            ))}
          </select>
        </div>
        {omitNumberField ? null : (
          <div className={`${DATA_FIELD} ${cdDataTab.contractInlineField}`}>
            <label htmlFor="cn">Номер дог.</label>
            {locked ? (
              <input
                id="cn"
                value={form.contract.number}
                readOnly
                disabled
                className={DATA_AUTO_FILLED}
              />
            ) : (
              <>
                <select
                  id="cn"
                  value={selectValue}
                  onChange={(e) => onSelectChange(e.target.value)}
                  disabled={allocating || previewLoading}
                  className={fieldClassName}
                  title={hintText ?? undefined}
                  aria-invalid={isBlockingError || undefined}
                >
                  <option value="">
                    {previewLoading
                      ? 'Загрузка…'
                      : preview?.recommendedNumber
                        ? `Рекомендуемый: ${preview.recommendedNumber}`
                        : '— Нет рекомендации —'}
                  </option>
                  {preview?.recommendedNumber ? (
                    <option value={preview.recommendedNumber}>
                      {preview.recommendedNumber} (выдать)
                    </option>
                  ) : null}
                  <option value={CUSTOM_VALUE}>Свой номер…</option>
                </select>
                {numberMode === 'custom' || selectValue === CUSTOM_VALUE ? (
                  <input
                    value={form.contract.number}
                    onChange={(e) => {
                      setNumberMode('custom');
                      updateContract('number', e.target.value);
                    }}
                    autoComplete="off"
                    placeholder="Введите номер"
                    className={`${fieldClassName ?? ''} ${styles.customNumberInput}`.trim()}
                  />
                ) : null}
              </>
            )}
          </div>
        )}
      </div>

      {!omitNumberField && hintText ? (
        <div
          className={isBlockingError ? styles.hintError : styles.hintMuted}
          title={hintText}
          role="status"
        >
          <span className={styles.hintText}>{shortenNumberingHint(hintText)}</span>
          {isBlockingError ? (
            <Link className={styles.hintLink} href="/admin/contract-documents/settings/numbering">
              Настроить
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
