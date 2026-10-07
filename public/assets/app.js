(() => {
  const data = window.SINA_DIVIDEND_DATA;
  const records = data.records;
  const validation = data.validation;

  const formatNumber = (value) => value === null ? '--' : value.toLocaleString('zh-CN');
  const text = (value) => value === null || value === undefined || value === '' ? '--' : value;

  document.getElementById('metric-count').textContent = records.length;
  document.getElementById('metric-range').textContent =
    `${validation.date_range.earliest.slice(0, 4)}-${validation.date_range.latest.slice(0, 4)}`;
  document.getElementById('metric-cash').textContent =
    records.filter((row) => row.cash_dividend_pre_tax_per_10 > 0).length;
  document.getElementById('metric-progress').textContent =
    `${Math.round(records.filter((row) => row.is_implemented).length / records.length * 100)}%`;

  const byYear = new Map();
  for (const row of records) {
    byYear.set(row.event_year, (byYear.get(row.event_year) || 0) + (row.cash_dividend_pre_tax_per_10 || 0));
  }
  const years = [...byYear.keys()].sort((a, b) => Number(a) - Number(b));
  const values = years.map((year) => byYear.get(year));
  const maxValue = Math.max(...values);
  const chart = document.getElementById('chart');
  chart.innerHTML = years.map((year, index) => `
    <div class="bar-group">
      <div class="bar-value">${values[index] ? formatNumber(Number(values[index].toFixed(3))) : '0'}</div>
      <div class="bar" style="height:${Math.max(3, values[index] / maxValue * 100)}%"></div>
      <div class="bar-year">${year}</div>
    </div>
  `).join('');

  const tbody = document.getElementById('dividend-table');
  const yearFilter = document.getElementById('year-filter');
  const search = document.getElementById('search');
  const tableCount = document.getElementById('table-count');

  years.slice().reverse().forEach((year) => {
    const option = document.createElement('option');
    option.value = year;
    option.textContent = year;
    yearFilter.append(option);
  });

  const render = () => {
    const keyword = search.value.trim().toLowerCase();
    const selectedYear = yearFilter.value;
    const filtered = records.filter((row) => {
      const matchesYear = selectedYear === 'all' || row.event_year === selectedYear;
      const haystack = Object.values(row).join(' ').toLowerCase();
      return matchesYear && (!keyword || haystack.includes(keyword));
    });
    tbody.innerHTML = filtered.map((row) => `
      <tr>
        <td>${row.announce_date}</td>
        <td class="plan">${row.plan_summary}</td>
        <td>${formatNumber(row.bonus_shares_per_10)}</td>
        <td>${formatNumber(row.conversion_shares_per_10)}</td>
        <td>${formatNumber(row.cash_dividend_pre_tax_per_10)}</td>
        <td><span class="badge">${row.progress}</span></td>
        <td>${text(row.ex_dividend_date)}</td>
        <td>${text(row.record_date)}</td>
        <td>${text(row.bonus_listing_date)}</td>
      </tr>
    `).join('');
    tableCount.textContent = `${filtered.length} / ${records.length} 条`;
  };

  yearFilter.addEventListener('change', render);
  search.addEventListener('input', render);
  render();

  const validationList = document.getElementById('validation-list');
  const items = [
    ['记录数', validation.row_count],
    ['重复业务键', validation.duplicate_business_keys],
    ['公告日期缺失', validation.missing_required_dates.announce_date],
    ['除权除息日缺失', validation.missing_required_dates.ex_dividend_date],
    ['股权登记日缺失', validation.missing_required_dates.record_date],
    ['红股上市日缺失', validation.missing_required_dates.bonus_listing_date],
    ['进度取值', validation.progress_values.join(' / ')]
  ];
  validationList.innerHTML = items.map(([key, value]) => `<li><strong>${key}</strong><span>${value}</span></li>`).join('');
})();
