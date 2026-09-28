import { defaultPackageFormData } from '../../../platform/form/defaults';
import type { PackageFormData } from '../../../platform/form/types';
import { newProductAddendumSpecificationLine } from '../addendum/addendumSpecification';
import { newDoorsSpecificationLine } from './doorsSpecification';
import {
  applyDoorsSupplierRequestLines,
  composeDoorsLineDisplayName,
  diffDoorsSpecificationForSupplierRequest,
} from './doorsSupplierRequest';

function line(patch: Partial<ReturnType<typeof newDoorsSpecificationLine>> = {}) {
  return { ...newDoorsSpecificationLine(), ...patch };
}

function specForm(lines: ReturnType<typeof newDoorsSpecificationLine>[]): PackageFormData {
  return { ...defaultPackageFormData(), doorsSpecificationLines: lines };
}

describe('composeDoorsLineDisplayName', () => {
  it('joins non-empty attributes with a dot separator', () => {
    expect(
      composeDoorsLineDisplayName(
        line({ name: 'Добор', size: '150х100', color: 'к ДО ЛАЙТ', openingSide: '' })
      )
    ).toBe('Добор · 150х100 · к ДО ЛАЙТ');
  });

  it('falls back to empty string for an empty line', () => {
    expect(composeDoorsLineDisplayName(line())).toBe('');
  });
});

describe('diffDoorsSpecificationForSupplierRequest', () => {
  it('puts the quantity increase into added lines only', () => {
    const spec = [line({ name: 'Добор', quantity: '3', unitPrice: '500' })];
    const request = [line({ ...spec[0], quantity: '5' })];
    const diff = diffDoorsSpecificationForSupplierRequest(spec, request);
    expect(diff.added).toHaveLength(1);
    expect(diff.added[0]).toMatchObject({
      name: 'Добор',
      quantity: '2',
      unit: 'шт.',
      price: '500',
    });
    expect(diff.excluded).toHaveLength(0);
  });

  it('puts the quantity decrease into excluded lines only', () => {
    const spec = [line({ name: 'Наличник', quantity: '6', unitPrice: '200' })];
    const request = [line({ ...spec[0], quantity: '4' })];
    const diff = diffDoorsSpecificationForSupplierRequest(spec, request);
    expect(diff.added).toHaveLength(0);
    expect(diff.excluded).toHaveLength(1);
    expect(diff.excluded[0]).toMatchObject({ name: 'Наличник', quantity: '2' });
  });

  it('adds fully new positions and excludes removed positions', () => {
    const door = line({ name: 'Дверь', quantity: '1', unitPrice: '15000' });
    const plinth = line({ name: 'Плинтус', quantity: '10', unitPrice: '100' });
    const extra = line({ name: 'Замок', quantity: '2', unitPrice: '800' });
    const diff = diffDoorsSpecificationForSupplierRequest([door, plinth], [door, extra]);
    expect(diff.added).toHaveLength(1);
    expect(diff.added[0]).toMatchObject({ name: 'Замок', quantity: '2' });
    expect(diff.excluded).toHaveLength(1);
    expect(diff.excluded[0]).toMatchObject({ name: 'Плинтус', quantity: '10' });
  });

  it('returns empty diff when nothing changed', () => {
    const spec = [line({ name: 'Дверь', quantity: '2', unitPrice: '1000' })];
    const request = [line({ ...spec[0] })];
    const diff = diffDoorsSpecificationForSupplierRequest(spec, request);
    expect(diff.added).toHaveLength(0);
    expect(diff.excluded).toHaveLength(0);
  });

  it('ignores empty template rows', () => {
    const spec = [line({ name: 'Дверь', quantity: '1', unitPrice: '1000' })];
    const diff = diffDoorsSpecificationForSupplierRequest(spec, [line({ ...spec[0] }), line()]);
    expect(diff.added).toHaveLength(0);
    expect(diff.excluded).toHaveLength(0);
  });
});

