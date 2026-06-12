'use client';

import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  type ContractDocumentPackagePayment,
  type ContractDocumentPackagePaymentInput,
  createContractDocumentPackagePayment,
} from '@/shared/api/admin-contract-document-packages';

import { amountToRussianWords } from '../../../../core/amountToRussianWords';
import { type PackageFormData } from '../../form/packageForm';
import { type PackageCashOrderConductDraft } from '../../payments/packageCashOrderPrint';
import {
  computePackageHubConductSuggestedAmountRub,
  formatPackageHubConductAmountInput,
} from '../../payments/packageHubConductPayment';
import {
  type PackagePaymentBasisOption,
  type PackagePaymentBasisOptionKey,
  packagePaymentBasisOptionByKey,
} from '../../payments/packagePaymentBasisOptions';
import {
  appendPackagePaymentBasisOption,
  paymentApiFieldsFromCustomBasis,
  readPackagePaymentBasisOptions,
} from '../../payments/packagePaymentBasisOptionsStorage';
import {
  PACKAGE_PAYMENT_FORM_LABELS,
  formatPackagePaymentDateForTemplate,
} from '../../payments/packagePaymentFormLabels';
import {
  type PackagePayableBreakdown,
  parseRubAmountString,
} from '../../payments/packagePaymentTotals';
import type { PackageContractPaymentsTabProps } from './PackageContractPaymentsTab';

export type UsePackagePaymentsConductParams = {
  packageId: string;
  form: PackageFormData;
  onError: (message: string) => void;
  onUpdateContract: PackageContractPaymentsTabProps['onUpdateContract'];
  onJournalChanged?: () => void;
  onPrintCashOrder?: PackageContractPaymentsTabProps['onPrintCashOrder'];
  onUpdateContractFields?: PackageContractPaymentsTabProps['onUpdateContractFields'];
  isHubConductLayout: boolean;
  setRows: Dispatch<SetStateAction<ContractDocumentPackagePayment[]>>;
  payableBreakdown: PackagePayableBreakdown;
  journalPaidRub: number;
  paidAllocations: {
    contractPaidRub: number;
    byAddendum: Map<number, number>;
  };
  hubFixedBasisOptions: PackagePaymentBasisOption[];
};

