'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import {
  type CrmCustomerListItem,
  type CrmDirection,
  type CrmUser,
  createMeasurement,
  getCrmCustomers,
  getCrmDirections,
  getCrmUsers,
  getMeasurement,
  updateMeasurement,
} from '@/shared/api/admin-crm';
import { apiFetch } from '@/shared/lib/api-fetch';
import { AddCrmCustomerModal } from '@/views/admin/CRM/Customers/AddCrmCustomerModal';

import styles from './MeasurementFormPage.module.css';
import { MeasurementHistoryModal } from './MeasurementHistoryModal';

const STATUS_OPTIONS = [
  { value: 'NEW', label: 'Принят' },
  { value: 'COMPLETED', label: 'Выполнен' },
  { value: 'CANCELLED', label: 'Отказ' },
  { value: 'CONVERTED', label: 'Договор подписан' },
];

const STATUS_SELECT_CLASS_BY_VALUE: Record<string, string> = {
  NEW: 'statusSelectNew',
  COMPLETED: 'statusSelectCompleted',
  CANCELLED: 'statusSelectCancelled',
  CONVERTED: 'statusSelectConverted',
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const REPAIR_MEASUREMENT_DATA_MARKER = '[REPAIR_MEASUREMENT_DATA_V1]';
const MAX_ROOMS_COUNT = 15;

interface OpeningDimensions {
  id: string;
  width: string;
  height: string;
}

interface RepairMeasurementRoom {
  id: string;
  name: string;
  ceilingHeight: string;
  wallThickness: string;
  slopeThickness: string;
  floorArea: string;
  wallSegments: string[];
  doors: OpeningDimensions[];
  windows: OpeningDimensions[];
  selectedWorkItemIds: string[];
  workItemQuantities: Record<string, string>;
  notes: string;
}

interface RepairMeasurementData {
  rooms: RepairMeasurementRoom[];
}

interface ServiceCatalogItem {
  id: string;
  name: string;
}

interface ServiceCatalogCategory {
  id: string;
  name: string;
  items?: ServiceCatalogItem[];
  children?: ServiceCatalogCategory[];
}

interface WorkCategoryGroup {
  id: string;
  name: string;
  items: ServiceCatalogItem[];
}

function formatDateForInput(s: string | null | undefined): string {
  if (!s) return '';
  const d = new Date(s);
  return d.toISOString().slice(0, 10);
}

/** Проверка формата телефона: минимум 10 цифр (российский номер) */
function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 11;
}

