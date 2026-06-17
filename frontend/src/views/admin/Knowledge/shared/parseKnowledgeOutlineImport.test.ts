import { describe, expect, it } from '@jest/globals';

import { parseKnowledgeOutlineImportText } from './parseKnowledgeOutlineImport';

const SAMPLE = `Модуль 1. Основы продукта (Вводный блок)
Базовые знания, с которых начинается понимание любого окна.
Устройство пластикового окна: из чего оно состоит (Рама, створка, стеклопакет).
Классификация ПВХ-профилей (Разбор ключевых технических параметров).

Модуль 2. Профильные системы VEKA (Бренд 1)
Глубокое изучение продукта А.
VEKA: философия бренда (История и позиционирование).`;

describe('parseKnowledgeOutlineImportText', () => {
  it('parses modules, descriptions and article excerpts', () => {
    const { modules } = parseKnowledgeOutlineImportText(SAMPLE);

    expect(modules).toHaveLength(2);
    expect(modules[0].name).toContain('Основы продукта');
    expect(modules[0].description).toContain('Базовые знания');
    expect(modules[0].articles).toHaveLength(2);
    expect(modules[0].articles[0].excerpt).toContain('Рама');
    expect(modules[1].articles).toHaveLength(1);
  });

  it('throws when modules are missing', () => {
    expect(() => parseKnowledgeOutlineImportText('просто текст')).toThrow();
  });
});
