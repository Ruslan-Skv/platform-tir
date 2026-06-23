'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  type RecruitmentCampaign,
  closeRecruitmentCampaign,
  createRecruitmentCampaign,
  fetchActiveRecruitmentCampaign,
  fetchRecruitmentCampaigns,
} from '@/shared/api/admin-recruitment';

import pageStyles from '../shared/RecruitmentPage.module.css';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU');
}

interface Props {
  campaignId?: string;
  onCampaignChange: (campaignId: string | undefined) => void;
  onRefresh?: () => void;
  candidatesForClose?: Array<{ id: string; fullName: string }>;
}

export function RecruitmentCampaignPanel({
  campaignId,
  onCampaignChange,
  onRefresh,
  candidatesForClose = [],
}: Props) {
  const [campaigns, setCampaigns] = useState<RecruitmentCampaign[]>([]);
  const [activeCampaign, setActiveCampaign] = useState<RecruitmentCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState('');
  const [showCloseForm, setShowCloseForm] = useState(false);
  const [selectedWinnerId, setSelectedWinnerId] = useState('');
  const [closeNotes, setCloseNotes] = useState('');
  const [closing, setClosing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, active] = await Promise.all([
        fetchRecruitmentCampaigns(),
        fetchActiveRecruitmentCampaign(),
      ]);
      setCampaigns(list);
      setActiveCampaign(active);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Ошибка загрузки отборов');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!campaignId && activeCampaign) {
      onCampaignChange(activeCampaign.id);
    }
  }, [campaignId, activeCampaign, onCampaignChange]);

  const selectedCampaign = campaigns.find((c) => c.id === campaignId) ?? activeCampaign ?? null;

  const handleCreateCampaign = async () => {
    const title = prompt('Название нового отбора:', `Отбор ${new Date().getFullYear()}`);
    if (!title?.trim()) return;
    setActionError('');
    try {
      const created = await createRecruitmentCampaign(title.trim());
      await load();
      onCampaignChange(created.id);
      onRefresh?.();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Не удалось создать отбор');
    }
  };

  const handleCloseCampaign = async () => {
    if (!selectedCampaign || selectedCampaign.status !== 'OPEN') return;
    setClosing(true);
    setActionError('');
    try {
      await closeRecruitmentCampaign(selectedCampaign.id, {
        selectedCandidateId: selectedWinnerId || undefined,
        notes: closeNotes.trim() || undefined,
      });
      setShowCloseForm(false);
      setSelectedWinnerId('');
      setCloseNotes('');
      await load();
      onRefresh?.();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Не удалось закрыть отбор');
    } finally {
      setClosing(false);
    }
  };

  if (loading) {
    return <div className={pageStyles.campaignPanel}>Загрузка отборов...</div>;
  }

  return (
    <div className={pageStyles.campaignPanel}>
      <div className={pageStyles.campaignPanelHeader}>
        <div>
          <div className={pageStyles.campaignPanelLabel}>Текущий отбор</div>
          {selectedCampaign ? (
            <>
              <div className={pageStyles.campaignPanelTitle}>
                {selectedCampaign.title}
                <span
                  className={
                    selectedCampaign.status === 'OPEN'
                      ? pageStyles.campaignStatusOpen
                      : pageStyles.campaignStatusClosed
                  }
                >
                  {selectedCampaign.status === 'OPEN' ? 'Открыт' : 'Закрыт'}
                </span>
              </div>
              <div className={pageStyles.campaignPanelMeta}>
                {formatDate(selectedCampaign.startedAt)}
                {selectedCampaign.closedAt
                  ? ` — ${formatDate(selectedCampaign.closedAt)}`
                  : ' — по настоящее время'}
                {' · '}
                {selectedCampaign.candidatesCount} канд.
                {selectedCampaign.selectedCandidate ? (
                  <>
                    {' · '}
                    Выбран: {selectedCampaign.selectedCandidate.fullName}
                  </>
                ) : null}
              </div>
            </>
          ) : (
            <div className={pageStyles.campaignPanelTitle}>Нет открытого отбора</div>
          )}
        </div>

        <div className={pageStyles.campaignPanelActions}>
          <select
            value={campaignId ?? ''}
            onChange={(e) => onCampaignChange(e.target.value || undefined)}
            className={pageStyles.filterSelect}
          >
            <option value="">— выберите отбор —</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} ({c.status === 'OPEN' ? 'открыт' : 'закрыт'}, {c.candidatesCount} канд.)
              </option>
            ))}
          </select>

          {!activeCampaign ? (
            <button
              data-admin-mutation
              type="button"
              className={pageStyles.btnPrimary}
              onClick={handleCreateCampaign}
            >
              + Новый отбор
            </button>
          ) : null}

          {selectedCampaign?.status === 'OPEN' ? (
            <button
              type="button"
              className={pageStyles.btnSecondary}
              onClick={() => setShowCloseForm((v) => !v)}
            >
              Закрыть отбор
            </button>
          ) : null}
        </div>
      </div>

      {actionError ? <div className={pageStyles.error}>{actionError}</div> : null}

      {showCloseForm && selectedCampaign?.status === 'OPEN' ? (
        <div className={pageStyles.campaignCloseForm}>
          <p className={pageStyles.campaignCloseHint}>
            После закрытия отбора кандидаты этого цикла останутся в архиве. Для следующего поиска
            создайте новый отбор — в аналитике будут учитываться только новые кандидаты.
          </p>
          <label className={pageStyles.formLabel}>
            Выбранный кандидат (необязательно)
            <select
              value={selectedWinnerId}
              onChange={(e) => setSelectedWinnerId(e.target.value)}
              className={pageStyles.filterSelect}
            >
              <option value="">— не выбран —</option>
              {candidatesForClose.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName}
                </option>
              ))}
            </select>
          </label>
          <label className={pageStyles.formLabel}>
            Заметки по итогам отбора
            <textarea
              value={closeNotes}
              onChange={(e) => setCloseNotes(e.target.value)}
              className={pageStyles.textarea}
              rows={2}
              placeholder="Краткий комментарий..."
            />
          </label>
          <div className={pageStyles.campaignCloseActions}>
            <button
              type="button"
              className={pageStyles.btnPrimary}
              disabled={closing}
              onClick={handleCloseCampaign}
            >
              {closing ? 'Закрытие...' : 'Подтвердить закрытие'}
            </button>
            <button
              type="button"
              className={pageStyles.btnSecondary}
              onClick={() => setShowCloseForm(false)}
            >
              Отмена
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
