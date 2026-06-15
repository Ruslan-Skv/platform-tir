const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../frontend/public/quiz/defaults');
fs.mkdirSync(dir, { recursive: true });

const items = {
  kitchen: 'Кухня',
  wardrobe: 'Шкаф',
  dressing_room: 'Гардеробная',
  bedroom: 'Спальня',
  other: 'Другое',
  straight: 'Прямая',
  corner: 'Угловая',
  u_shape: 'П-образная',
  island: 'С островом',
  mdf_film: 'МДФ',
  plastic: 'Пластик',
  enamel: 'Эмаль',
  solid_wood: 'Массив',
  undecided: '?',
  urgent: 'Срочно',
  this_month: 'Месяц',
  next_month: 'След.',
  two_months: '2 мес.',
  telegram: 'Telegram',
  phone: 'Телефон',
  max: 'MAX',
};

for (const [key, label] of Object.entries(items)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 120"><rect width="160" height="120" rx="10" fill="#2a2720"/><rect x="20" y="22" width="120" height="58" rx="6" fill="none" stroke="#c9a227" stroke-width="3"/><text x="80" y="100" text-anchor="middle" fill="#e8d5a3" font-size="13" font-family="system-ui,sans-serif">${label}</text></svg>`;
  fs.writeFileSync(path.join(dir, `${key}.svg`), svg);
}

console.log(`Generated ${Object.keys(items).length} quiz default images`);
