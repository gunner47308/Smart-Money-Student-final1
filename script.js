"use strict";

const STORAGE_KEY = "sms_transactions_v1";
const SETTINGS_KEY = "sms_settings_v1";
const PAGE_SIZE = 100;

const expenseCategories = {
  "อาหาร": ["ข้าว", "ก๋วยเตี๋ยว", "กาแฟ", "ชา", "ชานม", "น้ำ", "พิซซ่า", "kfc", "mk", "ชาบู", "หมูกระทะ", "ร้านอาหาร", "กิน"],
  "เดินทาง": ["เติมน้ำมัน", "น้ำมัน", "grab", "bolt", "taxi", "แท็กซี่", "รถเมล์", "รถไฟ", "bts", "mrt"],
  "ช้อปปิ้ง": ["เสื้อ", "เสื้อผ้า", "รองเท้า", "กางเกง", "กระเป๋า", "ของใช้", "เครื่องสำอาง"],
  "การศึกษา": ["หนังสือ", "ค่าเรียน", "ค่าเทอม", "สมุด", "ปากกา", "อุปกรณ์การเรียน"],
  "สุขภาพ": ["ยา", "คลินิก", "โรงพยาบาล", "หมอ", "ทันตแพทย์", "ฟิตเนส"],
  "บันเทิง": ["หนัง", "netflix", "spotify", "steam", "เกม"],
  "อื่น ๆ": []
};

const incomeCategories = {
  "เงินเดือน": ["เงินเดือน", "salary"],
  "โบนัส": ["โบนัส", "bonus"],
  "ขายของ": ["ขาย", "ขายเสื้อ", "ขายหนังสือ", "ขายสินค้า"],
  "ครอบครัว": ["แม่ให้เงิน", "พ่อให้เงิน", "ผู้ปกครองให้เงิน"],
  "ของขวัญ": ["ของขวัญ", "รางวัล"],
  "เงินคืน": ["cashback", "refund", "เงินคืน"],
  "อื่น ๆ": []
};

const state = {
  transactions: [],
  settings: {
    theme: "light",
    monthlyBudget: 0
  },
  filters: {
    search: "",
    type: "all",
    period: "month",
    sort: "newest"
  },
  page: 1,
  charts: {}
};

const els = {};

document.addEventListener("DOMContentLoaded", initApp);

function initApp() {
  cacheElements();
  loadState();
  bindEvents();
  applyTheme();
  fillCategoryOptions("income");
  updateAiPreview();
  renderAll();
  registerServiceWorker();
  setTimeout(() => document.getElementById("loading")?.remove(), 1500);
}

function cacheElements() {
  [
    "quickForm", "naturalInput", "aiPreview", "budgetForm", "budgetInput", "budgetDisplay",
    "averageDaily", "topCategory", "latestItem", "totalIncome", "totalExpense", "balance",
    "totalCount", "searchInput", "typeFilter", "periodFilter", "sortSelect", "transactionBody",
    "emptyState", "prevPage", "nextPage", "pageInfo", "exportCsvBtn", "exportExcelBtn",
    "exportPdfBtn", "csvImport", "editModal", "editForm", "editId", "editDate",
    "editDescription", "editAmount", "editType", "editCategory", "closeModal", "toast",
    "themeToggle", "installBtn"
  ].forEach((id) => {
    els[id] = document.getElementById(id);
  });
}

function bindEvents() {
  els.quickForm.addEventListener("submit", handleQuickSubmit);
  els.naturalInput.addEventListener("input", updateAiPreview);
  els.budgetForm.addEventListener("submit", handleBudgetSubmit);
  els.searchInput.addEventListener("input", () => updateFilter("search", els.searchInput.value));
  els.typeFilter.addEventListener("change", () => updateFilter("type", els.typeFilter.value));
  els.periodFilter.addEventListener("change", () => updateFilter("period", els.periodFilter.value));
  els.sortSelect.addEventListener("change", () => updateFilter("sort", els.sortSelect.value));
  els.prevPage.addEventListener("click", () => changePage(-1));
  els.nextPage.addEventListener("click", () => changePage(1));
  els.exportCsvBtn.addEventListener("click", exportCsv);
  els.exportExcelBtn.addEventListener("click", exportExcel);
  els.exportPdfBtn.addEventListener("click", exportPdf);
  els.csvImport.addEventListener("change", importCsv);
  els.editForm.addEventListener("submit", saveEditedTransaction);
  els.editType.addEventListener("change", () => fillCategoryOptions(els.editType.value, els.editCategory.value));
  els.closeModal.addEventListener("click", closeModal);
  els.editModal.addEventListener("click", (event) => {
    if (event.target === els.editModal) closeModal();
  });
  els.themeToggle.addEventListener("click", toggleTheme);
  window.addEventListener("beforeinstallprompt", handleInstallPrompt);
}

