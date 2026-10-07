import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const rawPath = resolve(root, 'data/raw/600519.utf8.html');
const html = await readFile(rawPath, 'utf8');
const $ = cheerio.load(html);

const textToNumber = (value) => {
  const cleaned = value.trim().replace(/,/g, '');
  if (!cleaned || cleaned === '--') return null;
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) throw new Error(`无法解析数值: ${value}`);
  return parsed;
};

const dateOrNull = (value) => {
  const trimmed = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
};

const rows = $('#sharebonus_1 tbody tr').toArray().map((row, index) => {
  const cells = $(row).find('td').toArray().map((cell) => $(cell).text().trim());
  if (cells.length < 9) throw new Error(`第 ${index + 1} 行字段数量不足: ${cells.length}`);
  const [announceDate, bonusPer10, conversionPer10, cashPer10, progress, exDate, recordDate, listingDate] = cells;
  const bonus = textToNumber(bonusPer10);
  const conversion = textToNumber(conversionPer10);
  const cash = textToNumber(cashPer10);
  const parts = [];
  if (bonus) parts.push(`送${bonus}`);
  if (conversion) parts.push(`转${conversion}`);
  if (cash) parts.push(`派${cash}`);
  const planSummary = parts.length ? `10${parts.join(' ')}` : '不分配';

  return {
    stock_code: '600519',
    stock_name: '贵州茅台',
    announce_date: dateOrNull(announceDate),
    event_year: dateOrNull(announceDate)?.slice(0, 4) ?? null,
    bonus_shares_per_10: bonus,
    conversion_shares_per_10: conversion,
    cash_dividend_pre_tax_per_10: cash,
    plan_summary: planSummary,
    progress,
    is_implemented: progress === '实施',
    ex_dividend_date: dateOrNull(exDate),
    record_date: dateOrNull(recordDate),
    bonus_listing_date: dateOrNull(listingDate),
    source_table: 'sharebonus_1',
    source: '新浪财经 vISSUE_ShareBonus'
  };
});

if (rows.length === 0) throw new Error('未从新浪页面解析到分红记录');

const seen = new Set();
for (const row of rows) {
  const key = `${row.announce_date}|${row.plan_summary}`;
  if (seen.has(key)) throw new Error(`发现重复业务键: ${key}`);
  seen.add(key);
}

const dateFields = ['announce_date', 'ex_dividend_date', 'record_date', 'bonus_listing_date'];
const missingByField = {};
for (const field of dateFields) {
  missingByField[field] = rows.filter((row) => row[field] === null).length;
}

const validation = {
  source_url: 'https://vip.stock.finance.sina.com.cn/corp/go.php/vISSUE_ShareBonus/stockid/600519.phtml',
  source_table: 'sharebonus_1',
  row_count: rows.length,
  expected_minimum_rows: 20,
  duplicate_business_keys: rows.length - seen.size,
  progress_values: [...new Set(rows.map((row) => row.progress))],
  implemented_count: rows.filter((row) => row.is_implemented).length,
  missing_required_dates: missingByField,
  date_range: {
    earliest: rows.at(-1)?.announce_date ?? null,
    latest: rows[0]?.announce_date ?? null
  },
  generated_at: new Date().toISOString()
};

if (validation.row_count < validation.expected_minimum_rows) throw new Error('解析记录数低于预期');
if (validation.duplicate_business_keys !== 0) throw new Error('存在重复记录');
if (missingByField.announce_date !== 0) throw new Error('公告日期存在缺失');

const csvHeader = [
  'stock_code', 'stock_name', 'announce_date', 'event_year', 'bonus_shares_per_10',
  'conversion_shares_per_10', 'cash_dividend_pre_tax_per_10', 'plan_summary', 'progress',
  'is_implemented', 'ex_dividend_date', 'record_date', 'bonus_listing_date', 'source_table', 'source'
].join(',');
const csvBody = rows.map((row) => csvHeader.split(',').map((field) => {
  const value = row[field];
  return value === null || value === undefined ? '' : String(value).includes(',') ? `"${value}"` : String(value);
}).join(',')).join('\n');

await mkdir(resolve(root, 'data'), { recursive: true });
await mkdir(resolve(root, 'public/assets'), { recursive: true });
await writeFile(resolve(root, 'data/cleaned_dividends.csv'), `${csvHeader}\n${csvBody}\n`, 'utf8');
await writeFile(resolve(root, 'data/validation_report.json'), `${JSON.stringify(validation, null, 2)}\n`, 'utf8');
await writeFile(
  resolve(root, 'public/assets/dividends.js'),
  `window.SINA_DIVIDEND_DATA = ${JSON.stringify({ stock: { code: '600519', name: '贵州茅台' }, validation, records: rows }, null, 2)};\n`,
  'utf8'
);

console.log(`解析 ${rows.length} 条记录；生成 CSV、校验报告和网页数据文件。`);
