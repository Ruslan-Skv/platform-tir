'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import {
  type ContractSignatoryProfile,
  getContractDocumentSignatoryProfiles,
} from '@/shared/api/admin-contract-document-packages';
import {
  type CrmDirection,
  type CrmUser,
  createMeasurement,
  getCrmDirections,
  getCrmUsers,
  getMeasurement,
  updateMeasurement,
} from '@/shared/api/admin-crm';
import { apiFetch } from '@/shared/lib/api-fetch';
import { useAdminStickySaveButton } from '@/views/admin/ui/AdminStickySaveButton';

import { measurementFieldsFromCrmCustomerDetail } from '../../shared/measurementCrmCustomer';
import {
  type MeasurementResultTabId,
  buildVisibleResultTabs,
  getResultTabLabel,
  pruneSavedTabsToVisible,
  resolveStatusAfterTabSaves,
} from '../../shared/measurementResultTabs';
import { API_URL, MAX_ROOMS_COUNT } from '../measurement-form-page.constants';
import type {
  FieldKey,
  RepairMeasurementData,
  RepairMeasurementRoom,
  ServiceCatalogCategory,
  WorkCategoryGroup,
} from '../measurement-form-page.types';
import type { MeasurementFormPageProps } from '../measurement-form-page.types';
import {
  buildDefaultRepairMeasurementData,
  buildDefaultRoom,
  buildMeasurementComments,
  cloneRoomWithOnlyWorks,
  collectWorkCategories,
  commentsIncludeRepairResults,
  commentsIncludeSavedTabs,
  extractSavedTabsFromComments,
  formatDateForInput,
  isMeasurementResultTabFilled,
  isRoomFilled,
  isValidPhone,
  parseRepairMeasurementDataFromComments,
} from '../measurement-form-page.utils';

