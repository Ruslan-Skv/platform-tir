'use client';

import { useCallback, useEffect, useState } from 'react';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import {
  CANDIDATE_STATUS_LABELS,
  type ComparisonAnalytics,
  fetchComparisonAnalytics,
} from '@/shared/api/admin-recruitment';

import listStyles from '../Recruitment.module.css';
import { RecruitmentCampaignPanel } from '../campaign/RecruitmentCampaignPanel';

function scoreClass(score: number | null | undefined) {
  if (score == null) return '';
  if (score >= 70) return listStyles.scoreHigh;
  if (score >= 45) return listStyles.scoreMid;
  return listStyles.scoreLow;
}

export function RecruitmentAnalyticsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<ComparisonAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [campaignId, setCampaignId] = useState<string | undefined>(
    searchParams.get('campaign') ?? undefined
  );

  const updateCampaignId = useCallback(
    (id: string | undefined) => {
      setCampaignId(id);
      const params = new URLSearchParams(searchParams.toString());
      if (id) params.set('campaign', id);
      else params.delete('campaign');
      const qs = params.toString();
      router.replace(qs ? `/admin/recruitment/analytics?${qs}` : '/admin/recruitment/analytics');
    },
    [router, searchParams]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchComparisonAnalytics(campaignId);
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки аналитики');
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) {
    return <div className={listStyles.loading}>Загрузка аналитики...</div>;
  }

  if (error && !data) {
    return (
      <div className={listStyles.page}>
        <div className={listStyles.error}>{error}</div>
        <Link href="/admin/recruitment" className={listStyles.btnSecondary}>
          ← Назад
        </Link>
      </div>
    );
  }

  if (!data) return null;

  const { campaign, summary, topRecommendation, candidates } = data;

  const listHref = campaignId
    ? `/admin/recruitment?campaign=${encodeURIComponent(campaignId)}`
    : '/admin/recruitment';

  return (
    <div className={listStyles.page}>
      <div className={listStyles.header}>
        <div>
          <h1 className={listStyles.title}>Сравнительная аналитика кандидатов</h1>
          <p className={listStyles.subtitle}>
            {campaign
              ? `Отбор «${campaign.title}» — рейтинг только кандидатов этого цикла`
              : 'Рейтинг и рекомендации на основе анкеты, резюме, собеседования и обучения'}
          </p>
        </div>
        <Link href={listHref} className={listStyles.btnSecondary}>
          ← К списку
        </Link>
      </div>

      <RecruitmentCampaignPanel
        campaignId={campaignId}
        onCampaignChange={updateCampaignId}
        onRefresh={load}
        candidatesForClose={candidates.map((c) => ({ id: c.id, fullName: c.fullName }))}
      />

      {error ? <div className={listStyles.error}>{error}</div> : null}

      <div className={listStyles.summaryGrid}>
        <div className={listStyles.summaryCard}>
          <div className={listStyles.summaryValue}>{summary.totalCandidates}</div>
          <div className={listStyles.summaryLabel}>Кандидатов в отборе</div>
        </div>
        <div className={listStyles.summaryCard}>
          <div className={listStyles.summaryValue}>{summary.avgScore || '—'}</div>
          <div className={listStyles.summaryLabel}>Средний балл</div>
        </div>
        <div className={listStyles.summaryCard}>
          <div className={listStyles.summaryValue}>{summary.withResumeCount}</div>
          <div className={listStyles.summaryLabel}>С резюме</div>
        </div>
        <div className={listStyles.summaryCard}>
          <div className={listStyles.summaryValue}>{summary.withTrainingCount}</div>
          <div className={listStyles.summaryLabel}>На обучении</div>
        </div>
        <div className={listStyles.summaryCard}>
          <div className={listStyles.summaryValue}>
            {summary.avgTrainingCompletion ? `${summary.avgTrainingCompletion}%` : '—'}
          </div>
          <div className={listStyles.summaryLabel}>Ср. прогресс обучения</div>
        </div>
      </div>

      {topRecommendation ? (
        <div className={listStyles.recommendationBox}>
          <h2 className={listStyles.recommendationTitle}>
            Рекомендуемый кандидат: {topRecommendation.fullName}
          </h2>
          <p>
            <strong>Балл:</strong>{' '}
            <span
              className={`${listStyles.scoreBadge} ${scoreClass(topRecommendation.overallScore)}`}
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
              <ul className={listStyles.strengthsList}>
                {topRecommendation.strengths.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </>
          ) : null}
          <button
            type="button"
            className={listStyles.btnPrimary}
            style={{ marginTop: 16 }}
            onClick={() => router.push(`/admin/recruitment/${topRecommendation.candidateId}`)}
          >
            Открыть карточку
          </button>
        </div>
      ) : (
        <div className={listStyles.emptyState}>
          Нет активных кандидатов для сравнения в выбранном отборе
        </div>
      )}

      {candidates.length > 0 ? (
        <div className={listStyles.tableWrap}>
          <table className={listStyles.table}>
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
                  style={{ cursor: 'pointer' }}
                  onClick={() => router.push(`/admin/recruitment/${c.id}`)}
                >
                  <td>
                    <span className={c.rank === 1 ? listStyles.rankBadgeTop : listStyles.rankBadge}>
                      {c.rank}
                    </span>
                  </td>
                  <td>
                    <div className={listStyles.candidateName}>{c.fullName}</div>
                  </td>
                  <td>
                    <span className={listStyles.statusBadge}>
                      {CANDIDATE_STATUS_LABELS[c.status]}
                    </span>
                  </td>
                  <td>{c.scoreBreakdown.experienceScore ?? '—'}</td>
                  <td>{c.scoreBreakdown.interviewScore ?? '—'}</td>
                  <td>{c.trainingProgress ? `${c.trainingProgress.completionPercent}%` : '—'}</td>
                  <td>{c.scoreBreakdown.softSkillsScore ?? '—'}</td>
                  <td>{c.scoreBreakdown.resumeScore ?? '—'}</td>
                  <td>
                    <span className={`${listStyles.scoreBadge} ${scoreClass(c.overallScore)}`}>
                      {c.overallScore ?? '—'}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.85em', maxWidth: 180 }}>
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
