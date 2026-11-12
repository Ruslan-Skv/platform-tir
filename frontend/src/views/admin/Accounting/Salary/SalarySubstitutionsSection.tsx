'use client';

import type { ManagerSubstitution } from '@/shared/api/accounting/admin-salary';
import type { CrmUser } from '@/shared/api/admin-crm';
import { ConfirmModal } from '@/shared/ui/ConfirmModal/ConfirmModal';
import { Modal } from '@/shared/ui/Modal';
import { DataTable } from '@/shared/ui/admin/DataTable';

import styles from './SalaryPage.module.css';
import type {
  ManagerSubstitutionDraft,
  ManagerSubstitutionsModel,
} from './hooks/useManagerSubstitutions';

type SectionProps = {
  model: ManagerSubstitutionsModel;
  users: CrmUser[];
};

function userName(user: CrmUser): string {
  return [user.lastName, user.firstName].filter(Boolean).join(' ') || user.email;
}

function formatDateRu(iso: string): string {
  return iso.split('-').reverse().join('.');
}

const STATUS_LABELS: Record<ManagerSubstitution['status'], string> = {
  active: 'идёт',
  upcoming: 'предстоит',
  past: 'закончилась',
};

/**
 * Блок «Подмены менеджеров» вкладки «Настройки» раздела «ЗП» (суперадмин):
 * в период подмены з/п по договорам отсутствующего менеджера и его личные
 * продажи по платежам ДП начисляются подменяющему. Включается вручную —
 * чтобы избежать случайных накладок.
 */
export function SalarySubstitutionsSection({ model, users }: SectionProps) {
  const columns = [
    {
      key: 'absentManager',
      title: 'Кого подменяют',
      render: (s: ManagerSubstitution) => s.absentManager.name,
    },
    {
      key: 'substituteManager',
      title: 'Кто подменяет',
      render: (s: ManagerSubstitution) => s.substituteManager.name,
    },
    {
      key: 'period',
      title: 'Период',
      render: (s: ManagerSubstitution) => `${formatDateRu(s.dateFrom)} — ${formatDateRu(s.dateTo)}`,
    },
    {
      key: 'status',
      title: 'Статус',
      render: (s: ManagerSubstitution) => (
        <span
          className={`${styles.statusBadge} ${
            s.status === 'active' ? styles.statusActive : styles.statusInactive
          }`}
        >
          {STATUS_LABELS[s.status]}
        </span>
      ),
    },
    {
      key: 'comment',
      title: 'Комментарий',
      render: (s: ManagerSubstitution) => s.comment || '—',
    },
    {
      key: 'actions',
      title: '',
      render: (s: ManagerSubstitution) => (
        <div className={styles.substitutionActions}>
          <button
            type="button"
            className={styles.substitutionActionBtn}
            onClick={() => model.openEditModal(s)}
            title="Изменить подмену"
          >
            Изменить
          </button>
          <button
            type="button"
            className={styles.substitutionActionBtnDanger}
            onClick={() => model.setDeleteTarget(s)}
            title="Удалить подмену"
          >
            Удалить
          </button>
        </div>
      ),
    },
  ];

  const { draft, setDraft } = model;

  return (
    <section className={styles.settingsPanel} aria-label="Подмены менеджеров">
      <h2 className={styles.sectionTitle}>
        Подмены менеджеров
        <span className={styles.mutedCell}> (отпуск / длительный больничный)</span>
      </h2>
      <p className={styles.mutedCell}>
        В период подмены з/п по всем договорам отсутствующего менеджера и его личные продажи по
        платежам ДП начисляются подменяющему. Оплаты, принятые подменяющим, лежат в его кассе.
        Менеджер договора при этом не меняется.
      </p>
      {model.error ? <p className={styles.errorText}>{model.error}</p> : null}
      {model.notice ? <p className={styles.noticeText}>{model.notice}</p> : null}
      <div className={styles.substitutionToolbar}>
        <button type="button" className={styles.substitutionAddBtn} onClick={model.openCreateModal}>
          + Подмена
        </button>
      </div>
      {model.loading ? (
        <p className={styles.mutedCell}>Загрузка…</p>
      ) : (
        <DataTable
          data={model.rows}
          columns={columns}
          keyExtractor={(s) => s.id}
          emptyMessage="Подмен нет — добавьте, когда менеджер уходит в отпуск или на больничный"
        />
      )}

      <Modal
        isOpen={model.modalOpen}
        onClose={model.closeModal}
        title={model.editingRow ? 'Изменить подмену' : 'Новая подмена'}
        size="md"
        showCloseButton
      >
        <div className={styles.substitutionModalForm}>
          <p className={styles.mutedCell}>
            Все договоры отсутствующего менеджера в период подмены дают з/п и продажи подменяющему.
            У одного менеджера не может быть двух пересекающихся подмен.
          </p>
          <label className={styles.settingsField}>
            <span>Кого подменяют (отпуск/больничный)</span>
            <select
              value={draft.absentManagerId}
              onChange={(e) => setDraft((d) => ({ ...d, absentManagerId: e.target.value }))}
              disabled={model.saving}
            >
              <option value="">— выберите менеджера —</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {userName(u)}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.settingsField}>
            <span>Кто подменяет (получает з/п и продажи)</span>
            <select
              value={draft.substituteManagerId}
              onChange={(e) => setDraft((d) => ({ ...d, substituteManagerId: e.target.value }))}
              disabled={model.saving}
            >
              <option value="">— выберите менеджера —</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {userName(u)}
                </option>
              ))}
            </select>
          </label>
          <div className={styles.substitutionDatesRow}>
            <label className={styles.settingsField}>
              <span>Начало периода</span>
              <input
                type="date"
                value={draft.dateFrom}
                onChange={(e) => setDraft((d) => ({ ...d, dateFrom: e.target.value }))}
                disabled={model.saving}
              />
            </label>
            <label className={styles.settingsField}>
              <span>Конец периода (включительно)</span>
              <input
                type="date"
                value={draft.dateTo}
                onChange={(e) => setDraft((d) => ({ ...d, dateTo: e.target.value }))}
                disabled={model.saving}
              />
            </label>
          </div>
          <label className={styles.settingsField}>
            <span>Комментарий (например: «отпуск», «больничный»)</span>
            <input
              type="text"
              value={draft.comment}
              onChange={(e) => setDraft((d) => ({ ...d, comment: e.target.value }))}
              disabled={model.saving}
              placeholder="Необязательно"
            />
          </label>
          <div className={styles.substitutionModalActions}>
            <button
              type="button"
              className={styles.substitutionSaveBtn}
              disabled={model.saving}
              onClick={() => void model.save()}
            >
              {model.saving ? 'Сохранение…' : model.editingRow ? 'Сохранить' : 'Создать подмену'}
            </button>
            <button
              type="button"
              className={styles.substitutionCancelBtn}
              disabled={model.saving}
              onClick={model.closeModal}
            >
              Отмена
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={model.deleteTarget != null}
        onClose={() => {
          if (!model.deleting) model.setDeleteTarget(null);
        }}
        onConfirm={() => void model.remove()}
        title="Удалить подмену?"
        message="Начисления вернутся менеджеру договора. Удалить подмену?"
        confirmText="Удалить"
        variant="danger"
      />
    </section>
  );
}

export type { ManagerSubstitutionDraft };
