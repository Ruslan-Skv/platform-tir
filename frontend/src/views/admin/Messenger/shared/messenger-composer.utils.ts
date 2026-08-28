/** Вставляет текст в позицию курсора textarea (или в конец, если курсора нет). */
export function insertTextAtCursor(
  el: HTMLTextAreaElement | null,
  value: string,
  insert: string,
  setValue: (next: string) => void
) {
  if (!el) {
    setValue(value + insert);
    return;
  }
  const start = el.selectionStart ?? value.length;
  const end = el.selectionEnd ?? value.length;
  const next = `${value.slice(0, start)}${insert}${value.slice(end)}`;
  setValue(next);
  requestAnimationFrame(() => {
    el.focus();
    const caret = start + insert.length;
    el.setSelectionRange(caret, caret);
  });
}
