'use client';

import Link from 'next/link';

import { CANDIDATE_STATUS_LABELS } from '@/shared/api/admin-recruitment';

import { RecruitmentCampaignPanel } from '../campaign/RecruitmentCampaignPanel';
import pageStyles from '../shared/RecruitmentPage.module.css';
import { recruitmentScoreClass } from '../shared/recruitment-score.utils';
import type { RecruitmentAnalyticsPageModel } from './hooks/useRecruitmentAnalyticsPage';

type RecruitmentAnalyticsPageViewProps = {
  model: RecruitmentAnalyticsPageModel;
};

export function RecruitmentAnalyticsPageView({ model }: RecruitmentAnalyticsPageViewProps) {
  const { router, data, loading, error, campaignId, updateCampaignId, load, listHref } = model;

  if (loading && !data) {
    return <div className={pageStyles.loading}>Загрузка аналитики...</div>;
  }

  if (error && !data) {
    return (
      <div className={pageStyles.page}>
        <div className={pageStyles.error}>{error}</div>
        <Link href="/admin/recruitment" className={pageStyles.btnSecondary}>
          ← Назад
        </Link>
      </div>
    );
  }

  if (!data) return null;

  const { campaign, summary, topRecommendation, candidates } = data;

  return (
    <div className={pageStyles.page}>
      <div className={pageStyles.header}>
        <div>
          <h1 className={pageStyles.title}>Сравнительная аналитика кандидатов</h1>
          <p className={pageStyles.subtitle}>
            {campaign
              ? `Отбор «${campaign.title}» — рейтинг только кандидатов этого цикла`
              : 'Рейтинг и рекомендации на основе анкеты, резюме, собеседования и обучения'}
          </p>
        </div>
        <Link href={listHref} className={pageStyles.btnSecondary}>
          ← К списку
        </Link>
      </div>

      <RecruitmentCampaignPanel
        campaignId={campaignId}
        onCampaignChange={updateCampaignId}
        onRefresh={load}
        candidatesForClose={candidates.map((c) => ({ id: c.id, fullName: c.fullName }))}
      />

      {error ? <div className={pageStyles.error}>{error}</div> : null}

      <div className={pageStyles.summaryGrid}>
        <div className={pageStyles.summaryCard}>
          <div className={pageStyles.summaryValue}>{summary.totalCandidates}</div>
          <div className={pageStyles.summaryLabel}>Кандидатов в отборе</div>
        </div>
        <div className={pageStyles.summaryCard}>
          <div className={pageStyles.summaryValue}>{summary.avgScore || '—'}</div>
          <div className={pageStyles.summaryLabel}>Средний балл</div>
        </div>
        <div className={pageStyles.summaryCard}>
          <div className={pageStyles.summaryValue}>{summary.withResumeCount}</div>
          <div className={pageStyles.summaryLabel}>С резюме</div>
        </div>
        <div className={pageStyles.summaryCard}>
          <div className={pageStyles.summaryValue}>{summary.withTrainingCount}</div>
          <div className={pageStyles.summaryLabel}>На обучении</div>
        </div>
        <div className={pageStyles.summaryCard}>
          <div className={pageStyles.summaryValue}>
            {summary.avgTrainingCompletion ? `${summary.avgTrainingCompletion}%` : '—'}
          </div>
          <div className={pageStyles.summaryLabel}>Ср. прогресс обучения</div>
        </div>
      </div>

      {topRecommendation ? (
        <div className={pageStyles.recommendationBox}>
          <h2 className={pageStyles.recommendationTitle}>
            Рекомендуемый кандидат: {topRecommendation.fullName}
          </h2>
          <p>
            <strong>Балл:</strong>{' '}
            <span
              className={`${pageStyles.scoreBadge} ${recruitmentScoreClass(pageStyles, topRecommendation.overallScore)}`}
            >
              {topRecommendation.overallScore ?? '—'}
            </span>
          </p>
          <p>
            <strong>Рекомендация:</strong> {topRecommendation.recommendation}
          </p>
          {topRecommendation.strengths.length > 0 ? (
            <>
              <strong>Сильные стороны:</strong>
              <ul className={pageStyles.strengthsList}>
                {topRecommendation.strengths.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </>
          ) : null}
          <button
            type="button"
            className={`${pageStyles.btnPrimary} ${pageStyles.recommendationActionBtn}`}
            onClick={() => router.push(`/admin/recruitment/${topRecommendation.candidateId}`)}
          >
            Открыть карточку
          </button>
        </div>
      ) : (
        <div className={pageStyles.emptyState}>
          Нет активных кандидатов для сравнения в выбранном отборе
        </div>
      )}

      {candidates.length > 0 ? (
        <div className={pageStyles.tableWrap}>
          <table className={pageStyles.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>Кандидат</th>
                <th>Статус</th>
                <th>Опыт</th>
                <th>Собесед.</th>
                <th>Обучение</th>
                <th>Soft skills</th>
                <th>Резюме</th>
                <th>Итого</th>
                <th>Рекомендация</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((c) => (
                <tr
                  key={c.id}
                  className={pageStyles.clickableRow}
                  onClick={() => router.push(`/admin/recruitment/${c.id}`)}
                >
                  <td>
                    <span className={c.rank === 1 ? pageStyles.rankBadgeTop : pageStyles.rankBadge}>
                      {c.rank}
                    </span>
                  </td>
                  <td>
                    <div className={pageStyles.candidateName}>{c.fullName}</div>
                  </td>
                  <td>
                    <span className={pageStyles.statusBadge}>
                      {CANDIDATE_STATUS_LABELS[c.status]}
                    </span>
                  </td>
                  <td>{c.scoreBreakdown.experienceScore ?? '—'}</td>
                  <td>{c.scoreBreakdown.interviewScore ?? '—'}</td>
                  <td>{c.trainingProgress ? `${c.trainingProgress.completionPercent}%` : '—'}</td>
                  <td>{c.scoreBreakdown.softSkillsScore ?? '—'}</td>
                  <td>{c.scoreBreakdown.resumeScore ?? '—'}</td>
                  <td>
                    <span
                      className={`${pageStyles.scoreBadge} ${recruitmentScoreClass(pageStyles, c.overallScore)}`}
                    >
                      {c.overallScore ?? '—'}
                    </span>
                  </td>
                  <td className={pageStyles.recommendationCellNarrow}>
                    {c.scoreBreakdown.recommendation}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
