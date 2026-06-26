/**
 * Production seed for remont quiz (node, no ts-node).
 * Docker: docker compose … exec backend node prisma/seed-quiz-remont.cjs
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '../.env') });
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

const { PrismaClient, Prisma } = require('@prisma/client');

const REMONT_QUIZ_SLUG = 'remont';
const REMONT_DOMAIN = 'remont-kvartir-51.ru';

const DEFAULT_QUIZ_CONSENT = {
  consentText: 'Я согласен(-на) на обработку персональных данных',
  consentLinkText: 'персональных данных',
  privacyPolicyTitle: 'Политика конфиденциальности персональных данных',
};

const DEFAULT_QUIZ_THEME = {
  accentColor: '#d90652',
  background: '#f8fafc',
  backgroundImageUrl: '/images/light-fon.png',
};

const REMONT_QUIZ_STEPS = require('./data/quiz-remont-steps.json');

function remontQuizStepCreateInput() {
  return REMONT_QUIZ_STEPS.map((step) => ({
    key: step.key,
    sortOrder: step.sortOrder,
    type: step.type,
    title: step.title,
    subtitle: step.subtitle ?? null,
    placeholder: step.placeholder ?? null,
    required: step.required,
    options: step.options ? step.options : Prisma.JsonNull,
    showWhen: step.showWhen ? step.showWhen : Prisma.JsonNull,
  }));
}

async function seedQuizRemont(prisma) {
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
        theme: DEFAULT_QUIZ_THEME,
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
    return step.options.some((o) => !o.imageUrl);
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

const prisma = new PrismaClient();

seedQuizRemont(prisma)
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
