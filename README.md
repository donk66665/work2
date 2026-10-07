# 新浪财经历史分红数据获取与预处理

以贵州茅台（600519）为例，从新浪财经 `vISSUE_ShareBonus` 页面获取历史分红数据，完成解析、清洗、校验，并在浏览器中展示实现过程与结果。

## 数据来源

| 项目 | 值 |
| --- | --- |
| 来源页面 | `https://vip.stock.finance.sina.com.cn/corp/go.php/vISSUE_ShareBonus/stockid/600519.phtml` |
| 目标表格 | `#sharebonus_1` |
| 原始快照 | `data/raw/600519.utf8.html` |
| 记录数 | 31条 |
| 时间跨度 | 2002-07-18 ~ 2026-06-22 |

## 快速开始

```bash
npm install

npm run extract   # 解析原始快照 -> CSV + 校验报告 + 网页数据
npm run test      # Playwright 页面测试 + 生成桌面/移动端截图
npm run serve     # 本地起服务，访问 http://localhost:4173
```

## 目录结构

```
data/
  raw/600519.utf8.html          新浪页面原始快照（可复查输入）
  cleaned_dividends.csv         清洗后结构化数据
  validation_report.json        机器可读校验结果
public/
  index.html                    展示页：过程 / 图表 / 表格 / 校验
  assets/styles.css             样式
  assets/app.js                 渲染与筛选逻辑
  assets/dividends.js           由extract 脚本生成的数据
scripts/
  extract_dividends.mjs         Cheerio 解析与清洗
  test-ui.mjs                   Playwright 页面测试
  server.mjs                    本地静态服务
docs/
  screenshots/desktop.png       桌面端整页截图
  screenshots/mobile.png        移动端整页截图
  agent-conversation.md         与 Agent 的完整对话记录
```

## 清洗规则

- 日期统一为 `YYYY-MM-DD`，非法或 `--` 值归为 `null`
- 数值去除千分位逗号，`--` 归为 `null`
- 派生字段：`plan_summary`（方案摘要）、`event_year`（事件年份）、`is_implemented`（进度是否为"实施"）
- 业务键 = `announce_date|plan_summary`，用于查重

## 校验结果

| 校验项 | 结果 |
| --- | --- |
| 记录数 | 31（预期 ≥ 20）|
| 重复业务键 | 0 |
| 公告日期缺失 | 0 |
| 除权除息日缺失 | 0 |
| 股权登记日缺失 | 0 |
| 红股上市日缺失 | 29（该字段对纯现金分红不适用）|
| 进度取值 | 实施 |

任一硬性校验不通过时，`extract_dividends.mjs` 会直接抛错退出，不产出半成品数据。

## Playwright 测试覆盖

`npm run test` 依次断言：

1. 页面标题与主标题符合预期
2. 指标区记录数为 31
3. 趋势图柱形数量 > 10
4. 默认表格渲染 31 行
5. 年份筛选 2025 得到 2 行
6. 组合筛选（2025 + 关键字）得到 0 行
7. 清除筛选后恢复 31 行
8. 浏览器控制台无错误
9. 移动端视口下主标题与指标可见

## 说明

数据来自公开行情页面，仅用于课程作业展示，不构成投资建议。
