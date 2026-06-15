import { PrismaClient } from '@prisma/client';
import {
  DEFAULT_QUIZ_CONSENT,
  DEFAULT_QUIZ_THEME,
  FURNITURE_QUIZ_SLUG,
} from '../src/quiz/quiz.types';
import { mebelQuizStepCreateInput, MEBEL_QUIZ_STEPS } from './seed-quiz-mebel-steps';

const MEBEL_DOMAIN = 'mebel-na-zakaz-51.ru';

export async function seedQuizMebel(prisma: PrismaClient) {
  const existing = await prisma.quizLanding.findUnique({
    where: { slug: FURNITURE_QUIZ_SLUG },
    include: { steps: true },
  });

  if (!existing) {
    const quiz = await prisma.quizLanding.create({
      data: {
        slug: FURNITURE_QUIZ_SLUG,
        direction: 'furniture',
        title: 'Мебель на заказ',
        domain: MEBEL_DOMAIN,
        isActive: true,
        headline: 'Рассчитайте стоимость мебели на заказ',
        subheadline:
          'Составляем смету · разрабатываем дизайн · изготавливаем · доставляем · собираем',
        promoText: 'Держим выгодные цены. Гарантия лучшей цены. Рассрочка.',
        primaryColor: DEFAULT_QUIZ_THEME.accentColor,
        theme: DEFAULT_QUIZ_THEME as object,
        displayPhone: '+7 (911) 300-35-03',
        city: 'Мурманск',
        successTitle: 'Спасибо за уделённое время!',
        successText:
          'Дизайнер уже приступил к расчёту стоимости. Мы перезвоним в течение 1 часа для уточнения деталей.',
        consentText: DEFAULT_QUIZ_CONSENT.consentText,
        consentLinkText: DEFAULT_QUIZ_CONSENT.consentLinkText,
        privacyPolicyTitle: DEFAULT_QUIZ_CONSENT.privacyPolicyTitle,
        notifyEmails: [],
        notifyTelegramIds: [],
        notifyPhones: [],
        steps: { create: mebelQuizStepCreateInput() },
      },
    });
    console.log(`✅ Quiz created: ${quiz.title} (${quiz.slug})`);
    return;
  }

  if (!existing.theme) {
    await prisma.quizLanding.update({
      where: { id: existing.id },
      data: {
        theme: DEFAULT_QUIZ_THEME as object,
        primaryColor: DEFAULT_QUIZ_THEME.accentColor,
      },
    });
    console.log('✅ Quiz mebel: тема обновлена (фон как на основном сайте)');
  } else if (
    existing.theme &&
    typeof existing.theme === 'object' &&
    !Array.isArray(existing.theme) &&
    !(existing.theme as Record<string, unknown>).backgroundImageUrl
  ) {
    await prisma.quizLanding.update({
      where: { id: existing.id },
      data: {
        theme: {
          ...DEFAULT_QUIZ_THEME,
          ...(existing.theme as Record<string, unknown>),
          backgroundImageUrl: DEFAULT_QUIZ_THEME.backgroundImageUrl,
          backgroundImageOpacity: DEFAULT_QUIZ_THEME.backgroundImageOpacity,
          backgroundImageBrightness: DEFAULT_QUIZ_THEME.backgroundImageBrightness,
        },
      },
    });
    console.log('✅ Quiz mebel: добавлен фоновый рисунок по умолчанию');
  }

  if (!existing.consentText || existing.consentText.includes('{link}')) {
    await prisma.quizLanding.update({
      where: { id: existing.id },
      data: {
        consentText: DEFAULT_QUIZ_CONSENT.consentText,
        consentLinkText: DEFAULT_QUIZ_CONSENT.consentLinkText,
        privacyPolicyTitle: DEFAULT_QUIZ_CONSENT.privacyPolicyTitle,
      },
    });
    console.log('✅ Quiz mebel: текст согласия обновлён');
  }

  const stepsWithoutImages = existing.steps.some((step) => {
    if (!step.options || !Array.isArray(step.options)) return false;
    return (step.options as { imageUrl?: string }[]).some((o) => !o.imageUrl);
  });

  if (stepsWithoutImages || existing.steps.length !== MEBEL_QUIZ_STEPS.length) {
    await prisma.$transaction(async (tx) => {
      await tx.quizStep.deleteMany({ where: { quizId: existing.id } });
      await tx.quizStep.createMany({
        data: mebelQuizStepCreateInput().map((s) => ({ ...s, quizId: existing.id })),
      });
    });
    console.log('✅ Quiz mebel: шаги обновлены (картинки по умолчанию)');
  } else {
    console.log('⏭️  Quiz mebel already exists');
  }
}
