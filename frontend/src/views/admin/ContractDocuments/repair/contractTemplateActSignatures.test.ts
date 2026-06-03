import { describe, expect, it } from 'vitest';

import { normalizeContractActHandwrittenSignaturesInHtml } from './contractTemplateActSignatures';

const BROKEN_USER_HTML = `<div class="signTableActRight"><table class="signTableActLayout" data-contract-signatures-handwritten-customer="1"><tbody><tr><td class="signTableActLayoutSpacer"><table class="signTable signTableActHandwritten" data-contract-signatures-handwritten-customer="1"><tbody><tr><td>Исполнитель</td><td>Заказчик</td></tr>
<tr><td>_________________/{{executor.directorName|plain}}</td><td><p style="margin: 0;">_________________/</p><p class="contractSignFioLine"><br></p></td></tr>
<tr class="signTableDateRow"><td></td><td>«____» ________________ 20__ г.</td></tr></tbody></table><br></td><td class="signTableActLayoutBody"><br></td></tr></tbody></table></div>`;

const MIXED_SIGN_ROW_HTML = `<table class="signTable signTableActHandwritten" data-contract-signatures-handwritten-customer="1"><tr><td>Исполнитель</td><td>Заказчик</td></tr>
<tr><td>_________________/{{executor.directorName|plain}}</td><td><span class="contractSignCustomerSlash"><span class="contractSignSignatureLine"></span>/<span class="contractSignFioLine"></span></span></td></tr>
<tr class="signTableDateRow"><td></td><td>«____» ________________ 20__ г.</td></tr></table>`;

describe('normalizeContractActHandwrittenSignaturesInHtml', () => {
  it('aligns executor and customer signature rows to the same slash layout', () => {
    const normalized = normalizeContractActHandwrittenSignaturesInHtml(MIXED_SIGN_ROW_HTML);
    expect(normalized).toContain('contractSignSlashRow');
    expect(normalized).toContain('contractSignNameText');
    expect(normalized).toContain('{{executor.directorName|plain}}');
    expect(normalized).not.toContain('_________________/');
    expect(normalized).not.toContain('contractSignCustomerSlash');
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
