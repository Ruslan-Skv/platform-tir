/**
 * Минимальный конвертер RTF → HTML для превью прикреплённых файлов спецификаций
 * (Word RTF: текст, таблицы \cell/\row, картинки \pict\pngblip/\jpegblip в hex).
 * Не претендует на полный стандарт — покрывает файлы, которые выгружает VEKA и Word.
 */

const SKIP_DESTINATIONS = new Set([
  'fonttbl',
  'colortbl',
  'stylesheet',
  'listtable',
  'listoverridetable',
  'list',
  'listlevel',
  'listtext',
  'info',
  'generator',
  'themedata',
  'colorschememapping',
  'latentstyles',
  'datastore',
  'rsidtbl',
  'mmathPr',
  'wgrffmtfilter',
  'fldinst',
  'nonshppict',
  'object',
  'objdata',
  'result',
  'pntext',
  'pntxta',
  'pntxtb',
  'shp',
  'shpinst',
  'shptxt',
  'header',
  'footer',
  'headerl',
  'headerr',
  'headerf',
  'footerl',
  'footerr',
  'footerf',
  'ftnsep',
  'ftnsepc',
  'ftnncn',
  'aftnsep',
  'aftnsepc',
  'aftnncn',
]);

/** Группы, содержимое которых обрабатывается как обычный текст документа. */
const TRANSPARENT_DESTINATIONS = new Set(['shppict', 'field', 'fldrslt']);

const SPECIAL_TEXT: Record<string, string> = {
  par: '\n',
  line: '\n',
  tab: '\t',
  emdash: '—',
  endash: '–',
  lquote: '«',
  rquote: '»',
  ldblquote: '“',
  rdblquote: '”',
  bullet: '•',
  '~': ' ',
  emsp: ' ',
  enspace: ' ',
};

const cp1251 = typeof TextDecoder !== 'undefined' ? new TextDecoder('windows-1251') : null;

function decodeCp1251(byte: number): string {
  if (cp1251) {
    try {
      return cp1251.decode(new Uint8Array([byte]));
    } catch {
      /* ниже — ручной фолбэк */
    }
  }
  if (byte < 0x80) return String.fromCharCode(byte);
  if (byte >= 0xc0 && byte <= 0xff) return String.fromCharCode(0x0410 + (byte - 0xc0));
  if (byte === 0xa8) return 'Ё';
  if (byte === 0xb8) return 'ё';
  if (byte >= 0xa0 && byte <= 0xbf) return String.fromCharCode(byte);
  return '';
}

function escapeHtmlText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

type Frame = {
  skip: boolean;
  dest: string | null;
  firstToken: boolean;
  ucSkip: number;
  skipChars: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  openedBold: boolean;
  openedItalic: boolean;
  openedUnderline: boolean;
  intbl: boolean;
  pict: { blip: string | null; hex: string; widthPx: number; heightPx: number } | null;
};

function newFrame(parent: Frame | null): Frame {
  return {
    skip: parent?.skip ?? false,
    dest: null,
    firstToken: true,
    ucSkip: parent?.ucSkip ?? 1,
    skipChars: 0,
    bold: parent?.bold ?? false,
    italic: parent?.italic ?? false,
    underline: parent?.underline ?? false,
    openedBold: false,
    openedItalic: false,
    openedUnderline: false,
    intbl: parent?.intbl ?? false,
    pict: null,
  };
}

function hexToDataUrl(hex: string, blip: string): string {
  const clean = hex.replace(/[^0-9a-fA-F]/g, '');
  if (!clean) return '';
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  const mime = blip === 'jpeg' ? 'image/jpeg' : 'image/png';
  return `data:${mime};base64,${btoa(binary)}`;
}

