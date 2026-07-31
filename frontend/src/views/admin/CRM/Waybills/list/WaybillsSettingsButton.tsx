'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  type DriverDeliveryAvailabilityListItem,
  type DriverDeliveryCycleDay,
  deleteDriverDeliveryAvailability,
  listDriverDeliveryAvailability,
  upsertDriverDeliveryAvailability,
} from '@/shared/api/admin-waybills';
import { Modal } from '@/shared/ui/Modal';
import { AdminSaveNotice } from '@/shared/ui/admin/AdminSaveNotice';
import toolbarButtonStyles from '@/shared/ui/admin/AdminToolbarIconButton/AdminToolbarIconButton.module.css';
import {
  ADMIN_KNOWLEDGE_PLATFORM_SETTINGS_ICON_SIZE,
  KnowledgePlatformSettingsIcon,
} from '@/shared/ui/icons';

import { defaultCycleDays, previewDriverCycle } from '../shared/driver-availability.utils';
import { formatUserLabel, todayIsoDate } from '../shared/waybills-page.utils';
import styles from './WaybillsSettingsButton.module.css';

type WaybillsSettingsButtonProps = {
  triggerClassName?: string;
};

type EditorState = {
  isActive: boolean;
  cycleAnchorDate: string;
  cycleDays: DriverDeliveryCycleDay[];
  notes: string;
};

function emptyEditor(): EditorState {
  return {
    isActive: true,
    cycleAnchorDate: todayIsoDate(),
    cycleDays: defaultCycleDays(),
    notes: '',
  };
}

function editorFromItem(item: DriverDeliveryAvailabilityListItem): EditorState {
  if (!item.scheme) return emptyEditor();
  return {
    isActive: item.scheme.isActive,
    cycleAnchorDate: item.scheme.cycleAnchorDate.slice(0, 10),
    cycleDays:
      item.scheme.cycleDays.length > 0
        ? item.scheme.cycleDays.map((d) => ({ ...d }))
        : defaultCycleDays(),
    notes: item.scheme.notes ?? '',
  };
}

