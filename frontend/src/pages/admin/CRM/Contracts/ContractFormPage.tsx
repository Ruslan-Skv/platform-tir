'use client';

import { useCallback, useEffect, useState } from 'react';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { useAuth } from '@/features/auth';
import {
  type Contract,
  type ContractAmendment,
  type CrmDirection,
  type CrmUser,
  type Measurement,
  addContractAmendment,
  createContract,
  createContractPayment,
  deleteContractPayment,
  getContract,
  getCrmDirections,
  getCrmUsers,
  getMeasurements,
  updateContract,
  uploadContractActImage,
} from '@/shared/api/admin-crm';

import styles from './ContractFormPage.module.css';

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Черновик' },
  { value: 'ACTIVE', label: 'Активный' },
  { value: 'IN_PROGRESS', label: 'В работе' },
  { value: 'COMPLETED', label: 'Завершён' },
  { value: 'EXPIRED', label: 'Истёк' },
  { value: 'CANCELLED', label: 'Отменён' },
];

const PAYMENT_FORM_OPTIONS: { value: 'CASH' | 'TERMINAL' | 'QR' | 'INVOICE'; label: string }[] = [
  { value: 'CASH', label: 'Наличные' },
  { value: 'TERMINAL', label: 'Терминал' },
  { value: 'QR', label: 'QR-код' },
  { value: 'INVOICE', label: 'По счёту' },
];

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  PREPAYMENT: 'Предоплата',
  ADVANCE: 'Частичная оплата',
  FINAL: 'Окончательный расчёт',
  AMENDMENT: 'Оплата доп. соглашения',
};

const PAYMENT_FORM_LABELS: Record<string, string> = {
  CASH: 'Наличные',
  TERMINAL: 'Терминал',
  QR: 'QR-код',
  INVOICE: 'По счёту',
};

function formatDateForInput(s: string | null | undefined): string {
  if (!s) return '';
  return new Date(s).toISOString().slice(0, 10);
}

function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 11;
}

