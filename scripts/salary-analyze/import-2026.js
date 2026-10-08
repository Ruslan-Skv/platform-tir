/**
 * Импорт договоров из «Новая таблица 2025 (1).xlsx» в salary_contracts за 2026 год.
 * Листы: 19о, 77о, 37о (окна/двери+потолки/жалюзи — по блокам листа) и 19-50/50, 77-50/50, 37-50/50 (ремонт 50/50).
 *
 * Правила отбора: договор попадает в импорт, если хотя бы одна значимая дата
 * (заключение / закрытие / доп. счёт) входит в 2026 год — тогда любой месячный
 * расчёт 2026 года будет полным.
 *
 * Идемпотентность: при наличии договоров в БД скрипт abort (или --force — очистит все).
 * Дубликаты № в рамках офиса получают суффикс ~2, ~3… (в таблице есть повторы).
 */
const { PrismaClient } = require('C:\\Users\\user\\dev\\platform-tir\\backend\\node_modules\\@prisma\\client');
const prisma = new PrismaClient();
const XLSX = require('C:\\Users\\user\\dev\\platform-tir\\frontend\\node_modules\\xlsx');

const FILE = 'C:\\Users\\user\\Desktop\\Новая таблица 2025 (1).xlsx';
const FORCE = process.argv.includes('--force');

const YEAR_FROM = 46023; // 2026-01-01 (serial)
const YEAR_TO = 46387; // 2026-12-31

const stats = {
  imported: 0,
  extraBills: 0,
  skippedNoDates: 0,
  skippedNot2026: 0,
  skippedInvalidDate: 0,
  skippedDsNoDate: 0,
  duplicatesRenamed: 0,
  outOfBlocks: 0,
};