describe('applyDoorsSupplierRequestLines', () => {
  const door = line({ name: 'Дверь', quantity: '3', unitPrice: '1000' });

  it('creates the first addendum slot with today date and the diff', () => {
    const form = specForm([door]);
    const result = applyDoorsSupplierRequestLines(
      form,
      [line({ ...door, quantity: '5' })],
      '05.09.2026'
    );
    expect(result.addendumSlotsExhausted).toBe(false);
    expect(result.addendumSlotOrdinal).toBe(1);
    expect(result.form.addendumSlotCount).toBe(1);
    expect(result.form.addendumDocumentDates[0]).toBe('05.09.2026');
    expect(result.form.addendumSlots[0].supplierRequestLinked).toBe(true);
    expect(result.form.addendumSlots[0].specificationAddedLines).toHaveLength(1);
    expect(result.form.addendumSlots[0].specificationAddedLines[0]).toMatchObject({
      quantity: '2',
    });
    expect(result.form.doorsSpecificationLines).toEqual([door]);
    expect(result.form.doorsSupplierRequestLines).toHaveLength(1);
  });

  it('does not create a slot when there is no difference', () => {
    const form = specForm([door]);
    const result = applyDoorsSupplierRequestLines(form, [line({ ...door })], '05.09.2026');
    expect(result.addendumSlotOrdinal).toBeNull();
    expect(result.form.addendumSlotCount).toBe(0);
    expect(result.form.doorsSupplierRequestLines).toHaveLength(1);
  });

  it('updates the same open linked slot on repeated saves', () => {
    const form = specForm([door]);
    const first = applyDoorsSupplierRequestLines(
      form,
      [line({ ...door, quantity: '5' })],
      '05.09.2026'
    );
    const second = applyDoorsSupplierRequestLines(
      first.form,
      [line({ ...door, quantity: '4' })],
      '06.09.2026'
    );
    expect(second.addendumSlotOrdinal).toBe(1);
    expect(second.form.addendumSlotCount).toBe(1);
    expect(second.form.addendumSlots[0].specificationAddedLines[0]).toMatchObject({
      quantity: '1',
    });
    expect(second.form.addendumDocumentDates[0]).toBe('05.09.2026');
  });

  it('clears the linked open slot when edits revert to the specification', () => {
    const form = specForm([door]);
    const first = applyDoorsSupplierRequestLines(
      form,
      [line({ ...door, quantity: '5' })],
      '05.09.2026'
    );
    const reverted = applyDoorsSupplierRequestLines(first.form, [line({ ...door })], '06.09.2026');
    expect(reverted.addendumSlotOrdinal).toBe(1);
    expect(reverted.form.addendumSlots[0].specificationAddedLines).toHaveLength(0);
    expect(reverted.form.addendumSlots[0].specificationExcludedLines).toHaveLength(0);
  });

  it('creates a new slot when the linked one is signed', () => {
    const form = specForm([door]);
    const first = applyDoorsSupplierRequestLines(
      form,
      [line({ ...door, quantity: '5' })],
      '05.09.2026'
    );
    const signed: PackageFormData = {
      ...first.form,
      addendumSlots: first.form.addendumSlots.map((slot, i) =>
        i === 0 ? { ...slot, status: 'SIGNED' } : slot
      ) as PackageFormData['addendumSlots'],
    };
    const second = applyDoorsSupplierRequestLines(
      signed,
      [line({ ...door, quantity: '6' })],
      '06.09.2026'
    );
    expect(second.addendumSlotOrdinal).toBe(2);
    expect(second.form.addendumSlotCount).toBe(2);
    expect(second.form.addendumSlots[1].supplierRequestLinked).toBe(true);
    expect(second.form.addendumSlots[1].specificationAddedLines[0]).toMatchObject({
      quantity: '3',
    });
  });

  it('keeps the request lines but skips the addendum when all 5 slots are used', () => {
    const form: PackageFormData = {
      ...specForm([door]),
      addendumSlotCount: 5,
    };
    const result = applyDoorsSupplierRequestLines(
      form,
      [line({ ...door, quantity: '5' })],
      '05.09.2026'
    );
    expect(result.addendumSlotsExhausted).toBe(true);
    expect(result.addendumSlotOrdinal).toBeNull();
    expect(result.form.addendumSlotCount).toBe(5);
    expect(result.form.doorsSupplierRequestLines).toHaveLength(1);
  });

  it('leaves manually created addendum slots without the linked flag untouched', () => {
    const manualSlot = {
      ...defaultPackageFormData().addendumSlots[0],
      specificationAddedLines: [
        { ...newProductAddendumSpecificationLine(), name: 'Ручная строка', quantity: '9' },
      ],
    };
    const form: PackageFormData = {
      ...specForm([door]),
      addendumSlotCount: 1,
      addendumSlots: [
        manualSlot,
        ...defaultPackageFormData().addendumSlots.slice(1),
      ] as PackageFormData['addendumSlots'],
    };
    const result = applyDoorsSupplierRequestLines(
      form,
      [line({ ...door, quantity: '4' })],
      '05.09.2026'
    );
    expect(result.addendumSlotOrdinal).toBe(2);
    expect(result.form.addendumSlots[0].specificationAddedLines[0]).toMatchObject({
      name: 'Ручная строка',
    });
    expect(result.form.addendumSlots[1].supplierRequestLinked).toBe(true);
  });
});
