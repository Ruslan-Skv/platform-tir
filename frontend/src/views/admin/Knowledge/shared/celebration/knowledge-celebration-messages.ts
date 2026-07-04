import type { KnowledgeTrainingCelebration } from '@/shared/api/admin-knowledge';

type MessageContext = KnowledgeTrainingCelebration;

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

const MATERIAL_HEADLINES = [
  (ctx: MessageContext) => `Отлично, ${ctx.learnerName}!`,
  (ctx: MessageContext) => `Молодец, ${ctx.learnerName}!`,
  (ctx: MessageContext) => `${ctx.learnerName}, ещё один шаг вперёд!`,
];

const MATERIAL_BODIES = [
  (ctx: MessageContext) => `Материал «${ctx.materialTitle}» успешно изучен.`,
  (ctx: MessageContext) => `«${ctx.materialTitle}» — в вашей копилке знаний.`,
  (ctx: MessageContext) => `Вы усвоили «${ctx.materialTitle}». Так держать!`,
];

const MODULE_HEADLINES = [
  (ctx: MessageContext) => `${ctx.learnerName}, модуль пройден!`,
  (ctx: MessageContext) => `Блестяще, ${ctx.learnerName}!`,
  (ctx: MessageContext) => `${ctx.learnerName}, это серьёзный результат!`,
];

const MODULE_BODIES = [
  (ctx: MessageContext) =>
    `Модуль «${ctx.moduleName ?? 'без названия'}» завершён${formatModuleProgress(ctx)}.`,
  (ctx: MessageContext) =>
    `Вы закрыли модуль «${ctx.moduleName ?? 'без названия'}»${formatModuleProgress(ctx)}.`,
];

const CATEGORY_HEADLINES = [
  (ctx: MessageContext) => `${ctx.learnerName}, поздравляем!`,
  (ctx: MessageContext) => `${ctx.learnerName}, это победа!`,
  (ctx: MessageContext) => `Ура, ${ctx.learnerName}!`,
];

const CATEGORY_BODIES = [
  (ctx: MessageContext) =>
    `Категория «${ctx.categoryName}» полностью пройдена — ${ctx.categoryProgress.completed} из ${ctx.categoryProgress.total} материалов.`,
  (ctx: MessageContext) =>
    `Вся программа «${ctx.categoryName}» за плечами: ${ctx.categoryProgress.completed} из ${ctx.categoryProgress.total}.`,
];

function formatModuleProgress(ctx: MessageContext): string {
  if (!ctx.moduleProgress || ctx.moduleProgress.total <= 0) {
    return '';
  }
  return `: ${ctx.moduleProgress.completed} из ${ctx.moduleProgress.total} материалов`;
}

export function buildKnowledgeCelebrationCopy(ctx: KnowledgeTrainingCelebration): {
  headline: string;
  body: string;
} {
  switch (ctx.level) {
    case 'category':
      return {
        headline: pickRandom(CATEGORY_HEADLINES)(ctx),
        body: pickRandom(CATEGORY_BODIES)(ctx),
      };
    case 'module':
      return {
        headline: pickRandom(MODULE_HEADLINES)(ctx),
        body: pickRandom(MODULE_BODIES)(ctx),
      };
    default:
      return {
        headline: pickRandom(MATERIAL_HEADLINES)(ctx),
        body: pickRandom(MATERIAL_BODIES)(ctx),
      };
  }
}

export function getKnowledgeCelebrationLevelLabel(
  level: KnowledgeTrainingCelebration['level']
): string {
  switch (level) {
    case 'category':
      return 'Категория пройдена';
    case 'module':
      return 'Модуль пройден';
    default:
      return 'Материал изучен';
  }
}
