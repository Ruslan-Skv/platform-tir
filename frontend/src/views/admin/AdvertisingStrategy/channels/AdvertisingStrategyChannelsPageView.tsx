'use client';

import { AdminFormMessage } from '@/shared/ui/admin/AdminFormMessage';

import styles from '../shared/AdvertisingStrategy.module.css';
import { AdvertisingStrategyPageShell } from '../shared/AdvertisingStrategyPageShell';
import { formatPercent, formatRub } from '../shared/advertising-strategy.utils';
import type { AdvertisingStrategyChannelsPageModel } from './hooks/useAdvertisingStrategyChannelsPage';

type AdvertisingStrategyChannelsPageViewProps = {
  model: AdvertisingStrategyChannelsPageModel;
};

export function AdvertisingStrategyChannelsPageView({
  model,
}: AdvertisingStrategyChannelsPageViewProps) {
  const {
    channels,
    totalBudget,
    loading,
    saving,
    modalOpen,
    editing,
    form,
    setForm,
    saveNoticeVisible,
    errorMessage,
    plannedTotal,
    openCreate,
    openEdit,
    closeModal,
    onBudgetInput,
    onShareInput,
    onNameChange,
    onCodeChange,
    handleSubmit,
    handleDelete,
  } = model;

  return (
    <AdvertisingStrategyPageShell
      subtitle="Приоритеты, бюджеты (₽ и доли) и роли каналов в рекламной стратегии."
      countLabel={`${channels.length} каналов`}
      countValue={channels.length}
      saveNoticeVisible={saveNoticeVisible}
      headerActions={
        <button type="button" className={styles.primaryButton} onClick={openCreate}>
          + Добавить канал
        </button>
      }
    >
      {errorMessage ? <AdminFormMessage type="error">{errorMessage}</AdminFormMessage> : null}

      <div className={styles.stats}>
        <span className={styles.statChip}>
          Общий бюджет:{' '}
          <span className={styles.statChipStrong}>{formatRub(totalBudget || plannedTotal)}</span>
        </span>
        <span className={styles.statChip}>
          По каналам: <span className={styles.statChipStrong}>{formatRub(plannedTotal)}</span>
        </span>
      </div>

      <section className={styles.section}>
        <div className={styles.card}>
          {loading ? (
            <p className={styles.loading}>Загрузка...</p>
          ) : channels.length === 0 ? (
            <p className={styles.empty}>Каналы ещё не добавлены.</p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Приоритет</th>
                    <th>Канал</th>
                    <th>Код</th>
                    <th>Бюджет / мес</th>
                    <th>Доля</th>
                    <th>Роль</th>
                    <th>Статус</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {channels.map((ch) => (
                    <tr key={ch.id}>
                      <td>
                        <span className={styles.priorityBadge}>{ch.priority}</span>
                      </td>
                      <td>
                        <span className={styles.channelName}>{ch.name}</span>
                        {ch.description ? (
                          <span className={styles.channelRole}>{ch.description}</span>
                        ) : null}
                      </td>
                      <td>
                        <code>{ch.code}</code>
                      </td>
                      <td>{formatRub(ch.monthlyBudget)}</td>
                      <td>{formatPercent(ch.budgetSharePercent)}</td>
                      <td>{ch.role || '—'}</td>
                      <td>
                        <span className={ch.isActive ? styles.statusOn : styles.statusOff}>
                          {ch.isActive ? 'Активен' : 'Выкл.'}
                        </span>
                      </td>
                      <td>
                        <div className={styles.actions}>
                          <button
                            type="button"
                            className={styles.linkButton}
                            onClick={() => openEdit(ch)}
                          >
                            Изменить
                          </button>
                          <button
                            type="button"
                            className={styles.dangerButton}
                            onClick={() => void handleDelete(ch)}
                          >
                            Удалить
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {modalOpen ? (
        <div className={styles.modalOverlay} role="presentation" onClick={closeModal}>
          <div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="channel-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="channel-modal-title" className={styles.modalTitle}>
              {editing ? 'Редактирование канала' : 'Новый канал'}
            </h2>
            <form className={styles.form} onSubmit={handleSubmit}>
              <label className={styles.field}>
                <span>Название</span>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => onNameChange(e.target.value)}
                  required
                />
              </label>
              <label className={styles.field}>
                <span>Код (латиница)</span>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => onCodeChange(e.target.value)}
                  required
                  pattern="[A-Za-z0-9_-]+"
                />
              </label>
              <div className={styles.formGrid}>
                <label className={styles.field}>
                  <span>Приоритет</span>
                  <input
                    type="number"
                    min={1}
                    value={form.priority}
                    onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                    required
                  />
                </label>
                <label className={styles.field}>
                  <span>Бюджет / мес, ₽</span>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={form.monthlyBudget}
                    onChange={(e) => onBudgetInput(e.target.value)}
                    placeholder="пусто = без бюджета"
                  />
                </label>
                <label className={styles.field}>
                  <span>Доля от общего бюджета, %</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={form.sharePercent}
                    onChange={(e) => onShareInput(e.target.value)}
                    placeholder={
                      totalBudget > 0 ? 'от общего бюджета' : 'сначала задайте общий бюджет'
                    }
                    disabled={totalBudget <= 0}
                  />
                </label>
              </div>
              <label className={styles.field}>
                <span>Роль в стратегии</span>
                <input
                  type="text"
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                  placeholder="Например: Сбор «горячих» заявок"
                />
              </label>
              <label className={styles.field}>
                <span>Описание</span>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                />
              </label>
              <label className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                />
                <span>Канал активен</span>
              </label>
              <div className={styles.actions}>
                <button type="submit" className={styles.primaryButton} disabled={saving}>
                  {saving ? 'Сохранение...' : 'Сохранить'}
                </button>
                <button type="button" className={styles.secondaryButton} onClick={closeModal}>
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </AdvertisingStrategyPageShell>
  );
}
