'use client';

import { useCallback, useEffect, useState } from 'react';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import {
  CANDIDATE_STATUS_LABELS,
  type SalesCandidate,
  type SalesCandidateStatus,
  deleteCandidate,
  fetchCandidates,
  getFullName,
} from '@/shared/api/admin-recruitment';

import styles from '../Recruitment.module.css';
import { RecruitmentCampaignPanel } from '../campaign/RecruitmentCampaignPanel';
import { RecruitmentRulesInfoTip } from '../shared/RecruitmentRulesInfoTip';

function scoreClass(score: number | null | undefined) {
  if (score == null) return '';
  if (score >= 70) return styles.scoreHigh;
  if (score >= 45) return styles.scoreMid;
  return styles.scoreLow;
}

export function RecruitmentListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<SalesCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<SalesCandidateStatus | ''>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [campaignId, setCampaignId] = useState<string | undefined>(
    searchParams.get('campaign') ?? undefined
  );

  const updateCampaignId = useCallback(
    (id: string | undefined) => {
      setCampaignId(id);
      setPage(1);
      const params = new URLSearchParams(searchParams.toString());
      if (id) params.set('campaign', id);
      else params.delete('campaign');
      const qs = params.toString();
      router.replace(qs ? `/admin/recruitment?${qs}` : '/admin/recruitment');
    },
    [router, searchParams]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchCandidates({
        search: search || undefined,
        status: status || undefined,
        campaignId,
        page,
        limit: 20,
      });
      setItems(res.items);
      setTotalPages(res.totalPages);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [search, status, page, campaignId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Удалить кандидата «${name}»?`)) return;
    try {
      await deleteCandidate(id);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Ошибка удаления');
    }
  };

  const analyticsHref = campaignId
    ? `/admin/recruitment/analytics?campaign=${encodeURIComponent(campaignId)}`
    : '/admin/recruitment/analytics';

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerInfoTip}>
          <RecruitmentRulesInfoTip />
        </div>
        <div>
          <h1 className={styles.title}>Подбор менеджеров по продажам</h1>
          <p className={styles.subtitle}>
            Учёт кандидатов по отборам: анкеты, резюме, обучение и сравнительная аналитика
          </p>
        </div>
        <div className={styles.headerActions}>
          <Link href={analyticsHref} className={styles.btnSecondary}>
            Аналитика
          </Link>
          <Link href="/admin/recruitment/blank" className={styles.btnSecondary}>
            Бланк анкеты
          </Link>
          <Link href="/admin/recruitment/new" className={styles.btnPrimary}>
            + Добавить кандидата
          </Link>
        </div>
      </div>

      <RecruitmentCampaignPanel
        campaignId={campaignId}
        onCampaignChange={updateCampaignId}
        onRefresh={load}
        candidatesForClose={items.map((c) => ({ id: c.id, fullName: getFullName(c) }))}
      />

      {error ? <div className={styles.error}>{error}</div> : null}

      <div className={styles.toolbar}>
        <input
          type="search"
          placeholder="Поиск по ФИО, телефону, email..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className={styles.searchInput}
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as SalesCandidateStatus | '');
            setPage(1);
          }}
          className={styles.filterSelect}
        >
          <option value="">Все статусы</option>
          {(Object.keys(CANDIDATE_STATUS_LABELS) as SalesCandidateStatus[]).map((s) => (
            <option key={s} value={s}>
              {CANDIDATE_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className={styles.loading}>Загрузка...</div>
      ) : items.length === 0 ? (
        <div className={styles.emptyState}>
          <p>Кандидаты в этом отборе не найдены</p>
          <Link href="/admin/recruitment/new" className={styles.btnPrimary}>
            Добавить кандидата
          </Link>
        </div>
      ) : (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Кандидат</th>
                  <th>Телефон</th>
                  <th>Статус</th>
                  <th>Опыт продаж</th>
                  <th>Обучение</th>
                  <th>Балл</th>
                  <th>Рекомендация</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div className={styles.candidateName}>{getFullName(c)}</div>
                      {c.email ? (
                        <div style={{ fontSize: '0.85em', color: '#666' }}>{c.email}</div>
                      ) : null}
                    </td>
                    <td>{c.phone}</td>
                    <td>
                      <span className={styles.statusBadge}>
                        {CANDIDATE_STATUS_LABELS[c.status]}
                      </span>
                    </td>
                    <td>
                      {c.salesExperienceYears != null ? `${c.salesExperienceYears} лет` : '—'}
                    </td>
                    <td>
                      {c.trainingProgress
                        ? `${c.trainingProgress.completionPercent}%`
                        : c.traineeUserId
                          ? '0%'
                          : '—'}
                    </td>
                    <td>
                      {c.scoreBreakdown?.overallScore != null ? (
                        <span
                          className={`${styles.scoreBadge} ${scoreClass(c.scoreBreakdown.overallScore)}`}
                        >
                          {c.scoreBreakdown.overallScore}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td style={{ maxWidth: 200, fontSize: '0.9em' }}>
                      {c.scoreBreakdown?.recommendation ?? '—'}
                    </td>
                    <td>
                      <div className={styles.rowActions}>
                        <button
                          type="button"
                          className={styles.linkBtn}
                          onClick={() => router.push(`/admin/recruitment/${c.id}`)}
                        >
                          Открыть
                        </button>
                        <button
                          type="button"
                          className={styles.linkBtnDanger}
                          onClick={() => handleDelete(c.id, getFullName(c))}
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

          {totalPages > 1 ? (
            <div className={styles.pagination}>
              <button
                type="button"
                className={styles.btnSecondary}
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Назад
              </button>
              <span>
                Страница {page} из {totalPages}
              </span>
              <button
                type="button"
                className={styles.btnSecondary}
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Вперёд →
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
