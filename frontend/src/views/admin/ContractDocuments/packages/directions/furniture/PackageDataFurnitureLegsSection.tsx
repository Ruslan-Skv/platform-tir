'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  type ContractDocumentPackageKind,
  type ContractNumberPreview,
  previewContractDocumentNumber,
} from '@/shared/api/admin-contract-document-packages';

import type { PackageDataTabProps } from '../../platform/editor/dataTab/PackageDataTab';
import {
  DATA_AUTO_FILLED,
  DATA_FIELD,
  DATA_SECTION_CARD,
  DATA_SECTION_TITLE,
} from '../../platform/editor/dataTab/packageDataTabStyles';
import {
  emptyExecutorRequisites,
  executorRequisitesFromProfile,
} from '../../platform/form/packageEditorProfileFields';
import type { PackageFormData } from '../../platform/form/packageForm';
import styles from './PackageDataFurnitureLegsSection.module.css';
import {
  FURNITURE_LEG_LABEL,
  FURNITURE_LEG_NUMBER_LETTER,
  type FurniturePackageLegId,
} from './furnitureLegs';

type Props = Pick<
  PackageDataTabProps,
  | 'form'
  | 'contractAndEstimateLocked'
  | 'packageKind'
  | 'executorProfiles'
  | 'updateContract'
  | 'applyExecutorProfile'
> & {
  setForm: React.Dispatch<React.SetStateAction<PackageFormData>>;
  touchPackageData: () => void;
};

const OPTIONAL_LEGS = ['montage', 'appliances'] as const;

function FurnitureLegNumberControl({
  legId,
  form,
  packageKind,
  locked,
  numberValue,
  onNumberChange,
}: {
  legId: FurniturePackageLegId;
  form: PackageFormData;
  packageKind: ContractDocumentPackageKind;
  locked: boolean;
  numberValue: string;
  onNumberChange: (value: string) => void;
}) {
  const letter = FURNITURE_LEG_NUMBER_LETTER[legId];
  const managerUserId = form.executor.signatoryCrmUserId?.trim() || '';
  const officeId = form.contract.officeId?.trim() || '';
  const surveyorUserId = form.contract.surveyorUserId?.trim() || '';
  const [preview, setPreview] = useState<ContractNumberPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [custom, setCustom] = useState(Boolean(numberValue));

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
        numberLetterOverride: letter,
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
  }, [canPreview, managerUserId, surveyorUserId, officeId, packageKind, letter]);

  useEffect(() => {
    if (locked) return;
    const t = window.setTimeout(() => {
      void refreshPreview();
    }, 200);
    return () => window.clearTimeout(t);
  }, [locked, refreshPreview]);

  const applyRecommended = () => {
    if (!preview?.recommendedNumber) return;
    setCustom(false);
    onNumberChange(preview.recommendedNumber);
  };

  const inputId = `furniture_leg_number_${legId}`;

  return (
    <div className={styles.numberBlock}>
      <div className={DATA_FIELD}>
        <label htmlFor={inputId}>Номер ({letter})</label>
        {locked ? (
          <input id={inputId} value={numberValue} readOnly disabled className={DATA_AUTO_FILLED} />
        ) : (
          <>
            <div className={styles.numberRow}>
              <select
                value={
                  custom
                    ? '__custom__'
                    : preview?.recommendedNumber && numberValue === preview.recommendedNumber
                      ? preview.recommendedNumber
                      : numberValue && preview?.recommendedNumber !== numberValue
                        ? '__custom__'
                        : (preview?.recommendedNumber ?? '')
                }
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === '__custom__') {
                    setCustom(true);
                    return;
                  }
                  if (v && v === preview?.recommendedNumber) {
                    applyRecommended();
                    return;
                  }
                  if (v) {
                    setCustom(false);
                    onNumberChange(v);
                  }
                }}
                disabled={previewLoading}
              >
                <option value="">
                  {previewLoading
                    ? 'Загрузка…'
                    : preview?.recommendedNumber
                      ? `Рекомендуемый: ${preview.recommendedNumber}`
                      : '— Нет рекомендации —'}
                </option>
                {preview?.recommendedNumber ? (
                  <option value={preview.recommendedNumber}>{preview.recommendedNumber}</option>
                ) : null}
                <option value="__custom__">Свой номер…</option>
              </select>
              {custom ? (
                <input
                  id={inputId}
                  value={numberValue}
                  onChange={(e) => {
                    setCustom(true);
                    onNumberChange(e.target.value);
                  }}
                  autoComplete="off"
                  placeholder="Введите номер"
                />
              ) : null}
            </div>
            {previewError ? <p className={styles.hintError}>{previewError}</p> : null}
          </>
        )}
      </div>
    </div>
  );
}

