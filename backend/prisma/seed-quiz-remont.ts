import { PrismaClient } from '@prisma/client';
import {
  DEFAULT_QUIZ_CONSENT,
  DEFAULT_QUIZ_THEME,
  REMONT_QUIZ_SLUG,
} from '../src/quiz/quiz.types';
import { remontQuizStepCreateInput, REMONT_QUIZ_STEPS } from './seed-quiz-remont-steps';

const REMONT_DOMAIN = 'remont-kvartir-51.ru';

export async function seedQuizRemont(prisma: PrismaClient) {
  const existing = await prisma.quizLanding.findUnique({
    where: { slug: REMONT_QUIZ_SLUG },
    include: { steps: true },
  });

  if (!existing) {
    const quiz = await prisma.quizLanding.create({
      data: {
        slug: REMONT_QUIZ_SLUG,
        direction: 'multi',
        title: 'Ремонт и отделка',
        domain: REMONT_DOMAIN,
        isActive: true,
        headline: 'Рассчитайте стоимость ремонта и отделки',
        subheadline:
          'Ремонт квартир · окна · двери · натяжные потолки · жалюзи · мебель на заказ',
        promoText: 'Держим выгодные цены. Гарантия лучшей цены. Рассрочка.',
        primaryColor: DEFAULT_QUIZ_THEME.accentColor,
        theme: DEFAULT_QUIZ_THEME as object,
        displayPhone: '+7 (911) 300-35-03',
        city: 'Мурманск',
        successTitle: 'Спасибо за уделённое время!',
        successText:
          'Менеджер уже приступил к расчёту стоимости. Мы перезвоним в течение 1 часа для уточнения деталей.',
        consentText: DEFAULT_QUIZ_CONSENT.consentText,
        consentLinkText: DEFAULT_QUIZ_CONSENT.consentLinkText,
        privacyPolicyTitle: DEFAULT_QUIZ_CONSENT.privacyPolicyTitle,
        notifyEmails: [],
        notifyTelegramIds: [],
        notifyPhones: [],
        steps: { create: remontQuizStepCreateInput() },
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
    console.log('✅ Quiz remont: тема обновлена');
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
    console.log('✅ Quiz remont: текст согласия обновлён');
  }

  const stepsWithoutImages = existing.steps.some((step) => {
    if (!step.options || !Array.isArray(step.options)) return false;
    return (step.options as { imageUrl?: string }[]).some((o) => !o.imageUrl);
  });

  if (stepsWithoutImages || existing.steps.length !== REMONT_QUIZ_STEPS.length) {
    await prisma.$transaction(async (tx) => {
      await tx.quizStep.deleteMany({ where: { quizId: existing.id } });
      await tx.quizStep.createMany({
        data: remontQuizStepCreateInput().map((s) => ({ ...s, quizId: existing.id })),
      });
    });
    console.log('✅ Quiz remont: шаги обновлены');
  } else {
    console.log('⏭️  Quiz remont already exists');
  }
}
