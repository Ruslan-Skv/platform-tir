import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { SubmitQuizDto } from './dto/submit-quiz.dto';
import { QuizNotifierService } from './quiz-notifier.service';
import type { QuizOption, QuizShowWhen, QuizTheme } from './quiz.types';
import { DEFAULT_QUIZ_CONSENT, DEFAULT_QUIZ_THEME, FURNITURE_TYPE_VALUES } from './quiz.types';

@Injectable()
export class QuizService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifier: QuizNotifierService,
  ) {}

  async getPublicConfig(params: { slug?: string; host?: string }) {
    const normalizedHost = params.host?.split(':')[0]?.toLowerCase();
    let quiz = normalizedHost
      ? await this.prisma.quizLanding.findFirst({
          where: { domain: normalizedHost, isActive: true },
          include: { steps: { orderBy: { sortOrder: 'asc' } } },
        })
      : null;

    if (!quiz && params.slug) {
      quiz = await this.prisma.quizLanding.findFirst({
        where: { slug: params.slug, isActive: true },
        include: { steps: { orderBy: { sortOrder: 'asc' } } },
      });
    }

    if (!quiz) {
      throw new NotFoundException('Квиз не найден');
    }

    return this.mapQuizPublic(quiz);
  }

  async submit(slug: string, dto: SubmitQuizDto) {
    const quiz = await this.prisma.quizLanding.findFirst({
      where: { slug, isActive: true },
      include: { steps: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!quiz) {
      throw new NotFoundException('Квиз не найден');
    }

    if (!dto.name?.trim() || !dto.phone?.trim()) {
      throw new BadRequestException('Укажите имя и телефон');
    }

    const furnitureType = dto.answers.furniture_type;
    if (
      furnitureType &&
      !FURNITURE_TYPE_VALUES.includes(furnitureType as (typeof FURNITURE_TYPE_VALUES)[number])
    ) {
      throw new BadRequestException('Некорректный тип мебели');
    }

    const submission = await this.prisma.quizSubmission.create({
      data: {
        quizId: quiz.id,
        name: dto.name.trim(),
        phone: dto.phone.trim(),
        answers: dto.answers as Prisma.InputJsonValue,
        furnitureType: furnitureType || null,
        utmSource: dto.utmSource?.trim() || null,
        utmMedium: dto.utmMedium?.trim() || null,
        utmCampaign: dto.utmCampaign?.trim() || null,
        referrer: dto.referrer?.trim() || null,
        landingUrl: dto.landingUrl?.trim() || null,
      },
    });

    const stepLabels = new Map(
      quiz.steps.map((s) => [
        s.key,
        {
          title: s.title,
          options: this.parseOptions(s.options),
        },
      ]),
    );

    await this.notifier.notifySubmission(quiz.id, {
      quizTitle: quiz.title,
      name: submission.name,
      phone: submission.phone,
      answers: dto.answers,
      stepLabels,
    });

    return { id: submission.id, success: true };
  }

  private mapQuizPublic(quiz: Prisma.QuizLandingGetPayload<{ include: { steps: true } }>) {
    return {
      id: quiz.id,
      slug: quiz.slug,
      direction: quiz.direction,
      title: quiz.title,
      headline: quiz.headline,
      subheadline: quiz.subheadline,
      promoText: quiz.promoText,
      logoUrl: quiz.logoUrl,
      primaryColor: quiz.primaryColor,
      theme: this.parseTheme(quiz.theme, quiz.primaryColor),
      displayPhone: quiz.displayPhone,
      city: quiz.city,
      successTitle: quiz.successTitle,
      successText: quiz.successText,
      catalogFileUrl: quiz.catalogFileUrl,
      privacyPolicyUrl: quiz.privacyPolicyUrl?.trim() || null,
      privacyPolicyTitle:
        quiz.privacyPolicyTitle?.trim() || DEFAULT_QUIZ_CONSENT.privacyPolicyTitle,
      privacyPolicyContent: quiz.privacyPolicyContent?.trim() || null,
      consentText: quiz.consentText?.trim() || DEFAULT_QUIZ_CONSENT.consentText,
      consentLinkText: quiz.consentLinkText?.trim() || DEFAULT_QUIZ_CONSENT.consentLinkText,
      steps: quiz.steps.map((s) => ({
        id: s.id,
        key: s.key,
        sortOrder: s.sortOrder,
        type: s.type,
        title: s.title,
        subtitle: s.subtitle,
        placeholder: s.placeholder,
        required: s.required,
        options: this.parseOptions(s.options),
        showWhen: this.parseShowWhen(s.showWhen),
      })),
    };
  }

  private parseOptions(value: Prisma.JsonValue | null | undefined): QuizOption[] | undefined {
    if (!Array.isArray(value)) return undefined;
    const result: QuizOption[] = [];
    for (const item of value) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
      const obj = item as Record<string, unknown>;
      const val = String(obj.value ?? '');
      const label = String(obj.label ?? '');
      if (!val || !label) continue;
      result.push({
        value: val,
        label,
        imageUrl: obj.imageUrl ? String(obj.imageUrl) : undefined,
      });
    }
    return result.length > 0 ? result : undefined;
  }

  private parseShowWhen(value: Prisma.JsonValue | null | undefined): QuizShowWhen | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const obj = value as Record<string, unknown>;
    if (typeof obj.branchKey !== 'string' || !Array.isArray(obj.values)) return null;
    return {
      branchKey: obj.branchKey,
      values: obj.values.filter((v): v is string => typeof v === 'string'),
    };
  }

  private parseTheme(value: Prisma.JsonValue | null | undefined, primaryColor: string): QuizTheme {
    const base = {
      ...DEFAULT_QUIZ_THEME,
      accentColor: primaryColor || DEFAULT_QUIZ_THEME.accentColor,
    };
    if (!value || typeof value !== 'object' || Array.isArray(value)) return base;
    const obj = value as Record<string, unknown>;
    const str = (k: keyof QuizTheme) =>
      typeof obj[k] === 'string' ? (obj[k] as string) : (base[k] as string);
    const num = (k: keyof QuizTheme) => {
      const v = obj[k];
      return typeof v === 'number' && Number.isFinite(v) ? v : (base[k] as number);
    };
    const backgroundImageUrl = !('backgroundImageUrl' in obj)
      ? base.backgroundImageUrl
      : obj.backgroundImageUrl === null || obj.backgroundImageUrl === ''
        ? null
        : typeof obj.backgroundImageUrl === 'string'
          ? obj.backgroundImageUrl
          : base.backgroundImageUrl;
    return {
      background: str('background'),
      backgroundImageUrl,
      backgroundImageOpacity: num('backgroundImageOpacity'),
      backgroundImageBrightness: num('backgroundImageBrightness'),
      textColor: str('textColor'),
      headingColor: str('headingColor'),
      headlineFontSize: num('headlineFontSize'),
      headlineFontWeight: num('headlineFontWeight'),
      mutedTextColor: str('mutedTextColor'),
      subheadlineFontSize: num('subheadlineFontSize'),
      subheadlineFontWeight: num('subheadlineFontWeight'),
      promoTextColor: str('promoTextColor'),
      promoFontSize: num('promoFontSize'),
      promoFontWeight: num('promoFontWeight'),
      stepBlockTextColor: str('stepBlockTextColor'),
      successTitleColor: str('successTitleColor'),
      successTextColor: str('successTextColor'),
      cardBackground: str('cardBackground'),
      cardBorder: str('cardBorder'),
      stepBlockMaxWidth: num('stepBlockMaxWidth'),
      stepBlockPadding: num('stepBlockPadding'),
      stepBlockBorderRadius: num('stepBlockBorderRadius'),
      stepChoiceColumns: num('stepChoiceColumns'),
      choiceCardBackground: str('choiceCardBackground'),
      choiceCardBorderColor: str('choiceCardBorderColor'),
      choiceCardBorderWidth: num('choiceCardBorderWidth'),
      choiceCardBorderRadius: num('choiceCardBorderRadius'),
      choiceCardPaddingX: num('choiceCardPaddingX'),
      choiceCardPaddingY: num('choiceCardPaddingY'),
      choiceCardGap: num('choiceCardGap'),
      choiceCardImageHeight: num('choiceCardImageHeight'),
      choiceCardImageRadius: num('choiceCardImageRadius'),
      choiceCardSelectedBackground: str('choiceCardSelectedBackground'),
      choiceCardSelectedBorderColor: str('choiceCardSelectedBorderColor'),
      accentColor: str('accentColor'),
      buttonTextColor: str('buttonTextColor'),
      backButtonTextColor: str('backButtonTextColor'),
      backButtonBorderColor: str('backButtonBorderColor'),
      backButtonBackground: str('backButtonBackground'),
      fontFamily: str('fontFamily'),
      headingFontFamily: str('headingFontFamily'),
      cityBadgeBackground: str('cityBadgeBackground'),
      cityBadgeBackgroundOpacity: num('cityBadgeBackgroundOpacity'),
      cityBadgeTextColor: str('cityBadgeTextColor'),
      cityBadgeIconColor: str('cityBadgeIconColor'),
      cityBadgeBorderColor: str('cityBadgeBorderColor'),
      cityBadgeFontSize: num('cityBadgeFontSize'),
      cityBadgeFontWeight: num('cityBadgeFontWeight'),
      cityBadgePaddingX: num('cityBadgePaddingX'),
      cityBadgePaddingY: num('cityBadgePaddingY'),
      cityBadgeBorderRadius: num('cityBadgeBorderRadius'),
      cityBadgeIconSize: num('cityBadgeIconSize'),
      cityBadgeBorderWidth: num('cityBadgeBorderWidth'),
      cityBadgeShadowOpacity: num('cityBadgeShadowOpacity'),
    };
  }
}
