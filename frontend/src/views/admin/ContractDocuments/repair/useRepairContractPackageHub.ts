'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  type ContractDocumentPackageKind,
  type ContractDocumentPackagePayment,
  type ContractDocumentPackageStatus,
  type ContractTemplatePreset,
  getContractDocumentPackage,
  getContractDocumentPackagePayments,
  getContractDocumentTemplatePresets,
  updateContractDocumentPackage,
  uploadRepairPackageContractCloseActPhoto,
  uploadRepairPackageWorkStartActPhoto,
} from '@/shared/api/admin-contract-document-packages';
import { publicUploadUrl } from '@/shared/lib/public-upload-url';

import { parseLinkedCrmCustomerIdFromFormData } from './crmManagerQuestionnaire1';
import {
  type BuildPersistedFormDataOptions,
  type RepairDocumentTemplateTabId,
  buildPersistedFormData,
  mergeFormDataFromStorage,
} from './formDataTemplateStorage';
import { getRepairContractNumberDisplayForForm } from './packageContractDisplay';
import { REPAIR_CASH_ORDER_TEMPLATE_TAB } from './repairActTwinCopiesOnOnePageHtml';
import {
  type RepairCashOrderConductDraft,
  buildRepairCashOrderPrintHtml,
  printRepairCashOrder,
} from './repairCashOrderPrint';
import { CONTRACT_SIGNED_REVERT_WINDOW_MS } from './repairContractPackageHubConstants';
import {
  formatContractConcludedDateForHeader,
  formatRepairPipelineActDate,
  isWithinMsSinceIso,
} from './repairContractPackageHubUtils';
import {
  REPAIR_WORK_START_MIN_CONTRACT_PAY_PCT,
  computeRepairPipelineModel,
  inferWindowsPrepayment70StartDate,
} from './repairContractPipeline';
import {
  type RepairPackageFormData,
  clampRepairAddendumSlotCount,
  mergeRepairPackageFormData,
} from './repairPackageForm';
import { createPackageJournalScheduler } from './repairPackageJournalSchedule';
import { computePackagePayableBreakdown } from './repairPackagePaymentTotals';
import { resolveRepairTemplateHtml } from './resolveRepairTemplateHtml';

export type UseRepairContractPackageHubOptions = {
  packageId: string;
  isOpen: boolean;
  onUpdated?: () => void;
  /** Актуальная форма из страницы редактора (если пакет открыт в редакторе). */
  getLiveForm?: () => RepairPackageFormData;
  getLivePersistOptions?: () => BuildPersistedFormDataOptions;
};

