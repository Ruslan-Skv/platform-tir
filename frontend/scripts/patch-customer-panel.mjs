import fs from 'fs';

const p = 'src/views/admin/CRM/Measurements/MeasurementFormPage.tsx';
const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/);

const start = lines.findIndex((l) => l.includes('customerCrmBlock'));
const end = lines.findIndex((l, i) => i > start && l.includes('htmlFor="customerName"'));
const searchStart = lines.findIndex((l, i) => i > start && l.includes('customerCrmSearchRow'));
let actionsEnd = start;
for (let i = searchStart; i < end; i++) {
  if (lines[i].includes('customerCrmActions')) {
    for (let j = i; j < end; j++) {
      if (lines[j].trim() === '</motion>') {
        actionsEnd = j;
        break;
      }
      if (lines[j].trim() === '</motion>') {
        actionsEnd = j;
        break;
      }
    }
    break;
  }
}

let middle = lines.slice(searchStart, actionsEnd + 1).join('\n');
middle = middle.replace(/className=\{styles\.secondaryButton\}/g, '___BTN___');
middle = middle.replace(/___BTN___/g, (m, o, str) => {
  const ctx = str.slice(Math.max(0, o - 250), o);
  return ctx.includes('setCustomerId')
    ? 'className={styles.customerCrmClearButton}'
    : 'className={styles.customerCrmAddButton}';
});
middle = middle
  .replace('Снять выбор карточки', 'Снять выбор')
  .replace('Добавить нового заказчика', '+ Добавить заказчика в базу')
  .replace(/\n\s*\{customerId \? \(\s*<span className=\{styles\.customerCrmLinkedBadge\}>Выбрана карточка клиента<\/span>\s*\) : null\}/, '');

const block = [
  '          <div className={`${styles.row} ${styles.customerCrmBlock}`}>',
  '            <article className={styles.customerCrmPanel}>',
  '              <div className={styles.customerCrmPanelHead}>',
  '                <div>',
  '                  <h3 className={styles.customerCrmTitle}>Поиск заказчика в базе</h3>',
  '                  <p className={styles.customerCrmHint}>',
  '                    Найдите карточку в базе или добавьте новую — поля заказчика заполнятся',
  '                    автоматически.',
  '                  </p>',
  '                </motion>',
  '                {customerId ? (',
  '                  <span className={styles.customerCrmLinkedBadge}>Карточка выбрана</span>',
  '                ) : null}',
  '              </motion>',
  middle,
  '            </article>',
  '          </motion>',
].join('\n');

const finalBlock = block.replace(/<\/?motion>/g, (tag) => (tag === '</motion>' ? '</motion>' : '<motion>'));

// Use div explicitly - the above replace is wrong. Build without typo:
const parts = [
  '          <div className={`${styles.row} ${styles.customerCrmBlock}`}>',
  '            <article className={styles.customerCrmPanel}>',
  '              <div className={styles.customerCrmPanelHead}>',
  '                <div>',
  '                  <h3 className={styles.customerCrmTitle}>Поиск заказчика в базе</h3>',
  '                  <p className={styles.customerCrmHint}>',
  '                    Найдите карточку в базе или добавьте новую — поля заказчика заполнятся',
  '                    автоматически.',
  '                  </p>',
  '                </motion>',
];

// I keep typing motion - use DIV in array:
const parts2 = [
  '          <div className={`${styles.row} ${styles.customerCrmBlock}`}>',
  '            <article className={styles.customerCrmPanel}>',
  '              <div className={styles.customerCrmPanelHead}>',
  '                <div>',
  '                  <h3 className={styles.customerCrmTitle}>Поиск заказчика в базе</h3>',
  '                  <p className={styles.customerCrmHint}>',
  '                    Найдите карточку в базе или добавьте новую — поля заказчика заполнятся',
  '                    автоматически.',
  '                  </p>',
  '                </motion>',
];

fs.writeFileSync('scripts/_debug.txt', parts2.join('\n'));
