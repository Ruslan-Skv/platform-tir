import type { KnowledgeTrainingCelebration } from '@/shared/api/admin-knowledge';

import {
  buildKnowledgeCelebrationCopy,
  getKnowledgeCelebrationLevelLabel,
} from './knowledge-celebration-messages';

const baseCelebration: KnowledgeTrainingCelebration = {
  level: 'material',
  learnerName: 'Анна',
  materialTitle: 'Введение в продажи',
  moduleName: 'Старт',
  categoryName: 'Менеджер',
  moduleProgress: { completed: 2, total: 4 },
  categoryProgress: { completed: 5, total: 10 },
  nextMaterialId: 'next-id',
};

describe('buildKnowledgeCelebrationCopy', () => {
  it('includes learner name for material level', () => {
    const copy = buildKnowledgeCelebrationCopy(baseCelebration);
    expect(copy.headline).toContain('Анна');
    expect(copy.body).toContain('Введение в продажи');
  });

  it('uses category copy for category level', () => {
    const copy = buildKnowledgeCelebrationCopy({ ...baseCelebration, level: 'category' });
    expect(copy.body).toContain('Менеджер');
    expect(copy.body).toContain('10');
  });
});

describe('getKnowledgeCelebrationLevelLabel', () => {
  it('returns labels by level', () => {
    expect(getKnowledgeCelebrationLevelLabel('material')).toBe('Материал изучен');
    expect(getKnowledgeCelebrationLevelLabel('module')).toBe('Модуль пройден');
    expect(getKnowledgeCelebrationLevelLabel('category')).toBe('Категория пройдена');
  });
});