function parseNumber(raw: string): number {
  const normalized = raw.replace(',', '.').trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function formatMetric(value: number): string {
  return value.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
}

function buildDefaultRoom(index: number): RepairMeasurementRoom {
  return {
    id: `room-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: `Помещение ${index + 1}`,
    ceilingHeight: '',
    wallThickness: '',
    slopeThickness: '',
    floorArea: '',
    wallSegments: [''],
    doors: [],
    windows: [],
    selectedWorkItemIds: [],
    workItemQuantities: {},
    notes: '',
  };
}

function buildDefaultRepairMeasurementData(): RepairMeasurementData {
  return {
    rooms: [buildDefaultRoom(0)],
  };
}

function parseRepairMeasurementDataFromComments(commentsValue: string | null | undefined): {
  cleanComment: string;
  data: RepairMeasurementData;
} {
  const source = commentsValue ?? '';
  const markerIndex = source.indexOf(REPAIR_MEASUREMENT_DATA_MARKER);
  if (markerIndex < 0) {
    return { cleanComment: source, data: buildDefaultRepairMeasurementData() };
  }
  const cleanComment = source.slice(0, markerIndex).trim();
  const jsonRaw = source.slice(markerIndex + REPAIR_MEASUREMENT_DATA_MARKER.length).trim();
  try {
    const parsed = JSON.parse(jsonRaw) as Partial<RepairMeasurementData>;
    const rooms = Array.isArray(parsed.rooms) ? parsed.rooms : [];
    const normalizedRooms = rooms
      .filter((room) => room && typeof room === 'object')
      .slice(0, MAX_ROOMS_COUNT)
      .map((room, index): RepairMeasurementRoom => {
        const r = room as Partial<RepairMeasurementRoom>;
        return {
          id: typeof r.id === 'string' && r.id.trim() ? r.id : buildDefaultRoom(index).id,
          name: typeof r.name === 'string' && r.name.trim() ? r.name : `Помещение ${index + 1}`,
          ceilingHeight: typeof r.ceilingHeight === 'string' ? r.ceilingHeight : '',
          wallThickness: typeof r.wallThickness === 'string' ? r.wallThickness : '',
          slopeThickness: typeof r.slopeThickness === 'string' ? r.slopeThickness : '',
          floorArea: typeof r.floorArea === 'string' ? r.floorArea : '',
          wallSegments: Array.isArray(r.wallSegments)
            ? r.wallSegments.filter((x): x is string => typeof x === 'string')
            : [''],
          doors: Array.isArray(r.doors)
            ? r.doors.map((d, dIndex) => ({
                id: typeof d?.id === 'string' && d.id.trim() ? d.id : `${index}-door-${dIndex}`,
                width: typeof d?.width === 'string' ? d.width : '',
                height: typeof d?.height === 'string' ? d.height : '',
              }))
            : [],
          windows: Array.isArray(r.windows)
            ? r.windows.map((w, wIndex) => ({
                id: typeof w?.id === 'string' && w.id.trim() ? w.id : `${index}-window-${wIndex}`,
                width: typeof w?.width === 'string' ? w.width : '',
                height: typeof w?.height === 'string' ? w.height : '',
              }))
            : [],
          selectedWorkItemIds: Array.isArray(r.selectedWorkItemIds)
            ? r.selectedWorkItemIds.filter((x): x is string => typeof x === 'string')
            : [],
          workItemQuantities:
            r.workItemQuantities && typeof r.workItemQuantities === 'object'
              ? Object.fromEntries(
                  Object.entries(r.workItemQuantities).filter(
                    ([k, v]) => typeof k === 'string' && typeof v === 'string'
                  )
                )
              : {},
          notes: typeof r.notes === 'string' ? r.notes : '',
        };
      });
    return {
      cleanComment,
      data: { rooms: normalizedRooms.length > 0 ? normalizedRooms : [buildDefaultRoom(0)] },
    };
  } catch {
    return { cleanComment: source, data: buildDefaultRepairMeasurementData() };
  }
}

function stringifyRepairMeasurementData(
  commentsValue: string,
  data: RepairMeasurementData
): string {
  const cleaned = commentsValue.trim();
  const payload = JSON.stringify(data);
  return cleaned
    ? `${cleaned}\n\n${REPAIR_MEASUREMENT_DATA_MARKER}${payload}`
    : `${REPAIR_MEASUREMENT_DATA_MARKER}${payload}`;
}

function collectWorkCategories(categories: ServiceCatalogCategory[]): WorkCategoryGroup[] {
  const grouped = new Map<string, { name: string; items: ServiceCatalogItem[] }>();
  const descendantIds = new Set<string>();
  const collectDescendantIds = (nodes: ServiceCatalogCategory[]) => {
    for (const node of nodes) {
      if (Array.isArray(node.children) && node.children.length > 0) {
        for (const child of node.children) {
          descendantIds.add(child.id);
        }
        collectDescendantIds(node.children);
      }
    }
  };
  collectDescendantIds(categories);

  const rootNodes = categories.filter((category) => !descendantIds.has(category.id));
  const walk = (
    nodes: ServiceCatalogCategory[],
    rootCategory: { id: string; name: string } | null
  ) => {
    for (const category of nodes) {
      const root = rootCategory ?? { id: category.id, name: category.name };
      const rawItems = Array.isArray(category.items) ? category.items : [];
      if (rawItems.length > 0) {
        const bucket = grouped.get(root.id) ?? { name: root.name, items: [] };
        bucket.items.push(...rawItems.map((item) => ({ id: item.id, name: item.name })));
        grouped.set(root.id, bucket);
      }
      if (Array.isArray(category.children) && category.children.length > 0) {
        walk(category.children, root);
      }
    }
  };
  walk(rootNodes, null);

  return [...grouped.entries()].map(([id, group]) => ({
    id,
    name: group.name,
    items: [...new Map(group.items.map((item) => [item.id, item])).values()],
  }));
}

function isRoomFilled(room: RepairMeasurementRoom): boolean {
  if (room.name.trim() !== '' && !/^Помещение\s+\d+$/i.test(room.name.trim())) return true;
  if (room.ceilingHeight.trim() !== '') return true;
  if (room.wallThickness.trim() !== '') return true;
  if (room.slopeThickness.trim() !== '') return true;
  if (room.floorArea.trim() !== '') return true;
  if (room.notes.trim() !== '') return true;
  if (room.selectedWorkItemIds.length > 0) return true;
  if (Object.keys(room.workItemQuantities).length > 0) return true;
  if (room.wallSegments.some((segment) => segment.trim() !== '')) return true;
  if (room.doors.some((door) => door.width.trim() !== '' || door.height.trim() !== '')) return true;
  if (room.windows.some((window) => window.width.trim() !== '' || window.height.trim() !== ''))
    return true;
  return false;
}

function cloneRoomWithOnlyWorks(room: RepairMeasurementRoom, index: number): RepairMeasurementRoom {
  const defaultRoom = buildDefaultRoom(index);
  return {
    ...defaultRoom,
    name: `${room.name.trim() || `Помещение ${index + 1}`} (копия)`,
    selectedWorkItemIds: [...room.selectedWorkItemIds],
    workItemQuantities: {},
  };
}

type AutoQuantityMetrics = {
  floorArea: number;
  perimeter: number;
  baseboardPerimeter: number;
  grossWallArea: number;
  netWallArea: number;
  doorsArea: number;
  windowsArea: number;
};

function addressFromCustomerExtended(ext: unknown): string {
  if (!ext || typeof ext !== 'object') return '';
  const a = (ext as Record<string, unknown>).address;
  return typeof a === 'string' ? a : '';
}

function crmCustomerDisplayName(row: CrmCustomerListItem): string {
  const parts = [row.firstName, row.lastName].map((x) => (x ?? '').trim()).filter(Boolean);
  if (parts.length) return parts.join(' ');
  if (row.company?.trim()) return row.company.trim();
  return row.email || row.id;
}

function isCreatedCrmCustomer(x: unknown): x is {
  id: string;
  firstName?: string;
  phone?: string | null;
  phones?: string[];
} {
  return typeof x === 'object' && x !== null && typeof (x as { id?: unknown }).id === 'string';
}

function resolveAutoQuantity(itemName: string, metrics: AutoQuantityMetrics): number | null {
  const n = itemName.toLowerCase();
  if (n.includes('плинтус')) return metrics.baseboardPerimeter;
  if (n.includes('периметр')) return metrics.perimeter;
  if (n.includes('пол') || n.includes('стяжк') || n.includes('ламинат') || n.includes('плитк')) {
    return metrics.floorArea;
  }
  if (n.includes('потол')) return metrics.floorArea;
  if (n.includes('стен')) return metrics.netWallArea;
  if (n.includes('двер')) return metrics.doorsArea;
  if (n.includes('окн')) return metrics.windowsArea;
  return null;
}

type FieldKey = 'managerId' | 'receptionDate' | 'executionDate' | 'customerName' | 'customerPhone';

interface MeasurementFormPageProps {
  measurementId?: string | null;
}

export function MeasurementFormPage({ measurementId }: MeasurementFormPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [managerId, setManagerId] = useState('');
  const [receptionDate, setReceptionDate] = useState(formatDateForInput(new Date().toISOString()));
  const [executionDate, setExecutionDate] = useState('');
  const [surveyorId, setSurveyorId] = useState('');
  const [directionId, setDirectionId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [crmSearchInput, setCrmSearchInput] = useState('');
  const [crmSearchDebounced, setCrmSearchDebounced] = useState('');
  const [crmSearchResults, setCrmSearchResults] = useState<CrmCustomerListItem[]>([]);
  const [crmSearchLoading, setCrmSearchLoading] = useState(false);
  const [crmSearchError, setCrmSearchError] = useState<string | null>(null);
  const [addCrmCustomerOpen, setAddCrmCustomerOpen] = useState(false);
  const [comments, setComments] = useState('');
  const [status, setStatus] = useState('NEW');
  const [loading, setLoading] = useState(!!measurementId);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [directions, setDirections] = useState<CrmDirection[]>([]);
  const [users, setUsers] = useState<CrmUser[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [repairMeasurementData, setRepairMeasurementData] = useState<RepairMeasurementData>(
    buildDefaultRepairMeasurementData()
  );
  const [workCategories, setWorkCategories] = useState<WorkCategoryGroup[]>([]);
  const [activeWorkCategoryByRoomId, setActiveWorkCategoryByRoomId] = useState<
    Record<string, string>
  >({});
  const [activeRoomId, setActiveRoomId] = useState('');
  const [currentMeasurementId, setCurrentMeasurementId] = useState<string | null>(
    measurementId ?? null
  );
  const lastSavedPayloadRef = useRef<string>('');
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialHydrationRef = useRef(true);

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

  const loadMeasurement = useCallback(async () => {
    if (!measurementId) return;
    setLoading(true);
    try {
      const data = await getMeasurement(measurementId);
      setManagerId(data.managerId);
      setReceptionDate(formatDateForInput(data.receptionDate));
      setExecutionDate(formatDateForInput(data.executionDate));
      setSurveyorId(data.surveyorId ?? '');
      setDirectionId(data.directionId ?? '');
      setCustomerId(data.customerId ?? null);
      setCustomerName(data.customerName);
      setCustomerAddress(data.customerAddress ?? '');
      setCustomerPhone(data.customerPhone);
      const parsedComments = parseRepairMeasurementDataFromComments(data.comments ?? '');
      setComments(parsedComments.cleanComment);
      setRepairMeasurementData(parsedComments.data);
      setStatus(data.status);
    } catch {
      showMessage('error', 'Ошибка загрузки замера');
    } finally {
      setLoading(false);
    }
  }, [measurementId, showMessage]);

  useEffect(() => {
    loadMeasurement();
  }, [loadMeasurement]);

  useEffect(() => {
    if (measurementId && searchParams.get('created') === '1') {
      showMessage('success', 'Замер создан');
      router.replace(`/admin/measurements/${measurementId}`, { scroll: false });
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
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setCrmSearchDebounced(crmSearchInput.trim());
    }, 380);
    return () => window.clearTimeout(t);
  }, [crmSearchInput]);

  useEffect(() => {
    const q = crmSearchDebounced;
    if (q.length < 2) {
      setCrmSearchResults([]);
      setCrmSearchError(null);
      return;
    }
    let cancelled = false;
    setCrmSearchLoading(true);
    setCrmSearchError(null);
    getCrmCustomers({ search: q, limit: 30, page: 1 })
      .then((res) => {
        if (!cancelled) setCrmSearchResults(res.data ?? []);
      })
      .catch((e) => {
        if (!cancelled) setCrmSearchError(e instanceof Error ? e.message : 'Ошибка поиска');
      })
      .finally(() => {
        if (!cancelled) setCrmSearchLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [crmSearchDebounced]);

  const applyCrmCustomerRow = useCallback((row: CrmCustomerListItem) => {
    setCustomerId(row.id);
    setCustomerName(crmCustomerDisplayName(row));
    const phone = row.phone?.trim() || row.phones?.find((p) => p.trim()) || '';
    setCustomerPhone(phone);
    setCustomerAddress(addressFromCustomerExtended(row.extendedProfile));
    setCrmSearchResults([]);
    setCrmSearchInput('');
    setCrmSearchDebounced('');
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
    if (executionDate) {
      const exec = new Date(executionDate);
      const rec = new Date(receptionDate);
      if (exec < rec) errors.executionDate = 'Дата выполнения не может быть раньше даты приёма';
    }
    if (!customerName.trim()) {
      errors.customerName = 'Введите ФИО заказчика';
    } else if (customerName.trim().length < 2) {
      errors.customerName = 'ФИО должно содержать минимум 2 символа';
    }
    if (!customerPhone.trim()) {
      errors.customerPhone = 'Введите телефон заказчика';
    } else if (!isValidPhone(customerPhone)) {
      errors.customerPhone = 'Неверный формат телефона';
    }
    return errors;
  }, [managerId, receptionDate, executionDate, customerName, customerPhone]);

  const buildPayload = useCallback(() => {
    const base = {
      managerId,
      receptionDate,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      status,
      ...(executionDate && { executionDate }),
      ...(surveyorId && { surveyorId }),
      ...(directionId && { directionId }),
      ...(customerAddress.trim() && { customerAddress: customerAddress.trim() }),
      comments: stringifyRepairMeasurementData(comments, repairMeasurementData),
    };
    if (currentMeasurementId) {
      return { ...base, customerId: customerId ?? null };
    }
    return customerId ? { ...base, customerId } : base;
  }, [
    managerId,
    receptionDate,
    customerName,
    customerPhone,
    status,
    executionDate,
    surveyorId,
    directionId,
    customerAddress,
    comments,
    repairMeasurementData,
    currentMeasurementId,
    customerId,
  ]);

  const persistMeasurement = useCallback(async () => {
    const errors = collectValidationErrors();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    const payload = buildPayload();
    const payloadKey = JSON.stringify(payload);
    if (payloadKey === lastSavedPayloadRef.current) return;
    setSaving(true);
    try {
      if (currentMeasurementId) {
        await updateMeasurement(currentMeasurementId, payload);
      } else {
        const created = await createMeasurement(payload);
        setCurrentMeasurementId(created.id);
        router.replace(`/admin/measurements/${created.id}`, { scroll: false });
      }
      lastSavedPayloadRef.current = payloadKey;
      setMessage({ type: 'success', text: 'Сохранено автоматически' });
      setTimeout(() => setMessage(null), 1200);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ошибка автосохранения';
      showMessage('error', msg);
    } finally {
      setSaving(false);
    }
  }, [collectValidationErrors, buildPayload, currentMeasurementId, router, showMessage]);

  useEffect(() => {
    if (loading) return;
    if (isInitialHydrationRef.current) {
      isInitialHydrationRef.current = false;
      lastSavedPayloadRef.current = JSON.stringify(buildPayload());
      return;
    }
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      void persistMeasurement();
    }, 700);
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [loading, buildPayload, persistMeasurement]);

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

  const handleMarkMeasurementCompleted = useCallback(() => {
    const hasAnyRoomData = repairMeasurementData.rooms.some((room) => isRoomFilled(room));
    if (!hasAnyRoomData) {
      showMessage('error', 'Сначала заполните блок «Замеры помещений»');
      return;
    }
    setStatus('COMPLETED');
  }, [repairMeasurementData.rooms, showMessage]);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>Загрузка...</div>
      </div>
    );
  }

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
  const surveyors = users.filter((u) => u.role === 'SURVEYOR');
  const isAutosaveMessage =
    message?.type === 'success' && message.text === 'Сохранено автоматически';

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href="/admin/measurements/repair" className={styles.backLink}>
          ← К списку замеров
        </Link>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>
            {measurementId ? 'Редактирование замера' : 'Новый замер'}
          </h1>
          <div className={styles.titleControls}>
            {measurementId && (
              <button
                type="button"
                className={styles.historyButton}
                onClick={() => setShowHistory(true)}
                title="История изменений"
              >
                📋 История
              </button>
            )}
            <label className={styles.statusInlineLabel}>
              <span className={styles.statusInlineText}>Статус</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={`${styles.select} ${styles.statusInlineSelect} ${
                  styles[STATUS_SELECT_CLASS_BY_VALUE[status] ?? '']
                }`}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <div
          className={`${styles.headerAutosaveFloating} ${
            isAutosaveMessage ? styles.headerAutosaveFloatingVisible : ''
          }`}
          aria-live="polite"
        >
          Сохранено автоматически
        </div>
      </div>

      {message && !isAutosaveMessage && (
        <div className={`${styles.message} ${styles[`message${message.type}`]}`}>
          {message.text}
        </div>
      )}

      <div className={styles.form}>
        <div className={`${styles.grid} ${styles.zoneMeta}`}>
          <div className={styles.row}>
            <label className={styles.label} htmlFor="managerId">
              Менеджер <span className={styles.required}>*</span>
            </label>
            <select
              id="managerId"
              value={managerId}
              onChange={(e) => {
                setManagerId(e.target.value);
                clearFieldError('managerId');
              }}
              className={`${styles.select} ${fieldErrors.managerId ? styles.inputError : ''}`}
              required
              aria-invalid={!!fieldErrors.managerId}
              aria-describedby={fieldErrors.managerId ? 'managerId-error' : undefined}
            >
              <option value="">— Выберите —</option>
              {managers.length > 0
                ? managers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {[u.firstName, u.lastName].filter(Boolean).join(' ')} ({u.role})
                    </option>
                  ))
                : users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {[u.firstName, u.lastName].filter(Boolean).join(' ')} ({u.role})
                    </option>
                  ))}
            </select>
            {fieldErrors.managerId && (
              <span id="managerId-error" className={styles.fieldError} role="alert">
                {fieldErrors.managerId}
              </span>
            )}
          </div>

          <div className={styles.row}>
            <label className={styles.label} htmlFor="receptionDate">
              Дата приёма <span className={styles.required}>*</span>
            </label>
            <input
              id="receptionDate"
              type="date"
              value={receptionDate}
              onChange={(e) => {
                setReceptionDate(e.target.value);
                clearFieldError('receptionDate');
              }}
              className={`${styles.input} ${fieldErrors.receptionDate ? styles.inputError : ''}`}
              required
              aria-invalid={!!fieldErrors.receptionDate}
              aria-describedby={fieldErrors.receptionDate ? 'receptionDate-error' : undefined}
            />
            {fieldErrors.receptionDate && (
              <span id="receptionDate-error" className={styles.fieldError} role="alert">
                {fieldErrors.receptionDate}
              </span>
            )}
          </div>

          <div className={styles.row}>
            <label className={styles.label} htmlFor="executionDate">
              Дата выполнения
            </label>
            <input
              id="executionDate"
              type="date"
              value={executionDate}
              onChange={(e) => {
                setExecutionDate(e.target.value);
                clearFieldError('executionDate');
              }}
              className={`${styles.input} ${fieldErrors.executionDate ? styles.inputError : ''}`}
              aria-invalid={!!fieldErrors.executionDate}
              aria-describedby={fieldErrors.executionDate ? 'executionDate-error' : undefined}
            />
            {fieldErrors.executionDate && (
              <span id="executionDate-error" className={styles.fieldError} role="alert">
                {fieldErrors.executionDate}
              </span>
            )}
          </div>

          <div className={styles.row}>
            <label className={styles.label}>Замерщик</label>
            <select
              value={surveyorId}
              onChange={(e) => setSurveyorId(e.target.value)}
              className={styles.select}
            >
              <option value="">— Не назначен —</option>
              {surveyors.length > 0
                ? surveyors.map((u) => (
                    <option key={u.id} value={u.id}>
                      {[u.firstName, u.lastName].filter(Boolean).join(' ')}
                    </option>
                  ))
                : users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {[u.firstName, u.lastName].filter(Boolean).join(' ')}
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

          <div className={`${styles.row} ${styles.customerCrmBlock}`}>
            <div className={styles.customerCrmBlockInner}>
              <h3 className={styles.customerCrmTitle}>Клиент в базе</h3>
              <p className={styles.customerCrmHint}>
                Найдите существующую карточку или создайте новую с краткими данными; полный профиль
                можно дополнить при договоре.
              </p>
              <div className={styles.customerCrmSearchRow}>
                <input
                  type="search"
                  className={styles.input}
                  placeholder="Поиск: ФИО, телефон, e-mail, компания (от 2 символов)"
                  value={crmSearchInput}
                  onChange={(e) => setCrmSearchInput(e.target.value)}
                  autoComplete="off"
                  aria-label="Поиск клиента в базе"
                />
                {customerId ? (
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => {
                      setCustomerId(null);
                    }}
                  >
                    Снять выбор карточки
                  </button>
                ) : null}
              </div>
              {crmSearchLoading ? <p className={styles.customerCrmMuted}>Поиск…</p> : null}
              {crmSearchError ? (
                <p className={styles.customerCrmError} role="alert">
                  {crmSearchError}
                </p>
              ) : null}
              {crmSearchDebounced.length >= 2 &&
              !crmSearchLoading &&
              !crmSearchError &&
              crmSearchResults.length === 0 ? (
                <p className={styles.customerCrmMuted}>Ничего не найдено</p>
              ) : null}
              {crmSearchResults.length > 0 ? (
                <ul
                  className={styles.customerCrmResults}
                  role="listbox"
                  aria-label="Результаты поиска"
                >
                  {crmSearchResults.map((row) => (
                    <li key={row.id}>
                      <button
                        type="button"
                        className={styles.customerCrmResultButton}
                        onClick={() => applyCrmCustomerRow(row)}
                      >
                        <span className={styles.customerCrmResultName}>
                          {crmCustomerDisplayName(row)}
                        </span>
                        <span className={styles.customerCrmResultMeta}>
                          {[row.phone || row.phones?.[0], row.email].filter(Boolean).join(' · ')}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className={styles.customerCrmActions}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => setAddCrmCustomerOpen(true)}
                >
                  Добавить нового заказчика
                </button>
                {customerId ? (
                  <span className={styles.customerCrmLinkedBadge}>Выбрана карточка клиента</span>
                ) : null}
              </div>
            </div>
          </div>

          <div className={styles.row}>
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
              aria-invalid={!!fieldErrors.customerName}
              aria-describedby={fieldErrors.customerName ? 'customerName-error' : undefined}
            />
            {fieldErrors.customerName && (
              <span id="customerName-error" className={styles.fieldError} role="alert">
                {fieldErrors.customerName}
              </span>
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
              Телефон заказчика <span className={styles.required}>*</span>
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
              aria-invalid={!!fieldErrors.customerPhone}
              aria-describedby={fieldErrors.customerPhone ? 'customerPhone-error' : undefined}
            />
            {fieldErrors.customerPhone && (
              <span id="customerPhone-error" className={styles.fieldError} role="alert">
                {fieldErrors.customerPhone}
              </span>
            )}
          </div>
        </div>

        <div className={`${styles.row} ${styles.zoneCommentMain}`}>
          <label className={styles.label}>Комментарии</label>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            className={styles.textarea}
            rows={3}
            placeholder="Дополнительная информация..."
          />
        </div>

        <section className={styles.measurementsSection}>
          <div className={styles.measurementsSectionHeader}>
            <h2 className={styles.measurementsTitle}>Замеры помещений</h2>
            <div className={styles.measurementsHeaderActions}>
              <button
                type="button"
                className={`${styles.secondaryButton} ${styles.completeMeasurementButton} ${
                  status === 'COMPLETED' ? styles.completeMeasurementButtonDone : ''
                }`}
                onClick={handleMarkMeasurementCompleted}
                disabled={status === 'COMPLETED'}
              >
                Замер выполнен
              </button>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={addRoom}
                disabled={repairMeasurementData.rooms.length >= MAX_ROOMS_COUNT}
              >
                + Добавить помещение
              </button>
            </div>
          </div>
          <p className={styles.measurementsHint}>
            Помещений: {repairMeasurementData.rooms.length} / {MAX_ROOMS_COUNT}. Периметр, площадь
            стен и вычеты дверей/окон считаются автоматически.
          </p>

          <div className={styles.roomTabs}>
            {repairMeasurementData.rooms.map((room, roomIndex) => (
              <button
                key={`tab-${room.id}`}
                type="button"
                className={`${styles.roomTabButton} ${activeRoomId === room.id ? styles.roomTabButtonActive : ''}`}
                onClick={() => setActiveRoomId(room.id)}
              >
                {room.name.trim() || `Помещение ${roomIndex + 1}`}
              </button>
            ))}
          </div>

          {(repairMeasurementData.rooms.filter((room) => room.id === activeRoomId)[0] ??
            repairMeasurementData.rooms[0]) &&
            (() => {
              const room =
                repairMeasurementData.rooms.filter((x) => x.id === activeRoomId)[0] ??
                repairMeasurementData.rooms[0];
              const roomIndex = repairMeasurementData.rooms.findIndex((x) => x.id === room.id);
              const wallSegments = room.wallSegments.map(parseNumber);
              const perimeter = wallSegments.reduce((sum, value) => sum + value, 0);
              const ceilingHeight = parseNumber(room.ceilingHeight);
              const doorsArea = room.doors.reduce(
                (sum, door) => sum + parseNumber(door.width) * parseNumber(door.height),
                0
              );
              const windowsArea = room.windows.reduce(
                (sum, window) => sum + parseNumber(window.width) * parseNumber(window.height),
                0
              );
              const grossWallArea = perimeter * ceilingHeight;
              const netWallArea = Math.max(0, grossWallArea - doorsArea - windowsArea);
              const doorsWidthSum = room.doors.reduce(
                (sum, door) => sum + parseNumber(door.width),
                0
              );
              const baseboardPerimeter = Math.max(0, perimeter - doorsWidthSum);

              return (
                <article key={room.id} className={styles.roomCard}>
                  <div className={styles.roomCardHeader}>
                    <strong>Помещение {roomIndex + 1}</strong>
                    <div className={styles.roomActions}>
                      <button
                        type="button"
                        className={`${styles.secondaryButton} ${styles.roomIconBtn}`}
                        onClick={() => copyRoomWithWorksOnly(room.id)}
                        disabled={repairMeasurementData.rooms.length >= MAX_ROOMS_COUNT}
                        title="Скопировать помещение (только виды работ)"
                        aria-label="Скопировать помещение"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width={14}
                          height={14}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden
                          className={styles.roomIconCopy}
                        >
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                      </button>
                      {repairMeasurementData.rooms.length > 1 && (
                        <button
                          type="button"
                          className={`${styles.secondaryButton} ${styles.roomIconBtn}`}
                          onClick={() => removeRoom(room.id)}
                          disabled={isRoomFilled(room)}
                          title={
                            isRoomFilled(room)
                              ? 'Заполненное помещение нельзя удалить'
                              : 'Удалить помещение'
                          }
                          aria-label="Удалить помещение"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width={14}
                            height={14}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden
                            className={styles.roomIconDelete}
                          >
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            <line x1="10" y1="11" x2="10" y2="17" />
                            <line x1="14" y1="11" x2="14" y2="17" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className={`${styles.roomTopGrid} ${styles.zonePrimary}`}>
                    <div className={styles.row}>
                      <label className={styles.label}>Название помещения</label>
                      <input
                        type="text"
                        className={styles.input}
                        value={room.name}
                        onChange={(e) =>
                          updateRoom(room.id, (r) => ({ ...r, name: e.target.value }))
                        }
                        placeholder="Кухня, Спальня, Коридор..."
                      />
                    </div>
                    <div className={styles.row}>
                      <label className={styles.label}>Высота потолка, м</label>
                      <input
                        type="text"
                        className={styles.input}
                        value={room.ceilingHeight}
                        onChange={(e) =>
                          updateRoom(room.id, (r) => ({ ...r, ceilingHeight: e.target.value }))
                        }
                        placeholder="2.7"
                      />
                    </div>
                    <div className={styles.row}>
                      <label className={styles.label}>Площадь пола, м2</label>
                      <input
                        type="text"
                        className={styles.input}
                        value={room.floorArea}
                        onChange={(e) =>
                          updateRoom(room.id, (r) => ({ ...r, floorArea: e.target.value }))
                        }
                        placeholder="18.5"
                      />
                    </div>
                    <div className={styles.row}>
                      <label className={styles.label}>Толщина стен, м</label>
                      <input
                        type="text"
                        className={styles.input}
                        value={room.wallThickness}
                        onChange={(e) =>
                          updateRoom(room.id, (r) => ({ ...r, wallThickness: e.target.value }))
                        }
                        placeholder="0.2"
                      />
                    </div>
                    <div className={styles.row}>
                      <label className={styles.label}>Толщина откосов, м</label>
                      <input
                        type="text"
                        className={styles.input}
                        value={room.slopeThickness}
                        onChange={(e) =>
                          updateRoom(room.id, (r) => ({ ...r, slopeThickness: e.target.value }))
                        }
                        placeholder="0.03"
                      />
                    </div>
                  </div>

                  <div
                    className={`${styles.row} ${styles.wallSegmentsSection} ${styles.zoneGeometry}`}
                  >
                    <label className={styles.label}>Участки стен (длины, м)</label>
                    <div className={styles.wallSegmentsList}>
                      {room.wallSegments.map((segment, segmentIndex) => (
                        <div
                          key={`${room.id}-segment-${segmentIndex}`}
                          className={styles.wallSegmentItem}
                        >
                          <input
                            type="text"
                            className={styles.input}
                            value={segment}
                            onChange={(e) =>
                              updateRoom(room.id, (r) => {
                                const next = [...r.wallSegments];
                                next[segmentIndex] = e.target.value;
                                return { ...r, wallSegments: next };
                              })
                            }
                            placeholder={`Сторона ${segmentIndex + 1}`}
                          />
                          <button
                            type="button"
                            className={styles.secondaryButton}
                            onClick={() =>
                              updateRoom(room.id, (r) => ({
                                ...r,
                                wallSegments: r.wallSegments.filter((_, i) => i !== segmentIndex),
                              }))
                            }
                            disabled={room.wallSegments.length <= 1}
                          >
                            −
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        className={styles.secondaryButton}
                        onClick={() =>
                          updateRoom(room.id, (r) => ({
                            ...r,
                            wallSegments: [...r.wallSegments, ''],
                          }))
                        }
                      >
                        + Сторона
                      </button>
                    </div>
                  </div>

                  <div className={`${styles.roomOpeningsGrid} ${styles.zoneOpenings}`}>
                    <div className={styles.row}>
                      <label className={styles.label}>Двери (ширина x высота, м)</label>
                      {room.doors.map((door, doorIndex) => (
                        <div
                          key={door.id}
                          className={`${styles.inlineRow} ${styles.openingSizeRow}`}
                        >
                          <input
                            type="text"
                            className={styles.input}
                            value={door.width}
                            onChange={(e) =>
                              updateRoom(room.id, (r) => {
                                const next = [...r.doors];
                                next[doorIndex] = { ...next[doorIndex], width: e.target.value };
                                return { ...r, doors: next };
                              })
                            }
                            placeholder="Ширина"
                          />
                          <input
                            type="text"
                            className={styles.input}
                            value={door.height}
                            onChange={(e) =>
                              updateRoom(room.id, (r) => {
                                const next = [...r.doors];
                                next[doorIndex] = { ...next[doorIndex], height: e.target.value };
                                return { ...r, doors: next };
                              })
                            }
                            placeholder="Высота"
                          />
                          <button
                            type="button"
                            className={styles.secondaryButton}
                            onClick={() =>
                              updateRoom(room.id, (r) => ({
                                ...r,
                                doors: r.doors.filter((_, i) => i !== doorIndex),
                              }))
                            }
                          >
                            −
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        className={styles.secondaryButton}
                        onClick={() =>
                          updateRoom(room.id, (r) => ({
                            ...r,
                            doors: [
                              ...r.doors,
                              { id: `${r.id}-door-${Date.now()}`, width: '', height: '' },
                            ],
                          }))
                        }
                      >
                        + Добавить дверь
                      </button>
                    </div>

                    <div className={styles.row}>
                      <label className={styles.label}>Окна (ширина x высота, м)</label>
                      {room.windows.map((window, windowIndex) => (
                        <div
                          key={window.id}
                          className={`${styles.inlineRow} ${styles.openingSizeRow}`}
                        >
                          <input
                            type="text"
                            className={styles.input}
                            value={window.width}
                            onChange={(e) =>
                              updateRoom(room.id, (r) => {
                                const next = [...r.windows];
                                next[windowIndex] = { ...next[windowIndex], width: e.target.value };
                                return { ...r, windows: next };
                              })
                            }
                            placeholder="Ширина"
                          />
                          <input
                            type="text"
                            className={styles.input}
                            value={window.height}
                            onChange={(e) =>
                              updateRoom(room.id, (r) => {
                                const next = [...r.windows];
                                next[windowIndex] = {
                                  ...next[windowIndex],
                                  height: e.target.value,
                                };
                                return { ...r, windows: next };
                              })
                            }
                            placeholder="Высота"
                          />
                          <button
                            type="button"
                            className={styles.secondaryButton}
                            onClick={() =>
                              updateRoom(room.id, (r) => ({
                                ...r,
                                windows: r.windows.filter((_, i) => i !== windowIndex),
                              }))
                            }
                          >
                            −
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        className={styles.secondaryButton}
                        onClick={() =>
                          updateRoom(room.id, (r) => ({
                            ...r,
                            windows: [
                              ...r.windows,
                              { id: `${r.id}-window-${Date.now()}`, width: '', height: '' },
                            ],
                          }))
                        }
                      >
                        + Добавить окно
                      </button>
                    </div>
                  </div>

                  <div className={styles.calculatedBlock}>
                    <div>
                      Периметр: <strong>{formatMetric(perimeter)} м</strong>
                    </div>
                    <div>
                      Периметр для плинтуса (минус двери):{' '}
                      <strong>{formatMetric(baseboardPerimeter)} м</strong>
                    </div>
                    <div>
                      Площадь стен (грязная): <strong>{formatMetric(grossWallArea)} м2</strong>
                    </div>
                    <div>
                      Площадь дверей: <strong>{formatMetric(doorsArea)} м2</strong>
                    </div>
                    <div>
                      Площадь окон: <strong>{formatMetric(windowsArea)} м2</strong>
                    </div>
                    <div>
                      Площадь стен (чистая): <strong>{formatMetric(netWallArea)} м2</strong>
                    </div>
                  </div>

                  <div className={styles.row}>
                    <label className={`${styles.label} ${styles.emphasisLabel}`}>
                      Требуемые виды работ
                    </label>
                    {workCategories.length === 0 ? (
                      <span className={styles.measurementsHint}>
                        Список работ пока не загрузился.
                      </span>
                    ) : (
                      <>
                        <div className={styles.workCategoryButtons}>
                          {workCategories.map((category, categoryIndex) => {
                            const activeCategoryId =
                              activeWorkCategoryByRoomId[room.id] ?? workCategories[0]?.id ?? '';
                            const isActive = activeCategoryId === category.id;
                            const hasSelectedInCategory = category.items.some((item) =>
                              room.selectedWorkItemIds.includes(item.id)
                            );
                            return (
                              <button
                                key={`${room.id}-${category.id}`}
                                type="button"
                                className={`${styles.workCategoryButton} ${
                                  isActive ? styles.workCategoryButtonActive : ''
                                } ${hasSelectedInCategory ? styles.workCategoryButtonMarked : ''}`}
                                title={
                                  hasSelectedInCategory
                                    ? 'В категории есть выбранные работы'
                                    : undefined
                                }
                                onClick={() =>
                                  setActiveWorkCategoryByRoomId((prev) => ({
                                    ...prev,
                                    [room.id]: category.id,
                                  }))
                                }
                              >
                                {category.name || `Категория ${categoryIndex + 1}`}
                              </button>
                            );
                          })}
                        </div>
                        <div className={styles.workItemsGrid}>
                          {(
                            workCategories.find(
                              (category) =>
                                category.id ===
                                (activeWorkCategoryByRoomId[room.id] ?? workCategories[0]?.id)
                            ) ?? workCategories[0]
                          )?.items.map((item) => {
                            const checked = room.selectedWorkItemIds.includes(item.id);
                            const autoQty = resolveAutoQuantity(item.name, {
                              floorArea: parseNumber(room.floorArea),
                              perimeter,
                              baseboardPerimeter,
                              grossWallArea,
                              netWallArea,
                              doorsArea,
                              windowsArea,
                            });
                            const manualQty = room.workItemQuantities[item.id] ?? '';
                            const displayQty =
                              manualQty.trim() !== ''
                                ? manualQty
                                : autoQty !== null
                                  ? formatMetric(autoQty)
                                  : '';
                            return (
                              <label key={`${room.id}-${item.id}`} className={styles.checkboxLabel}>
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) =>
                                    updateRoom(room.id, (r) => ({
                                      ...r,
                                      selectedWorkItemIds: e.target.checked
                                        ? [...r.selectedWorkItemIds, item.id]
                                        : r.selectedWorkItemIds.filter((id) => id !== item.id),
                                      workItemQuantities: e.target.checked
                                        ? r.workItemQuantities
                                        : Object.fromEntries(
                                            Object.entries(r.workItemQuantities).filter(
                                              ([key]) => key !== item.id
                                            )
                                          ),
                                    }))
                                  }
                                />
                                <span>{item.name}</span>
                                {checked && (
                                  <span className={styles.itemQuantityWrap}>
                                    <input
                                      type="text"
                                      className={`${styles.input} ${styles.itemQuantityInput}`}
                                      value={displayQty}
                                      onChange={(e) =>
                                        updateRoom(room.id, (r) => ({
                                          ...r,
                                          workItemQuantities: {
                                            ...r.workItemQuantities,
                                            [item.id]: e.target.value,
                                          },
                                        }))
                                      }
                                      placeholder={
                                        autoQty !== null ? formatMetric(autoQty) : 'Кол-во'
                                      }
                                    />
                                    {autoQty !== null && manualQty.trim() !== '' && (
                                      <button
                                        type="button"
                                        className={styles.secondaryButton}
                                        onClick={(e) => {
                                          e.preventDefault();
                                          updateRoom(room.id, (r) => ({
                                            ...r,
                                            workItemQuantities: Object.fromEntries(
                                              Object.entries(r.workItemQuantities).filter(
                                                ([key]) => key !== item.id
                                              )
                                            ),
                                          }));
                                        }}
                                        title="Вернуть авторасчёт"
                                      >
                                        ↺
                                      </button>
                                    )}
                                  </span>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>

                  <div className={`${styles.row} ${styles.zoneNotes}`}>
                    <label className={`${styles.label} ${styles.emphasisLabel}`}>
                      Примечания по помещению
                    </label>
                    <textarea
                      value={room.notes}
                      onChange={(e) =>
                        updateRoom(room.id, (r) => ({ ...r, notes: e.target.value }))
                      }
                      className={styles.textarea}
                      rows={2}
                      placeholder="Например: сложная геометрия, дополнительные подготовительные работы..."
                    />
                  </div>
                </article>
              );
            })()}
        </section>
      </div>

      <AddCrmCustomerModal
        isOpen={addCrmCustomerOpen}
        onClose={() => setAddCrmCustomerOpen(false)}
        formMode="measurementQuick"
        initialMeasurementDraft={{
          fullName: customerName,
          phone: customerPhone,
          address: customerAddress,
        }}
        onCreated={(created) => {
          if (!isCreatedCrmCustomer(created)) return;
          setCustomerId(created.id);
          if (typeof created.firstName === 'string' && created.firstName.trim()) {
            setCustomerName(created.firstName.trim());
          }
          const ph =
            (typeof created.phone === 'string' && created.phone.trim()) ||
            (Array.isArray(created.phones) ? created.phones.find((p) => p.trim()) : undefined);
          if (ph) setCustomerPhone(ph.trim());
        }}
      />

      {measurementId && showHistory && (
        <MeasurementHistoryModal
          measurementId={measurementId}
          measurementName={customerName || undefined}
          users={users}
          directions={directions}
          onClose={() => setShowHistory(false)}
          onRollback={loadMeasurement}
        />
      )}
    </div>
  );
}
