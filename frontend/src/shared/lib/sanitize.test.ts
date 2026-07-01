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

  it('still removes script tags', () => {
    const html = '<p>ok</p><script>alert(1)</script><table><tr><td>x</td></tr></table>';

    expect(sanitizeHtml(html)).not.toContain('<script');
    expect(sanitizeHtml(html)).toContain('<table>');
  });
});