function isoToDate(iso) {
  if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    throw new Error(`isoToDate: некорректная дата ${JSON.stringify(iso)}`);
  }
  return new Date(`${iso}T00:00:00.000Z`);
}
function serialToIso(n) {
  const d = new Date(Math.round((n - 25569) * 86400000));
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}
function isSerialInYear(n) {
  return n >= YEAR_FROM && n <= YEAR_TO;
}
function parseMaybeDate(cell) {
  if (!cell || cell.v === null || cell.v === undefined) return { date: null, any: false };
  if (cell.t === 'e') return { date: null, any: true, invalid: true }; // ячейка-ошибка (#DIV/0! и т.п.)
  if (typeof cell.v === 'number' && Number.isFinite(cell.v)) {
    const iso = serialToIso(cell.v);
    if (iso && saneYear(iso)) return { date: iso, any: true, inYear: isSerialInYear(cell.v) };
    return { date: null, any: true, invalid: true };
  }
  if (typeof cell.v === 'string') {
    const m = cell.v.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (m) {
      const day = +m[1];
      const month = +m[2];
      const year = +m[3];
      const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
      if (month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth && year >= 1900 && year <= 2100) {
        const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return { date: iso, any: true, inYear: year === 2026 };
      }
    }
  }
  return { date: null, any: true, invalid: true };
}
function saneYear(iso) {
  const y = Number(iso.slice(0, 4));
  return Number.isFinite(y) && y >= 1900 && y <= 2100;
}
function num(cell) {
  if (!cell || cell.v === null || cell.v === undefined || cell.v === '') return null;
  const n = typeof cell.v === 'number' ? cell.v : parseFloat(String(cell.v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}
function str(cell) {
  if (!cell || cell.v === null || cell.v === undefined || cell.t === 'e') return null;
  const s = String(cell.v).trim();
  if (!s.length || /^Invalid Date$/.test(s) || /^#(DIV\/0!|VALUE!|REF!|NAME\?|N\/A)$/.test(s)) return null;
  return s;
}
function pct(cell) {
  const n = num(cell);
  // Пустая ячейка = 0% (так работает формула листа: зп × % / %мен), а не «по умолчанию категории»
  return n === null ? 0 : Math.round(n * 100 * 100) / 100;
}
function truthyFlag(cell) {
  if (!cell || cell.v === null || cell.v === undefined || cell.v === '') return false;
  if (typeof cell.v === 'number') return cell.v !== 0;
  return true;
}

/** Сумма кэша числовой колонки листа по строкам (для сверки с расчётом из БД). */
function cachedColSum(ws, col, rows) {
  let sum = 0;
  for (const r of rows) {
    const cell = ws[`${col}${r}`];
    if (cell && typeof cell.v === 'number') sum += cell.v;
  }
  return sum;
}

async function main() {
  const existing = await prisma.salaryContract.count();
  if (existing > 0) {
    if (!FORCE) throw new Error(`В БД уже ${existing} договоров. Запустите с --force для очистки и повторного импорта.`);
    await prisma.salaryContract.deleteMany();
    console.log(`--force: удалено ${existing} договоров`);
  }

  const offices = await prisma.office.findMany();
  const officeByPrefix = new Map(offices.map((o) => [o.prefix, o]));
  const categories = await prisma.salaryCategory.findMany();
  const cat = (code) => {
    const c = categories.find((x) => x.code === code);
    if (!c) throw new Error(`Нет категории ${code}`);
    return c;
  };
  const CAT = {
    DOORS: cat('DOORS_CEILINGS'),
    WINDOWS: cat('WINDOWS'),
    BLINDS: cat('BLINDS'),
    REPAIR_5050: cat('REPAIR_5050'),
  };

  const wb = XLSX.readFile(FILE, { cellFormula: true });

  // Дедупликация № договора внутри офиса
  const numbersSeen = new Map(); // officeId:Set
  const seen = (officeId, numberRaw) => {
    const set = numbersSeen.get(officeId) ?? new Set();
    numbersSeen.set(officeId, set);
    let number = numberRaw;
    let i = 2;
    while (set.has(number)) {
      number = `${numberRaw}~${i++}`;
      stats.duplicatesRenamed++;
    }
    set.add(number);
    return number;
  };

  // -------- 'о' листы --------
  // Блоки категорий: номер строки заголовка блока → диапазон данных берём из SUBTOTAL в ячейке {vsCol}{row}
  const O_SHEETS = [
    {
      name: '19о', prefix: '19', vsCol: 'AQ', mgrCol: 'AO', zamCol: 'AP', blocks: [
        { row: 5, category: CAT.DOORS }, { row: 135, category: CAT.DOORS },
        { row: 278, category: CAT.WINDOWS }, { row: 358, category: CAT.BLINDS },
      ],
      col: { zamPct: 'B', vsPct: 'C', menPct: 'D', zam: 'E', m: 'F', source: 'G', zamName: 'K', menName: 'L', number: 'M', signed: 'N', closed: 'O', customer: 'P', products: 'Q', works: 'S', ds: [['T', 'U'], ['V', 'W'], ['Y', 'Z']] },
    },
    {
      name: '77о', prefix: '77', vsCol: 'AP', mgrCol: 'AN', zamCol: 'AO', blocks: [
        { row: 5, category: CAT.DOORS }, { row: 117, category: CAT.DOORS },
        { row: 224, category: CAT.WINDOWS }, { row: 339, category: CAT.BLINDS },
      ],
      col: { zamPct: 'B', vsPct: 'C', menPct: 'D', zam: 'E', m: 'F', source: 'G', zamName: 'J', menName: 'K', number: 'L', signed: 'M', closed: 'N', customer: 'O', products: 'P', works: 'R', ds: [['S', 'T'], ['U', 'V'], ['X', 'Y']] },
    },
    {
      name: '37о', prefix: '37', vsCol: 'AP', mgrCol: 'AN', zamCol: 'AO', blocks: [
        { row: 5, category: CAT.DOORS }, { row: 305, category: CAT.DOORS },
        { row: 459, category: CAT.WINDOWS }, { row: 580, category: CAT.BLINDS },
      ],
      col: { zamPct: 'B', vsPct: 'C', menPct: 'D', zam: 'E', m: 'F', source: 'G', zamName: 'J', menName: 'K', number: 'L', signed: 'M', closed: 'N', customer: 'O', products: 'P', works: 'R', ds: [['S', 'T'], ['U', 'V'], ['X', 'Y']] },
    },
  ];

  const sheetVerification = []; // для сверки с кэшем листа

  for (const sheet of O_SHEETS) {
    const ws = wb.Sheets[sheet.name];
    const office = officeByPrefix.get(sheet.prefix);
    if (!office) throw new Error(`Нет офиса с префиксом ${sheet.prefix}`);

    // Точные диапазоны данных блоков из формул SUBTOTAL/SUM
    const ranges = sheet.blocks.map((b) => {
      const cell = ws[`${sheet.vsCol}${b.row}`];
      const m = cell?.f?.match(/(?:SUBTOTAL\(9,|SUM\()?[A-Z]+(\d+):[A-Z]+(\d+)/);
      if (!m) throw new Error(`${sheet.name}: нет диапазона у блока ${b.row} (${sheet.vsCol}${b.row})`);
      return { category: b.category, from: +m[1], to: +m[2] };
    });
    console.log(`${sheet.name}: блоки`, ranges.map((r) => `${r.category.code} ${r.from}-${r.to}`).join('; '));

    let sheetImported = 0;
    for (const range of ranges) {
      for (let r = range.from; r <= range.to; r++) {
        const c = sheet.col;
        const numberRaw = str(ws[`${c.number}${r}`]);
        const signed = parseMaybeDate(ws[`${c.signed}${r}`]);
        const closed = parseMaybeDate(ws[`${c.closed}${r}`]);
        if (signed.invalid) stats.skippedInvalidDate++;
        if (closed.invalid) stats.skippedInvalidDate++;

        // Доп. счета
        const extraBills = [];
        let anyDsInYear = false;
        let firstDsIso = null;
        for (const [amountCol, dateCol] of c.ds) {
          const amount = num(ws[`${amountCol}${r}`]);
          const date = parseMaybeDate(ws[`${dateCol}${r}`]);
          if (amount === null && !date.any) continue;
          if (amount === null) continue;
          if (!date.date) {
            stats.skippedDsNoDate++;
            continue;
          }
          if (date.inYear) anyDsInYear = true;
          if (!firstDsIso) firstDsIso = date.date;
          extraBills.push({ amount, date: isoToDate(date.date) });
        }

        const inYear = signed.inYear || closed.inYear || anyDsInYear;
        if (!numberRaw || (!signed.date && !closed.date && extraBills.length === 0)) {
          stats.skippedNoDates++;
          continue;
        }
        if (!inYear) {
          stats.skippedNot2026++;
          continue;
        }

        const products = num(ws[`${c.products}${r}`]) ?? 0;
        const works = num(ws[`${c.works}${r}`]) ?? 0;
        const managerHandled = truthyFlag(ws[`${c.m}${r}`]);
        const surveyorHandled = truthyFlag(ws[`${c.zam}${r}`]);
        // Дата заключения может отсутствовать (как в таблице) — тогда нет доли «при заключении»
        const signedAtIso = signed.date;

        const number = seen(office.id, numberRaw);
        await prisma.salaryContract.create({
          data: {
            officeId: office.id,
            categoryId: range.category.id,
            number,
            signedAt: signedAtIso ? isoToDate(signedAtIso) : null,
            closedAt: closed.date ? isoToDate(closed.date) : null,
            customerName: str(ws[`${c.customer}${r}`]),
            managerName: str(ws[`${c.menName}${r}`]),
            surveyorName: str(ws[`${c.zamName}${r}`]),
            managerHandled,
            surveyorHandled,
            baseAmount: Math.round((products + works) * 100) / 100,
            managerPercentOverride: pct(ws[`${c.menPct}${r}`]),
            surveyorPercentOverride: pct(ws[`${c.zamPct}${r}`]),
            vsPercentOverride: pct(ws[`${c.vsPct}${r}`]),
            brigadierPercentOverride: 0,
            source: str(ws[`${c.source}${r}`]),
            note: `импорт ${sheet.name}, строка ${r}`,
            extraBills: { create: extraBills },
          },
        });
        stats.extraBills += extraBills.length;
        sheetImported++;
        stats.imported++;
      }
    }
    console.log(`${sheet.name}: импортировано ${sheetImported}`);

    // Кэш листа за текущий период (сентябрь 2026): строки всех блоков
    const allRows = ranges.flatMap((r) => {
      const rows = [];
      for (let i = r.from; i <= r.to; i++) rows.push(i);
      return rows;
    });
    sheetVerification.push({
      label: sheet.name, officeId: office.id, ws,
      mgrCol: sheet.mgrCol, zamCol: sheet.zamCol, vsCol: sheet.vsCol,
      rows: allRows, isRepair: false,
    });
  }

  // -------- -50/50 листы --------
  const R_SHEETS = [
    {
      name: '19-5050', prefix: '19', mgrCol: 'AM', brigCol: 'AN', headerRow: 3, dataFrom: 4,
      col: { brPct: 'B', menPct: 'C', m: 'D', br: 'E', source: 'F', vk: 'G', menName: 'H', number: 'I', signed: 'J', closed: 'K', customer: 'L', base: 'M', ds: [['N', 'O'], ['P', 'Q'], ['R', 'S'], ['T', 'U']] },
    },
    {
      name: '77-5050', prefix: '77', mgrCol: 'AH', brigCol: 'AI', headerRow: 3, dataFrom: 4,
      col: { brPct: 'B', menPct: 'C', m: 'D', br: 'E', source: 'F', vk: 'G', menName: 'H', number: 'I', signed: 'J', closed: 'K', customer: 'L', base: 'M', ds: [['N', 'O'], ['P', 'Q'], ['R', 'S']] },
    },
    {
      name: '37-5050', prefix: '37', mgrCol: 'AK', brigCol: 'AL', headerRow: 3, dataFrom: 4,
      col: { brPct: 'B', menPct: 'C', m: 'D', br: 'E', source: 'F', vk: 'G', menName: 'H', number: 'I', signed: 'J', closed: 'K', customer: 'L', base: 'M', ds: [['N', 'O'], ['P', 'Q'], ['R', 'S'], ['T', 'U']] },
    },
  ];

  for (const sheet of R_SHEETS) {
    const ws = wb.Sheets[sheet.name];
    const office = officeByPrefix.get(sheet.prefix);
    if (!office) throw new Error(`Нет офиса с префиксом ${sheet.prefix}`);

    const maxRow = (() => {
      let m = 0;
      for (const addr of Object.keys(ws)) {
        if (addr.startsWith('!')) continue;
        const rr = XLSX.utils.decode_cell(addr).r + 1;
        if (rr > m) m = rr;
      }
      return m;
    })();

    let sheetImported = 0;
    const allRows = [];
    for (let r = sheet.dataFrom; r <= maxRow; r++) {
      const c = sheet.col;
      const numberRaw = str(ws[`${c.number}${r}`]);
      const signed = parseMaybeDate(ws[`${c.signed}${r}`]);
      const closed = parseMaybeDate(ws[`${c.closed}${r}`]);
      if (signed.invalid) stats.skippedInvalidDate++;
      if (closed.invalid) stats.skippedInvalidDate++;

      const extraBills = [];
      let anyDsInYear = false;
      let firstDsIso = null;
      for (const [amountCol, dateCol] of c.ds) {
        const amount = num(ws[`${amountCol}${r}`]);
        const date = parseMaybeDate(ws[`${dateCol}${r}`]);
        if (amount === null) continue;
        if (!date.date) {
          stats.skippedDsNoDate++;
          continue;
        }
        if (date.inYear) anyDsInYear = true;
        if (!firstDsIso) firstDsIso = date.date;
        extraBills.push({ amount, date: isoToDate(date.date) });
      }

      if (!numberRaw || numberRaw.toLowerCase().includes('договор')) continue; // повторяющиеся шапки
      if (!signed.date && !closed.date && extraBills.length === 0) {
        if (numberRaw) stats.skippedNoDates++;
        continue;
      }
      if (!(signed.inYear || closed.inYear || anyDsInYear)) {
        stats.skippedNot2026++;
        continue;
      }

      const vk = str(ws[`${c.vk}${r}`]);
      const signedAtIso = signed.date;
      const number = seen(office.id, numberRaw);
      await prisma.salaryContract.create({
        data: {
          officeId: office.id,
          categoryId: CAT.REPAIR_5050.id,
          number,
          signedAt: signedAtIso ? isoToDate(signedAtIso) : null,
          closedAt: closed.date ? isoToDate(closed.date) : null,
          customerName: str(ws[`${c.customer}${r}`]),
          managerName: str(ws[`${c.menName}${r}`]),
          surveyorName: null,
          managerHandled: truthyFlag(ws[`${c.m}${r}`]),
          surveyorHandled: truthyFlag(ws[`${c.br}${r}`]), // колонка «бр»: бригада известна
          baseAmount: num(ws[`${c.base}${r}`]) ?? 0,
          managerPercentOverride: pct(ws[`${c.menPct}${r}`]),
          surveyorPercentOverride: 0,
          vsPercentOverride: 0,
          brigadierPercentOverride: pct(ws[`${c.brPct}${r}`]),
          source: str(ws[`${c.source}${r}`]),
          note: `импорт ${sheet.name}, строка ${r}${vk ? `; доп: ${vk}` : ''}`,
          extraBills: { create: extraBills },
        },
      });
      stats.extraBills += extraBills.length;
      stats.imported++;
      sheetImported++;
      allRows.push(r);
    }
    console.log(`${sheet.name}: импортировано ${sheetImported}`);
    sheetVerification.push({
      label: sheet.name, officeId: office.id, ws,
      mgrCol: sheet.mgrCol, brigCol: sheet.brigCol,
      rows: allRows, isRepair: true,
    });
  }

  console.log('\nSTATS:', JSON.stringify(stats, null, 0));

  // -------- Сверка с кэшем листа за сентябрь 2026 --------
  console.log('\nСВЕРКА с кэшем листа за период 01.09.2026–30.09.2026 (лист считает з/п по этим же датам):');
  const {
    SalaryCalculationService,
  } = require('C:\\Users\\user\\dev\\platform-tir\\backend\\dist\\src\\admin\\salary\\salary-calculation.service');
  const calc = new SalaryCalculationService(prisma);
  const result = await calc.calculate({ dateFrom: '2026-09-01', dateTo: '2026-09-30' });

  for (const v of sheetVerification) {
    const rows = result.rows.filter((r) => r.officeId === v.officeId);
    const oRows = rows.filter((r) => ['WINDOWS', 'DOORS_CEILINGS', 'BLINDS'].includes(r.categoryCode));
    const rRows = rows.filter((r) => r.categoryCode === 'REPAIR_5050');
    const sum = (arr, key) => Math.round(arr.reduce((s, x) => s + x[key], 0) * 100) / 100;

    if (v.isRepair) {
      const sheetMgr = cachedColSum(v.ws, v.mgrCol, v.rows);
      const sheetBrig = cachedColSum(v.ws, v.brigCol, v.rows);
      const dbMgr = sum(rRows, 'managerAmount');
      const dbBrig = sum(rRows, 'brigadierAmount');
      console.log(
        `${v.label}: менеджер лист=${sheetMgr.toFixed(2)} база=${dbMgr.toFixed(2)} ${Math.abs(sheetMgr - dbMgr) < 1 ? 'OK' : 'РАСХОЖДЕНИЕ'}; бригада лист=${sheetBrig.toFixed(2)} база=${dbBrig.toFixed(2)} ${Math.abs(sheetBrig - dbBrig) < 1 ? 'OK' : 'РАСХОЖДЕНИЕ'}`,
      );
    } else {
      const sheetMgr = cachedColSum(v.ws, v.mgrCol, v.rows);
      const sheetZam = cachedColSum(v.ws, v.zamCol, v.rows);
      const sheetVs = cachedColSum(v.ws, v.vsCol, v.rows);
      const dbMgr = sum(oRows, 'managerAmount');
      const dbZam = sum(oRows, 'surveyorAmount');
      const dbVs = sum(oRows, 'vsAmount');
      const okM = Math.abs(sheetMgr - dbMgr) < 1;
      const okZ = Math.abs(sheetZam - dbZam) < 1;
      const okV = Math.abs(sheetVs - dbVs) < 1;
      console.log(
        `${v.label}: менеджер лист=${sheetMgr.toFixed(2)} база=${dbMgr.toFixed(2)} ${okM ? 'OK' : 'РАСХОЖДЕНИЕ'}; замерщик лист=${sheetZam.toFixed(2)} база=${dbZam.toFixed(2)} ${okZ ? 'OK' : 'РАСХОЖДЕНИЕ'}; ВС лист=${sheetVs.toFixed(2)} база=${dbVs.toFixed(2)} ${okV ? 'OK' : 'РАСХОЖДЕНИЕ'}`,
      );
    }
  }

  // Сводка по категориям/офисам
  const byCatOffice = await prisma.salaryContract.groupBy({
    by: ['officeId', 'categoryId'],
    _count: true,
    _sum: { baseAmount: true },
  });
  console.log('\nПо офисам и категориям:');
  for (const g of byCatOffice) {
    const office = offices.find((o) => o.id === g.officeId);
    const category = categories.find((c) => c.id === g.categoryId);
    console.log(`  ${office?.name} / ${category?.code}: ${g._count} договоров, база ${Number(g._sum.baseAmount ?? 0).toFixed(2)}`);
  }
}

main()
  .catch((e) => {
    console.error('IMPORT FAIL:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
