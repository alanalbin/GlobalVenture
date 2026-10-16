/**
 * STARTUP INSIGHTS DASHBOARD - JAVASCRIPT CONTROLLER
 * Handles API integration, Chart.js rendering, search, filtering, pagination, and modal.
 */

document.addEventListener('DOMContentLoaded', () => {
  // --------------------------------------------------------------------------
  // Application State
  // --------------------------------------------------------------------------
  const state = {
    search: '',
    domain: '',
    country: '',
    outcome: '',
    stage: '',
    sortBy: 'Company_ID',
    sortOrder: 'asc',
    page: 1,
    perPage: 15,
    totalPages: 1,
    totalRecords: 0,
    datasetTotal: 25000,
    filtersInitialized: false
  };

  // Chart instances
  let outcomeChart = null;
  let domainChart = null;
  let yearChart = null;
  let countryChart = null;

  // DOM Elements
  const quickSearchInput = document.getElementById('quickSearchInput');
  const tableSearchInput = document.getElementById('tableSearchInput');
  const domainFilter = document.getElementById('domainFilter');
  const countryFilter = document.getElementById('countryFilter');
  const outcomeFilter = document.getElementById('outcomeFilter');
  const stageFilter = document.getElementById('stageFilter');
  const sortBySelect = document.getElementById('sortBySelect');
  const sortOrderBtn = document.getElementById('sortOrderBtn');
  const sortOrderIcon = document.getElementById('sortOrderIcon');
  const sortOrderText = document.getElementById('sortOrderText');
  const pageSizeSelect = document.getElementById('pageSizeSelect');
  const activeFilterChips = document.getElementById('activeFilterChips');

  const resetAllFiltersBtn = document.getElementById('resetAllFiltersBtn');
  const clearFiltersBtn = document.getElementById('clearFiltersBtn');
  const topExportBtn = document.getElementById('topExportBtn');
  const tableExportBtn = document.getElementById('tableExportBtn');

  const tableBody = document.getElementById('tableBody');
  const paginationInfo = document.getElementById('paginationInfo');
  const firstPageBtn = document.getElementById('firstPageBtn');
  const prevPageBtn = document.getElementById('prevPageBtn');
  const nextPageBtn = document.getElementById('nextPageBtn');
  const lastPageBtn = document.getElementById('lastPageBtn');
  const pageNumbersContainer = document.getElementById('pageNumbersContainer');

  // KPI elements
  const kpiTotalStartups = document.getElementById('kpiTotalStartups');
  const kpiPercentageFiltered = document.getElementById('kpiPercentageFiltered');
  const kpiTotalDomains = document.getElementById('kpiTotalDomains');
  const kpiTotalFunding = document.getElementById('kpiTotalFunding');
  const kpiTotalCountries = document.getElementById('kpiTotalCountries');
  const sidebarRunway = document.getElementById('sidebarRunway');
  const sidebarValuation = document.getElementById('sidebarValuation');

  // Modal elements
  const companyModal = document.getElementById('companyModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const modalCloseActionBtn = document.getElementById('modalCloseActionBtn');

  // Mobile sidebar
  const sidebar = document.getElementById('sidebar');
  const openSidebarBtn = document.getElementById('openSidebarBtn');
  const closeSidebarBtn = document.getElementById('closeSidebarBtn');

  // --------------------------------------------------------------------------
  // Chart Colors & Styling Tokens
  // --------------------------------------------------------------------------
  const chartColors = {
    blue: '#78aaff',
    purple: '#b7a1ff',
    teal: '#59e2c2',
    amber: '#fbbf72',
    coral: '#fb8da5',
    palette: ['#78aaff', '#b7a1ff', '#59e2c2', '#fbbf72', '#fb8da5', '#38bdf8', '#a78bfa', '#34d399', '#f472b6', '#facc15'],
    grid: 'rgba(72, 98, 146, 0.16)',
    text: '#95a7c4',
    font: { family: "'Inter', sans-serif", size: 11 }
  };

  // Configure Chart.js global defaults
  if (window.Chart) {
    Chart.defaults.color = chartColors.text;
    Chart.defaults.font.family = chartColors.font.family;
    Chart.defaults.font.size = chartColors.font.size;
  }

  // --------------------------------------------------------------------------
  // API Operations
  // --------------------------------------------------------------------------
  function buildQueryString(extra = {}) {
    const params = new URLSearchParams({
      search: state.search,
      domain: state.domain,
      country: state.country,
      outcome: state.outcome,
      stage: state.stage,
      ...extra
    });
    return params.toString();
  }

  // Fetch Summary Statistics & Chart Data
  async function fetchStats() {
    try {
      const q = buildQueryString();
      const res = await fetch(`/api/stats?${q}`);
      const data = await res.json();

      if (data.status === 'success') {
        state.totalRecords = data.total_records;
        state.datasetTotal = data.total_dataset_size || 25000;

        // Populate dropdown options on first load
        if (!state.filtersInitialized && data.filter_options) {
          populateDropdowns(data.filter_options);
          state.filtersInitialized = true;
        }

        // Update KPIs
        updateKPIs(data);

        // Update Charts
        renderOutcomeChart(data.charts.outcomes);
        renderDomainChart(data.charts.domains);
        renderYearChart(data.charts.years);
        renderCountryChart(data.charts.countries);
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }

  // Fetch Paginated Table Records
  async function fetchStartups() {
    tableBody.innerHTML = `
      <tr class="table-loading-row">
        <td colspan="10">
          <div class="table-spinner">
            <i class="fa-solid fa-circle-notch fa-spin"></i>
            <span>Loading records...</span>
          </div>
        </td>
      </tr>
    `;

    try {
      const q = buildQueryString({
        page: state.page,
        per_page: state.perPage,
        sort_by: state.sortBy,
        sort_order: state.sortOrder
      });

      const res = await fetch(`/api/startups?${q}`);
      const data = await res.json();

      if (data.status === 'success') {
        state.totalPages = data.total_pages;
        renderTableRows(data.records);
        renderPagination(data.total, data.page, data.per_page, data.total_pages);
        renderFilterChips();
      }
    } catch (err) {
      console.error('Failed to load startup records:', err);
      tableBody.innerHTML = `
        <tr class="table-empty-row">
          <td colspan="10">
            <i class="fa-solid fa-triangle-exclamation text-coral"></i>
            <p>Error retrieving records. Please check your network connection.</p>
          </td>
        </tr>
      `;
    }
  }

  // --------------------------------------------------------------------------
  // KPI Updating
  // --------------------------------------------------------------------------
  function updateKPIs(data) {
    kpiTotalStartups.textContent = data.total_records.toLocaleString();
    
    const pct = ((data.total_records / (data.total_dataset_size || 25000)) * 100).toFixed(0);
    kpiPercentageFiltered.textContent = `${pct}% of Cohort`;

    kpiTotalDomains.textContent = data.total_domains;
    kpiTotalFunding.textContent = data.total_funding_formatted || `$${data.total_funding_m}M`;
    kpiTotalCountries.textContent = data.total_countries;

    sidebarRunway.textContent = `${data.avg_runway_months || 0} mo`;
    sidebarValuation.textContent = data.avg_valuation_formatted || '$0M';
  }

  // --------------------------------------------------------------------------
  // Dropdown Initialization
  // --------------------------------------------------------------------------
  function populateDropdowns(options) {
    function fillSelect(el, items, placeholder) {
      el.innerHTML = `<option value="">${placeholder}</option>`;
      items.forEach(item => {
        if (!item) return;
        const opt = document.createElement('option');
        opt.value = item;
        opt.textContent = item;
        el.appendChild(opt);
      });
    }

    fillSelect(domainFilter, options.domains, 'All Domains');
    fillSelect(countryFilter, options.countries, 'All Countries');
    fillSelect(outcomeFilter, options.outcomes, 'All Outcomes');
    fillSelect(stageFilter, options.stages, 'All Stages');
  }

  // --------------------------------------------------------------------------
  // Chart Rendering Functions
  // --------------------------------------------------------------------------
  function renderOutcomeChart(outcomeData) {
    const ctx = document.getElementById('outcomeChart');
    if (!ctx) return;

    if (outcomeChart) outcomeChart.destroy();

    const colors = {
      'Independent': '#59e2c2',
      'Acquired': '#b7a1ff',
      'Closed': '#fb8da5',
      'Public/IPO': '#fbbf72',
      'Unknown': '#78aaff'
    };

    const bgColors = outcomeData.labels.map(l => colors[l] || '#78aaff');

    outcomeChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: outcomeData.labels,
        datasets: [{
          data: outcomeData.data,
          backgroundColor: bgColors,
          borderWidth: 2,
          borderColor: '#121c33',
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: {
            position: 'right',
            labels: {
              boxWidth: 12,
              padding: 12,
              color: chartColors.text,
              font: { size: 12, family: "'Inter', sans-serif" }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(16, 26, 48, 0.95)',
            titleColor: '#ffffff',
            bodyColor: '#e2e8f0',
            borderColor: 'rgba(120, 170, 255, 0.3)',
            borderWidth: 1,
            padding: 10,
            callbacks: {
              label: (context) => {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const val = context.parsed;
                const pct = ((val / total) * 100).toFixed(1);
                return ` ${context.label}: ${val.toLocaleString()} (${pct}%)`;
              }
            }
          }
        }
      }
    });
  }

  function renderDomainChart(domainData) {
    const ctx = document.getElementById('domainChart');
    if (!ctx) return;

    if (domainChart) domainChart.destroy();

    domainChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: domainData.labels,
        datasets: [{
          label: 'Startups Count',
          data: domainData.data,
          backgroundColor: 'rgba(120, 170, 255, 0.85)',
          borderRadius: 6,
          hoverBackgroundColor: '#9bbfff'
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            grid: { color: chartColors.grid },
            ticks: { color: chartColors.text }
          },
          y: {
            grid: { display: false },
            ticks: { color: '#ffffff', font: { weight: 500 } }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(16, 26, 48, 0.95)',
            borderColor: 'rgba(120, 170, 255, 0.3)',
            borderWidth: 1,
            callbacks: {
              label: (context) => ` Startups: ${context.parsed.x.toLocaleString()}`
            }
          }
        }
      }
    });
  }

  function renderYearChart(yearData) {
    const ctx = document.getElementById('yearChart');
    if (!ctx) return;

    if (yearChart) yearChart.destroy();

    yearChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: yearData.labels,
        datasets: [{
          label: 'Founded Startups',
          data: yearData.data,
          borderColor: '#59e2c2',
          backgroundColor: 'rgba(89, 226, 194, 0.12)',
          borderWidth: 2.5,
          tension: 0.3,
          fill: true,
          pointBackgroundColor: '#59e2c2',
          pointBorderColor: '#121c33',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            grid: { color: chartColors.grid },
            ticks: { color: chartColors.text }
          },
          y: {
            grid: { color: chartColors.grid },
            ticks: { color: chartColors.text }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(16, 26, 48, 0.95)',
            borderColor: 'rgba(89, 226, 194, 0.3)',
            borderWidth: 1,
            callbacks: {
              label: (ctx) => ` Founded in ${ctx.label}: ${ctx.parsed.y.toLocaleString()} startups`
            }
          }
        }
      }
    });
  }

  function renderCountryChart(countryData) {
    const ctx = document.getElementById('countryChart');
    if (!ctx) return;

    if (countryChart) countryChart.destroy();

    countryChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: countryData.labels,
        datasets: [{
          label: 'Startups Count',
          data: countryData.data,
          backgroundColor: 'rgba(183, 161, 255, 0.82)',
          borderRadius: 6,
          hoverBackgroundColor: '#cbbeff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: '#ffffff',
              font: { weight: 500, size: 10 },
              maxRotation: 45,
              minRotation: 20
            }
          },
          y: {
            grid: { color: chartColors.grid },
            ticks: { color: chartColors.text }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(16, 26, 48, 0.95)',
            borderColor: 'rgba(183, 161, 255, 0.3)',
            borderWidth: 1,
            callbacks: {
              label: (ctx) => ` Startups in ${ctx.label}: ${ctx.parsed.y.toLocaleString()}`
            }
          }
        }
      }
    });
  }

  // --------------------------------------------------------------------------
  // Table Rows & Badges Rendering
  // --------------------------------------------------------------------------
  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getOutcomeBadgeClass(outcome) {
    const o = (outcome || '').toLowerCase();
    if (o.includes('independent')) return 'badge-outcome-independent';
    if (o.includes('acquired')) return 'badge-outcome-acquired';
    if (o.includes('closed')) return 'badge-outcome-closed';
    if (o.includes('ipo') || o.includes('public')) return 'badge-outcome-ipo';
    return 'badge-stage';
  }

  function renderTableRows(records) {
    if (!records || records.length === 0) {
      tableBody.innerHTML = `
        <tr class="table-empty-row">
          <td colspan="10">
            <div class="empty-state">
              <i class="fa-solid fa-magnifying-glass" style="font-size:24px; margin-bottom:8px; opacity:0.6;"></i>
              <p>No startup records match the current filters.</p>
              <button class="btn btn-outline btn-sm" id="emptyResetBtn" style="margin-top:10px;">Clear All Filters</button>
            </div>
          </td>
        </tr>
      `;
      const btn = document.getElementById('emptyResetBtn');
      if (btn) btn.addEventListener('click', resetFilters);
      return;
    }

    tableBody.innerHTML = records.map(r => {
      const cid = escapeHtml(r.Company_ID);
      const domain = escapeHtml(r.Technology_Domain);
      const year = r.Founding_Year || '--';
      const city = escapeHtml(r.City);
      const country = escapeHtml(r.Country);
      const stage = escapeHtml(r.Funding_Stage);
      const funding = r.Total_Funding_USD_Millions != null ? `$${Number(r.Total_Funding_USD_Millions).toFixed(1)}M` : '--';
      const valuation = r.Valuation_USD_Millions != null ? `$${Number(r.Valuation_USD_Millions).toFixed(1)}M` : '--';
      const runway = r.Runway_Months != null ? `${Number(r.Runway_Months).toFixed(1)}m` : '--';
      const outcome = escapeHtml(r.Company_Outcome) || 'Unknown';
      const badgeClass = getOutcomeBadgeClass(outcome);

      return `
        <tr data-cid="${cid}">
          <td class="col-id">${cid}</td>
          <td class="col-domain">${domain}</td>
          <td>${year}</td>
          <td class="col-location">
            <span>${country}</span>
            <span style="color:var(--text-faint); font-size:11px;">(${city})</span>
          </td>
          <td><span class="badge badge-stage">${stage}</span></td>
          <td class="col-numeric text-teal">${funding}</td>
          <td class="col-numeric text-blue">${valuation}</td>
          <td class="col-numeric">${runway}</td>
          <td><span class="badge ${badgeClass}">${outcome}</span></td>
          <td>
            <button class="btn-view-row" data-cid="${cid}" title="Inspect full company telemetry">
              <i class="fa-solid fa-eye"></i> View
            </button>
          </td>
        </tr>
      `;
    }).join('');

    // Attach click listeners to rows & view buttons
    tableBody.querySelectorAll('tr[data-cid]').forEach(row => {
      row.addEventListener('click', (e) => {
        // Prevent trigger if clicking certain buttons
        const cid = row.getAttribute('data-cid');
        openCompanyModal(cid);
      });
    });
  }

  // --------------------------------------------------------------------------
  // Pagination Renderer
  // --------------------------------------------------------------------------
  function renderPagination(total, page, perPage, totalPages) {
    if (total === 0) {
      paginationInfo.textContent = 'Showing 0 to 0 of 0 records';
      firstPageBtn.disabled = true;
      prevPageBtn.disabled = true;
      nextPageBtn.disabled = true;
      lastPageBtn.disabled = true;
      pageNumbersContainer.innerHTML = '';
      return;
    }

    const start = (page - 1) * perPage + 1;
    const end = Math.min(total, page * perPage);
    paginationInfo.textContent = `Showing ${start.toLocaleString()} to ${end.toLocaleString()} of ${total.toLocaleString()} records`;

    firstPageBtn.disabled = (page <= 1);
    prevPageBtn.disabled = (page <= 1);
    nextPageBtn.disabled = (page >= totalPages);
    lastPageBtn.disabled = (page >= totalPages);

    // Build smart pagination pills
    pageNumbersContainer.innerHTML = '';
    const pages = getPaginationRange(page, totalPages);

    pages.forEach(p => {
      if (p === '...') {
        const span = document.createElement('span');
        span.className = 'page-ellipsis';
        span.textContent = '...';
        pageNumbersContainer.appendChild(span);
      } else {
        const btn = document.createElement('button');
        btn.className = `page-num ${p === page ? 'active' : ''}`;
        btn.textContent = p;
        btn.addEventListener('click', () => {
          if (state.page !== p) {
            state.page = p;
            fetchStartups();
            scrollToTable();
          }
        });
        pageNumbersContainer.appendChild(btn);
      }
    });
  }

  function getPaginationRange(current, max) {
    if (max <= 7) {
      return Array.from({ length: max }, (_, i) => i + 1);
    }
    if (current <= 4) {
      return [1, 2, 3, 4, 5, '...', max];
    }
    if (current >= max - 3) {
      return [1, '...', max - 4, max - 3, max - 2, max - 1, max];
    }
    return [1, '...', current - 1, current, current + 1, '...', max];
  }

  function scrollToTable() {
    const tableSection = document.getElementById('table-section');
    if (tableSection) {
      tableSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // --------------------------------------------------------------------------
  // Active Filter Badges
  // --------------------------------------------------------------------------
  function renderFilterChips() {
    activeFilterChips.innerHTML = '';
    const chips = [];

    if (state.search) chips.push({ label: `Search: "${state.search}"`, key: 'search' });
    if (state.domain) chips.push({ label: `Domain: ${state.domain}`, key: 'domain' });
    if (state.country) chips.push({ label: `Country: ${state.country}`, key: 'country' });
    if (state.outcome) chips.push({ label: `Outcome: ${state.outcome}`, key: 'outcome' });
    if (state.stage) chips.push({ label: `Stage: ${state.stage}`, key: 'stage' });

    if (chips.length === 0) {
      activeFilterChips.innerHTML = '<span class="no-filter-chip">All filters default</span>';
      return;
    }

    chips.forEach(chip => {
      const el = document.createElement('span');
      el.className = 'filter-chip';
      el.innerHTML = `
        ${escapeHtml(chip.label)}
        <i class="fa-solid fa-xmark filter-chip-remove" title="Remove filter"></i>
      `;
      el.querySelector('.filter-chip-remove').addEventListener('click', (e) => {
        e.stopPropagation();
        removeFilter(chip.key);
      });
      activeFilterChips.appendChild(el);
    });
  }

  function removeFilter(key) {
    if (key === 'search') {
      state.search = '';
      tableSearchInput.value = '';
      quickSearchInput.value = '';
    } else if (key === 'domain') {
      state.domain = '';
      domainFilter.value = '';
    } else if (key === 'country') {
      state.country = '';
      countryFilter.value = '';
    } else if (key === 'outcome') {
      state.outcome = '';
      outcomeFilter.value = '';
    } else if (key === 'stage') {
      state.stage = '';
      stageFilter.value = '';
    }

    state.page = 1;
    fetchStats();
    fetchStartups();
  }

  function resetFilters() {
    state.search = '';
    state.domain = '';
    state.country = '';
    state.outcome = '';
    state.stage = '';
    state.sortBy = 'Company_ID';
    state.sortOrder = 'asc';
    state.page = 1;

    tableSearchInput.value = '';
    quickSearchInput.value = '';
    domainFilter.value = '';
    countryFilter.value = '';
    outcomeFilter.value = '';
    stageFilter.value = '';
    sortBySelect.value = 'Company_ID';

    sortOrderText.textContent = 'ASC';
    sortOrderIcon.className = 'fa-solid fa-arrow-down-short-wide';

    fetchStats();
    fetchStartups();
  }

  // --------------------------------------------------------------------------
  // Modal Detail View
  // --------------------------------------------------------------------------
  async function openCompanyModal(companyId) {
    try {
      const res = await fetch(`/api/startup/${companyId}`);
      const data = await res.json();
      if (data.status === 'success') {
        const c = data.company;
        document.getElementById('modalCompanyId').textContent = c.Company_ID || '--';
        
        const badge = document.getElementById('modalOutcomeBadge');
        badge.textContent = c.Company_Outcome || 'Unknown';
        badge.className = `badge ${getOutcomeBadgeClass(c.Company_Outcome)}`;

        document.getElementById('modalSubhead').textContent = 
          `${c.Technology_Domain || 'Tech'} • ${c.City || 'City'}, ${c.Country || 'Global'}`;

        document.getElementById('modalFunding').textContent = 
          c.Total_Funding_USD_Millions != null ? `$${Number(c.Total_Funding_USD_Millions).toFixed(2)}M` : '--';
        document.getElementById('modalValuation').textContent = 
          c.Valuation_USD_Millions != null ? `$${Number(c.Valuation_USD_Millions).toFixed(2)}M` : '--';
        document.getElementById('modalARR').textContent = 
          c.Annual_Recurring_Revenue_USD_Millions != null ? `$${Number(c.Annual_Recurring_Revenue_USD_Millions).toFixed(2)}M` : '--';
        document.getElementById('modalBurn').textContent = 
          c.Monthly_Burn_Rate_USD_Millions != null ? `$${Number(c.Monthly_Burn_Rate_USD_Millions).toFixed(2)}M` : '--';

        document.getElementById('modalRunway').textContent = 
          c.Runway_Months != null ? `${Number(c.Runway_Months).toFixed(1)} months` : '--';
        document.getElementById('modalFoundingYear').textContent = c.Founding_Year || '--';
        document.getElementById('modalHeadcount').textContent = c.Current_Headcount_2026 != null ? c.Current_Headcount_2026 : '--';
        document.getElementById('modalPeakHeadcount').textContent = c.Peak_Headcount != null ? c.Peak_Headcount : '--';
        document.getElementById('modalLayoffs').textContent = c.Layoffs_2024_2025 != null ? c.Layoffs_2024_2025 : '0';
        document.getElementById('modalInvestorTier').textContent = c.Investor_Tier || '--';
        document.getElementById('modalAIAdoption').textContent = c.AI_Adoption_Level || 'None';
        document.getElementById('modalFundingStage').textContent = c.Funding_Stage || '--';

        companyModal.classList.add('show');
        companyModal.setAttribute('aria-hidden', 'false');
      }
    } catch (err) {
      console.error('Failed to load company detail:', err);
    }
  }

  function closeCompanyModal() {
    companyModal.classList.remove('show');
    companyModal.setAttribute('aria-hidden', 'true');
  }

  // --------------------------------------------------------------------------
  // CSV Export Trigger
  // --------------------------------------------------------------------------
  function triggerCSVExport() {
    const q = buildQueryString();
    window.location.href = `/api/export?${q}`;
  }

  // --------------------------------------------------------------------------
  // Event Listeners Setup
  // --------------------------------------------------------------------------
  // Debounce helper
  function debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  const handleSearch = debounce((val) => {
    state.search = val;
    state.page = 1;
    fetchStats();
    fetchStartups();
  }, 350);

  tableSearchInput.addEventListener('input', (e) => {
    quickSearchInput.value = e.target.value;
    handleSearch(e.target.value);
  });

  quickSearchInput.addEventListener('input', (e) => {
    tableSearchInput.value = e.target.value;
    handleSearch(e.target.value);
  });

  domainFilter.addEventListener('change', (e) => {
    state.domain = e.target.value;
    state.page = 1;
    fetchStats();
    fetchStartups();
  });

  countryFilter.addEventListener('change', (e) => {
    state.country = e.target.value;
    state.page = 1;
    fetchStats();
    fetchStartups();
  });

  outcomeFilter.addEventListener('change', (e) => {
    state.outcome = e.target.value;
    state.page = 1;
    fetchStats();
    fetchStartups();
  });

  stageFilter.addEventListener('change', (e) => {
    state.stage = e.target.value;
    state.page = 1;
    fetchStats();
    fetchStartups();
  });

  sortBySelect.addEventListener('change', (e) => {
    state.sortBy = e.target.value;
    state.page = 1;
    fetchStartups();
  });

  sortOrderBtn.addEventListener('click', () => {
    if (state.sortOrder === 'asc') {
      state.sortOrder = 'desc';
      sortOrderText.textContent = 'DESC';
      sortOrderIcon.className = 'fa-solid fa-arrow-down-wide-short';
    } else {
      state.sortOrder = 'asc';
      sortOrderText.textContent = 'ASC';
      sortOrderIcon.className = 'fa-solid fa-arrow-down-short-wide';
    }
    state.page = 1;
    fetchStartups();
  });

  pageSizeSelect.addEventListener('change', (e) => {
    state.perPage = parseInt(e.target.value, 10);
    state.page = 1;
    fetchStartups();
  });

  firstPageBtn.addEventListener('click', () => {
    if (state.page > 1) {
      state.page = 1;
      fetchStartups();
      scrollToTable();
    }
  });

  prevPageBtn.addEventListener('click', () => {
    if (state.page > 1) {
      state.page--;
      fetchStartups();
      scrollToTable();
    }
  });

  nextPageBtn.addEventListener('click', () => {
    if (state.page < state.totalPages) {
      state.page++;
      fetchStartups();
      scrollToTable();
    }
  });

  lastPageBtn.addEventListener('click', () => {
    if (state.page < state.totalPages) {
      state.page = state.totalPages;
      fetchStartups();
      scrollToTable();
    }
  });

  // Action Buttons
  resetAllFiltersBtn.addEventListener('click', resetFilters);
  clearFiltersBtn.addEventListener('click', resetFilters);
  topExportBtn.addEventListener('click', triggerCSVExport);
  tableExportBtn.addEventListener('click', triggerCSVExport);

  // Modal Close Listeners
  closeModalBtn.addEventListener('click', closeCompanyModal);
  modalCloseActionBtn.addEventListener('click', closeCompanyModal);
  companyModal.addEventListener('click', (e) => {
    if (e.target === companyModal) closeCompanyModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && companyModal.classList.contains('show')) {
      closeCompanyModal();
    }
  });

  // Mobile Sidebar Drawer
  if (openSidebarBtn) {
    openSidebarBtn.addEventListener('click', () => sidebar.classList.add('open'));
  }
  if (closeSidebarBtn) {
    closeSidebarBtn.addEventListener('click', () => sidebar.classList.remove('open'));
  }

  // --------------------------------------------------------------------------
  // Initial Boot
  // --------------------------------------------------------------------------
  fetchStats();
  fetchStartups();
});
