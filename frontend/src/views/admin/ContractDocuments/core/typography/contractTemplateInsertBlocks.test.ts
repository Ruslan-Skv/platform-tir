import {
  CONTRACT_SIGN_FIO_LINE_CLASS,
  buildContractActHandwrittenCustomerSignaturesHtml,
  buildContractPartySignaturesHtml,
} from './contractTemplateInsertBlocks';

describe('contractTemplateInsertBlocks signatures', () => {
  it('buildContractPartySignaturesHtml includes customer printed name placeholder', () => {
    const html = buildContractPartySignaturesHtml();
    expect(html).toContain('{{customer.signatureName|plain}}');
    expect(html).toContain('Подрядчик');
  });

  it('buildContractActHandwrittenCustomerSignaturesHtml omits customer printed name', () => {
    const html = buildContractActHandwrittenCustomerSignaturesHtml();
    expect(html).not.toContain('customer.signatureName');
    expect(html).toContain('width: 100%');
    expect(html).toContain('signTable signTableActHandwritten');
    expect(html).not.toContain('signTableActLayout');
    expect(html).toContain(CONTRACT_SIGN_FIO_LINE_CLASS);
    expect(html).toContain('contractSignSlashRow');
    expect(html).toContain('contractSignNameText');
    expect(html).not.toContain('_________________/');
    expect(html).not.toContain('Дата «');
    expect(html).toContain('signTableDateRow');
    expect(html).toContain('{{executor.directorName|plain}}');
    expect(html).toContain('data-contract-signatures-handwritten-customer="1"');
    expect(html).toMatch(/<td><\/td><td>«____»/);
  });
});
