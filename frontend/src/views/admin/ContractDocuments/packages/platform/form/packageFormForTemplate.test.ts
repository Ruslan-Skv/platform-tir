import { defaultPackageFormData } from './defaults';
import { packageFormForTemplate } from './packageFormForTemplate';

function formWithPrepaymentAmount(amount: string) {
  const form = defaultPackageFormData();
  form.contract.prepaymentAmount = amount;
  return form;
}

describe('packageFormForTemplate: сумма ПКО целыми рублями', () => {
  it('вкладка ПКО округляет сумму и пропись до целых рублей', () => {
    const tpl = packageFormForTemplate(formWithPrepaymentAmount('86 418,3'), {
      templateTab: 'cashOrder',
    });
    expect(tpl.contract.prepaymentAmount).toBe('86418');
    expect(tpl.contract.prepaymentAmountWords).toBe(
      'восемьдесят шесть тысяч четыреста восемнадцать рублей 00 копеек'
    );
  });

  it('остальные вкладки печатают сумму без округления', () => {
    const tpl = packageFormForTemplate(formWithPrepaymentAmount('86 418,3'), {
      templateTab: 'contract',
    });
    expect(tpl.contract.prepaymentAmount).toBe('86 418,3');
    expect(tpl.contract.prepaymentAmountWords).toBe(
      'восемьдесят шесть тысяч четыреста восемнадцать рублей 30 копеек'
    );
  });

  it('целая сумма и пустое поле не меняются', () => {
    const tpl = packageFormForTemplate(formWithPrepaymentAmount('50000'), {
      templateTab: 'cashOrder',
    });
    expect(tpl.contract.prepaymentAmount).toBe('50000');

    const empty = packageFormForTemplate(formWithPrepaymentAmount(''), {
      templateTab: 'cashOrder',
    });
    expect(empty.contract.prepaymentAmount).toBe('');
    expect(empty.contract.prepaymentAmountWords).toBe('');
  });
});
