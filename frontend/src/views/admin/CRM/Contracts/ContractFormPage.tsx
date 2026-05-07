'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { useAuth } from '@/features/auth';
import {
  type ComplexObject,
  type Contract,
  type ContractAmendment,
  type CrmDirection,
  type CrmUser,
  type Measurement,
  type Office,
  addContractAmendment,
  createComplexObject,
  createContract,
  createContractPayment,
  deleteContractPayment,
  getComplexObject,
  getComplexObjectContracts,
  getContract,
  getCrmDirections,
  getCrmUsers,
  getMeasurements,
  getOffices,
  removeContractAmendment,
  updateComplexObject,
  updateContract,
  updateContractAmendment,
  uploadContractActImage,
} from '@/shared/api/admin-crm';
import { Modal } from '@/shared/ui/Modal';

import { ComplexObjectHistoryModal } from './ComplexObjectHistoryModal';
import styles from './ContractFormPage.module.css';
import { ContractHistoryModal } from './ContractHistoryModal';

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Черновик' },
  { value: 'ACTIVE', label: 'Активный' },
  { value: 'IN_PROGRESS', label: 'В работе' },
  { value: 'COMPLETED', label: 'Завершён' },
  { value: 'EXPIRED', label: 'Истёк' },
  { value: 'CANCELLED', label: 'Отменён' },
];

const PAYMENT_FORM_OPTIONS: {
  value: 'CASH' | 'TERMINAL' | 'QR' | 'INVOICE' | 'LC_TRANSFER';
  label: string;
}[] = [
  { value: 'CASH', label: 'Наличные' },
  { value: 'TERMINAL', label: 'Терминал' },
  { value: 'QR', label: 'QR-код' },
  { value: 'INVOICE', label: 'По счёту' },
  { value: 'LC_TRANSFER', label: 'Переводы на ЛК' },
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
  LC_TRANSFER: 'Переводы на ЛК',
};

/** Максимальное количество доп. соглашений (д/с) по одному договору */
const MAX_AMENDMENTS_PER_CONTRACT = 5;

/** Максимальное количество оплат по одному договору (предоплата, част. оплата, ок. расчёт, оплата д/с) */
const MAX_PAYMENTS_PER_CONTRACT = 7;

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

