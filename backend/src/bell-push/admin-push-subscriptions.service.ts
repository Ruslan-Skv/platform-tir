import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import webpush from 'web-push';
import { PrismaService } from '../database/prisma.service';
import { AdminPushSubscribeDto } from './dto/admin-push-subscribe.dto';

export type AdminPushPayload = {
  title: string;
  body: string;
  url: string;
  tag?: string;
};

@Injectable()
export class AdminPushSubscriptionsService {
  private readonly logger = new Logger(AdminPushSubscriptionsService.name);
  private configured = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const publicKey = this.config.get<string>('VAPID_PUBLIC_KEY')?.trim();
    const privateKey = this.config.get<string>('VAPID_PRIVATE_KEY')?.trim();
    const subject =
      this.config.get<string>('VAPID_SUBJECT')?.trim() || 'mailto:admin@platform-tir.local';
    if (publicKey && privateKey) {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      this.configured = true;
    }
  }

  isConfigured() {
    return this.configured;
  }

  getPublicKey() {
    return this.config.get<string>('VAPID_PUBLIC_KEY')?.trim() || null;
  }

  upsertSubscription(userId: string, dto: AdminPushSubscribeDto, userAgent?: string) {
    return this.prisma.adminPushSubscription.upsert({
      where: { endpoint: dto.endpoint },
      create: {
        userId,
        endpoint: dto.endpoint,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
        userAgent: userAgent ?? null,
      },
      update: {
        userId,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
        userAgent: userAgent ?? null,
      },
    });
  }

  removeSubscription(userId: string, endpoint: string) {
    return this.prisma.adminPushSubscription.deleteMany({
      where: { userId, endpoint },
    });
  }

  listUserSubscriptions(userId: string) {
    return this.prisma.adminPushSubscription.findMany({
      where: { userId },
      select: { id: true, endpoint: true, p256dh: true, auth: true },
    });
  }

  async sendToUser(userId: string, payload: AdminPushPayload) {
    if (!this.configured) return;
    const subscriptions = await this.listUserSubscriptions(userId);
    await Promise.allSettled(
      subscriptions.map((subscription) => this.sendToSubscription(subscription, payload)),
    );
  }

  private async sendToSubscription(
    subscription: { id: string; endpoint: string; p256dh: string; auth: string },
    payload: AdminPushPayload,
  ) {
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        },
        JSON.stringify(payload),
      );
    } catch (error: unknown) {
      const statusCode =
        error && typeof error === 'object' && 'statusCode' in error
          ? Number((error as { statusCode?: number }).statusCode)
          : undefined;
      if (statusCode === 404 || statusCode === 410) {
        await this.prisma.adminPushSubscription.delete({ where: { id: subscription.id } });
      } else {
        this.logger.warn(`Push failed for subscription ${subscription.id}: ${String(error)}`);
      }
    }
  }
}
