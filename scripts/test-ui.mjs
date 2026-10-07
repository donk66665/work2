import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const target = `file:///${resolve(root, 'public/index.html').replace(/\\/g, '/')}`;
const browser = await chromium.launch();
const consoleErrors = [];

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});
page.on('pageerror', (error) => consoleErrors.push(error.message));

await page.goto(target, { waitUntil: 'networkidle' });
assert((await page.title()).includes('新浪财经'), '页面标题不符合预期');
assert((await page.locator('h1').textContent()).includes('新浪财经历史分红数据获取与预处理'), '主标题不符合预期');
assert(await page.locator('#metric-count').textContent() === '31', '指标区的记录数不是 31');
assert(await page.locator('#chart .bar-group').count() > 10, '趋势图柱形数量不足');
assert(await page.locator('#dividend-table tr').count() === 31, '默认表格没有显示 31 条记录');

await page.selectOption('#year-filter', '2025');
assert(await page.locator('#dividend-table tr').count() === 2, '2025 年筛选结果不是 2 条');
await page.fill('#search', '2026');
assert(await page.locator('#table-count').textContent().then((value) => value.startsWith('0 /')), '筛选后应为 0 条记录');
await page.selectOption('#year-filter', 'all');
await page.fill('#search', '');
assert(await page.locator('#dividend-table tr').count() === 31, '清除筛选后没有恢复 31 条记录');
assert(consoleErrors.length === 0, `浏览器控制台出现错误: ${consoleErrors.join('; ')}`);

await mkdir(resolve(root, 'docs/screenshots'), { recursive: true });
await page.screenshot({ path: resolve(root, 'docs/screenshots/desktop.png'), fullPage: true });
await page.close();

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
mobile.on('pageerror', (error) => consoleErrors.push(error.message));
await mobile.goto(target, { waitUntil: 'networkidle' });
assert(await mobile.locator('#metric-count').textContent() === '31', '移动端记录数指标不可见');
assert(await mobile.locator('h1').isVisible(), '移动端主标题不可见');
await mobile.screenshot({ path: resolve(root, 'docs/screenshots/mobile.png'), fullPage: true });
await mobile.close();

await browser.close();
console.log('Playwright 测试通过；桌面与移动端截图已保存到 docs/screenshots。');
