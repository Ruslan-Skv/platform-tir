/**
 * @jest-environment jsdom
 */
import {
  blockquoteHasMeaningfulText,
  handleNoteBlockquoteBackspaceOrDelete,
  removeEmptyNoteBlockquotesInHtml,
  removeNoteBlockquoteAtSelection,
} from './contractTemplateNoteBlock';

describe('contractTemplateNoteBlock', () => {
  it('detects empty blockquote with only br', () => {
    const bq = document.createElement('blockquote');
    bq.innerHTML = '<p><br></p>';
    expect(blockquoteHasMeaningfulText(bq)).toBe(false);
  });

  it('removes empty blockquote from html', () => {
    const html =
      '<p>До</p><blockquote style="border-left: 3px solid #000"><p><br></p></blockquote><p>После</p>';
    const out = removeEmptyNoteBlockquotesInHtml(html);
    expect(out).not.toContain('<blockquote');
    expect(out).toContain('До');
    expect(out).toContain('После');
  });

  it('handleNoteBlockquoteBackspaceOrDelete removes empty blockquote', () => {
    document.body.innerHTML = `<div id="editor"><blockquote><p><br></p></blockquote></div>`;
    const editor = document.getElementById('editor') as HTMLElement;
    const p = editor.querySelector('p') as HTMLParagraphElement;
    const range = document.createRange();
    range.setStart(p, 0);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    expect(handleNoteBlockquoteBackspaceOrDelete(editor)).toBe(true);
    expect(editor.querySelector('blockquote')).toBeNull();
  });

  it('removeNoteBlockquoteAtSelection unwraps blockquote with content', () => {
    document.body.innerHTML = `<div id="editor"><blockquote><p>Текст</p></blockquote></div>`;
    const editor = document.getElementById('editor') as HTMLElement;
    const p = editor.querySelector('p') as HTMLParagraphElement;
    const range = document.createRange();
    range.selectNodeContents(p);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    expect(removeNoteBlockquoteAtSelection(editor)).toBe(true);
    expect(editor.querySelector('blockquote')).toBeNull();
    expect(editor.textContent).toContain('Текст');
  });
});
