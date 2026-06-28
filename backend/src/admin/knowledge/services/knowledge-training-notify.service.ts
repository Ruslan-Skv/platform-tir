import { Injectable } from '@nestjs/common';
import { AdminBellPushService } from '../../../bell-push/admin-bell-push.service';
import { ExternalNotifyService } from '../../../external-notify/external-notify.service';
import { ExternalNotifySettingsService } from '../../../external-notify/external-notify-settings.service';
import { PrismaService } from '../../../database/prisma.service';

export type KnowledgeTrainingProgressKind = 'video_completed' | 'study_completed' | 'quiz_passed';

const PROGRESS_LABELS: Record<KnowledgeTrainingProgressKind, string> = {
  video_completed: 'Видео изучено',
  study_completed: 'Материал изучен',
  quiz_passed: 'Тест пройден',
};

@Injectable()
export class KnowledgeTrainingNotifyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly externalNotify: ExternalNotifyService,
    private readonly externalNotifySettings: ExternalNotifySettingsService,
    private readonly adminBellPush: AdminBellPushService,
  ) {}

  notifyProgress(
    kind: KnowledgeTrainingProgressKind,
    userId: string,
    materialId: string,
    extra?: { scorePercent?: number },
  ): void {
    void this.sendProgressNotification(kind, userId, materialId, extra).catch(() => undefined);
  }

  private async sendProgressNotification(
    kind: KnowledgeTrainingProgressKind,
    userId: string,
    materialId: string,
    extra?: { scorePercent?: number },
  ): Promise<void> {
    const [user, material] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true, email: true, role: true },
      }),
      this.prisma.knowledgeMaterial.findFirst({
        where: { id: materialId, deletedAt: null },
        select: {
          id: true,
          title: true,
          type: true,
          category: { select: { name: true } },
        },
      }),
    ]);

    if (!user || !material) return;

    const learnerName =
      [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.email;
    const progressLabel = PROGRESS_LABELS[kind];
    const categoryTitle = material.category?.name ?? 'Обучение';
    const scoreLine =
      kind === 'quiz_passed' && typeof extra?.scorePercent === 'number'
        ? `Результат: ${extra.scorePercent}%`
        : null;

    const subject = `${progressLabel}: «${material.title}»`;
    const text = [
      'Динамика обучения на платформе',
      '',
      `Событие: ${progressLabel}`,
      `Материал: ${material.title}`,
      `Категория: ${categoryTitle}`,
      `Сотрудник: ${learnerName}`,
      `Email: ${user.email}`,
      user.role ? `Роль: ${user.role}` : null,
      scoreLine,
      `Материал: /admin/knowledge/materials/${material.id}`,
    ]
      .filter(Boolean)
      .join('\n');

    const channels = await this.externalNotifySettings.getChannelsForEvent('knowledge_training');
    await this.externalNotify.send(channels, {
      subject,
      text,
      replyTo: user.email,
      fromLabel: 'Обучающая платформа',
    });

    await this.adminBellPush.notify('knowledge_training', {
      title: progressLabel,
      body: `${learnerName} — «${material.title}»`,
      url: `/admin/knowledge/materials/${material.id}`,
      tag: `knowledge-training-${kind}-${materialId}-${userId}`,
    });
  }
}
