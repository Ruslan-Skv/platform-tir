/**
 * Добавляет блок ПЭП / дистанционного подписания в seed-шаблоны договоров.
 * Запуск: node backend/prisma/scripts/patch-contract-remote-signing.mjs
 *
 * Синхронизировать с frontend/.../contractTemplateRemoteSigningSection.ts
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEED_DIR = path.join(__dirname, '../seed-data');

const PARAGRAPH_STYLE =
  'text-align: justify; text-indent: 1.25cm; margin: 0 0 6pt; line-height: 1.32';

function clauseParagraph(number, html, className = '') {
  const cls = className ? ` class="${className}"` : '';
  return `<p${cls} style="${PARAGRAPH_STYLE}" data-contract-paragraph-spacing="normal">${number} ${html}</p>`;
}

function buildRemoteSigningClauses({ startNumber = 8.4, contractorLabel = 'Исполнитель', className = '' } = {}) {
  const n = (offset) => {
    const major = Math.floor(startNumber);
    const minorStart = Math.round((startNumber - major + Number.EPSILON) * 10);
    return `${major}.${minorStart + offset}.`;
  };

  return [
    clauseParagraph(
      n(0),
      `<strong>Простая электронная подпись (ПЭП)</strong> — подпись Заказчика, формируемая путём открытия персональной ссылки на Сайте https://territory-interior.ru/, ознакомления с Электронными документами, ввода фамилии, имени и отчества (при необходимости — иных идентификационных данных) и одноразового кода подтверждения, переданного ${contractorLabel}ом, а также подтверждения согласия с условиями документов.`,
      className
    ),
    clauseParagraph(
      n(1),
      `<strong>Электронный документ</strong> — документ в электронной форме (в том числе PDF), доступный по ссылке на Сайте и/или направленный по электронной почте либо через мессенджер.`,
      className
    ),
    clauseParagraph(
      n(2),
      `${contractorLabel} вправе направлять Заказчику настоящий Договор, приложения к нему, акты и иные документы по Заказу в виде Электронных документов: по адресу электронной почты {{customer.email|plain}}; через мессенджеры (WhatsApp, Telegram, MAX и иные) по телефону {{customer.phone|plain}}; посредством персональной ссылки на Сайте.`,
      className
    ),
    clauseParagraph(
      n(3),
      'Заказчик обязуется самостоятельно ознакомиться с направленными Электронными документами до их подписания.',
      className
    ),
    clauseParagraph(
      n(4),
      `Подписание настоящего Договора, приложений и актов может осуществляться простой электронной подписью: Заказчик открывает персональную ссылку на Сайте, просматривает документы, вводит ФИО и одноразовый код подтверждения, полученный от ${contractorLabel}а, и подтверждает согласие с условиями документов в представленном виде.`,
      className
    ),
    clauseParagraph(
      n(5),
      `Совершение действий, указанных в предыдущем пункте, признаётся подписанием соответствующих Электронных документов Заказчиком и выражением его воли заключить (изменить) обязательства на условиях этих документов. Моментом подписания считается успешное подтверждение на Сайте. ${contractorLabel} вправе фиксировать в информационной системе дату и время подписания, ФИО подписанта и состав документов.`,
      className
    ),
    clauseParagraph(
      n(6),
      `Персональная ссылка и одноразовый код могут быть ограничены сроком действия. ${contractorLabel} вправе отозвать ссылку до момента подписания. При истечении срока или отзыве ссылки подписание по ней невозможно.`,
      className
    ),
    clauseParagraph(
      n(7),
      'Отказ Заказчика от подписания через Сайт (в том числе с указанием причины) не исключает последующего подписания на бумажном носителе либо иным согласованным способом.',
      className
    ),
    clauseParagraph(
      n(8),
      'Обработка персональных данных (в том числе телефона и адреса электронной почты) для направления ссылки, кода и документов осуществляется в соответствии с Политикой обработки персональных данных, размещённой на Сайте.',
      className
    ),
  ].join('');
}

function messengerClause(number, className = '') {
  return clauseParagraph(
    `${number}`,
    'Переписка в мессенджерах (WhatsApp, Telegram, MAX и иные) по номерам телефонов, указанным в договоре, а также направление Электронных документов и одноразового кода подтверждения указанными способами имеют юридическую силу для уведомлений, согласований и подписания в порядке настоящего раздела.',
    className
  );
}

const PEP_MARKER = 'Простая электронная подпись (ПЭП)';

function patchCeilings(html) {
  if (html.includes(PEP_MARKER)) return html;

  const oldMessenger =
    /  <p style="text-align: justify; text-indent: 1\.25cm; margin: 0 0 6pt; line-height: 1\.32" data-contract-paragraph-spacing="normal">\s*8\.3\. Переписка[\s\S]*?<\/p>\s*\n\s*\n  <h2 style="text-align: center; font-size: 12pt; margin: 11pt 0 5pt; line-height: 1\.32" data-contract-paragraph-spacing="normal">9\. ПРИЛОЖЕНИЯ/;

  const replacement = `  ${messengerClause('8.3.')}\n  ${buildRemoteSigningClauses({ startNumber: 8.4 })}\n\n  <h2 style="text-align: center; font-size: 12pt; margin: 11pt 0 5pt; line-height: 1.32" data-contract-paragraph-spacing="normal">9. ПРИЛОЖЕНИЯ`;

  if (!oldMessenger.test(html)) throw new Error('ceilings messenger block not found');
  return html.replace(oldMessenger, replacement);
}

function patchDoors(html) {
  if (html.includes(PEP_MARKER)) return html;

  const old8_1 =
    /<p class="ds-markdown-paragraph" data-contract-paragraph-spacing="normal" style="text-align: justify; text-indent: 1\.25cm; margin: 0 0 6pt; line-height: 1\.32">8\.1\. Переписка[\s\S]*?<\/p>/;

  html = html.replace(old8_1, messengerClause('8.1.', 'ds-markdown-paragraph'));

  const marker =
    '<p class="ds-markdown-paragraph" data-contract-paragraph-spacing="normal" style="text-align: center; margin: 0 0 6pt; line-height: 1.32"><b>9. ПРИЛОЖЕНИЯ</b></p>';
  const idx = html.indexOf(marker);
  if (idx < 0) throw new Error('doors section 9 marker not found');

  const pepBlock = buildRemoteSigningClauses({
    startNumber: 8.3,
    className: 'ds-markdown-paragraph',
  });
  return html.slice(0, idx) + pepBlock + html.slice(idx);
}

function patchWindowsOrBlinds(html) {
  if (html.includes(PEP_MARKER)) return html;

  const start = html.indexOf('8.3. Стороны признают юридическую силу переписки');
  if (start < 0) throw new Error('windows/blinds 8.3 block not found');
  const end = html.indexOf('</p>', start);
  if (end < 0) throw new Error('windows/blinds 8.3 closing tag not found');

  html =
    html.slice(0, start) +
    messengerClause('8.3.', 'ds-markdown-paragraph') +
    html.slice(end + 4);

  const markers = [
    '<p class="ds-markdown-paragraph" style="text-align: center; text-indent: 1.25cm; margin: 0 0 6pt; line-height: 1.32" data-contract-paragraph-spacing="normal"><b style="text-indent: 1.25cm">9. ПРИЛОЖЕНИЯ</b></p>',
    '<p class="ds-markdown-paragraph" data-contract-paragraph-spacing="normal" style="text-align: center; margin: 0 0 6pt; line-height: 1.32"><b>9. ПРИЛОЖЕНИЯ</b></p>',
  ];
  const marker = markers.find((m) => html.includes(m));
  if (!marker) throw new Error('windows/blinds section 9 marker not found');
  const idx = html.indexOf(marker);

  const pepBlock = buildRemoteSigningClauses({
    startNumber: 8.4,
    className: 'ds-markdown-paragraph',
  });
  return html.slice(0, idx) + pepBlock + html.slice(idx);
}

function patchRepair(html) {
  if (html.includes(PEP_MARKER)) return html;

  const marker =
    '<div style="text-align: center"><span><strong>8. ПРИЛОЖЕНИЯ</strong></span></div>';
  const idx = html.indexOf(marker);
  if (idx < 0) throw new Error('repair appendices marker not found');

  const inlineClauses = [
    ['7.4', 'Переписка в мессенджерах (WhatsApp, Telegram, MAX и иные) по номерам телефонов, указанным в договоре, а также направление Электронных документов и одноразового кода подтверждения указанными способами имеют юридическую силу для уведомлений, согласований и подписания в порядке настоящего раздела.'],
    ['7.5', '<strong>Простая электронная подпись (ПЭП)</strong> — подпись Заказчика, формируемая путём открытия персональной ссылки на Сайте https://territory-interior.ru/, ознакомления с Электронными документами, ввода фамилии, имени и отчества (при необходимости — иных идентификационных данных) и одноразового кода подтверждения, переданного Подрядчиком, а также подтверждения согласия с условиями документов.'],
    ['7.6', '<strong>Электронный документ</strong> — документ в электронной форме (в том числе PDF), доступный по ссылке на Сайте и/или направленный по электронной почте либо через мессенджер.'],
    ['7.7', 'Подрядчик вправе направлять Заказчику настоящий Договор, приложения к нему, акты и иные документы по Заказу в виде Электронных документов: по адресу электронной почты {{customer.email}}; через мессенджеры (WhatsApp, Telegram, MAX и иные) по телефону {{customer.phone}}; посредством персональной ссылки на Сайте https://territory-interior.ru/.'],
    ['7.8', 'Заказчик обязуется самостоятельно ознакомиться с направленными Электронными документами до их подписания.'],
    ['7.9', 'Подписание настоящего Договора, приложений и актов может осуществляться простой электронной подписью: Заказчик открывает персональную ссылку на Сайте, просматривает документы, вводит ФИО и одноразовый код подтверждения, полученный от Подрядчика, и подтверждает согласие с условиями документов в представленном виде.'],
    ['7.10', 'Совершение действий, указанных в п. 7.9, признаётся подписанием соответствующих Электронных документов Заказчиком. Моментом подписания считается успешное подтверждение на Сайте. Подрядчик вправе фиксировать дату и время подписания, ФИО подписанта и состав документов.'],
    ['7.11', 'Персональная ссылка и одноразовый код могут быть ограничены сроком действия. Подрядчик вправе отозвать ссылку до момента подписания.'],
    ['7.12', 'Отказ Заказчика от подписания через Сайт не исключает последующего подписания на бумажном носителе либо иным согласованным способом.'],
    ['7.13', 'Акт начала работ (Приложение № 2) может подписываться на бумажном носителе либо простой электронной подписью в порядке п. 7.5–7.12, если Акт направлен Заказчику как Электронный документ.'],
    ['7.14', 'Обработка персональных данных для направления ссылки, кода и документов осуществляется в соответствии с Политикой обработки персональных данных, размещённой на Сайте.'],
  ]
    .map(
      ([num, text]) =>
        `<br><br><span style="font-weight: bold">${num}.</span> ${text}`
    )
    .join('');

  html = html.slice(0, idx) + inlineClauses + html.slice(idx);

  const old343 =
    /2\) посредством отправки сообщений на телефонный номер Заказчика \(или мессенджеры привязанные к этому телефонному номеру\): \{\{customer\.phone\}\}; 3\) через на электронную почту: \{\{customer\.email\}\}\./;
  html = html.replace(
    old343,
    '2) посредством отправки сообщений на телефонный номер Заказчика (или мессенджеры WhatsApp, Telegram, MAX и иные, привязанные к этому телефонному номеру): {{customer.phone}}; 3) через электронную почту: {{customer.email}}; 4) посредством персональной ссылки на Сайте https://territory-interior.ru/ (простая электронная подпись — п. 7.5–7.12).'
  );

  return html;
}

const PATCHERS = {
  ceilings: patchCeilings,
  doors: patchDoors,
  windows: patchWindowsOrBlinds,
  blinds: patchWindowsOrBlinds,
  repair: patchRepair,
};

for (const kind of Object.keys(PATCHERS)) {
  const filePath = path.join(SEED_DIR, `${kind}-library-templates.seed.json`);
  const json = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const contract = json.items.find((item) => item.tabId === 'contract');
  if (!contract) {
    console.warn(`skip ${kind}: no contract tab`);
    continue;
  }
  const before = contract.html.length;
  contract.html = PATCHERS[kind](contract.html);
  fs.writeFileSync(filePath, `${JSON.stringify(json, null, 2)}\n`, 'utf8');
  console.log(`patched ${kind}: ${before} -> ${contract.html.length} chars`);
}

console.log('done');
