import { defaultPackageFormData } from './defaults';
import { applyRepairWorkOrderGlobalDefaults } from './repairWorkOrderPercents';

describe('applyRepairWorkOrderGlobalDefaults', () => {
  it('заполняет пустые налог и наценку из глобальных настроек', () => {
    const form = defaultPackageFormData();
    const res = applyRepairWorkOrderGlobalDefaults(form, {
      workOrderMarkupPercent: 15,
      workOrderTaxPercent: 20,
    });
    expect(res.changed).toBe(true);
    expect(res.form.workOrder.markupPercent).toBe('15');
    expect(res.form.workOrder.taxPercent).toBe('20');
  });

  it('не трогает значения, заданные в данных пакета', () => {
    const form = defaultPackageFormData();
    form.workOrder.markupPercent = '25';
    form.workOrder.taxPercent = '7';
    const res = applyRepairWorkOrderGlobalDefaults(form, {
      workOrderMarkupPercent: 15,
      workOrderTaxPercent: 20,
    });
    expect(res.changed).toBe(false);
    expect(res.form.workOrder.markupPercent).toBe('25');
    expect(res.form.workOrder.taxPercent).toBe('7');
  });

  it('заполняет только пустое поле, если второе задано в пакете', () => {
    const form = defaultPackageFormData();
    form.workOrder.taxPercent = '7';
    const res = applyRepairWorkOrderGlobalDefaults(form, {
      workOrderMarkupPercent: 15,
      workOrderTaxPercent: 20,
    });
    expect(res.changed).toBe(true);
    expect(res.form.workOrder.markupPercent).toBe('15');
    expect(res.form.workOrder.taxPercent).toBe('7');
  });

  it('ничего не делает, если глобальные настройки не заданы', () => {
    const form = defaultPackageFormData();
    expect(applyRepairWorkOrderGlobalDefaults(form, null).changed).toBe(false);
    expect(applyRepairWorkOrderGlobalDefaults(form, {}).changed).toBe(false);
    expect(
      applyRepairWorkOrderGlobalDefaults(form, {
        workOrderMarkupPercent: null,
        workOrderTaxPercent: null,
      }).changed
    ).toBe(false);
  });

  it('клампит глобальные значения до 0..100', () => {
    const form = defaultPackageFormData();
    const res = applyRepairWorkOrderGlobalDefaults(form, {
      workOrderMarkupPercent: 150,
      workOrderTaxPercent: -5,
    });
    expect(res.form.workOrder.markupPercent).toBe('100');
    // Отрицательные значения считаются незаданными
    expect(res.form.workOrder.taxPercent).toBe('');
  });
});