export function ContractFormPage({ contractId: initialContractId }: ContractFormPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  // Удалять оплаты (записи Кассы) может только супер-админ
  const canDeletePayments = user?.role === 'SUPER_ADMIN';
  const canEditAmendments = user?.role === 'SUPER_ADMIN';

  // Используем внутреннее состояние для текущего договора,
  // чтобы переключение между договорами не вызывало перемонтирование
  const [currentContractId, setCurrentContractId] = useState(initialContractId);

  // Синхронизируем с prop при первоначальной загрузке или переходе извне
  useEffect(() => {
    setCurrentContractId(initialContractId);
  }, [initialContractId]);

  // Используем currentContractId вместо contractId
  const contractId = currentContractId;

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
  const [discountValue, setDiscountValue] = useState('0');
  const [discountType, setDiscountType] = useState<'RUBLES' | 'PERCENT'>('RUBLES');
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
  const [newPaymentForm, setNewPaymentForm] = useState<
    'CASH' | 'TERMINAL' | 'QR' | 'INVOICE' | 'LC_TRANSFER'
  >('CASH');
  const [newPaymentType, setNewPaymentType] = useState<string>('PREPAYMENT');
  const [installationDate, setInstallationDate] = useState('');
  const [installationDurationDays, setInstallationDurationDays] = useState('');
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
  const [newAmendmentNotes, setNewAmendmentNotes] = useState('');
  const [notes, setNotes] = useState('');
  const [editingAmendment, setEditingAmendment] = useState<ContractAmendment | null>(null);
  const [amendmentToDelete, setAmendmentToDelete] = useState<ContractAmendment | null>(null);
  const [editAmendmentForm, setEditAmendmentForm] = useState<{
    amount: string;
    discount: string;
    date: string;
    durationDays: string;
    durationType: 'CALENDAR' | 'WORKING';
    notes: string;
  } | null>(null);
  const [measurementId, setMeasurementId] = useState('');
  const [loading, setLoading] = useState(!!contractId);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [directions, setDirections] = useState<CrmDirection[]>([]);
  const [users, setUsers] = useState<CrmUser[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [officeId, setOfficeId] = useState('');
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showComplexObjectHistoryModal, setShowComplexObjectHistoryModal] = useState(false);
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  // Комплексный объект
  const [complexObjectId, setComplexObjectId] = useState('');
  const [complexObject, setComplexObject] = useState<ComplexObject | null>(null);
  const [relatedContracts, setRelatedContracts] = useState<Contract[]>([]);
  const [activeTab, setActiveTab] = useState<'info' | 'contract'>('contract');
  // Поля формы общей информации объекта
  const [objName, setObjName] = useState('');
  const [objCustomerName, setObjCustomerName] = useState('');
  const [objCustomerPhones, setObjCustomerPhones] = useState<string[]>(['']);
  const [objAddress, setObjAddress] = useState('');
  const [objNotes, setObjNotes] = useState('');
  const [objHasElevator, setObjHasElevator] = useState<boolean | null>(null);
  const [objFloor, setObjFloor] = useState('');
  const [objOfficeId, setObjOfficeId] = useState('');
  const [objManagerId, setObjManagerId] = useState('');
  const [savingObjectInfo, setSavingObjectInfo] = useState(false);

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

  const loadContractById = useCallback(
    async (id: string, silent = false) => {
      if (!silent) setLoading(true);
      try {
        const data = await getContract(id);
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
        setOfficeId(data.officeId ?? '');
        setComplexObjectId(data.complexObjectId ?? '');
        // Если есть комплексный объект, загружаем его договоры
        if (data.complexObjectId) {
          getComplexObject(data.complexObjectId)
            .then((obj) => {
              setComplexObject(obj);
              // Заполняем форму общей информации
              setObjName(obj.name);
              setObjCustomerName(obj.customerName ?? '');
              setObjCustomerPhones(obj.customerPhones.length > 0 ? obj.customerPhones : ['']);
              setObjAddress(obj.address ?? '');
              setObjNotes(obj.notes ?? '');
              setObjHasElevator(obj.hasElevator);
              setObjFloor(obj.floor != null ? String(obj.floor) : '');
              setObjOfficeId(obj.officeId ?? '');
              setObjManagerId(obj.managerId ?? '');
            })
            .catch(() => setComplexObject(null));
          getComplexObjectContracts(data.complexObjectId)
            .then((contracts) => setRelatedContracts(contracts))
            .catch(() => setRelatedContracts([]));
        }
        setCustomerName(data.customerName);
        setCustomerAddress(data.customerAddress ?? '');
        setCustomerPhone(data.customerPhone ?? '');
        const total = Number(data.totalAmount ?? 0);
        const disc = Number(data.discount ?? 0);
        setTotalAmount(String(data.totalAmount ?? ''));
        setDiscountValue(String(disc));
        setDiscountType('RUBLES');
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
        const instDur = (data as Contract & { installationDurationDays?: number | null })
          .installationDurationDays;
        setInstallationDurationDays(instDur != null ? String(instDur) : '');
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
        if (!silent) setLoading(false);
      }
    },
    [showMessage]
  );

  // Ref для отслеживания внутреннего переключения (чтобы не делать двойную загрузку)
  const isInternalSwitch = useRef(false);

  // Функция переключения между договорами без перезагрузки страницы
  const switchToContract = useCallback(
    (id: string) => {
      if (id === contractId) return;
      isInternalSwitch.current = true;
      setCurrentContractId(id);
      // Обновляем URL без полной навигации
      window.history.pushState(null, '', `/admin/crm/contracts/${id}`);
      // Тихая загрузка без оверлея — чтобы вёрстка не дёргалась
      loadContractById(id, true);
      setActiveTab('contract');
    },
    [contractId, loadContractById]
  );

  useEffect(() => {
    // Пропускаем если это внутреннее переключение (уже загружено в switchToContract)
    if (isInternalSwitch.current) {
      isInternalSwitch.current = false;
      return;
    }
    if (contractId) {
      loadContractById(contractId);
    }
  }, [contractId, loadContractById]);

  useEffect(() => {
    if (contractId && searchParams?.get('created') === '1') {
      showMessage('success', 'Договор создан');
      router.replace(`/admin/crm/contracts/${contractId}`, { scroll: false });
    }
  }, [contractId, searchParams, router, showMessage]);

  // Обработка входящих параметров из URL при создании нового договора в рамках комплексного объекта
  useEffect(() => {
    if (!contractId) {
      const incomingComplexObjectId = searchParams?.get('complexObjectId');

      if (incomingComplexObjectId) {
        setComplexObjectId(incomingComplexObjectId);
        // Загружаем комплексный объект и его договоры
        getComplexObject(incomingComplexObjectId)
          .then((obj) => {
            setComplexObject(obj);
            // Заполняем форму общей информации
            setObjName(obj.name);
            setObjCustomerName(obj.customerName ?? '');
            setObjCustomerPhones(obj.customerPhones.length > 0 ? obj.customerPhones : ['']);
            setObjAddress(obj.address ?? '');
            setObjNotes(obj.notes ?? '');
            setObjHasElevator(obj.hasElevator);
            setObjFloor(obj.floor != null ? String(obj.floor) : '');
            setObjOfficeId(obj.officeId ?? '');
            setObjManagerId(obj.managerId ?? '');
            // Заполняем данные заказчика в договоре из объекта
            setCustomerName(obj.customerName ?? '');
            setCustomerPhone(obj.customerPhones[0] ?? '');
            setCustomerAddress(obj.address ?? '');
            // Устанавливаем офис и менеджера
            if (obj.officeId) setOfficeId(obj.officeId);
            if (obj.managerId) setManagerId(obj.managerId);
          })
          .catch(() => setComplexObject(null));
        getComplexObjectContracts(incomingComplexObjectId)
          .then(setRelatedContracts)
          .catch(() => setRelatedContracts([]));
      }
    }
  }, [contractId, searchParams]);

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
    getOffices()
      .then(setOffices)
      .catch(() => setOffices([]));
  }, []);

  const validate = (): boolean => {
    const errors: Partial<Record<FieldKey, string>> = {};
    if (!contractNumber.trim()) errors.contractNumber = 'Введите номер договора';
    if (!contractDate) errors.contractDate = 'Укажите дату заключения договора';
    // Валидация данных заказчика только если нет комплексного объекта
    if (!complexObjectId) {
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
        // customerName, customerAddress, customerPhone, managerId, officeId
        // будут взяты из комплексного объекта на бэкенде, если не переданы
        ...(customerName.trim() && { customerName: customerName.trim() }),
        totalAmount: parseFloat(totalAmount),
        discount:
          discountType === 'RUBLES'
            ? parseFloat(discountValue) || 0
            : (parseFloat(totalAmount) || 0) * ((parseFloat(discountValue) || 0) / 100),
        advanceAmount: 0,
        ...(directionId && { directionId }),
        ...(managerId && { managerId }),
        ...(officeId && { officeId }),
        ...(complexObjectId && { complexObjectId }),
        ...(customerAddress.trim() && { customerAddress: customerAddress.trim() }),
        ...(customerPhone.trim() && { customerPhone: customerPhone.trim() }),
        ...(installationDate && { installationDate }),
        installationDurationDays:
          installationDurationDays.trim() !== '' && parseInt(installationDurationDays, 10) >= 0
            ? parseInt(installationDurationDays, 10)
            : null,
        ...(deliveryDate && { deliveryDate }),
        ...(actWorkStartDate && { actWorkStartDate }),
        ...(contractId
          ? { actWorkEndDate: actWorkEndDate || null }
          : actWorkEndDate
            ? { actWorkEndDate }
            : {}),
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

  // Создание нового договора в рамках комплексного объекта
  const handleAddNewContractTab = async () => {
    if (!contractId) return;

    try {
      let objectId = complexObjectId;

      // Если комплексный объект ещё не создан, создаём его
      if (!objectId) {
        const newObject = await createComplexObject({
          name: customerName || `Объект от ${new Date().toLocaleDateString('ru-RU')}`,
          customerName: customerName || undefined,
          customerPhones: customerPhone ? [customerPhone] : [],
          address: customerAddress || undefined,
        });
        objectId = newObject.id;
        setComplexObjectId(objectId);
        setComplexObject(newObject);
        // Заполняем форму общей информации
        setObjName(newObject.name);
        setObjCustomerName(newObject.customerName ?? '');
        setObjCustomerPhones(newObject.customerPhones.length > 0 ? newObject.customerPhones : ['']);
        setObjAddress(newObject.address ?? '');
        // Привязываем текущий договор к комплексному объекту
        await updateContract(contractId, { complexObjectId: objectId });
      }

      // Переходим на страницу создания нового договора с привязкой к объекту
      router.push(`/admin/crm/contracts/new?complexObjectId=${objectId}`);
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Ошибка создания объекта');
    }
  };

  // Сохранение общей информации объекта
  const handleSaveObjectInfo = async () => {
    if (!complexObjectId) return;
    setSavingObjectInfo(true);
    try {
      const phones = objCustomerPhones.filter((p) => p.trim() !== '');
      const floorNum = objFloor.trim() ? parseInt(objFloor, 10) : null;
      const updated = await updateComplexObject(complexObjectId, {
        name: objName.trim() || null,
        customerName: objCustomerName.trim() || null,
        customerPhones: phones,
        address: objAddress.trim() || null,
        notes: objNotes.trim() || null,
        hasElevator: objHasElevator,
        floor: !isNaN(floorNum as number) ? floorNum : null,
        officeId: objOfficeId || null,
        managerId: objManagerId || null,
      });
      setComplexObject(updated);
      showMessage('success', 'Общая информация сохранена');
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setSavingObjectInfo(false);
    }
  };

  // Добавление/удаление телефона
  const handleAddPhone = () => {
    setObjCustomerPhones([...objCustomerPhones, '']);
  };
  const handleRemovePhone = (index: number) => {
    setObjCustomerPhones(objCustomerPhones.filter((_, i) => i !== index));
  };
  const handlePhoneChange = (index: number, value: string) => {
    const newPhones = [...objCustomerPhones];
    newPhones[index] = value;
    setObjCustomerPhones(newPhones);
  };

  const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);
  const total = parseFloat(totalAmount) || 0;
  const discount =
    discountType === 'RUBLES'
      ? parseFloat(discountValue) || 0
      : total * ((parseFloat(discountValue) || 0) / 100);
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
    payments.length < MAX_PAYMENTS_PER_CONTRACT &&
    ((newPaymentType === 'PREPAYMENT' && canAddPrepayment) ||
      (newPaymentType === 'ADVANCE' && canAddAdvance) ||
      (newPaymentType === 'FINAL' && canAddFinal) ||
      isAmendmentPayment);

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
      showMessage('success', 'Оплата добавлена и отражена в Кассе');
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
    if (newAmendmentNotes.trim()) {
      (payload as { notes?: string }).notes = newAmendmentNotes.trim();
    }
    try {
      const created = await addContractAmendment(contractId, payload);
      setAmendments((prev) => [...prev, created].sort((a, b) => (a.number ?? 0) - (b.number ?? 0)));
      setNewAmendmentAmount('');
      setNewAmendmentDiscount('0');
      setNewAmendmentDiscountType('RUBLES');
      setNewAmendmentDurationDays('');
      setNewAmendmentNotes('');
      showMessage('success', 'Доп. соглашение добавлено');
    } catch (err) {
      showMessage(
        'error',
        err instanceof Error ? err.message : 'Ошибка добавления доп. соглашения'
      );
    }
  };

  const handleDeleteAmendment = async () => {
    if (!contractId || !amendmentToDelete) return;
    const amendmentId = amendmentToDelete.id;
    setAmendmentToDelete(null);
    try {
      await removeContractAmendment(contractId, amendmentId);
      setAmendments((prev) => prev.filter((a) => a.id !== amendmentId));
      showMessage('success', 'Доп. соглашение удалено');
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Ошибка удаления доп. соглашения');
    }
  };

  const openEditAmendment = (a: ContractAmendment) => {
    setEditingAmendment(a);
    setEditAmendmentForm({
      amount: String(a.amount),
      discount: String(a.discount ?? 0),
      date: a.date ? formatDateForInput(a.date) : '',
      durationDays: String(a.durationAdditionDays ?? ''),
      durationType: (a.durationAdditionType as 'CALENDAR' | 'WORKING') ?? 'CALENDAR',
      notes: a.notes ?? '',
    });
  };

  const closeEditAmendment = () => {
    setEditingAmendment(null);
    setEditAmendmentForm(null);
  };

  const handleSaveAmendmentEdit = async () => {
    if (!contractId || !editingAmendment || !editAmendmentForm) return;
    const amt = parseFloat(editAmendmentForm.amount);
    const discountVal = parseFloat(editAmendmentForm.discount) || 0;
    const dateStr = editAmendmentForm.date;
    if (!dateStr || isNaN(amt)) {
      showMessage('error', 'Укажите дату и сумму');
      return;
    }
    const payload: {
      amount: number;
      date: string;
      discount?: number;
      durationAdditionDays?: number | null;
      durationAdditionType?: string | null;
      notes?: string | null;
    } = {
      amount: amt,
      date: new Date(dateStr + 'T12:00:00').toISOString(),
      discount: discountVal > 0 ? discountVal : undefined,
      notes: editAmendmentForm.notes.trim() || undefined,
    };
    const dur = parseInt(editAmendmentForm.durationDays, 10);
    if (!isNaN(dur) && dur > 0) {
      payload.durationAdditionDays = dur;
      payload.durationAdditionType = editAmendmentForm.durationType;
    } else {
      payload.durationAdditionDays = null;
      payload.durationAdditionType = null;
    }
    try {
      const updated = await updateContractAmendment(contractId, editingAmendment.id, payload);
      setAmendments((prev) => prev.map((a) => (a.id === editingAmendment.id ? updated : a)));
      closeEditAmendment();
      showMessage('success', 'Доп. соглашение обновлено');
    } catch (err) {
      showMessage(
        'error',
        err instanceof Error ? err.message : 'Ошибка обновления доп. соглашения'
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

  return (
    <div className={styles.page}>
      {/* Оверлей загрузки поверх контента */}
      {loading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingSpinner}>Загрузка...</div>
        </div>
      )}

      <div className={styles.header}>
        <Link href="/admin/crm/contracts" className={styles.backLink}>
          ← К списку договоров
        </Link>
        <div className={styles.headerTitleRow}>
          <h1 className={styles.title}>
            {contractId ? 'Редактирование договора' : 'Новый договор'}
          </h1>
          {contractId && (
            <button
              type="button"
              className={styles.historyButton}
              onClick={() => setShowHistoryModal(true)}
              title="История изменений"
            >
              📋 История
            </button>
          )}
        </div>

        {/* Вкладки договоров комплексного объекта */}
        {(contractId || complexObjectId) && (
          <div className={styles.contractTabs}>
            <div className={styles.tabsList}>
              {/* Вкладка "Общая информация" */}
              {complexObjectId && (
                <button
                  type="button"
                  className={`${styles.tab} ${styles.tabInfo} ${activeTab === 'info' ? styles.tabActive : ''}`}
                  onClick={() => setActiveTab('info')}
                  title="Общая информация объекта"
                >
                  🏠
                </button>
              )}

              {/* Все договоры объекта */}
              {relatedContracts.map((rc) => (
                <button
                  key={rc.id}
                  type="button"
                  className={`${styles.tab} ${rc.id === contractId && activeTab === 'contract' ? styles.tabActive : ''}`}
                  onClick={() => {
                    if (rc.id === contractId) {
                      setActiveTab('contract');
                    } else {
                      switchToContract(rc.id);
                    }
                  }}
                  title={rc.direction?.name || 'Договор'}
                >
                  {rc.contractNumber}
                </button>
              ))}

              {/* Вкладка "Новый договор" - только при создании нового */}
              {!contractId && (
                <button
                  type="button"
                  className={`${styles.tab} ${activeTab === 'contract' ? styles.tabActive : ''}`}
                  onClick={() => setActiveTab('contract')}
                  title="Новый договор"
                >
                  +
                </button>
              )}

              {/* Кнопка добавления нового договора (только для существующих договоров) */}
              {contractId && (
                <button
                  type="button"
                  className={styles.tabAddButton}
                  onClick={handleAddNewContractTab}
                  title="Добавить договор по этому же объекту"
                >
                  +
                </button>
              )}

              {/* Кнопка План-график (только для комплексных объектов) */}
              {complexObjectId && (
                <button
                  type="button"
                  className={styles.timelineButton}
                  onClick={() => setShowTimelineModal(true)}
                  title="Показать план-график по объекту"
                >
                  📊 План-график
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {message && (
        <div className={`${styles.message} ${styles[`message${message.type}`]}`}>
          {message.text}
        </div>
      )}

      {/* Форма общей информации объекта */}
      {activeTab === 'info' && complexObjectId && (
        <div className={styles.objectInfoForm}>
          <h2 className={styles.sectionTitle}>Общая информация объекта</h2>
          <p className={styles.sectionHint}>
            Эти данные будут общими для всех договоров этого объекта
          </p>

          <div className={styles.grid}>
            <div className={styles.row}>
              <label className={styles.label}>Название объекта</label>
              <input
                type="text"
                value={objName}
                onChange={(e) => setObjName(e.target.value)}
                placeholder="Например: Квартира Иванова"
                className={styles.input}
              />
            </div>

            <div className={styles.row}>
              <label className={styles.label}>Офис</label>
              <select
                value={objOfficeId}
                onChange={(e) => setObjOfficeId(e.target.value)}
                className={styles.select}
              >
                <option value="">— Выберите офис —</option>
                {offices.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.row}>
              <label className={styles.label}>Менеджер</label>
              <select
                value={objManagerId}
                onChange={(e) => setObjManagerId(e.target.value)}
                className={styles.select}
              >
                <option value="">— Выберите менеджера —</option>
                {managers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {[u.firstName, u.lastName].filter(Boolean).join(' ')}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.row}>
              <label className={styles.label}>ФИО заказчика</label>
              <input
                type="text"
                value={objCustomerName}
                onChange={(e) => setObjCustomerName(e.target.value)}
                placeholder="Иванов Иван Иванович"
                className={styles.input}
              />
            </div>

            <div className={styles.row}>
              <label className={styles.label}>Адрес заказчика</label>
              <textarea
                value={objAddress}
                onChange={(e) => setObjAddress(e.target.value)}
                placeholder="г. Москва, ул. Примерная, д. 1, кв. 1"
                className={styles.textarea}
                rows={2}
              />
            </div>

            <div className={styles.row}>
              <label className={styles.label}>Этаж</label>
              <input
                type="number"
                min={1}
                value={objFloor}
                onChange={(e) => setObjFloor(e.target.value)}
                placeholder="1"
                className={styles.input}
              />
            </div>

            <div className={styles.row}>
              <label className={styles.label}>Лифт</label>
              <select
                value={objHasElevator === null ? '' : objHasElevator ? 'yes' : 'no'}
                onChange={(e) => {
                  if (e.target.value === '') setObjHasElevator(null);
                  else setObjHasElevator(e.target.value === 'yes');
                }}
                className={styles.select}
              >
                <option value="">— Не указано —</option>
                <option value="yes">Есть</option>
                <option value="no">Нет</option>
              </select>
            </div>

            <div className={styles.row}>
              <label className={styles.label}>Телефоны заказчика</label>
              <div className={styles.phonesBlock}>
                {objCustomerPhones.map((phone, index) => (
                  <div key={index} className={styles.phoneRow}>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => handlePhoneChange(index, e.target.value)}
                      placeholder="+7 (999) 123-45-67"
                      className={styles.input}
                    />
                    {objCustomerPhones.length > 1 && (
                      <button
                        type="button"
                        className={styles.removePhoneBtn}
                        onClick={() => handleRemovePhone(index)}
                        title="Удалить телефон"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" className={styles.addPhoneBtn} onClick={handleAddPhone}>
                  + Добавить телефон
                </button>
              </div>
            </div>

            <div className={styles.rowFull}>
              <label className={styles.label}>Примечание</label>
              <textarea
                value={objNotes}
                onChange={(e) => setObjNotes(e.target.value)}
                placeholder="Дополнительная информация по объекту..."
                className={styles.textarea}
                rows={3}
              />
            </div>
          </div>

          <div className={styles.formActions}>
            <button
              type="button"
              className={styles.historyButton}
              onClick={() => setShowComplexObjectHistoryModal(true)}
              title="История изменений объекта"
            >
              История
            </button>
            <button
              type="button"
              className={styles.submitButton}
              onClick={handleSaveObjectInfo}
              disabled={savingObjectInfo}
            >
              {savingObjectInfo ? 'Сохранение...' : 'Сохранить общую информацию'}
            </button>
          </div>
        </div>
      )}

      {showComplexObjectHistoryModal && complexObjectId && (
        <ComplexObjectHistoryModal
          complexObjectId={complexObjectId}
          objectName={complexObject?.name}
          users={managers}
          onClose={() => setShowComplexObjectHistoryModal(false)}
          onRollback={() => {
            getComplexObject(complexObjectId).then(setComplexObject);
            setShowComplexObjectHistoryModal(false);
          }}
        />
      )}

      {/* Форма договора */}
      {activeTab === 'contract' && (
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

            {/* Менеджер и Офис показываются только если нет комплексного объекта */}
            {!complexObjectId && (
              <>
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
                  <label className={styles.label}>Офис</label>
                  <select
                    value={officeId}
                    onChange={(e) => setOfficeId(e.target.value)}
                    className={styles.select}
                  >
                    <option value="">— Выберите офис —</option>
                    {offices.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

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

            <div className={styles.row}>
              <label className={styles.label}>Скидка</label>
              <div className={styles.advanceAddInline}>
                <input
                  type="number"
                  min={0}
                  step={discountType === 'PERCENT' ? '0.01' : '0.01'}
                  max={discountType === 'PERCENT' ? 100 : undefined}
                  placeholder="0"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  className={styles.input}
                />
                <select
                  value={discountType}
                  onChange={(e) => {
                    const newType = e.target.value as 'RUBLES' | 'PERCENT';
                    const tot = parseFloat(totalAmount) || 0;
                    const val = parseFloat(discountValue) || 0;
                    if (newType === 'PERCENT' && discountType === 'RUBLES' && tot > 0 && val > 0) {
                      setDiscountValue(((val / tot) * 100).toFixed(2));
                    } else if (
                      newType === 'RUBLES' &&
                      discountType === 'PERCENT' &&
                      tot > 0 &&
                      val > 0
                    ) {
                      setDiscountValue((tot * (val / 100)).toFixed(2));
                    }
                    setDiscountType(newType);
                  }}
                  className={styles.select}
                >
                  <option value="RUBLES">₽</option>
                  <option value="PERCENT">%</option>
                </select>
              </div>
              {discountType === 'PERCENT' && total > 0 && parseFloat(discountValue || '0') > 0 && (
                <span className={styles.discountHint}>
                  =
                  {(total * (parseFloat(discountValue) / 100)).toLocaleString('ru-RU', {
                    maximumFractionDigits: 0,
                  })}{' '}
                  ₽
                </span>
              )}
            </div>

            {discount > 0 ? (
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
                      setTotalAmount(e.target.value);
                      clearFieldError('totalAmount');
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
                    value={Math.max(0, total - discount).toLocaleString('ru-RU', {
                      maximumFractionDigits: 2,
                    })}
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
                    setTotalAmount(e.target.value);
                    clearFieldError('totalAmount');
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

            {/* Данные заказчика показываются только если нет комплексного объекта */}
            {!complexObjectId && (
              <>
                <div className={styles.rowHalf}>
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

                <div className={styles.rowHalf}>
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
              </>
            )}

            <div className={`${styles.row} ${styles.rowFull}`}>
              <label className={`${styles.label} ${styles.labelBold}`}>
                Оплаты
                {payments.length >= MAX_PAYMENTS_PER_CONTRACT && (
                  <span className={styles.durationHint}>
                    {' '}
                    (макс. {MAX_PAYMENTS_PER_CONTRACT} оплат: предоплата, част. оплата, ок. расчёт,
                    оплата д/с)
                  </span>
                )}
              </label>
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
                    {payments.length < MAX_PAYMENTS_PER_CONTRACT ? (
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
                            setNewPaymentForm(
                              e.target.value as
                                | 'CASH'
                                | 'TERMINAL'
                                | 'QR'
                                | 'INVOICE'
                                | 'LC_TRANSFER'
                            )
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
                    ) : (
                      <p className={styles.durationHint}>
                        Достигнут лимит: не более {MAX_PAYMENTS_PER_CONTRACT} оплат по договору
                        (предоплата, частичная оплата, окончательный расчёт, оплата д/с).
                      </p>
                    )}
                    <p className={styles.advancesHint}>
                      Данные синхронизированы с таблицей «Движ. ден. средст»
                    </p>
                  </>
                )}
                {!contractId && (
                  <p className={styles.advancesHint}>
                    Оплаты добавляются после сохранения договора
                  </p>
                )}
              </div>
            </div>

            {contractId && (
              <div className={`${styles.row} ${styles.rowFull}`}>
                <label className={`${styles.label} ${styles.labelBold}`}>
                  Дополнительные соглашения
                  {amendments.length >= MAX_AMENDMENTS_PER_CONTRACT && (
                    <span className={styles.durationHint}>
                      {' '}
                      (макс. {MAX_AMENDMENTS_PER_CONTRACT} д/с по договору)
                    </span>
                  )}
                </label>
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
                        {a.notes && (
                          <span className={styles.advanceNotes} title={a.notes}>
                            {a.notes}
                          </span>
                        )}
                        {canEditAmendments && (
                          <div
                            className={styles.advanceActions}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              className={styles.advanceActionBtn}
                              onClick={() => openEditAmendment(a)}
                              title="Редактировать"
                            >
                              ✏️
                            </button>
                            <button
                              type="button"
                              className={`${styles.advanceActionBtn} ${styles.advanceActionBtnDanger}`}
                              onClick={() => setAmendmentToDelete(a)}
                              title="Удалить"
                            >
                              🗑️
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {amendments.length < MAX_AMENDMENTS_PER_CONTRACT && (
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
                      <div className={styles.advanceAddNotes}>
                        <label className={styles.advanceAddLabel}>Примечание</label>
                        <input
                          type="text"
                          placeholder="Опционально"
                          value={newAmendmentNotes}
                          onChange={(e) => setNewAmendmentNotes(e.target.value)}
                          className={styles.input}
                        />
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

            <div className={`${styles.row} ${styles.rowFull}`}>
              <div className={styles.installationRow}>
                <div className={styles.installationDateCol}>
                  <label className={styles.label}>Дата монтажа</label>
                  <input
                    type="date"
                    value={installationDate}
                    onChange={(e) => setInstallationDate(e.target.value)}
                    className={styles.input}
                  />
                </div>
                <div className={styles.installationDurationCol}>
                  <label className={styles.label}>Продолжительность монтажа (дн.)</label>
                  <input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={installationDurationDays}
                    onChange={(e) => setInstallationDurationDays(e.target.value.replace(/\D/g, ''))}
                    className={styles.input}
                  />
                </div>
                <div className={styles.installationDateCol}>
                  <label className={styles.label}>Дата доставки</label>
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className={styles.input}
                  />
                </div>
              </div>
            </div>

            <div className={`${styles.rowFull} ${styles.actDatePhotoRow}`}>
              <div className={styles.actDateCol}>
                <label className={styles.label}>Дата начала работ</label>
                <input
                  type="date"
                  value={actWorkStartDate}
                  onChange={(e) => setActWorkStartDate(e.target.value)}
                  className={styles.input}
                />
              </div>
              <div className={styles.actPhotosCol}>
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
              <div className={styles.actDateCol}>
                <label className={styles.label}>Дата сдачи работ</label>
                <div className={styles.dateInputWithClear}>
                  <input
                    type="date"
                    value={actWorkEndDate}
                    onChange={(e) => setActWorkEndDate(e.target.value)}
                    className={styles.input}
                  />
                  {actWorkEndDate && (
                    <button
                      type="button"
                      className={styles.dateClearBtn}
                      onClick={() => setActWorkEndDate('')}
                      title="Удалить дату"
                      aria-label="Удалить дату"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
              <div className={styles.actPhotosCol}>
                <label className={styles.label}>Фото акта сдачи работ</label>
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
            <label className={styles.label}>Примечание</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={styles.textarea}
              rows={2}
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
      )}

      {editingAmendment && editAmendmentForm && (
        <Modal
          isOpen={!!editingAmendment}
          onClose={closeEditAmendment}
          title={`Редактировать доп. соглашение №${editingAmendment.number ?? ''}`}
          size="md"
        >
          <div className={styles.editAmendmentForm}>
            <div>
              <label className={styles.advanceAddLabel}>Стоимость д/с</label>
              <input
                type="number"
                step="0.01"
                value={editAmendmentForm.amount}
                onChange={(e) =>
                  setEditAmendmentForm((prev) =>
                    prev ? { ...prev, amount: e.target.value } : prev
                  )
                }
                className={styles.input}
              />
            </div>
            <div>
              <label className={styles.advanceAddLabel}>Скидка д/с (₽)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={editAmendmentForm.discount}
                onChange={(e) =>
                  setEditAmendmentForm((prev) =>
                    prev ? { ...prev, discount: e.target.value } : prev
                  )
                }
                className={styles.input}
              />
            </div>
            <div>
              <label className={styles.advanceAddLabel}>Дата подписания</label>
              <input
                type="date"
                value={editAmendmentForm.date}
                onChange={(e) =>
                  setEditAmendmentForm((prev) => (prev ? { ...prev, date: e.target.value } : prev))
                }
                className={styles.input}
              />
            </div>
            <div>
              <label className={styles.advanceAddLabel}>Увеличение срока (дней)</label>
              <div className={styles.advanceAddInline}>
                <input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={editAmendmentForm.durationDays}
                  onChange={(e) =>
                    setEditAmendmentForm((prev) =>
                      prev ? { ...prev, durationDays: e.target.value.replace(/\D/g, '') } : prev
                    )
                  }
                  className={styles.input}
                />
                <select
                  value={editAmendmentForm.durationType}
                  onChange={(e) =>
                    setEditAmendmentForm((prev) =>
                      prev
                        ? { ...prev, durationType: e.target.value as 'CALENDAR' | 'WORKING' }
                        : prev
                    )
                  }
                  className={styles.select}
                >
                  <option value="CALENDAR">кал. дни</option>
                  <option value="WORKING">раб. дни</option>
                </select>
              </div>
            </div>
            <div>
              <label className={styles.advanceAddLabel}>Примечание</label>
              <input
                type="text"
                value={editAmendmentForm.notes}
                onChange={(e) =>
                  setEditAmendmentForm((prev) => (prev ? { ...prev, notes: e.target.value } : prev))
                }
                className={styles.input}
              />
            </div>
            <div className={styles.editAmendmentActions}>
              <button type="button" className={styles.cancelLink} onClick={closeEditAmendment}>
                Отмена
              </button>
              <button
                type="button"
                className={styles.submitButton}
                onClick={handleSaveAmendmentEdit}
              >
                Сохранить
              </button>
            </div>
          </div>
        </Modal>
      )}

      {amendmentToDelete && (
        <Modal
          isOpen={!!amendmentToDelete}
          onClose={() => setAmendmentToDelete(null)}
          title="Удалить доп. соглашение?"
          size="sm"
        >
          <div className={styles.deleteConfirm}>
            <p>
              Доп. соглашение №{amendmentToDelete.number ?? ''} от{' '}
              {new Date(amendmentToDelete.date).toLocaleDateString('ru-RU')} будет удалено. Это
              действие нельзя отменить.
            </p>
            <div className={styles.deleteConfirmActions}>
              <button
                type="button"
                className={styles.cancelLink}
                onClick={() => setAmendmentToDelete(null)}
              >
                Отмена
              </button>
              <button
                type="button"
                className={`${styles.submitButton} ${styles.deleteConfirmBtn}`}
                onClick={handleDeleteAmendment}
              >
                Удалить
              </button>
            </div>
          </div>
        </Modal>
      )}

      {contractId && showHistoryModal && (
        <ContractHistoryModal
          contractId={contractId}
          contractNumber={contractNumber}
          users={users}
          directions={directions}
          onClose={() => setShowHistoryModal(false)}
          onRollback={() => contractId && loadContractById(contractId)}
        />
      )}

      {/* Модальное окно План-график */}
      {showTimelineModal && complexObjectId && (
        <Modal
          isOpen={showTimelineModal}
          onClose={() => setShowTimelineModal(false)}
          size="xl"
          showCloseButton={false}
        >
          <div className={styles.timelineModal}>
            <div className={styles.timelineHeader}>
              <h2 className={styles.timelineTitle}>
                📊 План-график: {complexObject?.name || 'Объект'}
              </h2>
              <button
                type="button"
                className={styles.timelineCloseBtn}
                onClick={() => setShowTimelineModal(false)}
              >
                ✕
              </button>
            </div>

            <div className={styles.timelineContent}>
              {(() => {
                // Собираем все события из всех договоров
                const allContracts = [...relatedContracts];
                // Добавляем текущий договор если он есть
                if (contractId && contractNumber) {
                  const currentContractData = {
                    id: contractId,
                    contractNumber,
                    contractDate,
                    direction: directions.find((d) => d.id === directionId) || null,
                    installationDate,
                    installationDurationDays,
                    status,
                  };
                  // Проверяем, есть ли уже этот договор в списке
                  if (!allContracts.find((c) => c.id === contractId)) {
                    allContracts.push(currentContractData as unknown as Contract);
                  }
                }

                // Собираем все события
                type TimelineEvent = {
                  date: Date;
                  type:
                    | 'contract'
                    | 'installation_start'
                    | 'installation_end'
                    | 'payment'
                    | 'amendment';
                  label: string;
                  contractNumber: string;
                  direction: string;
                  color: string;
                };

                const events: TimelineEvent[] = [];

                allContracts.forEach((c) => {
                  const dirName = c.direction?.name || 'Договор';

                  // Дата заключения договора
                  if (c.contractDate) {
                    events.push({
                      date: new Date(c.contractDate),
                      type: 'contract',
                      label: `Заключение договора №${c.contractNumber}`,
                      contractNumber: c.contractNumber,
                      direction: dirName,
                      color: 'var(--admin-chart-series-1)',
                    });
                  }

                  // Дата начала монтажа
                  if ((c as Contract & { installationDate?: string }).installationDate) {
                    events.push({
                      date: new Date(
                        (c as Contract & { installationDate?: string }).installationDate!
                      ),
                      type: 'installation_start',
                      label: `Начало монтажа №${c.contractNumber}`,
                      contractNumber: c.contractNumber,
                      direction: dirName,
                      color: 'var(--admin-chart-series-2)',
                    });
                  }

                  // Дата окончания монтажа (расчётная: дата начала + срок)
                  const instDate = (c as Contract & { installationDate?: string }).installationDate;
                  const instDays = (c as Contract & { installationDurationDays?: number })
                    .installationDurationDays;
                  if (instDate && instDays && instDays > 0) {
                    const endDate = new Date(instDate);
                    endDate.setDate(endDate.getDate() + instDays);
                    events.push({
                      date: endDate,
                      type: 'installation_end',
                      label: `Окончание монтажа №${c.contractNumber}`,
                      contractNumber: c.contractNumber,
                      direction: dirName,
                      color: 'var(--admin-chart-series-8)',
                    });
                  }
                });

                // Сортируем по дате
                events.sort((a, b) => a.date.getTime() - b.date.getTime());

                if (events.length === 0) {
                  return <div className={styles.timelineEmpty}>Нет событий для отображения</div>;
                }

                // Определяем диапазон дат
                const minDate = events[0].date;
                const maxDate = events[events.length - 1].date;
                const totalDays = Math.max(
                  1,
                  Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
                );

                return (
                  <div className={styles.timeline}>
                    {/* Шкала времени */}
                    <div className={styles.timelineScale}>
                      <div className={styles.timelineScaleStart}>
                        {minDate.toLocaleDateString('ru-RU', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                      <div className={styles.timelineScaleLine} />
                      <div className={styles.timelineScaleEnd}>
                        {maxDate.toLocaleDateString('ru-RU', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                    </div>

                    {/* События на шкале */}
                    <div className={styles.timelineTrack}>
                      {events.map((event, idx) => {
                        const position =
                          totalDays > 1
                            ? ((event.date.getTime() - minDate.getTime()) /
                                (maxDate.getTime() - minDate.getTime())) *
                              100
                            : 50;
                        return (
                          <div
                            key={idx}
                            className={styles.timelineEvent}
                            style={{ left: `${position}%` }}
                            title={`${event.label}\n${event.date.toLocaleDateString('ru-RU')}`}
                          >
                            <div
                              className={styles.timelineEventDot}
                              style={{ backgroundColor: event.color }}
                            />
                          </div>
                        );
                      })}
                    </div>

                    {/* Список событий */}
                    <div className={styles.timelineList}>
                      {events.map((event, idx) => (
                        <div key={idx} className={styles.timelineItem}>
                          <div
                            className={styles.timelineItemDot}
                            style={{ backgroundColor: event.color }}
                          />
                          <div className={styles.timelineItemContent}>
                            <div className={styles.timelineItemDate}>
                              {event.date.toLocaleDateString('ru-RU', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                              })}
                            </div>
                            <div className={styles.timelineItemLabel}>{event.label}</div>
                            <div className={styles.timelineItemDirection}>{event.direction}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
