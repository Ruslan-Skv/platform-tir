import {
  CONTRACT_LEGAL_LIST_CLASS,
  applyContractLegalListInVisualEditor,
  detectSectionNumber,
  isNodeInsideContractLegalList,
} from './contractLegalList';

export type BulletMarkerId = 'disc' | 'circle' | 'square' | 'dash';

export const BULLET_MARKER_OPTIONS: {
  id: BulletMarkerId;
  glyph: string;
  title: string;
  listStyle: string;
  useDashClass?: boolean;
}[] = [
  { id: 'disc', glyph: '•', title: 'Заполненный круг', listStyle: 'disc' },
  { id: 'circle', glyph: '○', title: 'Контурный круг', listStyle: 'circle' },
  { id: 'square', glyph: '■', title: 'Квадрат', listStyle: 'square' },
  { id: 'dash', glyph: '–', title: 'Тире', listStyle: 'none', useDashClass: true },
];

const CONTRACT_TEMPLATE_BULLET_DASH_CLASS = 'contractTemplateBulletDash';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function splitLinesFromText(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function findListContainerForSelection(
  editor: HTMLElement,
  tagName: 'UL' | 'OL'
): HTMLElement | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  let node: Node | null = sel.getRangeAt(0).commonAncestorContainer;
  while (node && node !== editor) {
    if (node instanceof HTMLElement && node.tagName === tagName) return node;
    node = node.parentNode;
  }
  return null;
}

function applyBulletMarkerToUl(ul: HTMLUListElement, marker: BulletMarkerId): void {
  ul.classList.remove(CONTRACT_TEMPLATE_BULLET_DASH_CLASS);
  ul.style.margin = '0 0 8pt 22px';
  ul.style.padding = '0';
  const option = BULLET_MARKER_OPTIONS.find((item) => item.id === marker);
  if (option?.useDashClass) {
    ul.classList.add(CONTRACT_TEMPLATE_BULLET_DASH_CLASS);
    ul.style.listStyleType = 'none';
    return;
  }
  ul.style.listStyleType = option?.listStyle ?? 'disc';
}

function stripContractLegalListAttrsFromOl(ol: HTMLOListElement): void {
  ol.classList.remove(CONTRACT_LEGAL_LIST_CLASS);
  ol.removeAttribute('data-section');
  ol.style.margin = '0 0 8pt 22px';
  ol.style.padding = '0';
  ol.style.listStyleType = 'decimal';
  for (const li of ol.querySelectorAll('li')) {
    li.removeAttribute('data-section');
  }
}

export function buildBulletedListHtml(lines: string[], marker: BulletMarkerId): string {
  const option = BULLET_MARKER_OPTIONS.find((item) => item.id === marker);
  const classAttr = option?.useDashClass ? ` class="${CONTRACT_TEMPLATE_BULLET_DASH_CLASS}"` : '';
  const listStyle = option?.listStyle ?? 'disc';
  const items = (lines.length > 0 ? lines : ['Пункт списка'])
    .map((line) => `  <li>${escapeHtml(line)}</li>`)
    .join('\n');
  return `<ul${classAttr} style="margin: 0 0 8pt 22px; padding: 0; list-style-type: ${listStyle};">\n${items}\n</ul>`;
}

export function buildNumberedListHtml(lines: string[]): string {
  const items = (lines.length > 0 ? lines : ['Пункт 1', 'Пункт 2'])
    .map((line) => `  <li>${escapeHtml(line)}</li>`)
    .join('\n');
  return `<ol style="margin: 0 0 8pt 22px; padding: 0; list-style-type: decimal;">\n${items}\n</ol>`;
}

/** Визуальный конструктор: маркированный список с выбранным маркером. */
export function applyBulletedListInVisualEditor(
  editor: HTMLElement,
  marker: BulletMarkerId
): boolean {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return false;
  const range = sel.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer)) return false;
  if (isNodeInsideContractLegalList(editor, range.commonAncestorContainer)) return false;

  const existingUl = findListContainerForSelection(editor, 'UL');
  if (existingUl instanceof HTMLUListElement) {
    applyBulletMarkerToUl(existingUl, marker);
    return true;
  }

  document.execCommand('insertUnorderedList');
  const ul = findListContainerForSelection(editor, 'UL');
  if (!(ul instanceof HTMLUListElement)) return false;
  applyBulletMarkerToUl(ul, marker);
  return true;
}

