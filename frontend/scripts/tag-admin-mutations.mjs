import fs from 'fs';
import path from 'path';

const markers = [
  '+ Добавить',
  '+ Создать',
  '+ Новый',
  'Добавить ',
  'Создать ',
  'Сохранить',
  'Удалить',
  'Сохранение',
  'Провести',
  'Восстановить',
  'Изменить',
  'Опубликовать',
  'Отправить',
  'Выставить',
  'Новый расчёт',
  'Новый договор',
  'Добавить в журнал',
  'Добавить карточку',
  'Добавить набор',
  'Добавить строку',
  'Сохранить карточку',
  'Сохранить набор',
  'Сохранить расчёт',
  'Сохранить шаблон',
  'Сохранить настройки',
  'Скопировать',
  'В корзину',
];

const skipPatterns = ['aria-label="Закрыть', 'closeButton', 'Отмена', 'Закрыть модальное'];

function walk(dir, files = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, files);
    else if (e.name.endsWith('.tsx')) files.push(p);
  }
  return files;
}

let changed = 0;
for (const file of walk('src/views/admin')) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  let modified = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!markers.some((m) => line.includes(m))) continue;
    if (skipPatterns.some((s) => line.includes(s))) continue;
    for (let j = i; j >= Math.max(0, i - 10); j--) {
      const bl = lines[j];
      if (bl.includes('data-admin-mutation') || bl.includes('data-admin-allow-readonly')) break;
      if (bl.includes('<button') || bl.includes('<Link')) {
        if (!bl.includes('data-admin-mutation')) {
          lines[j] = bl.replace(/<(button|Link)\b/, '<$1 data-admin-mutation');
          modified = true;
        }
        break;
      }
      if (bl.includes('</button>') || bl.includes('</Link>')) break;
    }
  }
  if (modified) {
    fs.writeFileSync(file, lines.join('\n'));
    changed++;
    console.log(file);
  }
}
console.log('Updated', changed, 'files');
