import { normalizeContractActHandwrittenSignaturesInHtml } from './contractTemplateActSignatures';
import { repairContractTemplateStructureInHtml } from './contractTemplateStructure';

const BROKEN_USER_HTML = `<div class="signTableActRight"><table class="signTableActLayout" data-contract-signatures-handwritten-customer="1"><tbody><tr><td class="signTableActLayoutSpacer"><table class="signTable signTableActHandwritten" data-contract-signatures-handwritten-customer="1"><tbody><tr><td>Исполнитель</td><td>Заказчик</td></tr>
<tr><td>_________________/{{executor.directorName|plain}}</td><td><p style="margin: 0;">_________________/</p><p class="contractSignFioLine"><br></p></td></tr>
<tr class="signTableDateRow"><td></td><td>«____» ________________ 20__ г.</td></tr></tbody></table><br></td><td class="signTableActLayoutBody"><br></td></tr></tbody></table></div>`;

const MIXED_SIGN_ROW_HTML = `<table class="signTable signTableActHandwritten" data-contract-signatures-handwritten-customer="1"><tr><td>Исполнитель</td><td>Заказчик</td></tr>
<tr><td>_________________/{{executor.directorName|plain}}</td><td><span class="contractSignCustomerSlash"><span class="contractSignSignatureLine"></span>/<span class="contractSignFioLine"></span></span></td></tr>
<tr class="signTableDateRow"><td></td><td>«____» ________________ 20__ г.</td></tr></table>`;

/** Упрощённая вставка из редактора: slash + ФИО без линий подписи. */
const SIMPLIFIED_SLASH_ROW_HTML = `<table class="signTable signTableActHandwritten" data-contract-signatures-handwritten-customer="1"><tbody><tr><td>Исполнитель</td><td>Заказчик</td></tr>
<tr class="signTableSignRow"><td><span class="contractSignSlashRow">/<span class="contractSignNameText">{{executor.directorName|plain}}</span></span></td><td><span class="contractSignSlashRow">/</span></td></tr>
<tr class="signTableDateRow"><td></td><td>«____» ________________ 20__ г.</td></tr></tbody></table>`;

/** Точная разметка из отчёта пользователя (inline style на table, tbody). */
const USER_REPORTED_SIGN_TABLE = `<table class="signTable signTableActHandwritten" style="width: 100%; border-collapse: collapse" data-contract-signatures-handwritten-customer="1"><tbody><tr><td>Исполнитель</td><td>Заказчик</td></tr>
<tr class="signTableSignRow"><td><span class="contractSignSlashRow">/<span class="contractSignNameText">{{executor.directorName|plain}}</span></span></td><td><span class="contractSignSlashRow">/</span></td></tr>
<tr class="signTableDateRow"><td></td><td>«____» ________________ 20__ г.</td></tr></tbody></table>`;

describe('normalizeContractActHandwrittenSignaturesInHtml', () => {
  it('aligns executor and customer signature rows to the same slash layout', () => {
    const normalized = normalizeContractActHandwrittenSignaturesInHtml(MIXED_SIGN_ROW_HTML);
    expect(normalized).toContain('contractSignSlashRow');
    expect(normalized).toContain('contractSignNameText');
    expect(normalized).toContain('{{executor.directorName|plain}}');
    expect(normalized).not.toContain('_________________/');
    expect(normalized).not.toContain('contractSignCustomerSlash');
  });

  it('upgrades simplified slash row to canonical signature lines', () => {
    const normalized = normalizeContractActHandwrittenSignaturesInHtml(SIMPLIFIED_SLASH_ROW_HTML);
    expect(normalized).toContain('contractSignSignatureLine');
    expect(normalized).toContain('contractSignFioLine');
    expect(normalized).toContain('{{executor.directorName|plain}}');
    expect(normalized).toContain('signTableSignRow');
    expect(normalized.match(/contractSignSignatureLine/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it('upgrades user-reported act sign table markup', () => {
    const normalized = normalizeContractActHandwrittenSignaturesInHtml(USER_REPORTED_SIGN_TABLE);
    expect(normalized).toContain('contractSignSignatureLine');
    expect(normalized).toContain('contractSignFioLine');
    expect(normalized.match(/contractSignSignatureLine/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it('repairContractTemplateStructureInHtml upgrades act signatures in docPrint', () => {
    const wrapped = `<div class="docPrint docPrintContractCompact">${USER_REPORTED_SIGN_TABLE}</div>`;
    const out = repairContractTemplateStructureInHtml(wrapped);
    expect(out).toContain('contractSignSignatureLine');
    expect(out).toContain('contractSignFioLine');
  });

  it('unwraps legacy 50% layout and keeps a single full-width sign table', () => {
    const normalized = normalizeContractActHandwrittenSignaturesInHtml(BROKEN_USER_HTML);
    expect(normalized).not.toContain('signTableActLayout');
    expect(normalized).not.toContain('signTableActRight');
    expect(normalized).not.toContain('signTableActLayoutSpacer');
    expect(normalized).toMatch(/<table[^>]*class="[^"]*signTable[^"]*signTableActHandwritten/);
    expect(normalized.match(/<table/g)?.length).toBe(1);
    expect(normalized).toContain('width: 100%');
    expect(normalized).toContain('Исполнитель');
    expect(normalized).toContain('contractSignFioLine');
    expect(normalized).toContain('contractSignSlashRow');
    expect(normalized).toContain('contractSignNameText');
    expect(normalized).toContain('signTableSignRow');
    expect(normalized).toContain('contractSignSignatureLine');
    expect(normalized).not.toContain('_________________/');
  });
});
