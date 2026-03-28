import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const expenseFilePath = path.join(__dirname, "..", "data", "personal-expenses.json");

function formatCurrency(amount, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

function getCurrentMonthKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function isExpenseQuestion(userPrompt) {
  const normalized = userPrompt.toLowerCase();

  return (
    normalized.includes("expense") ||
    normalized.includes("spend") ||
    normalized.includes("spent") ||
    normalized.includes("budget")
  );
}

async function loadExpenseData() {
  const raw = await readFile(expenseFilePath, "utf8");
  return JSON.parse(raw);
}

function buildExpenseSummary(data, monthKey) {
  const entries = Array.isArray(data.expenses)
    ? data.expenses.filter((entry) => String(entry.date).startsWith(monthKey))
    : [];

  if (entries.length === 0) {
    return `No expense records found for ${monthKey}.`;
  }

  const currency = data.currency ?? "USD";
  const total = entries.reduce((sum, entry) => sum + Number(entry.amount ?? 0), 0);
  const byCategory = {};

  for (const entry of entries) {
    const category = entry.category ?? "other";
    byCategory[category] = (byCategory[category] ?? 0) + Number(entry.amount ?? 0);
  }

  const categoryLines = Object.entries(byCategory)
    .sort((left, right) => right[1] - left[1])
    .map(([category, amount]) => `- ${category}: ${formatCurrency(amount, currency)}`);

  const itemLines = entries.map(
    (entry) =>
      `- ${entry.date}: ${entry.title} (${entry.category}) ${formatCurrency(Number(entry.amount ?? 0), currency)}`,
  );

  return [
    `Expense month: ${monthKey}`,
    `Total spent: ${formatCurrency(total, currency)}`,
    "Category totals:",
    ...categoryLines,
    "Expense items:",
    ...itemLines,
  ].join("\n");
}

export async function getExpenseToolContext() {
  const expenseData = await loadExpenseData();
  const monthKey = getCurrentMonthKey();

  return {
    toolName: "personal_expenses_this_month",
    content: buildExpenseSummary(expenseData, monthKey),
  };
}