export function useRepairContractPackageHub({
  packageId,
  isOpen,
  onUpdated,
  getLiveForm,
  getLivePersistOptions,
}: UseRepairContractPackageHubOptions) {
  const [loading, setLoading] = useState(false);
  const [contentReady, setContentReady] = useState(false);
  const hubContentReadyRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<RepairPackageFormData>(() => mergeRepairPackageFormData({}));
  const [packageKind, setPackageKind] = useState<ContractDocumentPackageKind>('REPAIR');
  const [packageFlowStatus, setPackageFlowStatus] =
    useState<ContractDocumentPackageStatus>('IN_PROGRESS');
  const [paymentRows, setPaymentRows] = useState<ContractDocumentPackagePayment[]>([]);
  const [savingPackageStatus, setSavingPackageStatus] = useState(false);
  const [undoUiTick, setUndoUiTick] = useState(0);

  const formRef = useRef(form);
  formRef.current = form;
  const packageFlowStatusRef = useRef(packageFlowStatus);
  packageFlowStatusRef.current = packageFlowStatus;
  const templateOverridesRef = useRef<Partial<Record<RepairDocumentTemplateTabId, string>>>({});
  const selectedTemplateIdsRef = useRef<Partial<Record<RepairDocumentTemplateTabId, string>>>({});
  const draftTitleRef = useRef<string | null>(null);
  const linkedCrmCustomerIdRef = useRef<string | null>(null);
  const getLiveFormRef = useRef(getLiveForm);
  const getLivePersistOptionsRef = useRef(getLivePersistOptions);
  getLiveFormRef.current = getLiveForm;
  getLivePersistOptionsRef.current = getLivePersistOptions;
  const packageJournalSchedulerRef = useRef<ReturnType<
    typeof createPackageJournalScheduler
  > | null>(null);

  useEffect(() => {
    hubContentReadyRef.current = false;
    setContentReady(false);
  }, [packageId]);

  const hubFormBase = useCallback((): RepairPackageFormData => {
    return getLiveFormRef.current?.() ?? formRef.current;
  }, []);

  const buildHubPersistedFormData = useCallback((nextForm: RepairPackageFormData) => {
    const persistOptions =
      getLivePersistOptionsRef.current?.() ??
      (linkedCrmCustomerIdRef.current
        ? { linkedCrmCustomerId: linkedCrmCustomerIdRef.current }
        : undefined);
    return buildPersistedFormData(
      nextForm,
      templateOverridesRef.current,
      selectedTemplateIdsRef.current,
      persistOptions
    );
  }, []);

  const [workStartModalOpen, setWorkStartModalOpen] = useState(false);
  const [workStartModalDate, setWorkStartModalDate] = useState('');
  const [workStartModalFile, setWorkStartModalFile] = useState<File | null>(null);
  const [workStartModalBusy, setWorkStartModalBusy] = useState(false);
  const [workStartModalError, setWorkStartModalError] = useState<string | null>(null);

  const [contractCloseModalOpen, setContractCloseModalOpen] = useState(false);
  const [contractCloseModalDate, setContractCloseModalDate] = useState('');
  const [contractCloseModalFile, setContractCloseModalFile] = useState<File | null>(null);
  const [contractCloseModalBusy, setContractCloseModalBusy] = useState(false);
  const [contractCloseModalError, setContractCloseModalError] = useState<string | null>(null);

  const [repairActPhotosModalOpen, setRepairActPhotosModalOpen] = useState(false);
  const [refusalModalOpen, setRefusalModalOpen] = useState(false);
  const [refusalReasonDraft, setRefusalReasonDraft] = useState('');
  const [refusalModalBusy, setRefusalModalBusy] = useState(false);
  const [refusalModalError, setRefusalModalError] = useState<string | null>(null);
  const [revertRefusalConfirmOpen, setRevertRefusalConfirmOpen] = useState(false);
  const [contractTemplatePresets, setContractTemplatePresets] = useState<ContractTemplatePreset[]>(
    []
  );

  const persistForm = useCallback(
    async (
      nextForm: RepairPackageFormData,
      opts?: { status?: ContractDocumentPackageStatus; recordVersion?: boolean }
    ) => {
      const formData = buildHubPersistedFormData(nextForm);
      const recordVersion = opts?.recordVersion === true;
      await updateContractDocumentPackage(packageId, {
        status: opts?.status,
        formData,
        recordVersion,
      });
      if (recordVersion) {
        packageJournalSchedulerRef.current?.acknowledgeImmediateVersion();
      } else {
        packageJournalSchedulerRef.current?.schedule();
      }
      setForm(nextForm);
      formRef.current = nextForm;
    },
    [packageId, buildHubPersistedFormData]
  );

  useEffect(() => {
    if (!isOpen || !packageId) return;
    packageJournalSchedulerRef.current = createPackageJournalScheduler({
      packageId,
      getPayload: () => ({
        title: draftTitleRef.current,
        formData: buildHubPersistedFormData(formRef.current),
        status: packageFlowStatusRef.current,
      }),
    });
    return () => {
      packageJournalSchedulerRef.current?.dispose();
      packageJournalSchedulerRef.current = null;
    };
  }, [isOpen, packageId]);

  const loadHub = useCallback(async () => {
    const background = hubContentReadyRef.current;
    if (!background) setLoading(true);
    setError(null);
    try {
      const row = await getContractDocumentPackage(packageId);
      const presetsKind = row.kind === 'WINDOWS' ? 'WINDOWS' : 'REPAIR';
      const [paymentsRes, presetsRes] = await Promise.all([
        getContractDocumentPackagePayments(packageId).catch(
          () => [] as ContractDocumentPackagePayment[]
        ),
        getContractDocumentTemplatePresets(presetsKind).catch(() => ({
          items: [] as ContractTemplatePreset[],
          updatedAt: null,
        })),
      ]);
      setContractTemplatePresets(presetsRes.items ?? []);
      if (row.kind !== 'REPAIR' && row.kind !== 'WINDOWS') {
        setError('Этот пакет относится к другому направлению.');
        setPaymentRows([]);
        setPackageKind('REPAIR');
        return;
      }
      setPackageKind(row.kind);
      setPaymentRows(paymentsRes ?? []);
      setPackageFlowStatus(
        row.status === 'CONTRACT_CONCLUDED'
          ? 'CONTRACT_CONCLUDED'
          : row.status === 'REFUSED'
            ? 'REFUSED'
            : 'IN_PROGRESS'
      );
      const {
        form: mergedForm,
        templateOverrides,
        templatePresetIds,
      } = mergeFormDataFromStorage(row.formData);
      templateOverridesRef.current = templateOverrides;
      selectedTemplateIdsRef.current = templatePresetIds;
      linkedCrmCustomerIdRef.current = parseLinkedCrmCustomerIdFromFormData(row.formData);
      const live = getLiveFormRef.current?.();
      const formToShow = live ?? mergedForm;
      setForm(formToShow);
      formRef.current = formToShow;
      draftTitleRef.current = row.title?.trim() || null;
      const flowStatus: ContractDocumentPackageStatus =
        row.status === 'CONTRACT_CONCLUDED'
          ? 'CONTRACT_CONCLUDED'
          : row.status === 'REFUSED'
            ? 'REFUSED'
            : 'IN_PROGRESS';
      if (row.kind === 'WINDOWS' && flowStatus === 'CONTRACT_CONCLUDED') {
        const { grandTotalRub } = computePackagePayableBreakdown(mergedForm, 'WINDOWS');
        const inferred = inferWindowsPrepayment70StartDate(paymentsRes ?? [], grandTotalRub);
        const baseForPipeline = getLiveFormRef.current?.() ?? mergedForm;
        if (inferred && baseForPipeline.repairWorkStartActSignedAt?.trim() !== inferred) {
          const nextForm: RepairPackageFormData = {
            ...baseForPipeline,
            repairWorkStartActSignedAt: inferred,
            repairWorkStartActPhotoUrl: '',
          };
          await persistForm(nextForm);
          setForm(nextForm);
          formRef.current = nextForm;
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить пакет');
    } finally {
      setLoading(false);
      hubContentReadyRef.current = true;
      setContentReady(true);
    }
  }, [packageId, persistForm]);

  useEffect(() => {
    if (!isOpen || !packageId) return;
    void loadHub();
  }, [isOpen, packageId, loadHub]);

  const notifyUpdated = useCallback(() => {
    onUpdated?.();
  }, [onUpdated]);

  const syncWindowsWorkPeriodStartFromPayments = useCallback(
    async (
      payments: ContractDocumentPackagePayment[],
      baseForm: RepairPackageFormData
    ): Promise<void> => {
      if (packageKind !== 'WINDOWS' || packageFlowStatusRef.current !== 'CONTRACT_CONCLUDED') {
        return;
      }
      const { grandTotalRub } = computePackagePayableBreakdown(baseForm, 'WINDOWS');
      const inferred = inferWindowsPrepayment70StartDate(payments, grandTotalRub);
      if (!inferred || baseForm.repairWorkStartActSignedAt?.trim() === inferred) {
        return;
      }
      const nextForm: RepairPackageFormData = {
        ...hubFormBase(),
        repairWorkStartActSignedAt: inferred,
        repairWorkStartActPhotoUrl: '',
      };
      try {
        await persistForm(nextForm);
        setForm(nextForm);
        formRef.current = nextForm;
        notifyUpdated();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Не удалось сохранить дату начала срока');
      }
    },
    [packageKind, persistForm, notifyUpdated, hubFormBase]
  );

  const refreshJournalPaidRub = useCallback(async () => {
    try {
      const paymentsRes = await getContractDocumentPackagePayments(packageId);
      const rows = paymentsRes ?? [];
      setPaymentRows(rows);
      await syncWindowsWorkPeriodStartFromPayments(rows, formRef.current);
    } catch {
      /* не блокируем UI */
    }
  }, [packageId, syncWindowsWorkPeriodStartFromPayments]);

  const updateContract = useCallback(
    <K extends keyof RepairPackageFormData['contract']>(key: K, value: string) => {
      if (packageFlowStatusRef.current === 'REFUSED') return;
      const base = hubFormBase();
      const next = {
        ...base,
        contract: { ...base.contract, [key]: value },
      };
      setForm(next);
      formRef.current = next;
      void (async () => {
        try {
          await persistForm(next);
          notifyUpdated();
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Не удалось сохранить');
        }
      })();
    },
    [persistForm, notifyUpdated, hubFormBase]
  );

  const updateContractFields = useCallback(
    (patch: Partial<RepairPackageFormData['contract']>) => {
      if (packageFlowStatusRef.current === 'REFUSED') return;
      if (Object.keys(patch).length === 0) return;
      const base = hubFormBase();
      const next = {
        ...base,
        contract: { ...base.contract, ...patch },
      };
      setForm(next);
      formRef.current = next;
      void (async () => {
        try {
          await persistForm(next);
          notifyUpdated();
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Не удалось сохранить');
        }
      })();
    },
    [persistForm, notifyUpdated, hubFormBase]
  );

  const resolveCashOrderTemplateHtml = useCallback((): string => {
    return resolveRepairTemplateHtml(
      REPAIR_CASH_ORDER_TEMPLATE_TAB,
      contractTemplatePresets,
      selectedTemplateIdsRef.current,
      templateOverridesRef.current,
      packageKind
    );
  }, [contractTemplatePresets, packageKind]);

  const buildCashOrderPrintHtml = useCallback(
    (conduct?: RepairCashOrderConductDraft | null): string => {
      return buildRepairCashOrderPrintHtml(
        formRef.current,
        resolveCashOrderTemplateHtml(),
        conduct
      );
    },
    [resolveCashOrderTemplateHtml]
  );

  const printCashOrder = useCallback(
    (conduct?: RepairCashOrderConductDraft | null) => {
      const html = buildCashOrderPrintHtml(conduct);
      if (!html.trim()) {
        setError('Нет данных для печати ПКО.');
        return;
      }
      printRepairCashOrder(html);
    },
    [buildCashOrderPrintHtml]
  );

  const pipeline = useMemo(
    () =>
      computeRepairPipelineModel({
        packageKind,
        packageFlowStatus,
        form,
        payments: paymentRows,
        nowMs: Date.now(),
      }),
    [packageKind, packageFlowStatus, form, paymentRows, undoUiTick]
  );

  const attachedActPhotos = useMemo(() => {
    const items: Array<{ key: string; title: string; dateLabel: string; src: string }> = [];
    const workPhoto = form.repairWorkStartActPhotoUrl?.trim();
    if (workPhoto) {
      items.push({
        key: 'work-start',
        title: 'Акт начала работ',
        dateLabel: formatRepairPipelineActDate(form.repairWorkStartActSignedAt ?? ''),
        src: publicUploadUrl(workPhoto),
      });
    }
    const closePhoto = form.repairContractCloseActPhotoUrl?.trim();
    if (closePhoto) {
      items.push({
        key: 'contract-close',
        title:
          packageKind === 'WINDOWS'
            ? 'Акт приёмки-передачи'
            : 'Акт сдачи-приёмки (закрытие договора)',
        dateLabel: formatRepairPipelineActDate(form.repairContractCloseActSignedAt ?? ''),
        src: publicUploadUrl(closePhoto),
      });
    }
    return items;
  }, [
    form.repairWorkStartActPhotoUrl,
    form.repairWorkStartActSignedAt,
    form.repairContractCloseActPhotoUrl,
    form.repairContractCloseActSignedAt,
    packageKind,
  ]);

  useEffect(() => {
    const now = Date.now();
    let latestActiveEnd = 0;
    if (packageFlowStatus === 'CONTRACT_CONCLUDED') {
      const iso = form.contractConcludedAt?.trim();
      if (iso) {
        const ts = Date.parse(iso);
        if (Number.isFinite(ts)) {
          const d = ts + CONTRACT_SIGNED_REVERT_WINDOW_MS;
          if (d > now) latestActiveEnd = Math.max(latestActiveEnd, d);
        }
      }
    }
    const count = clampRepairAddendumSlotCount(form.addendumSlotCount);
    for (let i = 0; i < count; i++) {
      const slot = form.addendumSlots[i];
      if (slot?.status !== 'SIGNED') continue;
      const iso = slot.signedAt?.trim();
      if (!iso) continue;
      const ts = Date.parse(iso);
      if (!Number.isFinite(ts)) continue;
      const d = ts + CONTRACT_SIGNED_REVERT_WINDOW_MS;
      if (d > now) latestActiveEnd = Math.max(latestActiveEnd, d);
    }
    if (latestActiveEnd === 0) return;
    const id = window.setInterval(() => {
      setUndoUiTick((v) => v + 1);
      if (Date.now() >= latestActiveEnd) window.clearInterval(id);
    }, 100);
    return () => window.clearInterval(id);
  }, [packageFlowStatus, form.contractConcludedAt, form.addendumSlotCount, form.addendumSlots]);

  const contractNumberLabel = getRepairContractNumberDisplayForForm(form);

  const handleMarkContractConcluded = async () => {
    setSavingPackageStatus(true);
    setError(null);
    try {
      const nowIso = new Date().toISOString();
      const nextForm = { ...hubFormBase(), contractConcludedAt: nowIso, contractPaidAt: '' };
      await persistForm(nextForm, { status: 'CONTRACT_CONCLUDED', recordVersion: true });
      setPackageFlowStatus('CONTRACT_CONCLUDED');
      notifyUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось обновить статус пакета');
    } finally {
      setSavingPackageStatus(false);
    }
  };

  const confirmRevertContractConcluded = async () => {
    const canRevert =
      packageFlowStatusRef.current === 'CONTRACT_CONCLUDED' &&
      isWithinMsSinceIso(formRef.current.contractConcludedAt, CONTRACT_SIGNED_REVERT_WINDOW_MS);
    if (!canRevert) {
      setError('Снять статус «Договор подписан» можно только в течение 30 секунд после установки.');
      return;
    }
    setSavingPackageStatus(true);
    setError(null);
    try {
      const nextForm = { ...hubFormBase(), contractConcludedAt: '', contractPaidAt: '' };
      await persistForm(nextForm, { status: 'IN_PROGRESS', recordVersion: true });
      setPackageFlowStatus('IN_PROGRESS');
      notifyUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось снять отметку');
    } finally {
      setSavingPackageStatus(false);
    }
  };

  const handleConfirmContractRefusal = async () => {
    const reason = refusalReasonDraft.trim();
    if (!reason) {
      setRefusalModalError('Укажите причину отказа.');
      return;
    }
    setRefusalModalBusy(true);
    setRefusalModalError(null);
    setError(null);
    try {
      const nowIso = new Date().toISOString();
      const nextForm: RepairPackageFormData = {
        ...hubFormBase(),
        contractRefusalReason: reason,
        contractRefusedAt: nowIso,
      };
      await persistForm(nextForm, { status: 'REFUSED', recordVersion: true });
      setPackageFlowStatus('REFUSED');
      setRefusalModalOpen(false);
      setRefusalReasonDraft('');
      notifyUpdated();
    } catch (e) {
      setRefusalModalError(e instanceof Error ? e.message : 'Не удалось сохранить отказ');
    } finally {
      setRefusalModalBusy(false);
    }
  };

  const handleRevertRefusal = async () => {
    setSavingPackageStatus(true);
    setError(null);
    try {
      const nextForm: RepairPackageFormData = {
        ...hubFormBase(),
        contractRefusalReason: '',
        contractRefusedAt: '',
      };
      await persistForm(nextForm, { status: 'IN_PROGRESS', recordVersion: true });
      setPackageFlowStatus('IN_PROGRESS');
      setRevertRefusalConfirmOpen(false);
      notifyUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось снять статус «Отказ»');
    } finally {
      setSavingPackageStatus(false);
    }
  };

  const handleConfirmWorkStart = async () => {
    const dateRaw = workStartModalDate.trim();
    if (!dateRaw) {
      setWorkStartModalError(
        packageKind === 'WINDOWS'
          ? 'Укажите дату получения предоплаты (начало отсчёта срока).'
          : 'Укажите дату начала работ по акту.'
      );
      return;
    }
    if (packageKind === 'REPAIR' && !workStartModalFile) {
      setWorkStartModalError('Прикрепите фотографию акта начала работ.');
      return;
    }
    const payCheck = computeRepairPipelineModel({
      packageKind,
      packageFlowStatus: packageFlowStatusRef.current,
      form: formRef.current,
      payments: paymentRows,
    });
    if (!payCheck.workStartPaymentReady) {
      setWorkStartModalError(
        packageKind === 'WINDOWS'
          ? `Для этапа «В работе» нужна предоплата не менее ${REPAIR_WORK_START_MIN_CONTRACT_PAY_PCT}% от суммы договора (сейчас ${payCheck.grandPaidPct ?? payCheck.contractPaidPct ?? 0}%).`
          : `Для этапа «В работе» нужна оплата по договору не менее ${REPAIR_WORK_START_MIN_CONTRACT_PAY_PCT}% (сейчас ${payCheck.contractPaidPct ?? 0}%).`
      );
      return;
    }
    setWorkStartModalBusy(true);
    setWorkStartModalError(null);
    try {
      let imageUrl = '';
      if (packageKind === 'REPAIR' && workStartModalFile) {
        const uploaded = await uploadRepairPackageWorkStartActPhoto(packageId, workStartModalFile);
        imageUrl = uploaded.imageUrl;
      }
      const nextForm: RepairPackageFormData = {
        ...hubFormBase(),
        repairWorkStartActSignedAt: dateRaw,
        repairWorkStartActPhotoUrl: imageUrl,
      };
      await persistForm(nextForm, { recordVersion: true });
      setWorkStartModalOpen(false);
      setWorkStartModalDate('');
      setWorkStartModalFile(null);
      notifyUpdated();
    } catch (e) {
      setWorkStartModalError(e instanceof Error ? e.message : 'Не удалось сохранить');
    } finally {
      setWorkStartModalBusy(false);
    }
  };

  const handleConfirmContractClose = async () => {
    const dateRaw = contractCloseModalDate.trim();
    if (!dateRaw) {
      setContractCloseModalError('Укажите дату подписания акта сдачи-приёмки.');
      return;
    }
    if (!contractCloseModalFile) {
      setContractCloseModalError('Прикрепите фотографию акта сдачи-приёмки.');
      return;
    }
    const payCheck = computeRepairPipelineModel({
      packageKind,
      packageFlowStatus: packageFlowStatusRef.current,
      form: formRef.current,
      payments: paymentRows,
    });
    if (!payCheck.allPaymentsComplete) {
      setContractCloseModalError(
        packageKind === 'WINDOWS'
          ? payCheck.hasAddendumsInPackage
            ? 'Для закрытия нужна 100% оплата по договору (спецификация + счёт-заказ) и по всем Д/с с расчётами.'
            : 'Для закрытия договора нужна 100% оплата (изделия по спецификации и работы по счёту-заказу).'
          : 'Для закрытия договора нужна 100% оплата по договору и по всем доп. соглашениям с расчётами.'
      );
      return;
    }
    setContractCloseModalBusy(true);
    setContractCloseModalError(null);
    try {
      const { imageUrl } = await uploadRepairPackageContractCloseActPhoto(
        packageId,
        contractCloseModalFile
      );
      const nextForm: RepairPackageFormData = {
        ...hubFormBase(),
        repairContractCloseActSignedAt: dateRaw,
        repairContractCloseActPhotoUrl: imageUrl,
      };
      const formData: Record<string, unknown> = {
        ...buildHubPersistedFormData(nextForm),
        repairContractClosed: true,
      };
      await updateContractDocumentPackage(packageId, { formData, recordVersion: true });
      packageJournalSchedulerRef.current?.acknowledgeImmediateVersion();
      setForm(nextForm);
      formRef.current = nextForm;
      setContractCloseModalOpen(false);
      setContractCloseModalDate('');
      setContractCloseModalFile(null);
      notifyUpdated();
    } catch (e) {
      setContractCloseModalError(e instanceof Error ? e.message : 'Не удалось сохранить');
    } finally {
      setContractCloseModalBusy(false);
    }
  };

  const markAddendumSlotSigned = useCallback(
    async (slotIndex0: number) => {
      const p = hubFormBase();
      const slots = [...p.addendumSlots] as RepairPackageFormData['addendumSlots'];
      const cur = slots[slotIndex0];
      if (!cur || cur.status !== 'OPEN') return;
      slots[slotIndex0] = {
        ...cur,
        status: 'SIGNED',
        signedAt: new Date().toISOString(),
        paidAt: '',
      };
      const nextForm = { ...p, addendumSlots: slots };
      setSavingPackageStatus(true);
      setError(null);
      try {
        await persistForm(nextForm, { recordVersion: true });
        notifyUpdated();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Не удалось отметить Д/с подписанным');
      } finally {
        setSavingPackageStatus(false);
      }
    },
    [persistForm, notifyUpdated, hubFormBase]
  );

  const unmarkAddendumSlotSigned = useCallback(
    async (slotIndex0: number) => {
      const p = hubFormBase();
      const slots = [...p.addendumSlots] as RepairPackageFormData['addendumSlots'];
      const cur = slots[slotIndex0];
      if (!cur || cur.status !== 'SIGNED') return;
      if (!isWithinMsSinceIso(cur.signedAt, CONTRACT_SIGNED_REVERT_WINDOW_MS)) return;
      slots[slotIndex0] = { ...cur, status: 'OPEN', signedAt: '', paidAt: '' };
      const nextForm = { ...p, addendumSlots: slots };
      setSavingPackageStatus(true);
      setError(null);
      try {
        await persistForm(nextForm, { recordVersion: true });
        notifyUpdated();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Не удалось отменить подписание Д/с');
      } finally {
        setSavingPackageStatus(false);
      }
    },
    [persistForm, notifyUpdated, hubFormBase]
  );

  const headerConcludedDateLabel =
    packageFlowStatus === 'CONTRACT_CONCLUDED'
      ? formatContractConcludedDateForHeader(form.contractConcludedAt)
      : null;

  return {
    loading,
    contentReady,
    error,
    setError,
    form,
    packageKind,
    packageFlowStatus,
    contractNumberLabel,
    headerConcludedDateLabel,
    paymentRows,
    pipeline,
    savingPackageStatus,
    attachedActPhotos,
    workStartModalOpen,
    setWorkStartModalOpen,
    workStartModalDate,
    setWorkStartModalDate,
    workStartModalFile,
    setWorkStartModalFile,
    workStartModalBusy,
    workStartModalError,
    setWorkStartModalError,
    contractCloseModalOpen,
    setContractCloseModalOpen,
    contractCloseModalDate,
    setContractCloseModalDate,
    contractCloseModalFile,
    setContractCloseModalFile,
    contractCloseModalBusy,
    contractCloseModalError,
    setContractCloseModalError,
    repairActPhotosModalOpen,
    setRepairActPhotosModalOpen,
    refusalModalOpen,
    setRefusalModalOpen,
    refusalReasonDraft,
    setRefusalReasonDraft,
    refusalModalBusy,
    refusalModalError,
    setRefusalModalError,
    revertRefusalConfirmOpen,
    setRevertRefusalConfirmOpen,
    refreshJournalPaidRub,
    loadHub,
    updateContract,
    updateContractFields,
    printCashOrder,
    handleMarkContractConcluded,
    confirmRevertContractConcluded,
    handleConfirmContractRefusal,
    handleRevertRefusal,
    handleConfirmWorkStart,
    handleConfirmContractClose,
    markAddendumSlotSigned,
    unmarkAddendumSlotSigned,
  };
}

export type RepairContractPackageHubState = ReturnType<typeof useRepairContractPackageHub>;