function getWorkingDaysBetween(start: Date, end: Date): number {
  if (start > end) return 0;
  let count = 0;
  const d = new Date(start);
  while (d <= end) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

function addWorkingDays(start: Date, n: number): Date {
  const d = new Date(start);
  let added = 0;
  while (added < n) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return d;
}

type FieldKey =
  | 'contractNumber'
  | 'contractDate'
  | 'customerName'
  | 'customerPhone'
  | 'totalAmount';

interface ContractFormPageProps {
  contractId?: string | null;
}

export function ContractFormPage({ contractId }: ContractFormPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const canDeletePayments = user?.role === 'SUPER_ADMIN';
  const [contractNumber, setContractNumber] = useState('');
  const [contractDate, setContractDate] = useState(formatDateForInput(new Date().toISOString()));
  const [contractDurationDays, setContractDurationDays] = useState<string>('');
  const [contractDurationType, setContractDurationType] = useState<'CALENDAR' | 'WORKING'>(
    'CALENDAR'
  );
  const [status, setStatus] = useState('DRAFT');
  const [directionId, setDirectionId] = useState('');
  const [managerId, setManagerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [discountRubles, setDiscountRubles] = useState('0');
  const [discountPercent, setDiscountPercent] = useState('0');
  const [totalAmount, setTotalAmount] = useState('');
  const [payments, setPayments] = useState<
    Array<{
      id: string;
      amount: string | number;
      paymentDate: string;
      paymentForm: string;
      paymentType: string;
      notes?: string | null;
    }>
  >([]);
  const [newPaymentAmount, setNewPaymentAmount] = useState('');
  const [newPaymentDate, setNewPaymentDate] = useState(
    formatDateForInput(new Date().toISOString())
  );
  const [newPaymentForm, setNewPaymentForm] = useState<'CASH' | 'TERMINAL' | 'QR' | 'INVOICE'>(
    'CASH'
  );
  const [newPaymentType, setNewPaymentType] = useState<string>('PREPAYMENT');
  const [installationDate, setInstallationDate] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [actWorkStartDate, setActWorkStartDate] = useState('');
  const [actWorkEndDate, setActWorkEndDate] = useState('');
  const [actWorkStartImages, setActWorkStartImages] = useState<string[]>([]);
  const [actWorkEndImages, setActWorkEndImages] = useState<string[]>([]);
  const [uploadingActImage, setUploadingActImage] = useState<'start' | 'end' | null>(null);
  const [amendments, setAmendments] = useState<ContractAmendment[]>([]);
  const [newAmendmentAmount, setNewAmendmentAmount] = useState('');
  const [newAmendmentDiscount, setNewAmendmentDiscount] = useState('0');
  const [newAmendmentDiscountType, setNewAmendmentDiscountType] = useState<'RUBLES' | 'PERCENT'>(
    'RUBLES'
  );
  const [newAmendmentDate, setNewAmendmentDate] = useState(
    formatDateForInput(new Date().toISOString())
  );
  const [newAmendmentDurationDays, setNewAmendmentDurationDays] = useState('');
  const [newAmendmentDurationType, setNewAmendmentDurationType] = useState<'CALENDAR' | 'WORKING'>(
    'CALENDAR'
  );
  const [notes, setNotes] = useState('');
  const [measurementId, setMeasurementId] = useState('');
  const [loading, setLoading] = useState(!!contractId);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [directions, setDirections] = useState<CrmDirection[]>([]);
  const [users, setUsers] = useState<CrmUser[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);

  const clearFieldError = useCallback((field: FieldKey) => {
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const showMessage = useCallback((type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  }, []);

  const loadContract = useCallback(async () => {
    if (!contractId) return;
    setLoading(true);
    try {
      const data = await getContract(contractId);
      setContractNumber(data.contractNumber);
      setContractDate(formatDateForInput(data.contractDate));
      const type =
        (data as Contract & { contractDurationType?: string }).contractDurationType ?? 'CALENDAR';
      setContractDurationType(type === 'WORKING' ? 'WORKING' : 'CALENDAR');
      const dur = (data as Contract).contractDurationDays ?? null;
      const vEnd = (data as Contract).validityEnd
        ? new Date((data as Contract).validityEnd!)
        : null;
      const cDate = data.contractDate ? new Date(data.contractDate) : null;
      if (dur != null) {
        setContractDurationDays(String(dur));
      } else if (vEnd && cDate) {
        const calDays = Math.round((vEnd.getTime() - cDate.getTime()) / (24 * 60 * 60 * 1000));
        const workDays = getWorkingDaysBetween(cDate, vEnd);
        setContractDurationDays(
          type === 'WORKING' ? String(workDays) : String(calDays > 0 ? calDays : '')
        );
      } else {
        setContractDurationDays('');
      }
      setStatus(data.status);
      setDirectionId(data.directionId ?? '');
      setManagerId(data.managerId ?? '');
      setCustomerName(data.customerName);
      setCustomerAddress(data.customerAddress ?? '');
      setCustomerPhone(data.customerPhone ?? '');
      const total = Number(data.totalAmount ?? 0);
      const disc = Number(data.discount ?? 0);
      setTotalAmount(String(data.totalAmount ?? ''));
      setDiscountRubles(String(disc));
      setDiscountPercent(total > 0 ? String(((disc / total) * 100).toFixed(2)) : '0');
      const loadedPayments = (data as Contract).payments ?? [];
      setPayments(
        loadedPayments.map((p) => ({
          id: p.id,
          amount: p.amount,
          paymentDate: p.paymentDate,
          paymentForm: p.paymentForm,
          paymentType: p.paymentType,
          notes: (p as { notes?: string | null }).notes,
        }))
      );
      setInstallationDate(formatDateForInput(data.installationDate));
      setDeliveryDate(formatDateForInput(data.deliveryDate));
      setActWorkStartDate(formatDateForInput((data as Contract).actWorkStartDate));
      setActWorkEndDate(formatDateForInput((data as Contract).actWorkEndDate));
      setActWorkStartImages((data as Contract).actWorkStartImages ?? []);
      setActWorkEndImages((data as Contract).actWorkEndImages ?? []);
      setAmendments((data as Contract).amendments ?? []);
      setNotes(data.notes ?? '');
      setMeasurementId((data as Contract & { measurementId?: string }).measurementId ?? '');
    } catch {
      showMessage('error', 'Ошибка загрузки договора');
    } finally {
      setLoading(false);
    }
  }, [contractId, showMessage]);

  useEffect(() => {
    loadContract();
  }, [loadContract]);

  useEffect(() => {
    if (contractId && searchParams.get('created') === '1') {
      showMessage('success', 'Договор создан');
      router.replace(`/admin/crm/contracts/${contractId}`, { scroll: false });
    }
  }, [contractId, searchParams, router, showMessage]);

  useEffect(() => {
    getCrmDirections()
      .then(setDirections)
      .catch(() => setDirections([]));
    getCrmUsers()
      .then(setUsers)
      .catch(() => setUsers([]));
    getMeasurements({ limit: 500 })
      .then((r) => setMeasurements(r.data))
      .catch(() => setMeasurements([]));
  }, []);

  const validate = (): boolean => {
    const errors: Partial<Record<FieldKey, string>> = {};
    if (!contractNumber.trim()) errors.contractNumber = 'Введите номер договора';
    if (!contractDate) errors.contractDate = 'Укажите дату заключения договора';
    if (!customerName.trim()) {
      errors.customerName = 'Введите ФИО заказчика';
    } else if (customerName.trim().length < 2) {
      errors.customerName = 'ФИО должно содержать минимум 2 символа';
    }
    if (!customerPhone.trim()) {
      errors.customerPhone = 'Введите телефон заказчика';
    } else if (!isValidPhone(customerPhone)) {
      errors.customerPhone =
        'Неверный формат телефона. Введите номер в формате: +7 (999) 123-45-67 или 8 999 123-45-67 (минимум 10 цифр)';
    }
    const total = parseFloat(totalAmount);
    if (isNaN(total) || total < 0) errors.totalAmount = 'Введите корректную стоимость';

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      const first = Object.values(errors)[0];
      if (first) showMessage('error', first);
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!validate()) return;

    setSaving(true);
    try {
      const payload = {
        contractNumber: contractNumber.trim(),
        contractDate,
        status,
        customerName: customerName.trim(),
        totalAmount: parseFloat(totalAmount),
        discount: parseFloat(discountRubles) || 0,
        advanceAmount: 0,
        ...(directionId && { directionId }),
        ...(managerId && { managerId }),
        ...(customerAddress.trim() && { customerAddress: customerAddress.trim() }),
        customerPhone: customerPhone.trim(),
        ...(installationDate && { installationDate }),
        ...(deliveryDate && { deliveryDate }),
        ...(actWorkStartDate && { actWorkStartDate }),
        ...(actWorkEndDate && { actWorkEndDate }),
        ...(contractDurationDays.trim() !== ''
          ? (() => {
              const n = parseInt(contractDurationDays, 10);
              if (isNaN(n) || n < 0) return {};
              const end =
                contractDurationType === 'CALENDAR'
                  ? (() => {
                      const d = new Date(contractDate);
                      d.setDate(d.getDate() + n);
                      return d;
                    })()
                  : addWorkingDays(new Date(contractDate), n);
              return {
                contractDurationDays: n,
                contractDurationType,
                validityEnd: end.toISOString().slice(0, 10),
              };
            })()
          : {}),
        actWorkStartImages,
        actWorkEndImages,
        ...(notes.trim() && { notes: notes.trim() }),
        ...(measurementId && { measurementId }),
      };

      if (contractId) {
        await updateContract(contractId, payload);
        showMessage('success', 'Договор обновлён');
      } else {
        const created = await createContract(payload);
        router.push(`/admin/crm/contracts/${created.id}?created=1`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ошибка сохранения';
      showMessage('error', msg);
      setFieldErrors({});
    } finally {
      setSaving(false);
    }
  };

  const managers = users.filter((u) =>
    [
      'SUPER_ADMIN',
      'ADMIN',
      'MODERATOR',
      'SUPPORT',
      'BRIGADIER',
      'LEAD_SPECIALIST_FURNITURE',
      'LEAD_SPECIALIST_WINDOWS_DOORS',
    ].includes(u.role)
  );

  const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);
  const total = parseFloat(totalAmount) || 0;
  const discount = parseFloat(discountRubles) || 0;
  const amendmentsTotal = amendments.reduce(
    (s, a) => s + Number(a.amount) - Number(a.discount ?? 0),
    0
  );
  const contractAmount = Math.max(0, total - discount);
  const effectiveAmount = contractAmount + amendmentsTotal;
  const remaining = Math.max(0, effectiveAmount - totalPaid);
  const paidPct = effectiveAmount > 0 ? (totalPaid / effectiveAmount) * 100 : 0;
  const remainingPct = effectiveAmount > 0 ? (remaining / effectiveAmount) * 100 : 0;

  const prepaymentCount = payments.filter((p) => p.paymentType === 'PREPAYMENT').length;
  const advanceCount = payments.filter((p) => p.paymentType === 'ADVANCE').length;
  const finalCount = payments.filter((p) => p.paymentType === 'FINAL').length;
  const canAddPrepayment = prepaymentCount < 1;
  const canAddAdvance = advanceCount < 5;
  const canAddFinal = finalCount < 1;
  const isAmendmentPayment = newPaymentType.startsWith('AMENDMENT_');
  const canAddPayment =
    (newPaymentType === 'PREPAYMENT' && canAddPrepayment) ||
    (newPaymentType === 'ADVANCE' && canAddAdvance) ||
    (newPaymentType === 'FINAL' && canAddFinal) ||
    isAmendmentPayment;

  const handleAddPayment = async () => {
    if (!contractId || !canAddPayment) return;
    const amt = parseFloat(newPaymentAmount);
    if (amt <= 0 || !newPaymentDate) return;
    try {
      const paymentType = isAmendmentPayment ? 'AMENDMENT' : newPaymentType;
      const amendmentNum = isAmendmentPayment
        ? newPaymentType.replace('AMENDMENT_', '')
        : undefined;
      const created = await createContractPayment({
        contractId,
        paymentDate: newPaymentDate,
        amount: amt,
        paymentForm: newPaymentForm,
        paymentType: paymentType as 'PREPAYMENT' | 'ADVANCE' | 'FINAL' | 'AMENDMENT',
        managerId: managerId || undefined,
        ...(amendmentNum && { notes: `ДС №${amendmentNum}` }),
      });
      setPayments((prev) => [
        ...prev,
        {
          id: created.id,
          amount: created.amount,
          paymentDate: created.paymentDate,
          paymentForm: created.paymentForm,
          paymentType: created.paymentType,
          notes: created.notes,
        },
      ]);
      setNewPaymentAmount('');
      showMessage('success', 'Оплата добавлена');
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Ошибка добавления оплаты');
    }
  };

  const UPLOADS_BASE =
    typeof window !== 'undefined'
      ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1').replace(
          /\/api\/v1\/?$/,
          ''
        )
      : '';

  const actImageUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${UPLOADS_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const handleActImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'start' | 'end'
  ) => {
    const file = e.target.files?.[0];
    if (!file || !contractId) return;
    const allowed = /\.(jpe?g|png|webp|gif)$/i.test(file.name);
    if (!allowed) {
      showMessage('error', 'Допустимы только jpg, png, webp, gif');
      return;
    }
    setUploadingActImage(type);
    try {
      const { imageUrl } = await uploadContractActImage(contractId, file, type);
      if (type === 'start') setActWorkStartImages((p) => [...p, imageUrl]);
      else setActWorkEndImages((p) => [...p, imageUrl]);
      showMessage('success', 'Фото загружено');
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setUploadingActImage(null);
      e.target.value = '';
    }
  };

  const handleRemoveActImage = async (type: 'start' | 'end', url: string) => {
    if (!contractId) return;
    const newStart =
      type === 'start' ? actWorkStartImages.filter((u) => u !== url) : actWorkStartImages;
    const newEnd = type === 'end' ? actWorkEndImages.filter((u) => u !== url) : actWorkEndImages;
    if (type === 'start') setActWorkStartImages(newStart);
    else setActWorkEndImages(newEnd);
    try {
      const payload =
        type === 'start' ? { actWorkStartImages: newStart } : { actWorkEndImages: newEnd };
      await updateContract(contractId, payload);
      showMessage('success', 'Фото удалено');
    } catch {
      if (type === 'start') setActWorkStartImages(actWorkStartImages);
      else setActWorkEndImages(actWorkEndImages);
      showMessage('error', 'Ошибка удаления');
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!contractId) return;
    try {
      await deleteContractPayment(paymentId);
      setPayments((prev) => prev.filter((p) => p.id !== paymentId));
      showMessage('success', 'Оплата удалена');
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Ошибка удаления оплаты');
    }
  };

  const handleAddAmendment = async () => {
    if (!contractId) return;
    const amt = parseFloat(newAmendmentAmount);
    if (isNaN(amt) || !newAmendmentDate) return;
    const durationDays = parseInt(newAmendmentDurationDays, 10);
    const discountInput = parseFloat(newAmendmentDiscount) || 0;
    const discountRubles =
      newAmendmentDiscountType === 'PERCENT' && amt > 0
        ? Math.round(amt * (discountInput / 100) * 100) / 100
        : discountInput;
    const payload: {
      amount: number;
      date: string;
      discount?: number;
      durationAdditionDays?: number;
      durationAdditionType?: string;
    } = {
      amount: amt,
      date: new Date(newAmendmentDate + 'T12:00:00').toISOString(),
      ...(discountRubles > 0 && { discount: discountRubles }),
    };
    if (!isNaN(durationDays) && durationDays > 0) {
      payload.durationAdditionDays = durationDays;
      payload.durationAdditionType = newAmendmentDurationType;
    }
    try {
      const created = await addContractAmendment(contractId, payload);
      setAmendments((prev) => [...prev, created].sort((a, b) => (a.number ?? 0) - (b.number ?? 0)));
      setNewAmendmentAmount('');
      setNewAmendmentDiscount('0');
      setNewAmendmentDiscountType('RUBLES');
      setNewAmendmentDurationDays('');
      showMessage('success', 'Доп. соглашение добавлено');
    } catch (err) {
      showMessage(
        'error',
        err instanceof Error ? err.message : 'Ошибка добавления доп. соглашения'
      );
    }
  };

  const baseValidityEnd =
    contractDate && contractDurationDays && parseInt(contractDurationDays, 10) > 0
      ? contractDurationType === 'CALENDAR'
        ? (() => {
            const d = new Date(contractDate);
            d.setDate(d.getDate() + parseInt(contractDurationDays, 10));
            return d;
          })()
        : addWorkingDays(new Date(contractDate), parseInt(contractDurationDays, 10))
      : null;

  const effectiveValidityEnd = (() => {
    if (!baseValidityEnd) return null;
    let end = new Date(baseValidityEnd);
    for (const a of amendments) {
      const days = a.durationAdditionDays ?? 0;
      if (days <= 0) continue;
      const type = a.durationAdditionType ?? 'CALENDAR';
      end =
        type === 'WORKING'
          ? addWorkingDays(end, days)
          : (() => {
              const d = new Date(end);
              d.setDate(d.getDate() + days);
              return d;
            })();
    }
    return end;
  })();

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>Загрузка...</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href="/admin/crm/contracts" className={styles.backLink}>
          ← К списку договоров
        </Link>
        <h1 className={styles.title}>{contractId ? 'Редактирование договора' : 'Новый договор'}</h1>
      </div>

      {message && (
        <div className={`${styles.message} ${styles[`message${message.type}`]}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.grid}>
          <div className={styles.row}>
            <label className={styles.label} htmlFor="contractNumber">
              № договора <span className={styles.required}>*</span>
            </label>
            <input
              id="contractNumber"
              type="text"
              value={contractNumber}
              onChange={(e) => {
                setContractNumber(e.target.value);
                clearFieldError('contractNumber');
              }}
              className={`${styles.input} ${fieldErrors.contractNumber ? styles.inputError : ''}`}
              placeholder="Д-2024-001"
              required
            />
            {fieldErrors.contractNumber && (
              <span className={styles.fieldError}>{fieldErrors.contractNumber}</span>
            )}
          </div>

          <div className={styles.row}>
            <label className={styles.label} htmlFor="contractDate">
              Дата заключения договора <span className={styles.required}>*</span>
            </label>
            <input
              id="contractDate"
              type="date"
              value={contractDate}
              onChange={(e) => {
                setContractDate(e.target.value);
                clearFieldError('contractDate');
              }}
              className={`${styles.input} ${fieldErrors.contractDate ? styles.inputError : ''}`}
              required
            />
            {fieldErrors.contractDate && (
              <span className={styles.fieldError}>{fieldErrors.contractDate}</span>
            )}
          </div>

          <div className={styles.row}>
            <label className={styles.label}>Срок договора</label>
            <div className={styles.durationBlock}>
              <div className={styles.durationTypeRow}>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="contractDurationType"
                    checked={contractDurationType === 'CALENDAR'}
                    onChange={() => setContractDurationType('CALENDAR')}
                  />
                  календарные дни
                </label>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="contractDurationType"
                    checked={contractDurationType === 'WORKING'}
                    onChange={() => setContractDurationType('WORKING')}
                  />
                  рабочие дни
                </label>
              </div>
              <input
                id="contractDurationDays"
                type="number"
                min={0}
                value={contractDurationDays}
                onChange={(e) => setContractDurationDays(e.target.value.replace(/\D/g, ''))}
                className={styles.input}
                placeholder="0"
              />
              {contractDurationDays &&
                contractDate &&
                (() => {
                  const n = parseInt(contractDurationDays, 10) || 0;
                  if (n <= 0) return null;
                  const endDate =
                    contractDurationType === 'CALENDAR'
                      ? (() => {
                          const d = new Date(contractDate);
                          d.setDate(d.getDate() + n);
                          return d;
                        })()
                      : addWorkingDays(new Date(contractDate), n);
                  const other =
                    contractDurationType === 'CALENDAR'
                      ? getWorkingDaysBetween(new Date(contractDate), endDate)
                      : Math.round(
                          (endDate.getTime() - new Date(contractDate).getTime()) /
                            (24 * 60 * 60 * 1000)
                        );
                  return (
                    <span className={styles.durationHint}>
                      {contractDurationType === 'CALENDAR' ? 'раб. дней: ' : 'кал. дней: '}
                      {other}
                    </span>
                  );
                })()}
            </div>
          </div>

          <div className={styles.row}>
            <label className={styles.label}>Расчётная дата окончания договора</label>
            <span className={styles.readonlyValue}>
              {effectiveValidityEnd
                ? effectiveValidityEnd.toLocaleDateString('ru-RU')
                : contractDate && contractDurationDays && parseInt(contractDurationDays, 10) > 0
                  ? contractDurationType === 'CALENDAR'
                    ? (() => {
                        const d = new Date(contractDate);
                        d.setDate(d.getDate() + parseInt(contractDurationDays, 10));
                        return d.toLocaleDateString('ru-RU');
                      })()
                    : addWorkingDays(
                        new Date(contractDate),
                        parseInt(contractDurationDays, 10)
                      ).toLocaleDateString('ru-RU')
                  : '—'}
              {amendments.some((a) => (a.durationAdditionDays ?? 0) > 0) && (
                <span className={styles.durationHint}> (с учётом д/с)</span>
              )}
            </span>
          </div>

          <div className={styles.row}>
            <label className={styles.label}>Статус</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={styles.select}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.row}>
            <label className={styles.label}>Направление</label>
            <select
              value={directionId}
              onChange={(e) => setDirectionId(e.target.value)}
              className={styles.select}
            >
              <option value="">— Выберите —</option>
              {directions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.row}>
            <label className={styles.label}>Менеджер</label>
            <select
              value={managerId}
              onChange={(e) => setManagerId(e.target.value)}
              className={styles.select}
            >
              <option value="">— Выберите —</option>
              {(managers.length ? managers : users).map((u) => (
                <option key={u.id} value={u.id}>
                  {[u.firstName, u.lastName].filter(Boolean).join(' ')}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.row}>
            <label className={styles.label}>Замер</label>
            <select
              value={measurementId}
              onChange={(e) => setMeasurementId(e.target.value)}
              className={styles.select}
            >
              <option value="">— Не привязан —</option>
              {measurements.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.customerName} ({new Date(m.receptionDate).toLocaleDateString('ru-RU')})
                </option>
              ))}
            </select>
          </div>

          <div className={styles.rowFull}>
            <label className={styles.label} htmlFor="customerName">
              ФИО заказчика <span className={styles.required}>*</span>
            </label>
            <input
              id="customerName"
              type="text"
              value={customerName}
              onChange={(e) => {
                setCustomerName(e.target.value);
                clearFieldError('customerName');
              }}
              className={`${styles.input} ${fieldErrors.customerName ? styles.inputError : ''}`}
              placeholder="Иванов Иван Иванович"
              required
            />
            {fieldErrors.customerName && (
              <span className={styles.fieldError}>{fieldErrors.customerName}</span>
            )}
          </div>

          <div className={styles.row}>
            <label className={styles.label}>Адрес</label>
            <input
              type="text"
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
              className={styles.input}
              placeholder="г. Мурманск, ул. Ленина, д. 1"
            />
          </div>

          <div className={styles.row}>
            <label className={styles.label} htmlFor="customerPhone">
              Телефон <span className={styles.required}>*</span>
            </label>
            <input
              id="customerPhone"
              type="tel"
              value={customerPhone}
              onChange={(e) => {
                setCustomerPhone(e.target.value);
                clearFieldError('customerPhone');
              }}
              className={`${styles.input} ${fieldErrors.customerPhone ? styles.inputError : ''}`}
              placeholder="+7 (999) 123-45-67 или 8 999 123-45-67"
              required
            />
            {fieldErrors.customerPhone && (
              <span className={styles.fieldError}>{fieldErrors.customerPhone}</span>
            )}
          </div>

          {parseFloat(discountRubles || '0') > 0 ? (
            <>
              <div className={styles.row}>
                <label className={styles.label} htmlFor="totalAmount">
                  Стоимость без скидки (₽) <span className={styles.required}>*</span>
                </label>
                <input
                  id="totalAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={totalAmount}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTotalAmount(val);
                    clearFieldError('totalAmount');
                    const total = parseFloat(val);
                    if (total > 0) {
                      const rubles = parseFloat(discountRubles) || 0;
                      setDiscountPercent(((rubles / total) * 100).toFixed(2));
                    }
                  }}
                  className={`${styles.input} ${fieldErrors.totalAmount ? styles.inputError : ''}`}
                  placeholder="0"
                  required
                />
                {fieldErrors.totalAmount && (
                  <span className={styles.fieldError}>{fieldErrors.totalAmount}</span>
                )}
              </div>
              <div className={styles.row}>
                <label className={styles.label}>Стоимость со скидкой (₽)</label>
                <input
                  type="text"
                  value={Math.max(
                    0,
                    (parseFloat(totalAmount) || 0) - (parseFloat(discountRubles) || 0)
                  ).toLocaleString('ru-RU', { maximumFractionDigits: 2 })}
                  readOnly
                  className={`${styles.input} ${styles.inputReadOnly}`}
                  tabIndex={-1}
                  aria-readonly
                />
              </div>
            </>
          ) : (
            <div className={styles.row}>
              <label className={styles.label} htmlFor="totalAmount">
                Стоимость (₽) <span className={styles.required}>*</span>
              </label>
              <input
                id="totalAmount"
                type="number"
                min="0"
                step="0.01"
                value={totalAmount}
                onChange={(e) => {
                  const val = e.target.value;
                  setTotalAmount(val);
                  clearFieldError('totalAmount');
                  const total = parseFloat(val);
                  if (total > 0) {
                    const rubles = parseFloat(discountRubles) || 0;
                    setDiscountPercent(((rubles / total) * 100).toFixed(2));
                  }
                }}
                className={`${styles.input} ${fieldErrors.totalAmount ? styles.inputError : ''}`}
                placeholder="0"
                required
              />
              {fieldErrors.totalAmount && (
                <span className={styles.fieldError}>{fieldErrors.totalAmount}</span>
              )}
            </div>
          )}

          <div className={styles.row}>
            <label className={styles.label}>Скидка (₽)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={discountRubles}
              onChange={(e) => {
                const rubles = e.target.value;
                setDiscountRubles(rubles);
                const total = parseFloat(totalAmount);
                if (total > 0) {
                  const val = parseFloat(rubles) || 0;
                  setDiscountPercent(((val / total) * 100).toFixed(2));
                }
              }}
              className={styles.input}
            />
          </div>

          <div className={styles.row}>
            <label className={styles.label}>Скидка (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={discountPercent}
              onChange={(e) => {
                const pct = e.target.value;
                setDiscountPercent(pct);
                const total = parseFloat(totalAmount);
                if (total > 0) {
                  const val = (parseFloat(pct) || 0) / 100;
                  setDiscountRubles((total * val).toFixed(2));
                }
              }}
              className={styles.input}
            />
          </div>

          <div className={`${styles.row} ${styles.rowFull}`}>
            <label className={styles.label}>Оплаты</label>
            <div className={styles.advancesBlock}>
              <div className={styles.advancesSummary}>
                {amendments.length > 0 && (
                  <span>
                    Итого с учётом д/с:{' '}
                    {effectiveAmount.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽
                  </span>
                )}
                <span>
                  Оплачено: {totalPaid.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽ (
                  {paidPct.toFixed(1)}%)
                </span>
                <span>
                  Остаток: {remaining.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽ (
                  {remainingPct.toFixed(1)}%)
                </span>
              </div>
              {contractId && (
                <>
                  <div className={styles.advancesList}>
                    {payments.map((p) => (
                      <div key={p.id} className={styles.advanceRow}>
                        <span>{Number(p.amount).toLocaleString('ru-RU')} ₽</span>
                        <span>{new Date(p.paymentDate).toLocaleDateString('ru-RU')}</span>
                        <span>
                          {p.paymentType === 'AMENDMENT' && p.notes
                            ? p.notes
                            : (PAYMENT_TYPE_LABELS[p.paymentType] ?? p.paymentType)}
                        </span>
                        <span>{PAYMENT_FORM_LABELS[p.paymentForm] ?? p.paymentForm}</span>
                        {canDeletePayments && (
                          <button
                            type="button"
                            className={styles.advanceRemoveBtn}
                            onClick={() => handleDeletePayment(p.id)}
                            title="Удалить оплату"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className={styles.advanceAdd}>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Сумма"
                      value={newPaymentAmount}
                      onChange={(e) => setNewPaymentAmount(e.target.value)}
                      className={styles.input}
                    />
                    <input
                      type="date"
                      value={newPaymentDate}
                      onChange={(e) => setNewPaymentDate(e.target.value)}
                      className={styles.input}
                    />
                    <select
                      value={newPaymentType}
                      onChange={(e) => setNewPaymentType(e.target.value)}
                      className={styles.select}
                    >
                      <option value="PREPAYMENT" disabled={!canAddPrepayment}>
                        Предоплата {!canAddPrepayment && '(уже есть)'}
                      </option>
                      <option value="ADVANCE" disabled={!canAddAdvance}>
                        Частичная оплата ({advanceCount}/5)
                      </option>
                      <option value="FINAL" disabled={!canAddFinal}>
                        Окончательный расчёт {!canAddFinal && '(уже есть)'}
                      </option>
                      {amendments.map((a, idx) => (
                        <option key={a.id} value={`AMENDMENT_${a.number ?? idx + 1}`}>
                          Оплата доп. соглашения №{a.number ?? idx + 1}
                        </option>
                      ))}
                    </select>
                    <select
                      value={newPaymentForm}
                      onChange={(e) =>
                        setNewPaymentForm(e.target.value as 'CASH' | 'TERMINAL' | 'QR' | 'INVOICE')
                      }
                      className={styles.select}
                    >
                      {PAYMENT_FORM_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className={styles.advanceAddBtn}
                      onClick={handleAddPayment}
                      disabled={
                        !canAddPayment || !newPaymentAmount || parseFloat(newPaymentAmount) <= 0
                      }
                    >
                      + Добавить оплату
                    </button>
                  </div>
                  <p className={styles.advancesHint}>
                    Данные синхронизированы с таблицей «Оплаты по договорам»
                  </p>
                </>
              )}
              {!contractId && (
                <p className={styles.advancesHint}>Оплаты добавляются после сохранения договора</p>
              )}
            </div>
          </div>

          {contractId && (
            <div className={`${styles.row} ${styles.rowFull}`}>
              <label className={styles.label}>Дополнительные соглашения</label>
              <div className={styles.advancesBlock}>
                <div className={styles.advancesList}>
                  {amendments.map((a, idx) => (
                    <div key={a.id} className={styles.advanceRow}>
                      <span>№{a.number ?? idx + 1}</span>
                      <span>{new Date(a.date).toLocaleDateString('ru-RU')}</span>
                      <span>
                        {Number(a.discount ?? 0) > 0 ? (
                          <>
                            без скидки:{' '}
                            {Number(a.amount) > 0
                              ? `+${Number(a.amount).toLocaleString('ru-RU')} ₽`
                              : Number(a.amount) < 0
                                ? `${Number(a.amount).toLocaleString('ru-RU')} ₽`
                                : '0 ₽'}
                            {' · '}
                            со скидкой:{' '}
                            {(() => {
                              const net = Number(a.amount) - Number(a.discount ?? 0);
                              return net > 0
                                ? `+${net.toLocaleString('ru-RU')} ₽`
                                : `${net.toLocaleString('ru-RU')} ₽`;
                            })()}
                          </>
                        ) : (
                          <>
                            {Number(a.amount) > 0
                              ? `+${Number(a.amount).toLocaleString('ru-RU')} ₽`
                              : Number(a.amount) < 0
                                ? `${Number(a.amount).toLocaleString('ru-RU')} ₽`
                                : 'без изменений'}
                          </>
                        )}
                      </span>
                      {(a.durationAdditionDays ?? 0) > 0 && (
                        <span>
                          +{a.durationAdditionDays}{' '}
                          {a.durationAdditionType === 'WORKING' ? 'раб.' : 'кал.'} дн.
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                {amendments.length < 5 && (
                  <div className={styles.advanceAdd}>
                    <div>
                      <label className={styles.advanceAddLabel}>
                        {parseFloat(newAmendmentDiscount || '0') > 0
                          ? 'Стоимость д/с без скидки'
                          : 'Стоимость д/с'}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="+/−/0"
                        value={newAmendmentAmount}
                        onChange={(e) => setNewAmendmentAmount(e.target.value)}
                        className={styles.input}
                      />
                      {parseFloat(newAmendmentDiscount || '0') > 0 &&
                        newAmendmentAmount !== '' &&
                        !isNaN(parseFloat(newAmendmentAmount)) &&
                        (() => {
                          const amt = parseFloat(newAmendmentAmount);
                          const disc =
                            newAmendmentDiscountType === 'PERCENT' && amt > 0
                              ? amt * (parseFloat(newAmendmentDiscount) / 100)
                              : parseFloat(newAmendmentDiscount) || 0;
                          const net = amt - disc;
                          return (
                            <span className={styles.durationHint}>
                              со скидкой:{' '}
                              {net > 0
                                ? `+${net.toLocaleString('ru-RU')} ₽`
                                : `${net.toLocaleString('ru-RU')} ₽`}
                            </span>
                          );
                        })()}
                    </div>
                    <div>
                      <label className={styles.advanceAddLabel}>Скидка д/с</label>
                      <div className={styles.advanceAddInline}>
                        <input
                          type="number"
                          min={0}
                          step={newAmendmentDiscountType === 'PERCENT' ? '0.01' : '0.01'}
                          max={newAmendmentDiscountType === 'PERCENT' ? 100 : undefined}
                          placeholder="0"
                          value={newAmendmentDiscount}
                          onChange={(e) => setNewAmendmentDiscount(e.target.value)}
                          className={styles.input}
                        />
                        <select
                          value={newAmendmentDiscountType}
                          onChange={(e) =>
                            setNewAmendmentDiscountType(e.target.value as 'RUBLES' | 'PERCENT')
                          }
                          className={styles.select}
                        >
                          <option value="RUBLES">₽</option>
                          <option value="PERCENT">%</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className={styles.advanceAddLabel}>Дата подписания д/с</label>
                      <input
                        type="date"
                        value={newAmendmentDate}
                        onChange={(e) => setNewAmendmentDate(e.target.value)}
                        className={styles.input}
                      />
                    </div>
                    <div>
                      <label className={styles.advanceAddLabel}>Увеличение срока по д/с</label>
                      <div className={styles.advanceAddInline}>
                        <input
                          type="number"
                          min={0}
                          placeholder="0"
                          value={newAmendmentDurationDays}
                          onChange={(e) =>
                            setNewAmendmentDurationDays(e.target.value.replace(/\D/g, ''))
                          }
                          className={styles.input}
                        />
                        <select
                          value={newAmendmentDurationType}
                          onChange={(e) =>
                            setNewAmendmentDurationType(e.target.value as 'CALENDAR' | 'WORKING')
                          }
                          className={styles.select}
                        >
                          <option value="CALENDAR">кал. дни</option>
                          <option value="WORKING">раб. дни</option>
                        </select>
                      </div>
                    </div>
                    <button
                      type="button"
                      className={styles.advanceAddBtn}
                      onClick={handleAddAmendment}
                      disabled={
                        !newAmendmentDate ||
                        newAmendmentAmount === '' ||
                        isNaN(parseFloat(newAmendmentAmount))
                      }
                    >
                      + Доп. соглашение
                    </button>
                  </div>
                )}
                <p className={styles.advancesHint}>
                  Стоимость: + увеличение, − уменьшение, 0 без изменений. Скидка: в ₽ или % от
                  суммы. Срок: только увеличение.
                </p>
              </div>
            </div>
          )}

          <div className={styles.row}>
            <label className={styles.label}>Дата монтажа</label>
            <input
              type="date"
              value={installationDate}
              onChange={(e) => setInstallationDate(e.target.value)}
              className={styles.input}
            />
          </div>

          <div className={styles.row}>
            <label className={styles.label}>Дата доставки</label>
            <input
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              className={styles.input}
            />
          </div>

          <div className={styles.row}>
            <label className={styles.label}>Дата начала работ</label>
            <input
              type="date"
              value={actWorkStartDate}
              onChange={(e) => setActWorkStartDate(e.target.value)}
              className={styles.input}
            />
          </div>

          <div className={`${styles.row} ${styles.rowFull}`}>
            <label className={styles.label}>Фото акта начала работ</label>
            <div className={styles.actImagesBlock}>
              <div className={styles.actImagesList}>
                {actWorkStartImages.map((url) => (
                  <div key={url} className={styles.actImageThumb}>
                    <img src={actImageUrl(url)} alt="" />
                    {canDeletePayments && (
                      <button
                        type="button"
                        className={styles.actImageRemove}
                        onClick={() => handleRemoveActImage('start', url)}
                        title="Удалить"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {contractId && (
                <label className={styles.actImageUploadBtn}>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={(e) => handleActImageUpload(e, 'start')}
                    disabled={!!uploadingActImage}
                  />
                  {uploadingActImage === 'start' ? 'Загрузка...' : '+ Добавить фото'}
                </label>
              )}
            </div>
          </div>

          <div className={styles.row}>
            <label className={styles.label}>Дата окончания работ</label>
            <input
              type="date"
              value={actWorkEndDate}
              onChange={(e) => setActWorkEndDate(e.target.value)}
              className={styles.input}
            />
          </div>

          <div className={`${styles.row} ${styles.rowFull}`}>
            <label className={styles.label}>Фото акта окончания работ</label>
            <div className={styles.actImagesBlock}>
              <div className={styles.actImagesList}>
                {actWorkEndImages.map((url) => (
                  <div key={url} className={styles.actImageThumb}>
                    <img src={actImageUrl(url)} alt="" />
                    {canDeletePayments && (
                      <button
                        type="button"
                        className={styles.actImageRemove}
                        onClick={() => handleRemoveActImage('end', url)}
                        title="Удалить"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {contractId && (
                <label className={styles.actImageUploadBtn}>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={(e) => handleActImageUpload(e, 'end')}
                    disabled={!!uploadingActImage}
                  />
                  {uploadingActImage === 'end' ? 'Загрузка...' : '+ Добавить фото'}
                </label>
              )}
            </div>
          </div>

          {(actWorkStartDate || actWorkEndDate) && (
            <div className={`${styles.row} ${styles.rowFull}`}>
              <label className={styles.label}>Срок договора</label>
              <div className={styles.durationBlock}>
                {actWorkStartDate && actWorkEndDate ? (
                  (() => {
                    const start = new Date(actWorkStartDate);
                    const end = new Date(actWorkEndDate);
                    const calendarDays =
                      Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                    const workingDays = getWorkingDaysBetween(start, end);
                    return (
                      <span>
                        {calendarDays} дн., {workingDays} раб. дн.
                      </span>
                    );
                  })()
                ) : (
                  <span className={styles.durationHint}>Укажите обе даты для расчёта срока</span>
                )}
              </div>
            </div>
          )}
        </div>

        <div className={styles.row}>
          <label className={styles.label}>Примечания</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={styles.textarea}
            rows={3}
            placeholder="Дополнительная информация..."
          />
        </div>

        <div className={styles.actions}>
          <button type="submit" className={styles.submitButton} disabled={saving}>
            {saving ? 'Сохранение...' : contractId ? 'Сохранить' : 'Создать договор'}
          </button>
          <Link href="/admin/crm/contracts" className={styles.cancelLink}>
            Отмена
          </Link>
        </div>
      </form>
    </div>
  );
}
