import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { UpdateKnowledgePlatformSettingsDto } from '../dto/update-knowledge-platform-settings.dto';

const SETTINGS_ID = 'main';

@Injectable()
export class KnowledgePlatformSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings() {
    const row = await this.prisma.knowledgePlatformSettings.findUnique({
      where: { id: SETTINGS_ID },
    });
    if (!row) {
      return this.prisma.knowledgePlatformSettings.create({
        data: {
          id: SETTINGS_ID,
          materialQuizTimePerQuestionSeconds: 60,
          categoryQuizTimePerQuestionSeconds: 60,
          materialQuizMaxAttemptsPerDay: 3,
          categoryQuizMaxAttemptsPerDay: 3,
          materialQuizRetryCooldownMinutes: 30,
          categoryQuizRetryCooldownMinutes: 30,
        },
      });
    }
    return row;
  }

  async getMaterialQuizTimePerQuestionSeconds(): Promise<number> {
    const settings = await this.getSettings();
    return settings.materialQuizTimePerQuestionSeconds;
  }

  async getCategoryQuizTimePerQuestionSeconds(): Promise<number> {
    const settings = await this.getSettings();
    return settings.categoryQuizTimePerQuestionSeconds;
  }

  async getMaterialQuizMaxAttemptsPerDay(): Promise<number> {
    const settings = await this.getSettings();
    return settings.materialQuizMaxAttemptsPerDay;
  }

  async getCategoryQuizMaxAttemptsPerDay(): Promise<number> {
    const settings = await this.getSettings();
    return settings.categoryQuizMaxAttemptsPerDay;
  }

  async getMaterialQuizRetryCooldownMinutes(): Promise<number> {
    const settings = await this.getSettings();
    return settings.materialQuizRetryCooldownMinutes;
  }

  async getCategoryQuizRetryCooldownMinutes(): Promise<number> {
    const settings = await this.getSettings();
    return settings.categoryQuizRetryCooldownMinutes;
  }

  async getClientQuizSettings() {
    const settings = await this.getSettings();
    return {
      materialQuizTimePerQuestionSeconds: settings.materialQuizTimePerQuestionSeconds,
      categoryQuizTimePerQuestionSeconds: settings.categoryQuizTimePerQuestionSeconds,
      materialQuizMaxAttemptsPerDay: settings.materialQuizMaxAttemptsPerDay,
      categoryQuizMaxAttemptsPerDay: settings.categoryQuizMaxAttemptsPerDay,
      materialQuizRetryCooldownMinutes: settings.materialQuizRetryCooldownMinutes,
      categoryQuizRetryCooldownMinutes: settings.categoryQuizRetryCooldownMinutes,
    };
  }

  async updateSettings(dto: UpdateKnowledgePlatformSettingsDto) {
    const updated = await this.prisma.knowledgePlatformSettings.upsert({
      where: { id: SETTINGS_ID },
      update: {
        materialQuizTimePerQuestionSeconds: dto.materialQuizTimePerQuestionSeconds,
        categoryQuizTimePerQuestionSeconds: dto.categoryQuizTimePerQuestionSeconds,
        materialQuizMaxAttemptsPerDay: dto.materialQuizMaxAttemptsPerDay,
        categoryQuizMaxAttemptsPerDay: dto.categoryQuizMaxAttemptsPerDay,
        materialQuizRetryCooldownMinutes: dto.materialQuizRetryCooldownMinutes,
        categoryQuizRetryCooldownMinutes: dto.categoryQuizRetryCooldownMinutes,
      },
      create: {
        id: SETTINGS_ID,
        materialQuizTimePerQuestionSeconds: dto.materialQuizTimePerQuestionSeconds,
        categoryQuizTimePerQuestionSeconds: dto.categoryQuizTimePerQuestionSeconds,
        materialQuizMaxAttemptsPerDay: dto.materialQuizMaxAttemptsPerDay,
        categoryQuizMaxAttemptsPerDay: dto.categoryQuizMaxAttemptsPerDay,
        materialQuizRetryCooldownMinutes: dto.materialQuizRetryCooldownMinutes,
        categoryQuizRetryCooldownMinutes: dto.categoryQuizRetryCooldownMinutes,
      },
    });

    await this.prisma.knowledgeMaterialQuiz.updateMany({
      data: { timePerQuestionSeconds: dto.materialQuizTimePerQuestionSeconds },
    });

    return updated;
  }
}
