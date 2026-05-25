'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  type ContractDocumentPackagePayment,
  type ContractDocumentPackageStatus,
  getContractDocumentPackage,
  getContractDocumentPackagePayments,
  updateContractDocumentPackage,
  uploadRepairPackageContractCloseActPhoto,
  uploadRepairPackageWorkStartActPhoto,
} from '@/shared/api/admin-contract-document-packages';
import { publicUploadUrl } from '@/shared/lib/public-upload-url';

import {
  type RepairDocumentTemplateTabId,
  buildPersistedFormData,
  mergeFormDataFromStorage,
} from './formDataTemplateStorage';
import { getRepairContractNumberDisplayForForm } from './packageContractDisplay';
import { CONTRACT_SIGNED_REVERT_WINDOW_MS } from './repairContractPackageHubConstants';
import {
  formatContractConcludedDateForHeader,
  formatRepairPipelineActDate,
  isWithinMsSinceIso,
} from './repairContractPackageHubUtils';
import {
  REPAIR_WORK_START_MIN_CONTRACT_PAY_PCT,
  computeRepairPipelineModel,
} from './repairContractPipeline';
import { type RepairPackageFormData, mergeRepairPackageFormData } from './repairPackageForm';

export type UseRepairContractPackageHubOptions = {
  packageId: string;
  isOpen: boolean;
  onUpdated?: () => void;
};

export function useRepairContractPackageHub({
  packageId,
  isOpen,
  onUpdated,
}: UseRepairContractPackageHubOptions) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<RepairPackageFormData>(() => mergeRepairPackageFormData({}));
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

  const persistForm = useCallback(
    async (
      nextForm: RepairPackageFormData,
      opts?: { status?: ContractDocumentPackageStatus; recordVersion?: boolean }
    ) => {
      const formData = buildPersistedFormData(
        nextForm,
        templateOverridesRef.current,
        selectedTemplateIdsRef.current
      );
      await updateContractDocumentPackage(packageId, {
        status: opts?.status,
        formData,
        recordVersion: opts?.recordVersion ?? true,
      });
      setForm(nextForm);
      formRef.current = nextForm;
    },
    [packageId]
  );

  const loadHub = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [row, paymentsRes] = await Promise.all([
        getContractDocumentPackage(packageId),
        getContractDocumentPackagePayments(packageId).catch(
          () => [] as ContractDocumentPackagePayment[]
        ),
      ]);
      if (row.kind !== 'REPAIR') {
        setError('Этот пакет относится к другому направлению.');
        setPaymentRows([]);
        return;
      }
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
      setForm(mergedForm);
      formRef.current = mergedForm;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить пакет');
    } finally {
      setLoading(false);
    }
  }, [packageId]);

  useEffect(() => {
    if (!isOpen || !packageId) return;
    void loadHub();
  }, [isOpen, packageId, loadHub]);

  const refreshJournalPaidRub = useCallback(async () => {
    try {
      const paymentsRes = await getContractDocumentPackagePayments(packageId);
      setPaymentRows(paymentsRes ?? []);
    } catch {
      /* не блокируем UI */
    }
  }, [packageId]);

  const notifyUpdated = useCallback(() => {
    onUpdated?.();
  }, [onUpdated]);

  const updateContract = useCallback(
    <K extends keyof RepairPackageFormData['contract']>(key: K, value: string) => {
      if (packageFlowStatusRef.current === 'REFUSED') return;
      setForm((p) => {
        const next = { ...p, contract: { ...p.contract, [key]: value } };
        formRef.current = next;
        return next;
      });
      void (async () => {
        try {
          await persistForm(formRef.current, { recordVersion: true });
          notifyUpdated();
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Не удалось сохранить');
        }
      })();
    },
    [persistForm, notifyUpdated]
  );

  const pipeline = useMemo(
    () =>
      computeRepairPipelineModel({
        packageFlowStatus,
        form,
        payments: paymentRows,
        nowMs: Date.now(),
      }),
    [packageFlowStatus, form, paymentRows, undoUiTick]
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
        title: 'Акт сдачи-приёмки (закрытие договора)',
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
    const count = Math.min(
      5,
      Math.max(1, Number.isFinite(form.addendumSlotCount) ? form.addendumSlotCount : 1)
    );
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
      const nextForm = { ...formRef.current, contractConcludedAt: nowIso, contractPaidAt: '' };
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
      const nextForm = { ...formRef.current, contractConcludedAt: '', contractPaidAt: '' };
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
        ...formRef.current,
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
        ...formRef.current,
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
      setWorkStartModalError('Укажите дату начала работ по акту.');
      return;
    }
    if (!workStartModalFile) {
      setWorkStartModalError('Прикрепите фотографию акта начала работ.');
      return;
    }
    const payCheck = computeRepairPipelineModel({
      packageFlowStatus: packageFlowStatusRef.current,
      form: formRef.current,
      payments: paymentRows,
    });
    if (!payCheck.workStartPaymentReady) {
      setWorkStartModalError(
        `Для этапа «В работе» нужна оплата по договору не менее ${REPAIR_WORK_START_MIN_CONTRACT_PAY_PCT}% (сейчас ${payCheck.contractPaidPct ?? 0}%).`
      );
      return;
    }
    setWorkStartModalBusy(true);
    setWorkStartModalError(null);
    try {
      const { imageUrl } = await uploadRepairPackageWorkStartActPhoto(
        packageId,
        workStartModalFile
      );
      const nextForm: RepairPackageFormData = {
        ...formRef.current,
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
      packageFlowStatus: packageFlowStatusRef.current,
      form: formRef.current,
      payments: paymentRows,
    });
    if (!payCheck.allPaymentsComplete) {
      setContractCloseModalError(
        'Для закрытия договора нужна 100% оплата по договору и по всем доп. соглашениям с расчётами.'
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
        ...formRef.current,
        repairContractCloseActSignedAt: dateRaw,
        repairContractCloseActPhotoUrl: imageUrl,
      };
      const formData: Record<string, unknown> = {
        ...buildPersistedFormData(
          nextForm,
          templateOverridesRef.current,
          selectedTemplateIdsRef.current
        ),
        repairContractClosed: true,
      };
      await updateContractDocumentPackage(packageId, { formData, recordVersion: true });
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
      const p = formRef.current;
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
    [persistForm, notifyUpdated]
  );

  const unmarkAddendumSlotSigned = useCallback(
    async (slotIndex0: number) => {
      const p = formRef.current;
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
    [persistForm, notifyUpdated]
  );

  const headerConcludedDateLabel =
    packageFlowStatus === 'CONTRACT_CONCLUDED'
      ? formatContractConcludedDateForHeader(form.contractConcludedAt)
      : null;

  return {
    loading,
    error,
    setError,
    form,
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
