#!/usr/bin/env node
// Утилита для определения chat_id группового чата MAX, в который добавлен бот.
//
// Использование (из папки backend сервера, где лежит .env с MAX_BOT_TOKEN):
//   node scripts/max-group-chat-id.mjs                 — слушать обновления 2 минуты
//   node scripts/max-group-chat-id.mjs --wait 300      — слушать 5 минут
//   node scripts/max-group-chat-id.mjs --test -12345   — отправить тестовое сообщение в чат
//
// Пока скрипт работает, напишите любое сообщение в группу MAX (или упомяните там бота) —
// скрипт выведет chat_id группы. Он отрицательный, например -7000000000012345.

import fs from 'node:fs';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const argsText = process.argv.slice(2).join(' ');
const waitSecondsArg = Number(argsText.match(/--wait\s+(\d+)/)?.[1] ?? 120);
const testChatId = argsText.match(/--test\s+(-?\d+)/)?.[1];

function readEnvVar(name) {
  // В docker-контейнере токен приходит через переменные окружения, локально — через .env
  const fromProcessEnv = process.env[name]?.trim();
  if (fromProcessEnv) return fromProcessEnv;

  const candidates = [
    new URL(`file://${process.cwd().replace(/\\/g, '/')}/.env`),
    new URL('../.env', import.meta.url),
  ];
  for (const envUrl of candidates) {
    let content;
    try {
      content = fs.readFileSync(fileURLToPath(envUrl), 'utf8');
    } catch {
      continue;
    }
    const match = content.match(new RegExp(`^\\s*${name}\\s*=\\s*(.*)$`, 'm'));
    if (match) return match[1].trim().replace(/^["']|["']$/g, '');
  }
  return '';
}

const token = readEnvVar('MAX_BOT_TOKEN');
const base = (readEnvVar('MAX_API_BASE_URL') || 'https://platform-api2.max.ru').replace(/\/$/, '');

if (!token) {
  console.error('MAX_BOT_TOKEN не найден в .env (искали в текущей папке и рядом со скриптом).');
  console.error('Запустите скрипт на сервере из папки backend: node scripts/max-group-chat-id.mjs');
  process.exit(1);
}

async function api(pathname, params = {}) {
  const url = new URL(`${base}${pathname}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
  const response = await fetch(url, { headers: { Authorization: token } });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`MAX API ${response.status} ${url.pathname}: ${text.slice(0, 300)}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function collectChatIds(node, acc = new Set()) {
  if (Array.isArray(node)) {
    for (const item of node) collectChatIds(item, acc);
    return acc;
  }
  if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      if (key === 'chat_id' && (typeof value === 'number' || typeof value === 'string')) {
        acc.add(String(value));
      } else {
        collectChatIds(value, acc);
      }
    }
  }
  return acc;
}

const knownChatTitles = new Map();

async function describeChatId(chatId) {
  if (knownChatTitles.has(chatId)) return;
  knownChatTitles.set(chatId, null);
  try {
    const chat = await api(`/chats/${chatId}`);
    const title = chat.title ?? chat.name ?? null;
    knownChatTitles.set(chatId, title);
    const label = chat.type ? `, тип: ${chat.type}` : '';
    console.log(`    → chat_id ${chatId} — ${title ? `«${title}»` : 'название недоступно'}${label}`);
  } catch {
    console.log(`    → chat_id ${chatId} (информация о чате недоступна)`);
  }
}

function printUpdate(update) {
  const type = update.update_type ?? 'unknown';
  const inner = update.update ?? {};
  const message = inner.message ?? {};
  const text = message.body?.text ?? '';
  const sender = inner.sender?.name ?? inner.sender?.user_id ?? '';
  const chatIds = [...collectChatIds(update)].sort((a, b) => Number(a) - Number(b));
  console.log(`\n[Обновление] ${type}${sender ? ` от ${sender}` : ''}${text ? `: "${text.slice(0, 80)}"` : ''}`);
  for (const chatId of chatIds) {
    const kind = chatId.startsWith('-') ? 'ГРУППА (id отрицательный)' : 'личный диалог';
    console.log(`    chat_id ${chatId} — ${kind}`);
  }
  return chatIds;
}

if (testChatId) {
  console.log(`Отправка тестового сообщения в чат ${testChatId}...`);
  try {
    await api('/messages', { chat_id: testChatId });
    console.log('Готово: сообщение отправлено. Проверьте, что оно пришло в группу MAX.');
  } catch (error) {
    console.error(`Не удалось отправить: ${error.message}`);
    console.error('Проверьте chat_id (для групп он отрицательный) и что бот состоит в этой группе.');
    process.exit(1);
  }
  process.exit(0);
}

console.log(`Слушаю обновления бота ${Math.round(waitSecondsArg / 60)} мин (до ${new Date(
  Date.now() + waitSecondsArg * 1000,
).toLocaleTimeString('ru-RU')}).`);
console.log('>>> Сейчас напишите любое сообщение в группу MAX, куда добавлен бот. <<<');
console.log('Если сообщения не появятся — упомяните бота через @ в этой группе.');

const foundChatIds = new Set();
const seenUpdates = new Set();
let marker;
let requestFailed = false;

process.on('SIGINT', () => {
  console.log('\nОстановлено.');
  printSummary();
  process.exit(0);
});

function printSummary() {
  if (foundChatIds.size === 0) {
    console.log('\nchat_id групп не найдено.');
    console.log('Возможные причины: сообщение в группу не отправлено, бот не видит сообщения группы');
    console.log('(попробуйте упомянуть его через @) или webhook-подписка перехватывает обновления.');
    return;
  }
  console.log('\n=== ИТОГ: найденные chat_id ===');
  for (const chatId of [...foundChatIds].sort((a, b) => Number(a) - Number(b))) {
    const title = knownChatTitles.get(chatId);
    const kind = chatId.startsWith('-') ? 'ГРУППА' : 'личный диалог';
    console.log(`  ${chatId} — ${kind}${title ? ` «${title}»` : ''}`);
  }
  console.log('\nСкопируйте отрицательный id группы и добавьте его в админке:');
  console.log('/admin/settings/notification-channels → поле «MAX chat ID» (каждый id с новой строки).');
}

const deadline = Date.now() + waitSecondsArg * 1000;
while (Date.now() < deadline) {
  try {
    const params = { timeout: 25, count: 100 };
    if (marker !== undefined) params.marker = marker;
    const data = await api('/updates', params);
    requestFailed = false;
    const updates = data.updates ?? [];
    for (const update of updates) {
      if (update.marker !== undefined) marker = update.marker;
      const key = JSON.stringify(update);
      if (seenUpdates.has(key)) continue;
      seenUpdates.add(key);
      for (const chatId of printUpdate(update)) foundChatIds.add(chatId);
    }
    if (updates.length > 0) {
      await Promise.all([...foundChatIds].map((chatId) => describeChatId(chatId)));
    }
  } catch (error) {
    if (!requestFailed) {
      requestFailed = true;
      console.error(`Ошибка запроса обновлений: ${error.message}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
}

printSummary();
