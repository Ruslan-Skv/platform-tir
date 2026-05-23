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

import styles from '../ContractDocuments.module.css';
import {
  type RepairDocumentTemplateTabId,
  buildPersistedFormData,
  mergeFormDataFromStorage,
} from './formDataTemplateStorage';
import { getRepairContractNumberDisplayForForm } from './packageContractDisplay';
import {
  CONTRACT_SIGNED_REVERT_RING_C,
  CONTRACT_SIGNED_REVERT_RING_R,
  CONTRACT_SIGNED_REVERT_WINDOW_MS,
} from './repairContractPackageHubConstants';
import {
  REPAIR_CONTRACT_JOURNAL_PAY_BANNER_TOOLTIP,
  formatContractConcludedDateForHeader,
  formatRepairPipelineActDate,
  getRepairContractJournalPayBannerStyle,
  isWithinMsSinceIso,
  isWithinRevertWindow,
  sumPackagePaymentAmountsRub,
} from './repairContractPackageHubUtils';
import { type RepairPackageFormData, mergeRepairPackageFormData } from './repairPackageForm';
import { computeRepairPackagePayableBreakdown } from './repairPackagePaymentTotals';

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
  const [journalPaidRub, setJournalPaidRub] = useState(0);
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
        setJournalPaidRub(0);
        return;
      }
      setJournalPaidRub(sumPackagePaymentAmountsRub(paymentsRes ?? []));
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
      setJournalPaidRub(sumPackagePaymentAmountsRub(paymentsRes ?? []));
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

  const isContractPaid = (form.contractPaidAt ?? '').trim() !== '';
  const canRevertContractPaid = isContractPaid && isWithinRevertWindow(form.contractPaidAt);
  const canRevertContractConcluded =
    packageFlowStatus === 'CONTRACT_CONCLUDED' &&
    isWithinMsSinceIso(form.contractConcludedAt, CONTRACT_SIGNED_REVERT_WINDOW_MS);

  const signedAddendumOrdinals = useMemo(
    () =>
      form.addendumSlots
        .map((slot, i) => (slot.status === 'SIGNED' ? i + 1 : null))
        .filter((v): v is number => v !== null),
    [form.addendumSlots]
  );

  const paidAddendumOrdinals = useMemo(
    () =>
      form.addendumSlots
        .map((slot, i) => (slot.status === 'PAID' ? i + 1 : null))
        .filter((v): v is number => v !== null),
    [form.addendumSlots]
  );

  const openAddendumSignActions = useMemo(() => {
    const count = Math.min(
      5,
      Math.max(1, Number.isFinite(form.addendumSlotCount) ? form.addendumSlotCount : 1)
    );
    const rows: Array<{ slotIndex0: number; ordinal: number; hasAnyAttachedPresets: boolean }> = [];
    for (let i = 0; i < count; i++) {
      const slot = form.addendumSlots[i];
      if (!slot || slot.status !== 'OPEN') continue;
      const hasAnyAttachedPresets =
        (slot.selectedPresetIds?.length ?? 0) > 0 ||
        (slot.excludedSelectedPresetIds?.length ?? 0) > 0;
      rows.push({ slotIndex0: i, ordinal: i + 1, hasAnyAttachedPresets });
    }
    return rows;
  }, [form.addendumSlotCount, form.addendumSlots]);

  const repairWorkStarted = useMemo(
    () =>
      Boolean(form.repairWorkStartActSignedAt?.trim() && form.repairWorkStartActPhotoUrl?.trim()),
    [form.repairWorkStartActSignedAt, form.repairWorkStartActPhotoUrl]
  );

  const repairContractClosed = useMemo(() => {
    if (
      form.repairContractCloseActSignedAt?.trim() &&
      form.repairContractCloseActPhotoUrl?.trim()
    ) {
      return true;
    }
    const anyForm = form as unknown as Record<string, unknown>;
    return anyForm.repairContractClosed === true;
  }, [form]);

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

  const contractSignedRevertRemainingMs = useMemo(() => {
    if (packageFlowStatus !== 'CONTRACT_CONCLUDED') return 0;
    const iso = form.contractConcludedAt?.trim();
    if (!iso) return 0;
    const ts = Date.parse(iso);
    if (!Number.isFinite(ts)) return 0;
    return Math.max(0, ts + CONTRACT_SIGNED_REVERT_WINDOW_MS - Date.now());
  }, [packageFlowStatus, form.contractConcludedAt, undoUiTick]);

  const addendumSignedRevertUis = useMemo(() => {
    const rows: Array<{ slotIndex0: number; remainingMs: number }> = [];
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
      const remainingMs = Math.max(0, ts + CONTRACT_SIGNED_REVERT_WINDOW_MS - Date.now());
      if (remainingMs > 0) rows.push({ slotIndex0: i, remainingMs });
    }
    return rows;
  }, [form.addendumSlotCount, form.addendumSlots, undoUiTick]);

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

  const headerPayableBreakdown = useMemo(() => computeRepairPackagePayableBreakdown(form), [form]);

  const signedContractPayOrb = useMemo(() => {
    if (packageFlowStatus !== 'CONTRACT_CONCLUDED') return null;
    const gt = headerPayableBreakdown.grandTotalRub;
    if (gt == null || !Number.isFinite(gt) || gt <= 0) return null;
    const paid = journalPaidRub;
    const pct = (paid / gt) * 100;
    const tolRub = 0.5;
    const treatAsFull = paid >= gt - tolRub;
    const roundedPct = Math.round(pct);
    const label = treatAsFull ? '100%' : `${roundedPct}%`;
    let toneClass: string;
    if (treatAsFull || roundedPct >= 100) {
      toneClass = styles.packageFlowPayPctOrbGreen;
    } else if (roundedPct >= 70) {
      toneClass = styles.packageFlowPayPctOrbLime;
    } else {
      toneClass = styles.packageFlowPayPctOrbYellow;
    }
    const displayPct = treatAsFull ? 100 : roundedPct;
    const bannerText = `Всего оплачено: ${displayPct}%`;
    const bannerStyle = getRepairContractJournalPayBannerStyle(displayPct);
    const title = REPAIR_CONTRACT_JOURNAL_PAY_BANNER_TOOLTIP;
    return { label, toneClass, title, bannerText, bannerStyle };
  }, [packageFlowStatus, headerPayableBreakdown.grandTotalRub, journalPaidRub]);

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
    if (!canRevertContractConcluded) {
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

  const handleRevertContractPaid = async () => {
    if (!canRevertContractPaid) {
      setError('Снять статус «Договор оплачен» можно только в течение 24 часов после установки.');
      return;
    }
    setSavingPackageStatus(true);
    setError(null);
    try {
      const nextForm = { ...formRef.current, contractPaidAt: '' };
      await persistForm(nextForm, { status: packageFlowStatusRef.current, recordVersion: true });
      notifyUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось снять статус «Договор оплачен»');
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

  const unmarkAddendumSlotPaid = useCallback(
    async (slotIndex0: number) => {
      const p = formRef.current;
      const slots = [...p.addendumSlots] as RepairPackageFormData['addendumSlots'];
      const cur = slots[slotIndex0];
      if (!cur || cur.status !== 'PAID') return;
      if (!isWithinRevertWindow(cur.paidAt)) return;
      slots[slotIndex0] = { ...cur, status: 'SIGNED', paidAt: '' };
      const nextForm = { ...p, addendumSlots: slots };
      setSavingPackageStatus(true);
      setError(null);
      try {
        await persistForm(nextForm, { recordVersion: true });
        notifyUpdated();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Не удалось снять отметку оплаты Д/с');
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
    journalPaidRub,
    savingPackageStatus,
    isContractPaid,
    canRevertContractPaid,
    canRevertContractConcluded,
    signedAddendumOrdinals,
    paidAddendumOrdinals,
    openAddendumSignActions,
    repairWorkStarted,
    repairContractClosed,
    attachedActPhotos,
    contractSignedRevertRemainingMs,
    addendumSignedRevertUis,
    signedContractPayOrb,
    CONTRACT_SIGNED_REVERT_RING_R,
    CONTRACT_SIGNED_REVERT_RING_C,
    CONTRACT_SIGNED_REVERT_WINDOW_MS,
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
    handleRevertContractPaid,
    handleConfirmContractRefusal,
    handleRevertRefusal,
    handleConfirmWorkStart,
    handleConfirmContractClose,
    markAddendumSlotSigned,
    unmarkAddendumSlotSigned,
    unmarkAddendumSlotPaid,
  };
}

export type RepairContractPackageHubState = ReturnType<typeof useRepairContractPackageHub>;