function loadState() {
  state.transactions = safeJsonParse(localStorage.getItem(STORAGE_KEY), []);
  state.settings = { ...state.settings, ...safeJsonParse(localStorage.getItem(SETTINGS_KEY), {}) };
}

function saveTransactions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.transactions));
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
}

function safeJsonParse(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function handleQuickSubmit(event) {
  event.preventDefault();
  const parsed = parseNaturalInput(els.naturalInput.value);
  if (!parsed.valid) {
    showToast(parsed.message, true);
    return;
  }

  state.transactions.unshift({
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
    date: today(),
    description: parsed.description,
    amount: parsed.amount,
    type: parsed.type,
    category: parsed.category
  });
  els.naturalInput.value = "";
  updateAiPreview();
  saveTransactions();
  renderAll();
  showToast("บันทึกรายการสำเร็จ");
}

function parseNaturalInput(input) {
  const raw = input.trim();
  if (!raw) return { valid: false, message: "กรุณากรอกรายละเอียดและจำนวนเงิน" };

  const amountMatch = raw.match(/(?:^|\s)(\d+(?:\.\d{1,2})?)\s*$/);
  if (!amountMatch) return { valid: false, message: "กรุณาระบุจำนวนเงินเป็นตัวเลขไว้ท้ายข้อความ เช่น ข้าว 50" };

  const amount = Number(amountMatch[1]);
  const description = raw.slice(0, amountMatch.index).trim();
  if (!description) return { valid: false, message: "กรุณากรอกรายละเอียดรายการ" };
  if (!Number.isFinite(amount) || amount <= 0) return { valid: false, message: "จำนวนเงินต้องมากกว่า 0 บาท" };

  const classification = classifyText(description);
  return {
    valid: true,
    description,
    amount,
    type: classification.type,
    category: classification.category
  };
}

function classifyText(text) {
  const normalized = text.toLowerCase();
  const income = findCategory(normalized, incomeCategories);
  if (income !== "อื่น ๆ") return { type: "income", category: income };

  const expense = findCategory(normalized, expenseCategories);
  if (expense !== "อื่น ๆ") return { type: "expense", category: expense };

  return { type: "expense", category: "อื่น ๆ" };
}

function findCategory(text, groups) {
  for (const [category, keywords] of Object.entries(groups)) {
    if (keywords.some((keyword) => text.includes(keyword.toLowerCase()))) return category;
  }
  return "อื่น ๆ";
}

function updateAiPreview() {
  const parsed = parseNaturalInput(els.naturalInput.value);
  if (!els.naturalInput.value.trim()) {
    els.aiPreview.textContent = "ระบบจะวิเคราะห์จำนวนเงิน ประเภท และหมวดหมู่ให้อัตโนมัติ";
    return;
  }
  els.aiPreview.textContent = parsed.valid
    ? `รายละเอียด: ${parsed.description} | จำนวนเงิน: ${formatMoney(parsed.amount)} | ประเภท: ${typeText(parsed.type)} | หมวดหมู่: ${parsed.category}`
    : parsed.message;
}

function handleBudgetSubmit(event) {
  event.preventDefault();
  const value = Number(els.budgetInput.value);
  if (!Number.isFinite(value) || value < 0) {
    showToast("งบประมาณต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป", true);
    return;
  }
  state.settings.monthlyBudget = value;
  els.budgetInput.value = "";
  saveSettings();
  renderAll();
  showToast("บันทึกงบประมาณแล้ว");
}

function updateFilter(key, value) {
  state.filters[key] = value;
  state.page = 1;
  renderTable();
  renderCharts();
}

function renderAll() {
  renderSummary();
  renderInsights();
  renderTable();
  renderCharts();
}

function renderSummary() {
  const income = sumByType("income", state.transactions);
  const expense = sumByType("expense", state.transactions);
  els.totalIncome.textContent = formatMoney(income);
  els.totalExpense.textContent = formatMoney(expense);
  els.balance.textContent = formatMoney(income - expense);
  els.totalCount.textContent = state.transactions.length.toLocaleString("th-TH");
  els.budgetDisplay.textContent = formatMoney(state.settings.monthlyBudget);

  const monthExpense = sumByType("expense", filterByPeriod(state.transactions, "month"));
  if (state.settings.monthlyBudget > 0 && monthExpense > state.settings.monthlyBudget) {
    showToast("แจ้งเตือน: ค่าใช้จ่ายเดือนนี้เกินงบประมาณแล้ว", true);
  }
}

function renderInsights() {
  const expenses = state.transactions.filter((item) => item.type === "expense");
  const uniqueDays = new Set(expenses.map((item) => item.date)).size || 1;
  const average = sumByType("expense", expenses) / uniqueDays;
  els.averageDaily.textContent = formatMoney(average);

  const categoryTotals = groupSum(expenses, "category");
  const top = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
  els.topCategory.textContent = top ? `${top[0]} (${formatMoney(top[1])})` : "ยังไม่มีข้อมูล";

  const latest = [...state.transactions].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
  els.latestItem.textContent = latest ? `${latest.description} ${formatMoney(latest.amount)}` : "ยังไม่มีรายการ";
}

function renderTable() {
  const filtered = getFilteredTransactions();
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  state.page = Math.min(state.page, totalPages);
  const start = (state.page - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);

  els.transactionBody.innerHTML = "";
  const fragment = document.createDocumentFragment();
  for (const item of pageItems) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(formatDate(item.date))}</td>
      <td>${escapeHtml(item.description)}</td>
      <td><span class="pill ${item.type}">${typeText(item.type)}</span></td>
      <td>${escapeHtml(item.category)}</td>
      <td>${formatMoney(item.amount)}</td>
      <td>
        <div class="action-cell">
          <button class="mini-btn" type="button" data-action="edit" data-id="${item.id}">แก้ไข</button>
          <button class="mini-btn delete" type="button" data-action="delete" data-id="${item.id}">ลบ</button>
        </div>
      </td>
    `;
    fragment.appendChild(tr);
  }
  els.transactionBody.appendChild(fragment);
  els.transactionBody.onclick = handleTableAction;
  els.emptyState.classList.toggle("show", filtered.length === 0);
  els.pageInfo.textContent = `หน้า ${state.page} / ${totalPages} (${filtered.length.toLocaleString("th-TH")} รายการ)`;
  els.prevPage.disabled = state.page <= 1;
  els.nextPage.disabled = state.page >= totalPages;
}

function getFilteredTransactions() {
  const search = state.filters.search.trim().toLowerCase();
  let items = filterByPeriod(state.transactions, state.filters.period);

  if (state.filters.type !== "all") {
    items = items.filter((item) => item.type === state.filters.type);
  }

  if (search) {
    items = items.filter((item) =>
      [item.description, item.category, typeText(item.type), item.amount, item.date]
        .join(" ")
        .toLowerCase()
        .includes(search)
    );
  }

  return sortTransactions(items, state.filters.sort);
}

function filterByPeriod(items, period) {
  if (period === "all") return [...items];
  const now = new Date();
  return items.filter((item) => {
    const date = new Date(`${item.date}T00:00:00`);
    if (period === "day") return isSameDay(date, now);
    if (period === "week") return daysBetween(date, now) <= 6;
    if (period === "month") return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    if (period === "year") return date.getFullYear() === now.getFullYear();
    return true;
  });
}

function sortTransactions(items, sort) {
  return [...items].sort((a, b) => {
    if (sort === "oldest") return new Date(a.date) - new Date(b.date);
    if (sort === "amountDesc") return b.amount - a.amount;
    if (sort === "amountAsc") return a.amount - b.amount;
    return new Date(b.date) - new Date(a.date);
  });
}

function handleTableAction(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const item = state.transactions.find((entry) => entry.id === button.dataset.id);
  if (!item) return;

  if (button.dataset.action === "edit") openEditModal(item);
  if (button.dataset.action === "delete") deleteTransaction(item.id);
}

function openEditModal(item) {
  els.editId.value = item.id;
  els.editDate.value = item.date;
  els.editDescription.value = item.description;
  els.editAmount.value = item.amount;
  els.editType.value = item.type;
  fillCategoryOptions(item.type, item.category);
  els.editModal.classList.add("show");
  els.editModal.setAttribute("aria-hidden", "false");
}

function closeModal() {
  els.editModal.classList.remove("show");
  els.editModal.setAttribute("aria-hidden", "true");
}

function fillCategoryOptions(type, selected = "อื่น ๆ") {
  const categories = Object.keys(type === "income" ? incomeCategories : expenseCategories);
  els.editCategory.innerHTML = categories.map((category) =>
    `<option value="${escapeHtml(category)}"${category === selected ? " selected" : ""}>${escapeHtml(category)}</option>`
  ).join("");
}

function saveEditedTransaction(event) {
  event.preventDefault();
  const amount = Number(els.editAmount.value);
  if (!els.editDate.value || !els.editDescription.value.trim() || !Number.isFinite(amount) || amount <= 0) {
    showToast("กรุณากรอกข้อมูลให้ครบและจำนวนเงินต้องมากกว่า 0", true);
    return;
  }

  const item = state.transactions.find((entry) => entry.id === els.editId.value);
  if (!item) return;
  item.date = els.editDate.value;
  item.description = els.editDescription.value.trim();
  item.amount = amount;
  item.type = els.editType.value;
  item.category = els.editCategory.value;
  saveTransactions();
  closeModal();
  renderAll();
  showToast("แก้ไขรายการแล้ว");
}

function deleteTransaction(id) {
  state.transactions = state.transactions.filter((item) => item.id !== id);
  saveTransactions();
  renderAll();
  showToast("ลบรายการแล้ว");
}

function changePage(step) {
  state.page += step;
  renderTable();
}

function renderCharts() {
  if (!window.Chart) return;
  const items = getFilteredTransactions();
  renderCategoryChart(items);
  renderMonthlyChart(state.transactions);
  renderDailyChart(items);
}

function renderCategoryChart(items) {
  const expenses = items.filter((item) => item.type === "expense");
  const data = groupSum(expenses, "category");
  upsertChart("categoryChart", "pie", Object.keys(data), Object.values(data), {
    backgroundColor: ["#2196f3", "#7dd3fc", "#60a5fa", "#38bdf8", "#93c5fd", "#0ea5e9", "#2563eb"]
  });
}

function renderMonthlyChart(items) {
  const months = Array.from({ length: 12 }, (_, index) => `${index + 1}`);
  const income = Array(12).fill(0);
  const expense = Array(12).fill(0);
  const year = new Date().getFullYear();
  items.forEach((item) => {
    const date = new Date(`${item.date}T00:00:00`);
    if (date.getFullYear() !== year) return;
    const target = item.type === "income" ? income : expense;
    target[date.getMonth()] += item.amount;
  });
  upsertChart("monthlyChart", "bar", months, [
    { label: "รายรับ", data: income, backgroundColor: "#16a34a" },
    { label: "รายจ่าย", data: expense, backgroundColor: "#ef4444" }
  ]);
}

function renderDailyChart(items) {
  const expenses = items.filter((item) => item.type === "expense");
  const data = groupSum(expenses, "date");
  const labels = Object.keys(data).sort().slice(-30);
  const values = labels.map((label) => data[label]);
  upsertChart("dailyChart", "line", labels.map(formatDate), values, {
    borderColor: "#2196f3",
    backgroundColor: "rgba(33, 150, 243, 0.16)",
    fill: true,
    tension: 0.35
  });
}

function upsertChart(id, type, labels, dataOrDatasets, style = {}) {
  const ctx = document.getElementById(id);
  const datasets = Array.isArray(dataOrDatasets) && dataOrDatasets[0]?.data
    ? dataOrDatasets
    : [{ label: "จำนวนเงิน", data: dataOrDatasets, ...style }];

  if (state.charts[id]) state.charts[id].destroy();
  state.charts[id] = new Chart(ctx, {
    type,
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom" }
      },
      scales: type === "pie" ? {} : {
        y: { beginAtZero: true }
      }
    }
  });
}

function exportCsv() {
  const csv = toCsv(getFilteredTransactions());
  downloadBlob(csv, "smart-money-student.csv", "text/csv;charset=utf-8");
}

function exportExcel() {
  const rows = getFilteredTransactions();
  const html = `
    <html><head><meta charset="UTF-8"></head><body>
    <table>
      <tr><th>วันที่</th><th>รายละเอียด</th><th>ประเภท</th><th>หมวดหมู่</th><th>จำนวนเงิน</th></tr>
      ${rows.map((item) => `<tr><td>${item.date}</td><td>${escapeHtml(item.description)}</td><td>${typeText(item.type)}</td><td>${escapeHtml(item.category)}</td><td>${item.amount}</td></tr>`).join("")}
    </table>
    </body></html>`;
  downloadBlob(html, "smart-money-student.xls", "application/vnd.ms-excel;charset=utf-8");
}

function exportPdf() {
  const rows = getFilteredTransactions();
  const popup = window.open("", "_blank");
  if (!popup) {
    showToast("Browser บล็อกหน้าต่าง Export PDF", true);
    return;
  }
  popup.document.write(`
    <html lang="th"><head><meta charset="UTF-8"><title>Smart Money Student Report</title>
    <style>body{font-family:Tahoma,sans-serif;padding:24px;color:#12304a}table{width:100%;border-collapse:collapse}th,td{border-bottom:1px solid #d9efff;padding:10px;text-align:left}h1{color:#2196f3}</style>
    </head><body><h1>Smart Money Student Report</h1>
    <p>Export: ${new Date().toLocaleString("th-TH")}</p>
    <table><thead><tr><th>วันที่</th><th>รายละเอียด</th><th>ประเภท</th><th>หมวดหมู่</th><th>จำนวนเงิน</th></tr></thead>
    <tbody>${rows.map((item) => `<tr><td>${formatDate(item.date)}</td><td>${escapeHtml(item.description)}</td><td>${typeText(item.type)}</td><td>${escapeHtml(item.category)}</td><td>${formatMoney(item.amount)}</td></tr>`).join("")}</tbody></table>
    <script>window.onload=()=>{window.print();};<\/script></body></html>
  `);
  popup.document.close();
}

function importCsv(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const rows = parseCsv(String(reader.result));
    const imported = rows.map(csvRowToTransaction).filter(Boolean);
    state.transactions = [...imported, ...state.transactions];
    saveTransactions();
    renderAll();
    showToast(`นำเข้า ${imported.length} รายการ`);
    event.target.value = "";
  };
  reader.readAsText(file, "UTF-8");
}

function csvRowToTransaction(row) {
  const date = row["วันที่"] || row.date || today();
  const description = row["รายละเอียด"] || row.description || "";
  const amount = Number(row["จำนวนเงิน"] || row.amount);
  const typeValue = row["ประเภท"] || row.type || "expense";
  const type = typeValue === "รายรับ" || typeValue === "income" ? "income" : "expense";
  const category = row["หมวดหมู่"] || row.category || "อื่น ๆ";
  if (!description.trim() || !Number.isFinite(amount) || amount <= 0) return null;
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
    date,
    description: description.trim(),
    amount,
    type,
    category
  };
}

function toCsv(rows) {
  const header = ["วันที่", "รายละเอียด", "ประเภท", "หมวดหมู่", "จำนวนเงิน"];
  const body = rows.map((item) => [
    item.date,
    item.description,
    typeText(item.type),
    item.category,
    item.amount
  ]);
  return [header, ...body].map((row) => row.map(csvEscape).join(",")).join("\n");
}

function parseCsv(text) {
  const cleanText = text.replace(/^\uFEFF/, "");
  const lines = cleanText.split(/\r?\n/).filter(Boolean).map(parseCsvLine);
  const headers = lines.shift() || [];
  return lines.map((line) => Object.fromEntries(headers.map((header, index) => [header, line[index] || ""])));
}

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"' && line[i + 1] === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function downloadBlob(content, fileName, type) {
  const blob = new Blob(["\uFEFF", content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function toggleTheme() {
  state.settings.theme = state.settings.theme === "dark" ? "light" : "dark";
  saveSettings();
  applyTheme();
}

function applyTheme() {
  document.body.classList.toggle("dark", state.settings.theme === "dark");
  els.themeToggle.textContent = state.settings.theme === "dark" ? "☀" : "☾";
}

let deferredInstallPrompt = null;

function handleInstallPrompt(event) {
  event.preventDefault();
  deferredInstallPrompt = event;
  els.installBtn.hidden = false;
  els.installBtn.onclick = async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    els.installBtn.hidden = true;
  };
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("service-worker.js").catch(() => {
      showToast("Service Worker ยังไม่พร้อมใช้งาน", true);
    });
  }
}

function sumByType(type, items) {
  return items.filter((item) => item.type === type).reduce((sum, item) => sum + Number(item.amount), 0);
}

function groupSum(items, key) {
  return items.reduce((acc, item) => {
    acc[item[key]] = (acc[item[key]] || 0) + Number(item.amount);
    return acc;
  }, {});
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function formatMoney(value) {
  return `${Number(value || 0).toLocaleString("th-TH", { maximumFractionDigits: 2 })} บาท`;
}

function typeText(type) {
  return type === "income" ? "รายรับ" : "รายจ่าย";
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function daysBetween(a, b) {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.abs(Math.floor((stripTime(b) - stripTime(a)) / oneDay));
}

function stripTime(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showToast(message, isError = false) {
  els.toast.textContent = message;
  els.toast.style.background = isError ? "#ef4444" : "#0f62c9";
  els.toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => els.toast.classList.remove("show"), 2800);
}
