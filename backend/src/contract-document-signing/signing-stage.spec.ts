import { BadRequestException } from '@nestjs/common';
import { ContractDocumentPackageKind, ContractDocumentPackageStatus } from '@prisma/client';

import {
  addendumOrdinalFromTab,
  assertSigningChronologyAtSign,
  detectSigningStage,
  signingStageLabel,
  validateSigningStageCreation,
} from './signing-stage';

const KIND = ContractDocumentPackageKind.REPAIR;
const IN_PROGRESS = ContractDocumentPackageStatus.IN_PROGRESS;
const CONCLUDED = ContractDocumentPackageStatus.CONTRACT_CONCLUDED;
const REFUSED = ContractDocumentPackageStatus.REFUSED;

describe('detectSigningStage', () => {
  it('определяет этап по единственному этапному документу', () => {
    expect(detectSigningStage([{ tabId: 'contract' }])).toEqual({
      stage: 'CONTRACT',
      stageTabs: ['contract'],
      stageTab: 'contract',
    });
    expect(detectSigningStage([{ tabId: 'actStart' }, { tabId: 'estimate' }])).toEqual({
      stage: 'ACT_START',
      stageTabs: ['actStart'],
      stageTab: 'actStart',
    });
    expect(detectSigningStage([{ tabId: 'actAcceptance' }])).toEqual({
      stage: 'ACT_ACCEPTANCE',
      stageTabs: ['actAcceptance'],
      stageTab: 'actAcceptance',
    });
  });

  it('без этапных документов этапа нет (документы не меняют статус)', () => {
    expect(detectSigningStage([{ tabId: 'specification' }, { tabId: 'memo' }])).toEqual({
      stage: null,
      stageTabs: [],
      stageTab: null,
    });
  });

  it('два этапных документа дают пустой этап и оба таба (микс)', () => {
    const result = detectSigningStage([{ tabId: 'contract' }, { tabId: 'actAcceptance' }]);
    expect(result.stage).toBeNull();
    expect(result.stageTabs).toEqual(['contract', 'actAcceptance']);
  });

  it('signingStageLabel возвращает человеческие названия', () => {
    expect(signingStageLabel('CONTRACT')).toBe('Договор');
    expect(signingStageLabel('ACT_START')).toBe('Акт начала работ');
    expect(signingStageLabel('ACT_ACCEPTANCE')).toBe('Акт сдачи-приёмки');
    expect(signingStageLabel('ADDENDUM', 'addendum2')).toBe('Доп. соглашение №2');
    expect(signingStageLabel(null)).toBe('Документы');
  });

  it('addendumOrdinalFromTab распознаёт номера Д/с', () => {
    expect(addendumOrdinalFromTab('addendum1')).toBe(1);
    expect(addendumOrdinalFromTab('addendum5')).toBe(5);
    expect(addendumOrdinalFromTab('contract')).toBeNull();
    expect(addendumOrdinalFromTab(null)).toBeNull();
  });
});

describe('validateSigningStageCreation', () => {
  const base = {
    kind: KIND,
    status: IN_PROGRESS,
    formData: {},
  };

  it('договор можно отправить, пока он не подписан', () => {
    expect(() =>
      validateSigningStageCreation({ ...base, stage: 'CONTRACT', stageTabs: ['contract'] }),
    ).not.toThrow();
  });

  it('нельзя смешивать договор и акты в одной сессии', () => {
    expect(() =>
      validateSigningStageCreation({
        ...base,
        stage: null,
        stageTabs: ['contract', 'actAcceptance'],
      }),
    ).toThrow('отдельными сессиями');
  });

  it('подписанный договор нельзя отправлять повторно', () => {
    expect(() =>
      validateSigningStageCreation({
        ...base,
        status: CONCLUDED,
        stage: 'CONTRACT',
        stageTabs: ['contract'],
      }),
    ).toThrow('уже подписан');
  });

  it('отказ блокирует отправку договора', () => {
    expect(() =>
      validateSigningStageCreation({
        ...base,
        status: REFUSED,
        stage: 'CONTRACT',
        stageTabs: ['contract'],
      }),
    ).toThrow('статусе отказа');
  });

  it('акты требуют подписанного договора (хронология)', () => {
    expect(() =>
      validateSigningStageCreation({
        ...base,
        status: IN_PROGRESS,
        stage: 'ACT_ACCEPTANCE',
        stageTabs: ['actAcceptance'],
      }),
    ).toThrow('Сначала подпишите договор');

    expect(() =>
      validateSigningStageCreation({
        ...base,
        status: CONCLUDED,
        stage: 'ACT_ACCEPTANCE',
        stageTabs: ['actAcceptance'],
      }),
    ).not.toThrow();
  });

  it('акт начала работ — только для «Ремонта» и только один раз', () => {
    expect(() =>
      validateSigningStageCreation({
        ...base,
        kind: ContractDocumentPackageKind.WINDOWS,
        status: CONCLUDED,
        stage: 'ACT_START',
        stageTabs: ['actStart'],
      }),
    ).toThrow('только для направления «Ремонт»');

    expect(() =>
      validateSigningStageCreation({
        ...base,
        status: CONCLUDED,
        formData: { repairWorkStartActSignedAt: '2026-09-28' },
        stage: 'ACT_START',
        stageTabs: ['actStart'],
      }),
    ).toThrow('уже отмечен подписанным');

    expect(() =>
      validateSigningStageCreation({
        ...base,
        status: CONCLUDED,
        stage: 'ACT_START',
        stageTabs: ['actStart'],
      }),
    ).not.toThrow();
  });

  it('акт сдачи-приёмки нельзя отправить повторно', () => {
    expect(() =>
      validateSigningStageCreation({
        ...base,
        status: CONCLUDED,
        formData: { repairContractCloseActSignedAt: '2026-09-28' },
        stage: 'ACT_ACCEPTANCE',
        stageTabs: ['actAcceptance'],
      }),
    ).toThrow('уже отмечен подписанным');
  });
});