export function useMeasurementFormPage({ measurementId }: MeasurementFormPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [managerId, setManagerId] = useState('');
  const [receptionDate, setReceptionDate] = useState(formatDateForInput(new Date().toISOString()));
  const [executionDate, setExecutionDate] = useState('');
  const [surveyorId, setSurveyorId] = useState('');
  /** Первая строка — основное направление, остальные — дополнительные. */
  const [directionRows, setDirectionRows] = useState<string[]>(['']);
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [comments, setComments] = useState('');
  const [status, setStatus] = useState('NEW');
  const [loading, setLoading] = useState(!!measurementId);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(() =>
    measurementId && searchParams.get('created') === '1'
      ? { type: 'success', text: 'Замер создан' }
      : null
  );
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [directions, setDirections] = useState<CrmDirection[]>([]);
  const [users, setUsers] = useState<CrmUser[]>([]);
  const [managerOptions, setManagerOptions] = useState<ContractSignatoryProfile[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [repairMeasurementData, setRepairMeasurementData] = useState<RepairMeasurementData>(
    buildDefaultRepairMeasurementData()
  );
  const [workCategories, setWorkCategories] = useState<WorkCategoryGroup[]>([]);
  const [activeWorkCategoryByRoomId, setActiveWorkCategoryByRoomId] = useState<
    Record<string, string>
  >({});
  const [activeRoomId, setActiveRoomId] = useState('');
  const [resultsSectionOpen, setResultsSectionOpen] = useState(false);
  const [savedResultTabs, setSavedResultTabs] = useState<Set<MeasurementResultTabId>>(
    () => new Set()
  );
  const [activeResultTab, setActiveResultTab] = useState<MeasurementResultTabId>('repair');
  const [currentMeasurementId, setCurrentMeasurementId] = useState<string | null>(
    measurementId ?? null
  );
  const pageHeaderRef = useRef<HTMLDivElement>(null);
  const handleSaveMeasurementRef = useRef<() => Promise<void>>(async () => undefined);

  const messageTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearFieldError = useCallback((field: FieldKey) => {
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const showMessage = useCallback((type: 'success' | 'error', text: string) => {
    if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);
    setMessage({ type, text });
    messageTimeoutRef.current = setTimeout(
      () => {
        setMessage(null);
        messageTimeoutRef.current = null;
      },
      type === 'error' ? 6000 : 3500
    );
  }, []);

  const loadMeasurement = useCallback(async () => {
    if (!measurementId) return;
    setLoading(true);
    try {
      const data = await getMeasurement(measurementId);
      setManagerId(data.managerId);
      setReceptionDate(formatDateForInput(data.receptionDate));
      setExecutionDate(formatDateForInput(data.executionDate));
      setSurveyorId(data.surveyorId ?? '');
      const additionalDirectionIds =
        data.additionalDirectionIds ?? data.additionalDirections?.map((d) => d.id) ?? [];
      const primaryDirectionId = data.directionId ?? '';
      setDirectionRows(
        primaryDirectionId || additionalDirectionIds.length > 0
          ? [primaryDirectionId, ...additionalDirectionIds]
          : ['']
      );
      setCustomerId(data.customerId ?? null);
      setCustomerName(data.customerName);
      setCustomerAddress(data.customerAddress ?? '');
      setCustomerPhone(data.customerPhone);
      const { textWithoutSavedMarker, savedTabs } = extractSavedTabsFromComments(
        data.comments ?? ''
      );
      const parsedComments = parseRepairMeasurementDataFromComments(textWithoutSavedMarker);
      setComments(parsedComments.cleanComment);
      setRepairMeasurementData(parsedComments.data);
      setSavedResultTabs(savedTabs);
      setResultsSectionOpen(
        commentsIncludeRepairResults(data.comments ?? '') ||
          commentsIncludeSavedTabs(data.comments ?? '')
      );
      setActiveResultTab('repair');
      setStatus(data.status);
    } catch {
      showMessage('error', 'Ошибка загрузки замера');
    } finally {
      setLoading(false);
    }
  }, [measurementId, showMessage]);

  useEffect(() => {
    void loadMeasurement();
  }, [loadMeasurement]);

  useEffect(() => {
    if (measurementId && searchParams.get('created') === '1') {
      try {
        sessionStorage.removeItem('measurement-form-toast');
      } catch {
        /* ignore */
      }
      showMessage('success', 'Замер создан');
      router.replace(`/admin/measurements/${measurementId}`, { scroll: false });
      return;
    }
    try {
      const raw = sessionStorage.getItem('measurement-form-toast');
      if (!raw) return;
      sessionStorage.removeItem('measurement-form-toast');
      const parsed = JSON.parse(raw) as { type?: string; text?: string };
      if (
        (parsed.type === 'success' || parsed.type === 'error') &&
        typeof parsed.text === 'string' &&
        parsed.text.trim()
      ) {
        showMessage(parsed.type, parsed.text);
      }
    } catch {
      /* ignore */
    }
  }, [measurementId, searchParams, router, showMessage]);

  useEffect(() => {
    setCurrentMeasurementId(measurementId ?? null);
  }, [measurementId]);

  useEffect(() => {
    getCrmDirections()
      .then(setDirections)
      .catch(() => setDirections([]));
    getCrmUsers()
      .then(setUsers)
      .catch(() => setUsers([]));
    getContractDocumentSignatoryProfiles('REPAIR')
      .then((res) => {
        const items = (res.items ?? [])
          .filter((p) => Boolean(p.crmUserId?.trim()))
          .sort((a, b) =>
            (a.title || '').localeCompare(b.title || '', 'ru', { sensitivity: 'base' })
          );
        setManagerOptions(items);
      })
      .catch(() => setManagerOptions([]));
  }, []);

  const applyCrmCustomerFromDetail = useCallback(
    (detail: Parameters<typeof measurementFieldsFromCrmCustomerDetail>[0]) => {
      const fields = measurementFieldsFromCrmCustomerDetail(detail);
      setCustomerId(fields.customerId);
      setCustomerName(fields.customerName);
      setCustomerPhone(fields.customerPhone);
      setCustomerAddress(fields.customerAddress);
      clearFieldError('customerName');
      clearFieldError('customerPhone');
      if (fields.customerAddress.trim()) clearFieldError('customerAddress');
    },
    [clearFieldError]
  );

  const directionOptionsForRow = useCallback(
    (rowIndex: number) => {
      const taken = new Set(
        directionRows
          .map((id, index) => (index !== rowIndex && id ? id : null))
          .filter((id): id is string => Boolean(id))
      );
      return directions.filter((direction) => !taken.has(direction.id));
    },
    [directionRows, directions]
  );

  const insertDirectionRowAfter = useCallback(
    (rowIndex: number) => {
      setDirectionRows((prev) => {
        const maxRows = Math.max(directions.length, 1);
        if (prev.length >= maxRows) return prev;
        const next = [...prev];
        next.splice(rowIndex + 1, 0, '');
        return next;
      });
    },
    [directions.length]
  );

  const updateDirectionRow = useCallback((rowIndex: number, value: string) => {
    setDirectionRows((prev) => prev.map((id, index) => (index === rowIndex ? value : id)));
  }, []);

  const removeDirectionRow = useCallback((rowIndex: number) => {
    setDirectionRows((prev) =>
      prev.length <= 1 ? prev : prev.filter((_, index) => index !== rowIndex)
    );
  }, []);

  useEffect(() => {
    const loadWorkItems = async () => {
      try {
        const token =
          localStorage.getItem('admin_token') ?? localStorage.getItem('user_token') ?? undefined;
        const res = await apiFetch(
          `${API_URL}/admin/service-catalog/categories?includeInactive=true`,
          {
            headers: {
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          }
        );
        if (!res.ok) {
          setWorkCategories([]);
          return;
        }
        const categories = (await res.json()) as ServiceCatalogCategory[];
        setWorkCategories(collectWorkCategories(categories));
      } catch {
        setWorkCategories([]);
      }
    };
    void loadWorkItems();
  }, []);

  useEffect(() => {
    if (repairMeasurementData.rooms.length === 0) {
      setActiveRoomId('');
      return;
    }
    const exists = repairMeasurementData.rooms.some((room) => room.id === activeRoomId);
    if (!exists) {
      setActiveRoomId(repairMeasurementData.rooms[0].id);
    }
  }, [repairMeasurementData.rooms, activeRoomId]);

  const collectValidationErrors = useCallback((): Partial<Record<FieldKey, string>> => {
    const errors: Partial<Record<FieldKey, string>> = {};
    if (!managerId.trim()) errors.managerId = 'Выберите менеджера';
    if (!receptionDate) errors.receptionDate = 'Укажите дату приёма замера';
    if (!directionRows[0]?.trim()) errors.directionId = 'Выберите направление';
    if (!customerAddress.trim()) {
      errors.customerAddress =
        'Укажите адрес объекта в карточке заказчика (раздел адресов объектов)';
    }
    if (executionDate) {
      const exec = new Date(executionDate);
      const rec = new Date(receptionDate);
      if (exec < rec) errors.executionDate = 'Дата выполнения не может быть раньше даты приёма';
    }
    if (!customerId) {
      errors.customerName = 'Выберите заказчика в базе через поиск';
    } else {
      if (!customerName.trim()) {
        errors.customerName = 'В карточке заказчика не указано ФИО';
      } else if (customerName.trim().length < 2) {
        errors.customerName = 'ФИО должно содержать минимум 2 символа';
      }
      if (!customerPhone.trim()) {
        errors.customerPhone = 'Введите телефон заказчика';
      } else if (!isValidPhone(customerPhone)) {
        errors.customerPhone = 'Неверный формат телефона';
      }
    }
    return errors;
  }, [
    managerId,
    receptionDate,
    executionDate,
    directionRows,
    customerId,
    customerName,
    customerPhone,
    customerAddress,
  ]);

  const visibleResultTabs = useMemo(
    () => buildVisibleResultTabs(directionRows, directions),
    [directionRows, directions]
  );

  const visibleResultTabIds = useMemo(
    () => visibleResultTabs.map((tab) => tab.id),
    [visibleResultTabs]
  );

  const managerOptionIds = useMemo(
    () => new Set(managerOptions.map((p) => p.crmUserId).filter(Boolean) as string[]),
    [managerOptions]
  );

  const orphanManagerLabel = useMemo(() => {
    if (!managerId || managerOptionIds.has(managerId)) return null;
    const u = users.find((user) => user.id === managerId);
    const name = u ? [u.firstName, u.lastName].filter(Boolean).join(' ') : '';
    return name ? `${name} — нет в справочнике` : `Менеджер (${managerId}) — нет в справочнике`;
  }, [managerId, managerOptionIds, users]);

  const surveyors = useMemo(() => users.filter((u) => u.role === 'SURVEYOR'), [users]);

  useEffect(() => {
    setActiveResultTab((prev) => {
      if (visibleResultTabs.some((tab) => tab.id === prev)) return prev;
      return visibleResultTabs[0]?.id ?? 'repair';
    });
    setSavedResultTabs((prev) => {
      const next = pruneSavedTabsToVisible(prev, visibleResultTabIds);
      return next.size === prev.size ? prev : next;
    });
  }, [visibleResultTabs, visibleResultTabIds]);

  const buildPayload = useCallback(
    (opts?: { savedTabs?: Set<MeasurementResultTabId>; statusOverride?: string }) => {
      const savedTabs = opts?.savedTabs ?? savedResultTabs;
      const payloadStatus = opts?.statusOverride ?? status;
      const primaryDirectionId = directionRows[0]?.trim() ?? '';
      const additionalDirectionIds = directionRows
        .slice(1)
        .map((id) => id.trim())
        .filter(Boolean);
      const shouldPersistResults = resultsSectionOpen || savedTabs.size > 0;
      const base = {
        managerId,
        receptionDate,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        status: payloadStatus,
        ...(executionDate && { executionDate }),
        ...(surveyorId && { surveyorId }),
        ...(primaryDirectionId && { directionId: primaryDirectionId }),
        ...(additionalDirectionIds.length > 0 && { additionalDirectionIds }),
        ...(customerAddress.trim() && { customerAddress: customerAddress.trim() }),
        comments: shouldPersistResults
          ? buildMeasurementComments(
              comments,
              savedTabs,
              resultsSectionOpen ? repairMeasurementData : null
            )
          : comments.trim(),
      };
      if (currentMeasurementId) {
        return { ...base, customerId: customerId ?? null };
      }
      return customerId ? { ...base, customerId } : base;
    },
    [
      managerId,
      receptionDate,
      customerName,
      customerPhone,
      status,
      executionDate,
      surveyorId,
      directionRows,
      customerAddress,
      comments,
      repairMeasurementData,
      resultsSectionOpen,
      savedResultTabs,
      currentMeasurementId,
      customerId,
    ]
  );

  const persistMeasurement = useCallback(
    async (opts?: {
      savedTabs?: Set<MeasurementResultTabId>;
      statusOverride?: string;
      successText?: string;
    }): Promise<boolean> => {
      const errors = collectValidationErrors();
      setFieldErrors(errors);
      const errorMessages = [...new Set(Object.values(errors).filter(Boolean))];
      if (errorMessages.length > 0) {
        showMessage(
          'error',
          errorMessages.length === 1
            ? errorMessages[0]!
            : `Не удалось сохранить. ${errorMessages.join('. ')}`
        );
        return false;
      }
      const payload = buildPayload({
        savedTabs: opts?.savedTabs,
        statusOverride: opts?.statusOverride,
      });
      setSaving(true);
      try {
        if (currentMeasurementId) {
          await updateMeasurement(currentMeasurementId, payload);
          showMessage('success', opts?.successText ?? 'Замер сохранён');
        } else {
          const created = await createMeasurement(payload);
          setCurrentMeasurementId(created.id);
          const successText = opts?.successText ?? 'Замер создан';
          try {
            sessionStorage.setItem(
              'measurement-form-toast',
              JSON.stringify({ type: 'success', text: successText })
            );
          } catch {
            /* ignore */
          }
          showMessage('success', successText);
          router.replace(`/admin/measurements/${created.id}?created=1`, { scroll: false });
        }
        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Ошибка сохранения';
        showMessage('error', msg);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [collectValidationErrors, buildPayload, currentMeasurementId, router, showMessage]
  );

  const handleSaveMeasurement = useCallback(async () => {
    await persistMeasurement({
      successText: currentMeasurementId ? 'Замер сохранён' : 'Замер создан',
    });
  }, [persistMeasurement, currentMeasurementId]);

  handleSaveMeasurementRef.current = handleSaveMeasurement;

  const saveButtonState = useAdminStickySaveButton({
    enabled: !loading,
    loading,
    saving,
    pageHeaderRef,
    onSave: () => void handleSaveMeasurementRef.current(),
  });

  const updateRoom = useCallback(
    (roomId: string, updater: (room: RepairMeasurementRoom) => RepairMeasurementRoom) => {
      setRepairMeasurementData((prev) => ({
        rooms: prev.rooms.map((room) => (room.id === roomId ? updater(room) : room)),
      }));
    },
    []
  );

  const addRoom = () => {
    setRepairMeasurementData((prev) => {
      if (prev.rooms.length >= MAX_ROOMS_COUNT) return prev;
      const newRoom = buildDefaultRoom(prev.rooms.length);
      setActiveRoomId(newRoom.id);
      return { rooms: [...prev.rooms, newRoom] };
    });
  };

  const removeRoom = (roomId: string) => {
    setRepairMeasurementData((prev) => {
      if (prev.rooms.length <= 1) return prev;
      const roomToDelete = prev.rooms.find((room) => room.id === roomId);
      if (!roomToDelete) return prev;
      if (isRoomFilled(roomToDelete)) return prev;
      const roomIndex = prev.rooms.findIndex((room) => room.id === roomId);
      const nextRooms = prev.rooms.filter((room) => room.id !== roomId);
      if (activeRoomId === roomId && nextRooms.length > 0) {
        const nextIndex = Math.min(roomIndex, nextRooms.length - 1);
        setActiveRoomId(nextRooms[nextIndex].id);
      }
      return { rooms: nextRooms.length > 0 ? nextRooms : [buildDefaultRoom(0)] };
    });
  };

  const copyRoomWithWorksOnly = (roomId: string) => {
    setRepairMeasurementData((prev) => {
      if (prev.rooms.length >= MAX_ROOMS_COUNT) return prev;
      const source = prev.rooms.find((room) => room.id === roomId);
      if (!source) return prev;
      const newRoom = cloneRoomWithOnlyWorks(source, prev.rooms.length);
      setActiveRoomId(newRoom.id);
      return { rooms: [...prev.rooms, newRoom] };
    });
  };

  const handleSaveResultTab = useCallback(
    async (tabId: MeasurementResultTabId) => {
      if (!currentMeasurementId) {
        showMessage('error', 'Сначала нажмите «Сохранить замер» вверху страницы');
        return;
      }
      if (!resultsSectionOpen) {
        showMessage('error', 'Сначала нажмите «Заполнить результаты замеров»');
        return;
      }
      if (savedResultTabs.has(tabId)) return;
      if (!isMeasurementResultTabFilled(tabId, repairMeasurementData.rooms)) {
        showMessage(
          'error',
          `Сначала заполните вкладку «${getResultTabLabel(tabId, visibleResultTabs)}»`
        );
        return;
      }
      const nextSaved = new Set(savedResultTabs);
      nextSaved.add(tabId);
      const nextStatus = resolveStatusAfterTabSaves(status, visibleResultTabIds, nextSaved);
      setSavedResultTabs(nextSaved);
      if (nextStatus !== status) setStatus(nextStatus);
      await persistMeasurement({
        savedTabs: nextSaved,
        statusOverride: nextStatus,
        successText:
          nextStatus === 'COMPLETED' && status !== 'COMPLETED'
            ? 'Вкладка зафиксирована. Статус: Выполнен'
            : 'Вкладка зафиксирована',
      });
    },
    [
      currentMeasurementId,
      repairMeasurementData.rooms,
      resultsSectionOpen,
      savedResultTabs,
      status,
      visibleResultTabIds,
      visibleResultTabs,
      persistMeasurement,
      showMessage,
    ]
  );

  const handleUnsaveResultTab = useCallback(
    async (tabId: MeasurementResultTabId) => {
      if (!savedResultTabs.has(tabId)) return;
      const nextSaved = new Set(savedResultTabs);
      nextSaved.delete(tabId);
      const nextStatus = resolveStatusAfterTabSaves(status, visibleResultTabIds, nextSaved);
      setSavedResultTabs(nextSaved);
      if (nextStatus !== status) setStatus(nextStatus);
      await persistMeasurement({
        savedTabs: nextSaved,
        statusOverride: nextStatus,
        successText: 'Фиксация вкладки отменена',
      });
    },
    [savedResultTabs, status, visibleResultTabIds, persistMeasurement]
  );

  return {
    measurementId,
    router,
    managerId,
    setManagerId,
    receptionDate,
    setReceptionDate,
    executionDate,
    setExecutionDate,
    surveyorId,
    setSurveyorId,
    directionRows,
    customerName,
    setCustomerName,
    customerAddress,
    setCustomerAddress,
    customerPhone,
    setCustomerPhone,
    customerId,
    setCustomerId,
    comments,
    setComments,
    status,
    setStatus,
    loading,
    saving,
    message,
    setMessage,
    fieldErrors,
    directions,
    users,
    managerOptions,
    showHistory,
    setShowHistory,
    repairMeasurementData,
    setRepairMeasurementData,
    workCategories,
    activeWorkCategoryByRoomId,
    setActiveWorkCategoryByRoomId,
    activeRoomId,
    setActiveRoomId,
    resultsSectionOpen,
    setResultsSectionOpen,
    savedResultTabs,
    activeResultTab,
    setActiveResultTab,
    currentMeasurementId,
    clearFieldError,
    showMessage,
    applyCrmCustomerFromDetail,
    directionOptionsForRow,
    insertDirectionRowAfter,
    updateDirectionRow,
    removeDirectionRow,
    visibleResultTabs,
    visibleResultTabIds,
    orphanManagerLabel,
    surveyors,
    pageHeaderRef,
    saveButtonState,
    handleHeaderSaveClick: saveButtonState.handleSaveClick,
    handleSaveMeasurement,
    persistMeasurement,
    updateRoom,
    addRoom,
    removeRoom,
    copyRoomWithWorksOnly,
    handleSaveResultTab,
    handleUnsaveResultTab,
  };
}

export type MeasurementFormPageModel = ReturnType<typeof useMeasurementFormPage>;