export function rtfToHtml(rtf: string): string {
  const out: string[] = [];
  let paraOpen = false;
  let inTable = false;
  let inRow = false;
  let inCell = false;

  const stack: Frame[] = [newFrame(null)];
  const top = () => stack[stack.length - 1]!;
  // Инлайн-теги держим глобально и всегда закрываем на границе ячейки/абзаца,
  // иначе \b, открытый в начале строки RTF, даёт невалидную разметку (<b><tr>…).
  let boldOn = false;
  let italicOn = false;
  let underlineOn = false;
  const closeInlineTags = () => {
    if (underlineOn) {
      out.push('</u>');
      underlineOn = false;
    }
    if (italicOn) {
      out.push('</i>');
      italicOn = false;
    }
    if (boldOn) {
      out.push('</b>');
      boldOn = false;
    }
  };

  const openPara = () => {
    if (!inCell && !inTable && !paraOpen) {
      out.push('<p>');
      paraOpen = true;
    }
  };
  const closePara = () => {
    closeInlineTags();
    if (paraOpen) {
      out.push('</p>');
      paraOpen = false;
    }
  };
  const ensureCell = () => {
    if (!inTable) {
      closePara();
      out.push('<table><tbody>');
      inTable = true;
    }
    if (!inRow) {
      out.push('<tr>');
      inRow = true;
    }
    if (!inCell) {
      out.push('<td>');
      inCell = true;
    }
  };
  const closeCell = () => {
    closeInlineTags();
    if (inCell) {
      out.push('</td>');
      inCell = false;
    }
  };
  const closeRow = () => {
    closeCell();
    if (inRow) {
      out.push('</tr>');
      inRow = false;
    }
  };
  const closeTable = () => {
    closeRow();
    if (inTable) {
      out.push('</tbody></table>');
      inTable = false;
    }
  };

  const writeText = (raw: string) => {
    if (!raw) return;
    const frame = top();
    if (frame.skip || frame.dest === 'pict') {
      if (frame.dest === 'pict' && frame.pict) {
        frame.pict.hex += raw;
      }
      return;
    }
    if (frame.intbl) {
      ensureCell();
    } else {
      closeTable();
      openPara();
    }
    out.push(escapeHtmlText(raw));
  };

  const handleControl = (word: string, param: number | null, starred: boolean) => {
    const frame = top();

    // Первая команда группы определяет назначение группы.
    if (frame.firstToken) {
      frame.firstToken = false;
      if (word === 'pict') {
        frame.dest = 'pict';
        frame.pict = { blip: null, hex: '', widthPx: 0, heightPx: 0 };
        return;
      }
      if (SKIP_DESTINATIONS.has(word) || (starred && !TRANSPARENT_DESTINATIONS.has(word))) {
        frame.skip = true;
        return;
      }
      if (word !== 'rtf' && word !== 'ansi' && word !== 'mac' && word !== 'pc' && word !== 'pca') {
        frame.dest = word;
      }
    }
    if (frame.skip) return;

    if (frame.dest === 'pict' && frame.pict) {
      if (word === 'pngblip') frame.pict.blip = 'png';
      else if (word === 'jpegblip') frame.pict.blip = 'jpeg';
      else if (word === 'picw' && param != null) frame.pict.widthPx = param;
      else if (word === 'pich' && param != null) frame.pict.heightPx = param;
      return;
    }

    switch (word) {
      case 'uc':
        if (param != null) frame.ucSkip = Math.max(0, Math.min(10, param));
        return;
      case 'u': {
        if (param == null) return;
        if (frame.skipChars > 0) return;
        const code = param < 0 ? param + 65536 : param;
        frame.skipChars = frame.ucSkip;
        if (code === 10 || code === 13) {
          writeText('\n');
        } else {
          writeText(String.fromCharCode(code));
        }
        return;
      }
      case 'b':
        if (param === 0) {
          if (boldOn) {
            out.push('</b>');
            boldOn = false;
          }
          frame.bold = false;
        } else if (!boldOn) {
          if (frame.intbl) ensureCell();
          else {
            closeTable();
            openPara();
          }
          out.push('<b>');
          boldOn = true;
          frame.bold = true;
          frame.openedBold = true;
        }
        return;
      case 'i':
        if (param === 0) {
          if (italicOn) {
            out.push('</i>');
            italicOn = false;
          }
          frame.italic = false;
        } else if (!italicOn) {
          if (frame.intbl) ensureCell();
          else {
            closeTable();
            openPara();
          }
          out.push('<i>');
          italicOn = true;
          frame.italic = true;
          frame.openedItalic = true;
        }
        return;
      case 'ul':
        if (param === 0) {
          if (underlineOn) {
            out.push('</u>');
            underlineOn = false;
          }
          frame.underline = false;
        } else if (!underlineOn) {
          if (frame.intbl) ensureCell();
          else {
            closeTable();
            openPara();
          }
          out.push('<u>');
          underlineOn = true;
          frame.underline = true;
          frame.openedUnderline = true;
        }
        return;
      case 'pard':
      case 'plain': {
        if (boldOn) {
          out.push('</b>');
          boldOn = false;
        }
        if (italicOn) {
          out.push('</i>');
          italicOn = false;
        }
        if (underlineOn) {
          out.push('</u>');
          underlineOn = false;
        }
        frame.bold = false;
        frame.italic = false;
        frame.underline = false;
        frame.openedBold = false;
        frame.openedItalic = false;
        frame.openedUnderline = false;
        if (word === 'pard') frame.intbl = false;
        return;
      }
      case 'intbl':
        frame.intbl = true;
        return;
      case 'cell':
        if (frame.intbl || inCell) {
          closeCell();
        }
        return;
      case 'row':
      case 'nestrow':
        closeRow();
        return;
      case 'par':
        if (frame.intbl && inCell) {
          out.push('<br>');
        } else if (inCell) {
          out.push('<br>');
        } else {
          closeTable();
          closePara();
        }
        return;
      default: {
        const special = SPECIAL_TEXT[word];
        if (special === '\n') {
          if (inCell) out.push('<br>');
          else {
            closeTable();
            closePara();
          }
        } else if (special === '\t') {
          writeText('\u00a0\u00a0\u00a0\u00a0');
        } else if (special != null && word !== 'par') {
          writeText(special);
        }
        return;
      }
    }
  };

  const iMax = rtf.length;
  let i = 0;
  let starredNext = false;
  // Пропускаем строку {\rtf1 ... — первый токен корневой группы.
  while (i < iMax) {
    const ch = rtf[i]!;
    if (ch === '{') {
      stack.push(newFrame(top()));
      i++;
    } else if (ch === '}') {
      const frame = stack.pop();
      if (frame?.pict && frame.pict.blip) {
        const dataUrl = hexToDataUrl(frame.pict.hex, frame.pict.blip);
        if (dataUrl) {
          if (frame.intbl && inCell) {
            out.push(`<img src="${dataUrl}" alt="">`);
          } else {
            closeInlineTags();
            closeTable();
            closePara();
            out.push(`<p class="rtfImageParagraph"><img src="${dataUrl}" alt=""></p>`);
          }
        }
      }
      if (frame?.openedBold && boldOn) {
        out.push('</b>');
        boldOn = false;
      }
      if (frame?.openedItalic && italicOn) {
        out.push('</i>');
        italicOn = false;
      }
      if (frame?.openedUnderline && underlineOn) {
        out.push('</u>');
        underlineOn = false;
      }
      if (stack.length === 0) break;
      i++;
    } else if (ch === '\\') {
      i++;
      if (i >= iMax) break;
      const next = rtf[i]!;
      if (next === '\\' || next === '{' || next === '}') {
        writeText(next);
        i++;
      } else if (next === "'") {
        const hex = rtf.slice(i + 1, i + 3);
        i += 3;
        const frame = top();
        if (frame.skipChars > 0) {
          frame.skipChars -= 1;
          continue;
        }
        const byte = parseInt(hex, 16);
        if (Number.isFinite(byte)) writeText(decodeCp1251(byte));
      } else if (next === '*') {
        i++;
        starredNext = true;
      } else if (/[a-zA-Z]/.test(next)) {
        let word = '';
        while (i < iMax && /[a-zA-Z]/.test(rtf[i]!)) {
          word += rtf[i]!;
          i++;
        }
        let param: number | null = null;
        if (i < iMax && (rtf[i] === '-' || /[0-9]/.test(rtf[i]!))) {
          let num = '';
          if (rtf[i] === '-') {
            num += '-';
            i++;
          }
          while (i < iMax && /[0-9]/.test(rtf[i]!)) {
            num += rtf[i]!;
            i++;
          }
          param = num === '-' || num === '' ? null : parseInt(num, 10);
        }
        if (rtf[i] === ' ') i++;
        const starred = starredNext;
        starredNext = false;
        handleControl(word, param, starred);
      } else if (next === '~') {
        writeText('\u00a0');
        i++;
      } else {
        // Неизвестный одиночный символ-команда (\{, \}, \\ обработаны выше).
        i++;
      }
    } else if (ch === '\r' || ch === '\n' || ch === '\0') {
      // Переносы строк исходника RTF игнорируются (абзацы — только через \par).
      i++;
    } else {
      const frame = top();
      if (frame.skipChars > 0) {
        frame.skipChars -= 1;
        i++;
        continue;
      }
      writeText(ch);
      i++;
    }
  }

  closeTable();
  closePara();
  return out.join('');
}
