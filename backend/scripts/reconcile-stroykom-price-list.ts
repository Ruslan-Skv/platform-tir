/**
 * CLI: разбор прайса Стройкома и сравнение двух файлов.
 *
 * Примеры:
 *   npx ts-node scripts/reconcile-stroykom-price-list.ts parse "C:/path/to/price.xls"
 *   npx ts-node scripts/reconcile-stroykom-price-list.ts parse "C:/path/to/price.xls" INTERIOR_DOOR
 *   npx ts-node scripts/reconcile-stroykom-price-list.ts diff "old.xls" "new.xls" STEEL_DOOR
 */
import {
  diffPriceListRows,
  parseStroykomPriceList,
} from '../src/admin/catalog/suppliers/parsers/stroykom-price-list.parser';
import {
  PRICE_LIST_CATEGORY_LABELS,
  SUPPLIER_PRICE_LIST_CATEGORIES,
  type SupplierPriceListCategory,
} from '../src/admin/catalog/suppliers/parsers/price-list-parser.types';

function printUsage() {
  console.log(`Usage:
  parse <file.xls> [category]
  diff <previous.xls> <current.xls> [category]

Categories: ${SUPPLIER_PRICE_LIST_CATEGORIES.join(', ')} (default: TRIM)`);
}

function parseCategory(value?: string): SupplierPriceListCategory {
  if (value && SUPPLIER_PRICE_LIST_CATEGORIES.includes(value as SupplierPriceListCategory)) {
    return value as SupplierPriceListCategory;
  }
  return 'TRIM';
}

function printSummary(rows: ReturnType<typeof diffPriceListRows>) {
  const summary = {
    unchanged: rows.filter((r) => r.status === 'unchanged').length,
    changed: rows.filter((r) => r.status === 'changed').length,
    added: rows.filter((r) => r.status === 'added').length,
    removed: rows.filter((r) => r.status === 'removed').length,
  };
  console.log('Summary:', summary);
}

async function main() {
  const [, , command, arg1, arg2, arg3] = process.argv;
  if (!command || !arg1) {
    printUsage();
    process.exit(1);
  }

  if (command === 'parse') {
    const category = parseCategory(arg2);
    const parsed = parseStroykomPriceList(arg1, category);
    console.log(`Category: ${PRICE_LIST_CATEGORY_LABELS[category]}`);
    console.log(`Sheet: ${parsed.sheetName}`);
    console.log(`Date: ${parsed.priceListDate ?? '—'}`);
    console.log(`Rows: ${parsed.rows.length}`);
    console.log(parsed.rows.slice(0, 5));
    return;
  }

  if (command === 'diff') {
    if (!arg2) {
      printUsage();
      process.exit(1);
    }
    const category = parseCategory(arg3);
    const previous = parseStroykomPriceList(arg1, category);
    const current = parseStroykomPriceList(arg2, category);
    console.log(`Category: ${PRICE_LIST_CATEGORY_LABELS[category]}`);
    const diff = diffPriceListRows(previous.rows, current.rows);
    printSummary(diff);
    const changed = diff.filter((r) => r.status !== 'unchanged');
    console.log(changed.slice(0, 30));
    return;
  }

  printUsage();
  process.exit(1);
}

void main();