export function usePackagePaymentsConduct({
  packageId,
  form,
  onError,
  onUpdateContract,
  onJournalChanged,
  onPrintCashOrder,
  onUpdateContractFields,
  isHubConductLayout,
  setRows,
  payableBreakdown,
  journalPaidRub,
  paidAllocations,
  hubFixedBasisOptions,
}: UsePackagePaymentsConductParams) {
  const [saving, setSaving] = useState(false);
  const [basisOptions, setBasisOptions] = useState<string[]>([]);
  const [newBasisDraft, setNewBasisDraft] = useState('');
  const [hubBasisKey, setHubBasisKey] = useState<PackagePaymentBasisOptionKey | ''>('');
  const [conductAmount, setConductAmount] = useState('');
  const [hubPaymentConductedNotice, setHubPaymentConductedNotice] = useState(false);
  const hubConductPrefillBasisRef = useRef<PackagePaymentBasisOptionKey | ''>('');

  /** Поля только для режима «Изменить запись» в журнале (не трогаем contract.*). */
  const [draft, setDraft] = useState<{
    paymentDate: string;
    paymentForm: ContractDocumentPackagePaymentInput['paymentForm'];
  }>(() => ({
    paymentDate: new Date().toISOString().slice(0, 10),
    paymentForm: 'INVOICE',
  }));

  const refreshBasisOptions = useCallback(() => {
    setBasisOptions(readPackagePaymentBasisOptions());
  }, []);

  useEffect(() => {
    refreshBasisOptions();
  }, [refreshBasisOptions]);

  /** Если список оснований из LS загрузился, а в договоре пусто — подставляем первый вариант (ПКО / полная вкладка). */
  useEffect(() => {
    if (isHubConductLayout) return;
    const first = basisOptions[0];
    if (!first) return;
    if (form.contract.paymentBasis.trim()) return;
    onUpdateContract('paymentBasis', first);
  }, [basisOptions, form.contract.paymentBasis, onUpdateContract, isHubConductLayout]);

  const hubConductDateReady = Boolean(draft.paymentDate.trim());
  const hubConductSelectedBasis = useMemo(
    () => packagePaymentBasisOptionByKey(hubFixedBasisOptions, hubBasisKey),
    [hubFixedBasisOptions, hubBasisKey]
  );
  const hubConductBasisReady = Boolean(
    hubConductSelectedBasis && !hubConductSelectedBasis.disabled
  );
  const hubConductAmountReady = useMemo(() => {
    const amountNum = parseRubAmountString(conductAmount);
    return amountNum != null && amountNum > 0;
  }, [conductAmount]);
  const hubConductFormComplete =
    hubConductDateReady && hubConductBasisReady && hubConductAmountReady;
  const hubConductAllBasesDone =
    hubFixedBasisOptions.length > 0 && hubFixedBasisOptions.every((o) => o.disabled);

  const buildHubCashOrderConductDraft = useCallback((): PackageCashOrderConductDraft | null => {
    const option = packagePaymentBasisOptionByKey(hubFixedBasisOptions, hubBasisKey);
    if (!option || option.disabled) return null;
    const amount = conductAmount.trim();
    if (!amount || !draft.paymentDate.trim()) return null;
    return {
      paymentDate: draft.paymentDate,
      paymentForm: draft.paymentForm,
      paymentBasis: option.label,
      prepaymentAmount: amount,
    };
  }, [hubFixedBasisOptions, hubBasisKey, conductAmount, draft.paymentDate, draft.paymentForm]);

  const syncHubConductToContractForPko = useCallback(
    (conduct: PackageCashOrderConductDraft) => {
      const prepaymentAmount = conduct.prepaymentAmount.trim();
      const patch: Partial<PackageContractPaymentsTabProps['form']['contract']> = {
        paymentBasis: conduct.paymentBasis.trim(),
        prepaymentAmount,
        prepaymentAmountWords: prepaymentAmount ? amountToRussianWords(prepaymentAmount) : '',
        prepaymentDate: formatPackagePaymentDateForTemplate(conduct.paymentDate),
        paymentFormLabel: PACKAGE_PAYMENT_FORM_LABELS[conduct.paymentForm] ?? conduct.paymentForm,
      };
      if (onUpdateContractFields) {
        onUpdateContractFields(patch);
        return;
      }
      for (const [key, value] of Object.entries(patch)) {
        if (typeof value !== 'string') continue;
        onUpdateContract(key as keyof PackageContractPaymentsTabProps['form']['contract'], value);
      }
    },
    [onUpdateContract, onUpdateContractFields]
  );

  const handleHubPrintCashOrder = () => {
    const conduct = buildHubCashOrderConductDraft();
    if (!conduct) {
      onError('Заполните дату, основание и сумму оплаты для печати ПКО');
      return;
    }
    if (!onPrintCashOrder) return;
    syncHubConductToContractForPko(conduct);
    onPrintCashOrder(conduct);
  };

  useEffect(() => {
    if (!isHubConductLayout) return;
    if (hubConductSelectedBasis?.disabled) {
      setHubBasisKey('');
      setConductAmount('');
      hubConductPrefillBasisRef.current = '';
    }
  }, [isHubConductLayout, hubConductSelectedBasis?.disabled]);

  useEffect(() => {
    if (!isHubConductLayout || !hubConductBasisReady || !hubConductSelectedBasis) {
      return;
    }
    if (hubConductPrefillBasisRef.current === hubBasisKey) return;
    hubConductPrefillBasisRef.current = hubBasisKey;
    const suggested = computePackageHubConductSuggestedAmountRub(
      hubConductSelectedBasis,
      payableBreakdown,
      journalPaidRub,
      paidAllocations.contractPaidRub,
      paidAllocations.byAddendum
    );
    if (suggested != null && suggested > 0) {
      setConductAmount(formatPackageHubConductAmountInput(suggested));
    }
  }, [
    isHubConductLayout,
    hubConductBasisReady,
    hubConductSelectedBasis,
    hubBasisKey,
    payableBreakdown,
    journalPaidRub,
    paidAllocations.contractPaidRub,
    paidAllocations.byAddendum,
  ]);

  const resetDraft = () => {
    setDraft({
      paymentDate: new Date().toISOString().slice(0, 10),
      paymentForm: 'INVOICE',
    });
  };

  const resetHubConductForm = useCallback(() => {
    setConductAmount('');
    setHubBasisKey('');
    hubConductPrefillBasisRef.current = '';
    setDraft((d) => ({
      ...d,
      paymentDate: new Date().toISOString().slice(0, 10),
      paymentForm: 'INVOICE',
    }));
  }, []);

  const handleHubBasisChange = (key: PackagePaymentBasisOptionKey | '') => {
    setHubPaymentConductedNotice(false);
    if (key !== hubBasisKey) {
      hubConductPrefillBasisRef.current = '';
    }
    setHubBasisKey(key);
    if (!key) {
      setConductAmount('');
    }
  };

  const basisSelectOptionsCreate = useMemo(() => {
    const opts = [...basisOptions];
    const t = form.contract.paymentBasis.trim();
    if (t && !opts.includes(t)) {
      opts.unshift(t);
    }
    return opts;
  }, [basisOptions, form.contract.paymentBasis]);

  const handleAppendBasisOption = () => {
    const res = appendPackagePaymentBasisOption(newBasisDraft);
    if (!res.ok) {
      onError(res.reason);
      return;
    }
    setBasisOptions(res.list);
    setNewBasisDraft('');
    const added = res.list[res.list.length - 1]!;
    onUpdateContract('paymentBasis', added);
  };

  const submitHubConductPayment = async () => {
    const option = packagePaymentBasisOptionByKey(hubFixedBasisOptions, hubBasisKey);
    if (!option) {
      onError('Выберите основание платежа');
      return;
    }
    if (option.disabled) {
      onError('Выбранное основание уже закрыто — выберите другое');
      return;
    }
    const amountNum = parseRubAmountString(conductAmount);
    if (amountNum == null || amountNum <= 0) {
      onError('Укажите корректную сумму оплаты');
      return;
    }
    const body: ContractDocumentPackagePaymentInput = {
      paymentDate: draft.paymentDate,
      amount: amountNum,
      paymentForm: draft.paymentForm,
      paymentType: option.paymentType,
      basis: option.label,
    };
    if (option.addendumNumber != null) {
      body.addendumNumber = option.addendumNumber;
    }
    setSaving(true);
    try {
      const created = await createContractDocumentPackagePayment(packageId, body);
      setRows((prev) =>
        [...prev, created].sort((a, b) => a.paymentDate.localeCompare(b.paymentDate))
      );
      const conduct: PackageCashOrderConductDraft = {
        paymentDate: draft.paymentDate,
        paymentForm: draft.paymentForm,
        paymentBasis: option.label,
        prepaymentAmount: conductAmount.trim(),
      };
      syncHubConductToContractForPko(conduct);
      onJournalChanged?.();
      setHubPaymentConductedNotice(true);
      resetHubConductForm();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Не удалось провести оплату');
    } finally {
      setSaving(false);
    }
  };

  const submitCreate = async () => {
    const amountNum = parseRubAmountString(form.contract.prepaymentAmount);
    if (amountNum == null || amountNum <= 0) {
      onError('Укажите корректную сумму оплаты (поле ниже — то же значение для ПКО и журнала)');
      return;
    }
    const basisRaw = form.contract.paymentBasis.trim();
    if (!basisRaw) {
      onError('Выберите или добавьте основание платежа');
      return;
    }
    const apiFields = paymentApiFieldsFromCustomBasis(basisRaw);
    const body: ContractDocumentPackagePaymentInput = {
      paymentDate: draft.paymentDate,
      amount: amountNum,
      paymentForm: draft.paymentForm,
      paymentType: apiFields.paymentType,
      basis: apiFields.basis || undefined,
    };
    if (apiFields.addendumNumber != null) {
      body.addendumNumber = apiFields.addendumNumber;
    }
    setSaving(true);
    try {
      const created = await createContractDocumentPackagePayment(packageId, body);
      setRows((prev) =>
        [...prev, created].sort((a, b) => a.paymentDate.localeCompare(b.paymentDate))
      );
      onJournalChanged?.();
      resetDraft();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Не удалось сохранить оплату');
    } finally {
      setSaving(false);
    }
  };

  return {
    saving,
    draft,
    setDraft,
    newBasisDraft,
    setNewBasisDraft,
    hubBasisKey,
    conductAmount,
    setConductAmount,
    hubPaymentConductedNotice,
    hubConductDateReady,
    hubConductAllBasesDone,
    hubConductFormComplete,
    hubConductBasisReady,
    handleHubBasisChange,
    handleHubPrintCashOrder,
    handleAppendBasisOption,
    submitHubConductPayment,
    submitCreate,
    basisSelectOptionsCreate,
  };
}
