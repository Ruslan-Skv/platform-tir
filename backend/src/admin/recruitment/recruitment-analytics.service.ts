import { Injectable } from '@nestjs/common';
import { SalesCandidateStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  RecruitmentKnowledgeSyncService,
  calculateCandidateScore,
} from './recruitment-knowledge-sync.service';
import { RecruitmentCampaignService } from './recruitment-campaign.service';

@Injectable()
export class RecruitmentAnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly knowledgeSync: RecruitmentKnowledgeSyncService,
    private readonly campaignService: RecruitmentCampaignService,
  ) {}

  async getComparisonAnalytics(campaignId?: string) {
    let resolvedCampaignId = campaignId;
    if (!resolvedCampaignId) {
      const active = await this.campaignService.getActive();
      if (!active) {
        return {
          campaign: null,
          summary: {
            totalCandidates: 0,
            avgScore: 0,
            avgTrainingCompletion: 0,
            withTrainingCount: 0,
            withResumeCount: 0,
            statusCounts: {},
          },
          topRecommendation: null,
          candidates: [],
        };
      }
      resolvedCampaignId = active.id;
    } else {
      await this.campaignService.findOne(resolvedCampaignId);
    }

    const campaign = await this.campaignService.findOne(resolvedCampaignId);

    const candidates = await this.prisma.salesCandidate.findMany({
      where: {
        campaignId: resolvedCampaignId,
        status: { notIn: [SalesCandidateStatus.REJECTED] },
      },
      include: {
        traineeUser: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
      orderBy: [{ overallScore: 'desc' }, { createdAt: 'desc' }],
    });

    const enriched = await Promise.all(
      candidates.map(async (candidate) => {
        const trainingProgress = candidate.traineeUserId
          ? await this.knowledgeSync.getTrainingProgress(candidate.traineeUserId)
          : null;
        const scoreBreakdown = calculateCandidateScore(candidate, trainingProgress);

        return {
          id: candidate.id,
          fullName: [candidate.lastName, candidate.firstName, candidate.middleName]
            .filter(Boolean)
            .join(' '),
          status: candidate.status,
          phone: candidate.phone,
          email: candidate.email,
          salesExperienceYears: candidate.salesExperienceYears,
          interviewScore: candidate.interviewScore,
          overallScore: scoreBreakdown.overallScore,
          scoreBreakdown,
          trainingProgress: trainingProgress
            ? {
                completionPercent: trainingProgress.completionPercent,
                completedCount: trainingProgress.completedCount,
                trackableCount: trainingProgress.trackableCount,
                lastActivityAt: trainingProgress.lastActivityAt,
              }
            : null,
          hasResume: Boolean(candidate.resumeFileUrl),
          createdAt: candidate.createdAt.toISOString(),
        };
      }),
    );

    const ranked = [...enriched].sort((a, b) => (b.overallScore ?? 0) - (a.overallScore ?? 0));

    const withRank = ranked.map((c, index) => ({
      ...c,
      rank: index + 1,
    }));

    const topCandidate = withRank[0] ?? null;

    const statusCounts = candidates.reduce(
      (acc, c) => {
        acc[c.status] = (acc[c.status] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const avgScore =
      withRank.length > 0
        ? Math.round(
            (withRank.reduce((s, c) => s + (c.overallScore ?? 0), 0) / withRank.length) * 10,
          ) / 10
        : 0;

    const withTraining = withRank.filter((c) => c.trainingProgress);
    const avgTrainingCompletion =
      withTraining.length > 0
        ? Math.round(
            (withTraining.reduce((s, c) => s + (c.trainingProgress?.completionPercent ?? 0), 0) /
              withTraining.length) *
              10,
          ) / 10
        : 0;

    return {
      campaign,
      summary: {
        totalCandidates: candidates.length,
        avgScore,
        avgTrainingCompletion,
        withTrainingCount: withTraining.length,
        withResumeCount: withRank.filter((c) => c.hasResume).length,
        statusCounts,
      },
      topRecommendation: topCandidate
        ? {
            candidateId: topCandidate.id,
            fullName: topCandidate.fullName,
            overallScore: topCandidate.overallScore,
            recommendation: topCandidate.scoreBreakdown.recommendation,
            strengths: topCandidate.scoreBreakdown.strengths,
          }
        : null,
      candidates: withRank,
    };
  }
}
