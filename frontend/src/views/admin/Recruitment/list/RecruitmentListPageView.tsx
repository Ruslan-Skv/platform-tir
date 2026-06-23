'use client';

import Link from 'next/link';

import { CANDIDATE_STATUS_LABELS, type SalesCandidateStatus } from '@/shared/api/admin-recruitment';

import { RecruitmentCampaignPanel } from '../campaign/RecruitmentCampaignPanel';
import pageStyles from '../shared/RecruitmentPage.module.css';
import { RecruitmentRulesInfoTip } from '../shared/RecruitmentRulesInfoTip';
import { recruitmentScoreClass } from '../shared/recruitment-score.utils';
import type { RecruitmentListPageModel } from './hooks/useRecruitmentListPage';

type RecruitmentListPageViewProps = {
  model: RecruitmentListPageModel;
};

export function RecruitmentListPageView({ model }: RecruitmentListPageViewProps) {
  const {
    router,
    items,
    loading,
    error,
    search,
    setSearch,
    setPage,
    status,
    setStatus,
    page,
    totalPages,
    campaignId,
    updateCampaignId,
    load,
    handleDelete,
    analyticsHref,
    getFullName,
  } = model;

  return (
    <div className={pageStyles.page}>
      <div className={pageStyles.header}>
        <div className={pageStyles.headerInfoTip}>
          <RecruitmentRulesInfoTip />
        </div>
        <div>
          <h1 className={pageStyles.title}>Подбор менеджеров по продажам</h1>
          <p className={pageStyles.subtitle}>
            Учёт кандидатов по отборам: анкеты, резюме, обучение и сравнительная аналитика
          </p>
        </div>
        <div className={pageStyles.headerActions}>
          <Link href={analyticsHref} className={pageStyles.btnSecondary}>
            Аналитика
          </Link>
          <Link href="/admin/recruitment/blank" className={pageStyles.btnSecondary}>
            Бланк анкеты
          </Link>
          <Link data-admin-mutation href="/admin/recruitment/new" className={pageStyles.btnPrimary}>
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

      {error ? <div className={pageStyles.error}>{error}</div> : null}

      <div className={pageStyles.toolbar}>
        <input
          type="search"
          placeholder="Поиск по ФИО, телефону, email..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className={pageStyles.searchInput}
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as SalesCandidateStatus | '');
            setPage(1);
          }}
          className={pageStyles.filterSelect}
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
        <div className={pageStyles.loading}>Загрузка...</div>
      ) : items.length === 0 ? (
        <div className={pageStyles.emptyState}>
          <p>Кандидаты в этом отборе не найдены</p>
          <Link data-admin-mutation href="/admin/recruitment/new" className={pageStyles.btnPrimary}>
            Добавить кандидата
          </Link>
        </div>
      ) : (
        <>
          <div className={pageStyles.tableWrap}>
            <table className={pageStyles.table}>
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
                      <div className={pageStyles.candidateName}>{getFullName(c)}</div>
                      {c.email ? <div className={pageStyles.emailHint}>{c.email}</div> : null}
                    </td>
                    <td>{c.phone}</td>
                    <td>
                      <span className={pageStyles.statusBadge}>
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
                          className={`${pageStyles.scoreBadge} ${recruitmentScoreClass(pageStyles, c.scoreBreakdown.overallScore)}`}
                        >
                          {c.scoreBreakdown.overallScore}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className={pageStyles.recommendationCell}>
                      {c.scoreBreakdown?.recommendation ?? '—'}
                    </td>
                    <td>
                      <div className={pageStyles.rowActions}>
                        <button
                          type="button"
                          className={pageStyles.linkBtn}
                          onClick={() => router.push(`/admin/recruitment/${c.id}`)}
                        >
                          Открыть
                        </button>
                        <button
                          data-admin-mutation
                          type="button"
                          className={pageStyles.linkBtnDanger}
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
            <div className={pageStyles.pagination}>
              <button
                type="button"
                className={pageStyles.btnSecondary}
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
                className={pageStyles.btnSecondary}
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
