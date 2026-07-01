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
        data: { id: SETTINGS_ID, quizTimePerQuestionSeconds: 60 },
      });
    }
    return row;
  }

  async getQuizTimePerQuestionSeconds(): Promise<number> {
    const settings = await this.getSettings();
    return settings.quizTimePerQuestionSeconds;
  }

  async getClientQuizSettings() {
    const settings = await this.getSettings();
    return { quizTimePerQuestionSeconds: settings.quizTimePerQuestionSeconds };
  }

  async updateSettings(dto: UpdateKnowledgePlatformSettingsDto) {
    const updated = await this.prisma.knowledgePlatformSettings.upsert({
      where: { id: SETTINGS_ID },
      update: { quizTimePerQuestionSeconds: dto.quizTimePerQuestionSeconds },
      create: {
        id: SETTINGS_ID,
        quizTimePerQuestionSeconds: dto.quizTimePerQuestionSeconds,
      },
    });

    await this.prisma.knowledgeMaterialQuiz.updateMany({
      data: { timePerQuestionSeconds: dto.quizTimePerQuestionSeconds },
    });

    return updated;
  }
}