/** Визуальный конструктор: обычный нумерованный список 1. 2. 3. (не договорный). */
export function applyNumberedListInVisualEditor(editor: HTMLElement): boolean {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return false;
  const range = sel.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer)) return false;
  if (isNodeInsideContractLegalList(editor, range.commonAncestorContainer)) return false;

  document.execCommand('insertOrderedList');
  const ol = findListContainerForSelection(editor, 'OL');
  if (!(ol instanceof HTMLOListElement)) return false;
  if (ol.classList.contains(CONTRACT_LEGAL_LIST_CLASS)) return false;
  stripContractLegalListAttrsFromOl(ol);
  return true;
}

/** Визуальный конструктор: многоуровневый список договора (1.1, 1.1.1). */
export function applyContractMultilevelListInVisualEditor(editor: HTMLElement): boolean {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return false;
  const range = sel.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer)) return false;
  applyContractLegalListInVisualEditor(editor, 1);
  return true;
}

export function getLinesForListFromHtmlSelection(
  selected: string,
  hasSelection: boolean,
  fallbackLines: string[]
): string[] {
  if (!hasSelection) return fallbackLines;
  const lines = splitLinesFromText(selected.replace(/<[^>]+>/g, '\n'));
  return lines.length > 0 ? lines : fallbackLines;
}

export const LIST_TOOLTIP = {
  bullet: {
    title: 'Маркированный список',
    steps: [
      'Выделите один или несколько абзацев (или поставьте курсор в строку).',
      'Выберите вид маркера в выпадающем списке: •, ○, ■ или тире.',
      'Нажмите кнопку с маркером — строки станут пунктами списка.',
      'Enter — новый пункт; Backspace в пустом пункте — выход из списка.',
      'Повторное нажатие кнопки снимает маркированный список с выделенных пунктов.',
    ],
    note: 'Не используйте для договорных пунктов 1 / 1.1 — для них есть «Многоуровневый список».',
  },
  numbered: {
    title: 'Нумерованный список',
    steps: [
      'Выделите абзацы или поставьте курсор в нужную строку.',
      'Нажмите кнопку — появится список с номерами 1., 2., 3.',
      'Enter — следующий номер; Backspace в пустом пункте — выход из списка.',
      'Повторное нажатие кнопки отключает нумерацию.',
    ],
    note: 'Это обычная нумерация. Для договора (1., 1.1., 1.2.) используйте «Многоуровневый список».',
  },
  multilevel: {
    title: 'Многоуровневый список договора',
    steps: [
      'Выделите текст или поставьте курсор в абзац — нажмите кнопку «1.».',
      'Появятся пункты верхнего уровня: 1., 2., 3.…',
      'Tab (⇥) на пункте — подпункт 1.1, 1.2… под предыдущий пункт (не для раздела 2 — там Shift+Enter).',
      'Enter — следующий пункт того же уровня; Shift+Enter — новый раздел 2., 3.… (не Tab).',
      '⇤ / Backspace в пустом подпункте — поднять уровень или удалить пустой пункт.',
      'Enter в пустом подпункте в конце раздела (после 3.3 → пустой 3.4) — выход из списка в абзац для подписей.',
      'Enter в пустом пункте верхнего уровня — выход в абзац.',
    ],
    note: 'Для глав договора с заголовком H2 «2. …» пункты того списка нумеруются 2.1, 2.2…. Таблицу подписей — после списка.',
  },
  indent: {
    title: 'Увеличить уровень (Tab)',
    steps: [
      'Поставьте курсор в пункт многоуровневого списка договора.',
      'Нажмите кнопку — пункт станет подпунктом (1.1.1), если есть пункт выше.',
    ],
    note: 'Работает только внутри многоуровневого списка договора.',
  },
  outdent: {
    title: 'Уменьшить уровень (Shift+Tab / ⇤)',
    steps: [
      'В подпункте 1.1 — поднимает на уровень пункта 1.2, 1.3…',
      'В пустом подпункте после Enter — удаляет его и возвращает курсор в родительский пункт.',
    ],
    note: 'На пункте с текстом ⇤ не отменяет Enter — используйте пустой новый пункт и ⇤ или Backspace.',
  },
} as const;

export function detectSectionForListHtml(editor: HTMLElement | null): string {
  if (!editor) return '1';
  return detectSectionNumber(editor, null);
}
