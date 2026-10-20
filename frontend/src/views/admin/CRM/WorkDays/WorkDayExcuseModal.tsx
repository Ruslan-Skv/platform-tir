'use client';

import { type FormEvent, useEffect, useState } from 'react';

import type { WorkDayExcuseKind, WorkDayJournalRow } from '@/shared/api/crm/admin-work-days';
import { Modal } from '@/shared/ui/Modal';
import crmFormStyles from '@/views/admin/CRM/Customers/modals/AddCrmCustomerModal.module.css';
import modalStyles from '@/views/admin/Catalog/Components/shared/ComponentCatalogModal.module.css';

import {
  formatWorkDayDate,
  workDayExcuseLabel,
  workDayRowViolations,
  workDayUserName,
} from './work-days-display.utils';

type WorkDayExcuseModalProps = {
  /** Строка журнала с нарушениями; null — окно закрыто. */
  target: WorkDayJournalRow | null;
  busy: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    userId: string;
    workDate: string;
    kinds: WorkDayExcuseKind[];
    comment?: string;
  }) => Promise<void>;
};

/**
 * Прощение нарушений строки журнала (только суперадмин): выбранное нарушение
 * перестаёт считаться нарушением — удержание не начисляется, а сотрудник
 * в «Моём рабочем дне» его не видит.
 */
export function WorkDayExcuseModal({ target, busy, onClose, onSubmit }: WorkDayExcuseModalProps) {
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!target) return;
    // По умолчанию отмечены все ещё не прощённые нарушения строки.
    setSelected(
      Object.fromEntries(
        workDayRowViolations(target)
          .filter((violation) => !violation.excused)
          .map((violation) => [violation.kind, true])
      )
    );
    setComment('');
    setError(null);
  }, [target]);

  const violations = target ? workDayRowViolations(target) : [];
  const unexcused = violations.filter((violation) => !violation.excused);
  const alreadyExcused = violations.filter((violation) => violation.excused);

  const toggle = (kind: WorkDayExcuseKind) => {
    setSelected((prev) => ({ ...prev, [kind]: !prev[kind] }));
  };

  const handleClose = () => {
    if (busy) return;
    setError(null);
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!target) return;
    const kinds = unexcused.filter((violation) => selected[violation.kind]).map((v) => v.kind);
    if (kinds.length === 0) {
      setError('Выберите хотя бы одно нарушение');
      return;
    }
    setError(null);
    try {
      await onSubmit({
        userId: target.userId,
        workDate: target.workDate.slice(0, 10),
        kinds,
        comment: comment.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось простить нарушение');
    }
  };

  const violationLabel = (kind: WorkDayExcuseKind, minutes: number | null) =>
    minutes ? `${workDayExcuseLabel(kind)} — ${minutes} мин` : workDayExcuseLabel(kind);

  return (
    <Modal
      isOpen={target !== null}
      onClose={handleClose}
      title="Простить нарушение"
      size="md"
      className={crmFormStyles.modalPanel}
      showCloseButton
      compactOnMobile
    >
      <form
        className={`${crmFormStyles.formShell} ${modalStyles.formBlueShell}`}
        data-modal-form
        data-modal-density="compact"
        onSubmit={(e) => void handleSubmit(e)}
      >
        <p data-modal-form-hint style={{ marginTop: 0 }}>
          Прощённое нарушение не учитывается при расчёте удержаний из оклада и не показывается
          сотруднику в «Моём рабочем дне». Отменить прощение можно крестиком в списке прощённых
          нарушений над журналом.
        </p>

        <div data-modal-form-grid>
          <div data-modal-form-group>
            <label>Сотрудник</label>
            <p>{target ? workDayUserName(target) : '—'}</p>
          </div>

          <div data-modal-form-group>
            <label>Дата</label>
            <p>{target ? formatWorkDayDate(target.workDate) : '—'}</p>
          </div>

          {unexcused.length > 0 ? (
            <div data-modal-form-group data-modal-span>
              <label>Нарушения *</label>
              <div>
                {unexcused.map((violation) => (
                  <label key={violation.kind}>
                    <input
                      type="checkbox"
                      checked={Boolean(selected[violation.kind])}
                      disabled={busy}
                      onChange={() => toggle(violation.kind)}
                    />{' '}
                    {violationLabel(violation.kind, violation.minutes)}
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          {alreadyExcused.length > 0 ? (
            <div data-modal-form-group data-modal-span>
              <label>Уже прощено</label>
              <p>
                {alreadyExcused
                  .map((violation) => violationLabel(violation.kind, violation.minutes))
                  .join(', ')}
              </p>
            </div>
          ) : null}

          <div data-modal-form-group data-modal-span>
            <label htmlFor="work-day-excuse-comment">Комментарий</label>
            <textarea
              id="work-day-excuse-comment"
              value={comment}
              disabled={busy}
              rows={3}
              placeholder="Например: сбой приложения при обновлении — не по вине сотрудника"
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
        </div>

        {error ? <p data-modal-form-error>{error}</p> : null}

        <div data-modal-form-actions>
          <button type="button" data-modal-btn="secondary" onClick={handleClose} disabled={busy}>
            Отмена
          </button>
          <button
            data-admin-mutation
            type="submit"
            data-modal-btn="primary"
            disabled={busy || unexcused.length === 0}
          >
            {busy ? 'Сохранение…' : 'Простить'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