export function WaybillsSettingsButton({ triggerClassName }: WaybillsSettingsButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [items, setItems] = useState<DriverDeliveryAvailabilityListItem[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState>(emptyEditor);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listDriverDeliveryAvailability();
      setItems(data);
      setSelectedUserId((prev) => {
        if (prev && data.some((d) => d.user.id === prev)) return prev;
        return data[0]?.user.id ?? null;
      });
    } catch (err) {
      setItems([]);
      setError(err instanceof Error ? err.message : 'Не удалось загрузить настройки');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);

  useEffect(() => {
    if (!selectedUserId) {
      setEditor(emptyEditor());
      return;
    }
    const item = items.find((i) => i.user.id === selectedUserId);
    if (item) setEditor(editorFromItem(item));
  }, [selectedUserId, items]);

  const selectedItem = useMemo(
    () => items.find((i) => i.user.id === selectedUserId) ?? null,
    [items, selectedUserId]
  );

  const preview = useMemo(
    () =>
      previewDriverCycle({
        cycleAnchorDate: editor.cycleAnchorDate,
        cycleDays: editor.cycleDays,
      }),
    [editor.cycleAnchorDate, editor.cycleDays]
  );

  const updateDay = (index: number, patch: Partial<DriverDeliveryCycleDay>) => {
    setEditor((prev) => {
      const cycleDays = prev.cycleDays.map((d, i) => (i === index ? { ...d, ...patch } : d));
      return { ...prev, cycleDays };
    });
  };

  const handleSave = async () => {
    if (!selectedUserId) return;
    if (!editor.cycleAnchorDate.trim()) {
      setError('Укажите дату начала цикла');
      return;
    }
    if (editor.cycleDays.length < 1) {
      setError('Добавьте хотя бы один день цикла');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await upsertDriverDeliveryAvailability(selectedUserId, {
        isActive: editor.isActive,
        cycleAnchorDate: editor.cycleAnchorDate,
        cycleDays: editor.cycleDays.map((d) =>
          d.kind === 'OFF'
            ? { kind: 'OFF', availableFrom: null, availableTo: null }
            : {
                kind: 'ON',
                availableFrom: d.availableFrom || '00:00',
                availableTo: d.availableTo || '23:59',
              }
        ),
        notes: editor.notes.trim() || null,
      });
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 1800);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedUserId || !selectedItem?.scheme) return;
    if (!window.confirm('Удалить схему доступности этого водителя?')) return;
    setSaving(true);
    setError(null);
    try {
      await deleteDriverDeliveryAvailability(selectedUserId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка удаления');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className={triggerClassName || `${toolbarButtonStyles.button} ${styles.trigger}`}
        title="Настройки путевого листа"
        aria-label="Настройки путевого листа"
        onClick={() => setOpen(true)}
      >
        <KnowledgePlatformSettingsIcon size={ADMIN_KNOWLEDGE_PLATFORM_SETTINGS_ICON_SIZE} />
      </button>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Настройки путевого листа"
        size="lg"
        showCloseButton
        titleAside={<AdminSaveNotice visible={savedFlash} />}
        className={styles.modalPanel}
      >
        <div className={styles.shell} data-modal-form data-modal-density="compact">
          <p className={styles.hint}>
            Задайте циклическую схему, когда водитель доступен на доставках. Пример: 2 дня в работе
            → выходной → день с 15:00. Дата начала цикла — день с индексом 0.
          </p>

          {error ? <p data-modal-form-error>{error}</p> : null}
          {loading ? <p data-modal-form-hint>Загрузка…</p> : null}

          {!loading && items.length === 0 ? (
            <p data-modal-form-hint>Нет водителей для настройки</p>
          ) : null}

          {!loading && items.length > 0 ? (
            <div className={styles.layout}>
              <aside className={styles.driverList} aria-label="Водители">
                {items.map((item) => {
                  const active = item.user.id === selectedUserId;
                  return (
                    <button
                      key={item.user.id}
                      type="button"
                      className={`${styles.driverBtn}${active ? ` ${styles.driverBtnActive}` : ''}`}
                      onClick={() => setSelectedUserId(item.user.id)}
                    >
                      <span className={styles.driverName}>{formatUserLabel(item.user)}</span>
                      <span className={styles.driverMeta}>
                        {item.scheme
                          ? item.scheme.isActive
                            ? `${item.scheme.cycleDays.length} дн. цикл`
                            : 'Выкл.'
                          : 'Нет схемы'}
                      </span>
                    </button>
                  );
                })}
              </aside>

              <div className={styles.editor}>
                {selectedItem ? (
                  <>
                    <label className={styles.checkRow}>
                      <input
                        type="checkbox"
                        checked={editor.isActive}
                        onChange={(e) =>
                          setEditor((prev) => ({ ...prev, isActive: e.target.checked }))
                        }
                      />
                      Схема активна
                    </label>

                    <div data-modal-form-group>
                      <label htmlFor="wb-av-anchor">Начало цикла (день 1)</label>
                      <input
                        id="wb-av-anchor"
                        type="date"
                        value={editor.cycleAnchorDate}
                        onChange={(e) =>
                          setEditor((prev) => ({ ...prev, cycleAnchorDate: e.target.value }))
                        }
                      />
                    </div>

                    <div className={styles.cycleHeader}>
                      <span className={styles.cycleTitle}>Дни цикла</span>
                      <button
                        type="button"
                        data-modal-btn="secondary"
                        onClick={() =>
                          setEditor((prev) => ({
                            ...prev,
                            cycleDays: [
                              ...prev.cycleDays,
                              { kind: 'ON', availableFrom: '00:00', availableTo: '23:59' },
                            ],
                          }))
                        }
                      >
                        + День
                      </button>
                    </div>

                    <div className={styles.cycleDays}>
                      {editor.cycleDays.map((day, index) => (
                        <div key={index} className={styles.cycleDay}>
                          <div className={styles.cycleDayTop}>
                            <span className={styles.cycleDayIndex}>День {index + 1}</span>
                            <select
                              value={day.kind}
                              aria-label={`Тип дня ${index + 1}`}
                              onChange={(e) => {
                                const kind = e.target.value as 'ON' | 'OFF';
                                updateDay(
                                  index,
                                  kind === 'OFF'
                                    ? { kind, availableFrom: null, availableTo: null }
                                    : {
                                        kind,
                                        availableFrom: day.availableFrom || '00:00',
                                        availableTo: day.availableTo || '23:59',
                                      }
                                );
                              }}
                            >
                              <option value="ON">На доставках</option>
                              <option value="OFF">Выходной</option>
                            </select>
                            {editor.cycleDays.length > 1 ? (
                              <button
                                type="button"
                                data-modal-btn="secondary"
                                onClick={() =>
                                  setEditor((prev) => ({
                                    ...prev,
                                    cycleDays: prev.cycleDays.filter((_, i) => i !== index),
                                  }))
                                }
                              >
                                Удалить
                              </button>
                            ) : null}
                          </div>
                          {day.kind === 'ON' ? (
                            <div className={styles.timeRow}>
                              <label>
                                с
                                <input
                                  type="time"
                                  value={day.availableFrom || '00:00'}
                                  onChange={(e) =>
                                    updateDay(index, { availableFrom: e.target.value })
                                  }
                                />
                              </label>
                              <label>
                                до
                                <input
                                  type="time"
                                  value={day.availableTo || '23:59'}
                                  onChange={(e) =>
                                    updateDay(index, { availableTo: e.target.value })
                                  }
                                />
                              </label>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>

                    <div data-modal-form-group>
                      <label htmlFor="wb-av-notes">Заметка</label>
                      <textarea
                        id="wb-av-notes"
                        rows={2}
                        value={editor.notes}
                        onChange={(e) => setEditor((prev) => ({ ...prev, notes: e.target.value }))}
                        placeholder="Например: сутки через трое на основной работе"
                      />
                    </div>

                    <div className={styles.preview}>
                      <div className={styles.cycleTitle}>Превью 14 дней</div>
                      <div className={styles.previewChips}>
                        {preview.map((p) => (
                          <span
                            key={p.date}
                            className={`${styles.previewChip} ${
                              p.kind === 'OFF' ? styles.previewOff : styles.previewOn
                            }`}
                            title={p.label}
                          >
                            <span className={styles.previewDate}>{p.date.slice(5)}</span>
                            <span className={styles.previewLabel}>{p.label}</span>
                          </span>
                        ))}
                      </div>
                    </div>

                    <div data-modal-form-actions>
                      {selectedItem.scheme ? (
                        <button
                          type="button"
                          data-modal-btn="secondary"
                          disabled={saving}
                          onClick={() => void handleDelete()}
                        >
                          Удалить схему
                        </button>
                      ) : (
                        <span />
                      )}
                      <button
                        data-admin-mutation
                        type="button"
                        data-modal-btn="primary"
                        disabled={saving}
                        onClick={() => void handleSave()}
                      >
                        {saving ? 'Сохранение…' : 'Сохранить'}
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </Modal>
    </>
  );
}
