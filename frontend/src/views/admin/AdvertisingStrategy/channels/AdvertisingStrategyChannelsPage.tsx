'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  type MarketingChannel,
  createMarketingChannel,
  deleteMarketingChannel,
  getMarketingChannels,
  getMarketingStrategy,
  updateMarketingChannel,
} from '@/shared/api/admin-marketing';
import { AdminFormMessage } from '@/shared/ui/admin/AdminFormMessage';
import { useAdminSaveFeedback } from '@/shared/ui/admin/useAdminSaveFeedback';

import styles from '../shared/AdvertisingStrategy.module.css';
import { AdvertisingStrategyPageShell } from '../shared/AdvertisingStrategyPageShell';
import {
  budgetFromShare,
  formatPercent,
  formatRub,
  shareFromBudget,
  slugifyChannelCode,
} from '../shared/advertising-strategy.utils';

type ChannelFormState = {
  name: string;
  code: string;
  priority: string;
  monthlyBudget: string;
  sharePercent: string;
  role: string;
  description: string;
  isActive: boolean;
};

const emptyForm = (): ChannelFormState => ({
  name: '',
  code: '',
  priority: '10',
  monthlyBudget: '',
  sharePercent: '',
  role: '',
  description: '',
  isActive: true,
});

function toForm(channel: MarketingChannel): ChannelFormState {
  return {
    name: channel.name,
    code: channel.code,
    priority: String(channel.priority),
    monthlyBudget: channel.monthlyBudget != null ? String(channel.monthlyBudget) : '',
    sharePercent: channel.budgetSharePercent != null ? String(channel.budgetSharePercent) : '',
    role: channel.role ?? '',
    description: channel.description ?? '',
    isActive: channel.isActive,
  };
}

export function AdvertisingStrategyChannelsPage() {
  const [channels, setChannels] = useState<MarketingChannel[]>([]);
  const [totalBudget, setTotalBudget] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MarketingChannel | null>(null);
  const [form, setForm] = useState<ChannelFormState>(emptyForm);
  const [codeTouched, setCodeTouched] = useState(false);
  const { saveNoticeVisible, errorMessage, showSaveSuccess, showSaveError, resetSaveFeedback } =
    useAdminSaveFeedback();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [chs, strategy] = await Promise.all([getMarketingChannels(), getMarketingStrategy()]);
      setChannels(chs);
      setTotalBudget(strategy.monthlyBudgetTotal ?? 0);
    } catch (err) {
      showSaveError(err instanceof Error ? err.message : 'Не удалось загрузить каналы');
    } finally {
      setLoading(false);
    }
  }, [showSaveError]);

  useEffect(() => {
    void load();
  }, [load]);

  const plannedTotal = useMemo(
    () =>
      channels
        .filter((c) => c.isActive && c.monthlyBudget != null)
        .reduce((sum, c) => sum + (c.monthlyBudget ?? 0), 0),
    [channels]
  );

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setCodeTouched(false);
    resetSaveFeedback();
    setModalOpen(true);
  };

  const openEdit = (channel: MarketingChannel) => {
    setEditing(channel);
    setForm(toForm(channel));
    setCodeTouched(true);
    resetSaveFeedback();
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const onBudgetInput = (money: string) => {
    const amount = money.trim() === '' ? null : Number(money);
    setForm((f) => ({
      ...f,
      monthlyBudget: money,
      sharePercent:
        amount === null || !Number.isFinite(amount) || totalBudget <= 0
          ? f.sharePercent
          : String(shareFromBudget(amount, totalBudget) ?? ''),
    }));
  };

  const onShareInput = (share: string) => {
    const pct = share.trim() === '' ? null : Number(share);
    setForm((f) => ({
      ...f,
      sharePercent: share,
      monthlyBudget:
        pct === null || !Number.isFinite(pct) || totalBudget <= 0
          ? f.monthlyBudget
          : String(budgetFromShare(pct, totalBudget) ?? ''),
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    resetSaveFeedback();
    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim(),
        priority: Number(form.priority) || 100,
        monthlyBudget: form.monthlyBudget.trim() === '' ? null : Number(form.monthlyBudget),
        role: form.role.trim() || null,
        description: form.description.trim() || null,
        isActive: form.isActive,
      };
      if (editing) {
        await updateMarketingChannel(editing.id, payload);
      } else {
        await createMarketingChannel(payload);
      }
      showSaveSuccess();
      closeModal();
      await load();
    } catch (err) {
      showSaveError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (channel: MarketingChannel) => {
    if (
      !window.confirm(`Удалить канал «${channel.name}»? Статистика по каналу тоже будет удалена.`)
    ) {
      return;
    }
    resetSaveFeedback();
    try {
      await deleteMarketingChannel(channel.id);
      showSaveSuccess();
      await load();
    } catch (err) {
      showSaveError(err instanceof Error ? err.message : 'Ошибка удаления');
    }
  };

  return (
    <AdvertisingStrategyPageShell
      subtitle="Приоритеты, бюджеты (₽ и доли) и роли каналов в рекламной стратегии."
      countLabel={`${channels.length} каналов`}
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
                  onChange={(e) => {
                    const name = e.target.value;
                    setForm((f) => ({
                      ...f,
                      name,
                      code: codeTouched ? f.code : slugifyChannelCode(name),
                    }));
                  }}
                  required
                />
              </label>
              <label className={styles.field}>
                <span>Код (латиница)</span>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => {
                    setCodeTouched(true);
                    setForm((f) => ({ ...f, code: e.target.value }));
                  }}
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