describe('validateSigningStageCreation: доп. соглашения', () => {
  const concludedBase = {
    kind: KIND,
    status: CONCLUDED,
    formData: {
      addendumSlots: [
        { status: 'OPEN', selectedPresetIds: ['preset-1'], signedAt: '' },
        { status: 'SIGNED', selectedPresetIds: ['preset-2'], signedAt: '2026-09-28T10:00:00Z' },
      ],
    },
  };

  it('Д/с с расчётом и статусом OPEN можно отправить', () => {
    expect(() =>
      validateSigningStageCreation({
        ...concludedBase,
        stage: 'ADDENDUM',
        stageTabs: ['addendum1'],
      }),
    ).not.toThrow();
  });

  it('Д/с нельзя смешивать с договором в одной сессии', () => {
    expect(() =>
      validateSigningStageCreation({
        ...concludedBase,
        stage: null,
        stageTabs: ['contract', 'addendum1'],
      }),
    ).toThrow('отдельными сессиями');
  });

  it('Д/с направляется только после подписания договора', () => {
    expect(() =>
      validateSigningStageCreation({
        ...concludedBase,
        status: IN_PROGRESS,
        stage: 'ADDENDUM',
        stageTabs: ['addendum1'],
      }),
    ).toThrow('Сначала подпишите договор');
  });

  it('пустое Д/с (без расчёта) отправить нельзя', () => {
    expect(() =>
      validateSigningStageCreation({
        ...concludedBase,
        formData: { addendumSlots: [{ status: 'OPEN' }] },
        stage: 'ADDENDUM',
        stageTabs: ['addendum1'],
      }),
    ).toThrow('пустое');
  });

  it('уже подписанное Д/с повторно отправить нельзя', () => {
    expect(() =>
      validateSigningStageCreation({
        ...concludedBase,
        stage: 'ADDENDUM',
        stageTabs: ['addendum2'],
      }),
    ).toThrow('уже отмечено подписанным');
  });
});

describe('assertSigningChronologyAtSign', () => {
  it('акты и Д/с подписываются только после заключения договора', () => {
    expect(() => assertSigningChronologyAtSign('ACT_START', IN_PROGRESS)).toThrow(
      BadRequestException,
    );
    expect(() => assertSigningChronologyAtSign('ACT_ACCEPTANCE', IN_PROGRESS)).toThrow(
      'договор ещё не подписан',
    );
    expect(() => assertSigningChronologyAtSign('ADDENDUM', IN_PROGRESS)).toThrow(
      'договор ещё не подписан',
    );
    expect(() => assertSigningChronologyAtSign('ACT_START', CONCLUDED)).not.toThrow();
    expect(() => assertSigningChronologyAtSign('ADDENDUM', CONCLUDED)).not.toThrow();
  });

  it('договор и обычные документы — без ограничений', () => {
    expect(() => assertSigningChronologyAtSign('CONTRACT', IN_PROGRESS)).not.toThrow();
    expect(() => assertSigningChronologyAtSign(null, IN_PROGRESS)).not.toThrow();
  });
});
