/**
 * @jest-environment jsdom
 */
import { describe, expect, it } from '@jest/globals';

import { sanitizeHtml } from './sanitize';

describe('sanitizeHtml', () => {
  it('preserves table markup from TipTap editor', () => {
    const html =
      '<p>Вводный абзац</p><table><tbody><tr><th>Колонка A</th><th>Колонка B</th></tr><tr><td>1</td><td>2</td></tr></tbody></table>';

    const sanitized = sanitizeHtml(html);

    expect(sanitized).toContain('<table>');
    expect(sanitized).toContain('<tbody>');
    expect(sanitized).toContain('<tr>');
    expect(sanitized).toContain('<th>Колонка A</th>');
    expect(sanitized).toContain('<td>1</td>');
  });

  it('preserves TipTap v3 table wrapper, colgroup and width attrs', () => {
    const html =
      '<div class="tableWrapper"><table style="min-width: 175px"><colgroup><col colwidth="87"><col colwidth="88"></colgroup><tbody><tr><th>Параметр</th><th>Значение</th></tr><tr><td colspan="2">Итого</td></tr></tbody></table></div>';

    const sanitized = sanitizeHtml(html);

    expect(sanitized).toContain('tableWrapper');
    expect(sanitized).toContain('<colgroup>');
    expect(sanitized).toContain('colwidth="87"');
    expect(sanitized).toContain('colspan="2"');
    expect(sanitized).toContain('min-width: 175px');
  });

  it('still removes script tags', () => {
    const html = '<p>ok</p><script>alert(1)</script><table><tr><td>x</td></tr></table>';

    expect(sanitizeHtml(html)).not.toContain('<script');
    expect(sanitizeHtml(html)).toContain('<table>');
  });
});