export function PackageDataFurnitureLegsSection({
  form,
  contractAndEstimateLocked,
  packageKind,
  executorProfiles,
  updateContract,
  applyExecutorProfile,
  setForm,
  touchPackageData,
}: Props) {
  const locked = contractAndEstimateLocked;

  const patchLeg = useCallback(
    (legId: FurniturePackageLegId, patch: Partial<PackageFormData['furniture']['manufacture']>) => {
      setForm((prev) => {
        const prevLeg = prev.furniture[legId];
        const nextLeg = { ...prevLeg, ...patch };
        const nextFurniture = { ...prev.furniture, [legId]: nextLeg };
        let next = { ...prev, furniture: nextFurniture };
        if (legId === 'manufacture') {
          if (patch.contract && typeof patch.contract.number === 'string') {
            next = {
              ...next,
              contract: { ...next.contract, number: patch.contract.number },
            };
          }
          if (patch.executor) {
            next = {
              ...next,
              executor: {
                ...next.executor,
                ...patch.executor,
              },
            };
          }
        }
        return next;
      });
      touchPackageData();
    },
    [setForm, touchPackageData]
  );

  const setLegEnabled = useCallback(
    (legId: 'montage' | 'appliances', enabled: boolean) => {
      setForm((prev) => ({
        ...prev,
        furniture: {
          ...prev.furniture,
          [legId]: { ...prev.furniture[legId], enabled },
          activeDocLeg:
            !enabled && prev.furniture.activeDocLeg === legId
              ? 'manufacture'
              : prev.furniture.activeDocLeg,
        },
      }));
      touchPackageData();
    },
    [setForm, touchPackageData]
  );

  const applyLegExecutor = useCallback(
    (legId: FurniturePackageLegId, title: string) => {
      if (locked) return;
      if (legId === 'manufacture') {
        applyExecutorProfile(title);
        setForm((prev) => {
          const profile = executorProfiles.find((it) => it.title === title);
          const executor = profile
            ? {
                selectedProfileTitle: title,
                ...executorRequisitesFromProfile(profile),
              }
            : {
                selectedProfileTitle: '',
                ...emptyExecutorRequisites(),
              };
          return {
            ...prev,
            furniture: {
              ...prev.furniture,
              manufacture: {
                ...prev.furniture.manufacture,
                executor,
              },
            },
          };
        });
        touchPackageData();
        return;
      }
      const profile = executorProfiles.find((it) => it.title === title);
      const executor = profile
        ? {
            selectedProfileTitle: title,
            ...executorRequisitesFromProfile(profile),
          }
        : {
            selectedProfileTitle: '',
            ...emptyExecutorRequisites(),
          };
      patchLeg(legId, { executor });
    },
    [applyExecutorProfile, executorProfiles, locked, patchLeg, setForm, touchPackageData]
  );

  /** Синхронизация шапочного номера → нога изготовления. */
  useEffect(() => {
    const header = form.contract.number;
    if (form.furniture.manufacture.contract.number === header) return;
    setForm((prev) => {
      if (prev.furniture.manufacture.contract.number === prev.contract.number) return prev;
      return {
        ...prev,
        furniture: {
          ...prev.furniture,
          manufacture: {
            ...prev.furniture.manufacture,
            contract: {
              ...prev.furniture.manufacture.contract,
              number: prev.contract.number,
            },
          },
        },
      };
    });
  }, [form.contract.number, form.furniture.manufacture.contract.number, setForm]);

  /** Синхронизация шапочного исполнителя → нога изготовления. */
  useEffect(() => {
    const title = form.executor.selectedProfileTitle;
    if (form.furniture.manufacture.executor.selectedProfileTitle === title) return;
    setForm((prev) => {
      if (
        prev.furniture.manufacture.executor.selectedProfileTitle ===
        prev.executor.selectedProfileTitle
      ) {
        return prev;
      }
      return {
        ...prev,
        furniture: {
          ...prev.furniture,
          manufacture: {
            ...prev.furniture.manufacture,
            executor: {
              selectedProfileTitle: prev.executor.selectedProfileTitle,
              executorKind: prev.executor.executorKind,
              companyName: prev.executor.companyName,
              inn: prev.executor.inn,
              kpp: prev.executor.kpp,
              ogrn: prev.executor.ogrn,
              ogrnip: prev.executor.ogrnip,
              legalAddress: prev.executor.legalAddress,
              actualAddress: prev.executor.actualAddress,
              bankDetails: prev.executor.bankDetails,
              bankName: prev.executor.bankName,
              bankBik: prev.executor.bankBik,
              bankCorrAccount: prev.executor.bankCorrAccount,
              bankSettlementAccount: prev.executor.bankSettlementAccount,
              email: prev.executor.email,
            },
          },
        },
      };
    });
  }, [form.executor, form.furniture.manufacture.executor.selectedProfileTitle, setForm]);

  const disabledOptionalHint = useMemo(() => 'Включите договор, если он нужен в этом пакете', []);

  return (
    <div className={`${DATA_SECTION_CARD} ${styles.wrap}`}>
      <h3 className={DATA_SECTION_TITLE}>Договоры пакета «Мебель»</h3>
      <p className={styles.lead}>
        Изготовление оформляется всегда. Монтаж и технику подключайте только при необходимости — у
        каждой ноги свой исполнитель и номер (м / с / т).
      </p>

      <section className={styles.legCard} aria-label={FURNITURE_LEG_LABEL.manufacture}>
        <header className={styles.legHeader}>
          <h4 className={styles.legTitle}>{FURNITURE_LEG_LABEL.manufacture}</h4>
          <span className={styles.legBadge}>
            обязательно · {FURNITURE_LEG_NUMBER_LETTER.manufacture}
          </span>
        </header>
        <div className={styles.legGrid}>
          <div className={DATA_FIELD}>
            <label htmlFor="furniture_manufacture_executor">Исполнитель</label>
            <select
              id="furniture_manufacture_executor"
              value={form.furniture.manufacture.executor.selectedProfileTitle}
              onChange={(e) => applyLegExecutor('manufacture', e.target.value)}
              disabled={locked}
              className={locked ? DATA_AUTO_FILLED : undefined}
            >
              <option value="">— выбрать набор —</option>
              {executorProfiles.map((profile) => (
                <option key={profile.title} value={profile.title}>
                  {profile.title}
                </option>
              ))}
            </select>
          </div>
          <FurnitureLegNumberControl
            legId="manufacture"
            form={form}
            packageKind={packageKind}
            locked={locked}
            numberValue={form.furniture.manufacture.contract.number || form.contract.number}
            onNumberChange={(value) => {
              updateContract('number', value);
              patchLeg('manufacture', {
                contract: { ...form.furniture.manufacture.contract, number: value },
              });
            }}
          />
        </div>
      </section>

      {OPTIONAL_LEGS.map((legId) => {
        const leg = form.furniture[legId];
        return (
          <section key={legId} className={styles.legCard} aria-label={FURNITURE_LEG_LABEL[legId]}>
            <header className={styles.legHeader}>
              <h4 className={styles.legTitle}>{FURNITURE_LEG_LABEL[legId]}</h4>
              <label className={styles.enableLabel}>
                <input
                  type="checkbox"
                  checked={leg.enabled}
                  onChange={(e) => setLegEnabled(legId, e.target.checked)}
                  disabled={locked}
                />
                Включить в пакет
              </label>
            </header>
            {!leg.enabled ? (
              <p className={styles.disabledHint}>{disabledOptionalHint}</p>
            ) : (
              <div className={styles.legGrid}>
                <div className={DATA_FIELD}>
                  <label htmlFor={`furniture_${legId}_executor`}>Исполнитель</label>
                  <select
                    id={`furniture_${legId}_executor`}
                    value={leg.executor.selectedProfileTitle}
                    onChange={(e) => applyLegExecutor(legId, e.target.value)}
                    disabled={locked}
                    className={locked ? DATA_AUTO_FILLED : undefined}
                  >
                    <option value="">— выбрать набор —</option>
                    {executorProfiles.map((profile) => (
                      <option key={profile.title} value={profile.title}>
                        {profile.title}
                      </option>
                    ))}
                  </select>
                </div>
                <FurnitureLegNumberControl
                  legId={legId}
                  form={form}
                  packageKind={packageKind}
                  locked={locked}
                  numberValue={leg.contract.number}
                  onNumberChange={(value) =>
                    patchLeg(legId, {
                      contract: { ...leg.contract, number: value },
                    })
                  }
                />
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
