'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  type DriverDeliveryAbsenceBlock,
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

import {
  defaultCycleDays,
  emptyAbsenceBlock,
  previewDriverCycle,
} from '../shared/driver-availability.utils';
import { formatUserLabel, todayIsoDate } from '../shared/waybills-page.utils';
import styles from './WaybillsSettingsButton.module.css';

type WaybillsSettingsButtonProps = {
  triggerClassName?: string;
};

type EditorState = {
  isActive: boolean;
  cycleAnchorDate: string;
  cycleDays: DriverDeliveryCycleDay[];
  absenceBlocks: DriverDeliveryAbsenceBlock[];
  notes: string;
};

function emptyEditor(): EditorState {
  return {
    isActive: true,
    cycleAnchorDate: todayIsoDate(),
    cycleDays: defaultCycleDays(),
    absenceBlocks: [],
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
    absenceBlocks: (item.scheme.absenceBlocks ?? []).map((b) => ({ ...b })),
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

  const isDirty = useMemo(() => {
    if (!selectedItem) return false;
    const baseline = editorFromItem(selectedItem);
    return JSON.stringify(baseline) !== JSON.stringify(editor);
  }, [selectedItem, editor]);

  const selectDriver = (userId: string) => {
    if (userId === selectedUserId) return;
    if (isDirty) {
      const ok = window.confirm(
        'Есть несохранённые изменения схемы. Переключить водителя без сохранения?'
      );
      if (!ok) return;
    }
    setSelectedUserId(userId);
  };

  const copyFromDriver = (fromUserId: string) => {
    const source = items.find((i) => i.user.id === fromUserId);
    if (!source?.scheme) {
      setError('У выбранного водителя нет сохранённой схемы');
      return;
    }
    setEditor({
      isActive: source.scheme.isActive,
      cycleAnchorDate: source.scheme.cycleAnchorDate.slice(0, 10),
      cycleDays:
        source.scheme.cycleDays.length > 0
          ? source.scheme.cycleDays.map((d) => ({ ...d }))
          : defaultCycleDays(),
      absenceBlocks: [],
      notes: source.scheme.notes ?? '',
    });
  };

  const preview = useMemo(
    () =>
      previewDriverCycle({
        cycleAnchorDate: editor.cycleAnchorDate,
        cycleDays: editor.cycleDays,
        absenceBlocks: editor.absenceBlocks,
      }),
    [editor.cycleAnchorDate, editor.cycleDays, editor.absenceBlocks]
  );

  const updateDay = (index: number, patch: Partial<DriverDeliveryCycleDay>) => {
    setEditor((prev) => {
      const cycleDays = prev.cycleDays.map((d, i) => (i === index ? { ...d, ...patch } : d));
      return { ...prev, cycleDays };
    });
  };

  const updateAbsence = (index: number, patch: Partial<DriverDeliveryAbsenceBlock>) => {
    setEditor((prev) => {
      const absenceBlocks = prev.absenceBlocks.map((b, i) =>
        i === index ? { ...b, ...patch } : b
      );
      return { ...prev, absenceBlocks };
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
    for (let i = 0; i < editor.absenceBlocks.length; i++) {
      const block = editor.absenceBlocks[i]!;
      if (!block.dateFrom || !block.dateTo) {
        setError(`Укажите даты периода отсутствия #${i + 1}`);
        return;
      }
      if (block.dateFrom > block.dateTo) {
        setError(`В периоде #${i + 1} дата «с» должна быть не позже «по»`);
        return;
      }
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
        absenceBlocks: editor.absenceBlocks.map((b) => ({
          kind: b.kind,
          dateFrom: b.dateFrom,
          dateTo: b.dateTo,
          note: b.note?.trim() || null,
        })),
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
            У каждого водителя своя схема: выберите сотрудника слева и задайте его цикл (например: 2
            дня → выходной → с 15:00) и периоды отпуска/больничного. «Начало цикла» — день 1 этой
            схемы.
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
                      onClick={() => selectDriver(item.user.id)}
                    >
                      <span className={styles.driverName}>{formatUserLabel(item.user)}</span>
                      <span className={styles.driverMeta}>
                        {item.scheme
                          ? item.scheme.isActive
                            ? `Своя схема · ${item.scheme.cycleDays.length} дн.`
                            : 'Схема выкл.'
                          : 'Нет схемы'}
                      </span>
                    </button>
                  );
                })}
              </aside>

              <div className={styles.editor}>
                {selectedItem ? (
                  <>
                    <div className={styles.editorDriverTitle}>
                      Схема: {formatUserLabel(selectedItem.user)}
                      {selectedItem.user.role === 'DRIVER' ? '' : ` · ${selectedItem.user.role}`}
                    </div>
                    <div className={styles.copyRow}>
                      <label htmlFor="wb-av-copy">Скопировать цикл от</label>
                      <select
                        id="wb-av-copy"
                        defaultValue=""
                        onChange={(e) => {
                          const fromId = e.target.value;
                          e.target.value = '';
                          if (fromId) copyFromDriver(fromId);
                        }}
                      >
                        <option value="">—</option>
                        {items
                          .filter((i) => i.user.id !== selectedUserId && i.scheme)
                          .map((i) => (
                            <option key={i.user.id} value={i.user.id}>
                              {formatUserLabel(i.user)}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div className={styles.editorTop}>
                      <label className={styles.checkRow}>
                        <input
                          type="checkbox"
                          checked={editor.isActive}
                          onChange={(e) =>
                            setEditor((prev) => ({ ...prev, isActive: e.target.checked }))
                          }
                        />
                        Активна
                      </label>
                      <div className={styles.anchorField}>
                        <label htmlFor="wb-av-anchor">Начало цикла</label>
                        <input
                          id="wb-av-anchor"
                          type="date"
                          value={editor.cycleAnchorDate}
                          onChange={(e) =>
                            setEditor((prev) => ({ ...prev, cycleAnchorDate: e.target.value }))
                          }
                        />
                      </div>
                    </div>

                    <div className={styles.cycleHeader}>
                      <span className={styles.cycleTitle}>Дни цикла</span>
                      <button
                        type="button"
                        data-modal-btn="secondary"
                        className={styles.compactBtn}
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
                          <span className={styles.cycleDayIndex}>{index + 1}</span>
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
                          ) : (
                            <span className={styles.dayOffPlaceholder}>—</span>
                          )}
                          {editor.cycleDays.length > 1 ? (
                            <button
                              type="button"
                              data-modal-btn="secondary"
                              className={styles.compactBtn}
                              onClick={() =>
                                setEditor((prev) => ({
                                  ...prev,
                                  cycleDays: prev.cycleDays.filter((_, i) => i !== index),
                                }))
                              }
                              aria-label={`Удалить день ${index + 1}`}
                            >
                              ×
                            </button>
                          ) : (
                            <span className={styles.dayRemoveSpacer} />
                          )}
                        </div>
                      ))}
                    </div>

                    <div className={styles.cycleHeader}>
                      <span className={styles.cycleTitle}>Отпуск / больничный</span>
                      <button
                        type="button"
                        data-modal-btn="secondary"
                        className={styles.compactBtn}
                        onClick={() =>
                          setEditor((prev) => ({
                            ...prev,
                            absenceBlocks: [...prev.absenceBlocks, emptyAbsenceBlock()],
                          }))
                        }
                      >
                        + Период
                      </button>
                    </div>
                    <p className={styles.sectionHint}>
                      В эти даты доставки не принимаются (приоритет над циклом).
                    </p>
                    {editor.absenceBlocks.length === 0 ? (
                      <p className={styles.emptyAbsences}>Периодов нет</p>
                    ) : (
                      <div className={styles.absenceBlocks}>
                        {editor.absenceBlocks.map((block, index) => (
                          <div key={index} className={styles.absenceRow}>
                            <select
                              value={block.kind}
                              aria-label={`Тип периода ${index + 1}`}
                              onChange={(e) =>
                                updateAbsence(index, {
                                  kind: e.target.value as 'VACATION' | 'SICK',
                                })
                              }
                            >
                              <option value="VACATION">Отпуск</option>
                              <option value="SICK">Больничный</option>
                            </select>
                            <label className={styles.absenceDate}>
                              с
                              <input
                                type="date"
                                value={block.dateFrom}
                                onChange={(e) => updateAbsence(index, { dateFrom: e.target.value })}
                              />
                            </label>
                            <label className={styles.absenceDate}>
                              по
                              <input
                                type="date"
                                value={block.dateTo}
                                onChange={(e) => updateAbsence(index, { dateTo: e.target.value })}
                              />
                            </label>
                            <input
                              type="text"
                              className={styles.absenceNote}
                              value={block.note ?? ''}
                              placeholder="Комментарий"
                              aria-label={`Комментарий периода ${index + 1}`}
                              onChange={(e) =>
                                updateAbsence(index, { note: e.target.value || null })
                              }
                            />
                            <button
                              type="button"
                              data-modal-btn="secondary"
                              className={styles.compactBtn}
                              onClick={() =>
                                setEditor((prev) => ({
                                  ...prev,
                                  absenceBlocks: prev.absenceBlocks.filter((_, i) => i !== index),
                                }))
                              }
                              aria-label={`Удалить период ${index + 1}`}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className={styles.notesRow}>
                      <label htmlFor="wb-av-notes">Заметка</label>
                      <input
                        id="wb-av-notes"
                        type="text"
                        value={editor.notes}
                        onChange={(e) => setEditor((prev) => ({ ...prev, notes: e.target.value }))}
                        placeholder="Сутки через трое на основной работе…"
                      />
                    </div>

                    <div className={styles.preview}>
                      <div className={styles.cycleTitle}>Превью</div>
                      <div className={styles.previewChips}>
                        {preview.slice(0, 7).map((p) => (
                          <span
                            key={p.date}
                            className={`${styles.previewChip} ${
                              p.kind === 'VACATION' || p.kind === 'SICK'
                                ? styles.previewAbsence
                                : p.kind === 'OFF'
                                  ? styles.previewOff
                                  : styles.previewOn
                            }`}
                            title={`${p.date}: ${p.label}`}
                          >
                            <span className={styles.previewDate}>{p.date.slice(5)}</span>
                            <span className={styles.previewLabel}>{p.label}</span>
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className={styles.actions} data-modal-form-actions>
                      {selectedItem.scheme ? (
                        <button
                          type="button"
                          data-modal-btn="secondary"
                          disabled={saving}
                          onClick={() => void handleDelete()}
                        >
                          Удалить
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
