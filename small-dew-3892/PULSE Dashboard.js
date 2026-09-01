// P.U.L.S.E Dashboard — Scriptable Home Screen Widget (v2)
// Numbers now reset every week automatically, based on "DATE OF ACTION".
//
// STEP 1: Paste your LIVE Google Sheet's Apps Script URL below
// (ends in /exec). This is a NEW link — deploy the updated Code.gs
// on your live sheet first, then paste that link here.
const API_URL = "PASTE_YOUR_LIVE_SHEET_URL_HERE";

async function main() {
  const widget = new ListWidget();
  widget.backgroundColor = new Color("#111827");
  widget.setPadding(14, 14, 14, 14);

  if (!API_URL || API_URL.indexOf("PASTE_YOUR") === 0) {
    showMessage(widget, "Setup needed", "Open this script in Scriptable and paste your live Google Apps Script URL at the top.");
    finish(widget);
    return;
  }

  let data;
  try {
    const req = new Request(API_URL);
    req.headers = { "Accept": "application/json" };
    const raw = await req.loadString();
    let json;
    try {
      json = JSON.parse(raw);
    } catch (parseErr) {
      showMessage(widget, "Bad response", "The link didn't return data. In Apps Script: Deploy > Manage deployments > Edit > 'Who has access' must be 'Anyone'.");
      finish(widget);
      return;
    }
    if (json.error) {
      showMessage(widget, "Backend error", String(json.error));
      finish(widget);
      return;
    }
    data = json.data || json;
  } catch (netErr) {
    showMessage(widget, "Can't connect", "Check your internet connection and that the link is correct.");
    finish(widget);
    return;
  }

  buildDashboard(widget, data);
  finish(widget);
}

function buildDashboard(widget, data) {
  const approach = data.APPROACH || [];
  const presentation = data.PRESENTATION || [];
  const closing = data.CLOSING || [];
  const sr = data.SR || [];

  const weekStart = getWeekStart(new Date());
  const weekEnd = getWeekEnd(weekStart);

  const approachWeek = countThisWeek(approach, weekStart, weekEnd);
  const presentationWeek = countThisWeek(presentation, weekStart, weekEnd);
  const closingWeek = countThisWeek(closing, weekStart, weekEnd);
  const srWeek = countThisWeek(sr, weekStart, weekEnd);

  // Header
  const header = widget.addStack();
  header.centerAlignContent();
  const title = header.addText("P.U.L.S.E");
  title.font = Font.boldSystemFont(15);
  title.textColor = new Color("#60a5fa");
  header.addSpacer();
  const dateText = header.addText(formatToday());
  dateText.font = Font.systemFont(11);
  dateText.textColor = new Color("#9ca3af");

  widget.addSpacer(2);
  const weekLabel = widget.addText("This week (" + formatShort(weekStart) + " - " + formatShort(weekEnd) + ")");
  weekLabel.font = Font.systemFont(9);
  weekLabel.textColor = new Color("#6b7280");

  widget.addSpacer(8);

  // Metric row: resets every week
  const metrics = widget.addStack();
  metrics.spacing = 6;
  addMetric(metrics, "Appr.", approachWeek, "#60a5fa");
  addMetric(metrics, "Pres.", presentationWeek, "#facc15");
  addMetric(metrics, "Clos.", closingWeek, "#34d399");
  addMetric(metrics, "SR", srWeek, "#f472b6");

  widget.addSpacer(12);

  // Today's action items: birthdays, payments due, follow-ups
  const items = getTodayItems(approach, presentation, closing, sr);
  const listTitle = widget.addText("TODAY");
  listTitle.font = Font.boldSystemFont(10);
  listTitle.textColor = new Color("#6b7280");
  widget.addSpacer(4);

  if (items.length === 0) {
    const none = widget.addText("Nothing due today");
    none.font = Font.systemFont(12);
    none.textColor = new Color("#9ca3af");
  } else {
    items.slice(0, 4).forEach(function (item) {
      const row = widget.addStack();
      row.centerAlignContent();
      const dot = row.addText("- ");
      dot.textColor = new Color(item.color);
      const label = row.addText(item.name + " - " + item.detail);
      label.font = Font.systemFont(12);
      label.textColor = Color.white();
      label.lineLimit = 1;
      widget.addSpacer(3);
    });
  }
}

function addMetric(stack, label, value, hex) {
  const box = stack.addStack();
  box.layoutVertically();
  box.centerAlignContent();
  box.backgroundColor = new Color("#1f2937");
  box.cornerRadius = 8;
  box.setPadding(6, 4, 6, 4);
  const valText = box.addText(String(value));
  valText.font = Font.boldSystemFont(16);
  valText.textColor = new Color(hex);
  valText.centerAlignText();
  const labText = box.addText(label);
  labText.font = Font.systemFont(9);
  labText.textColor = new Color("#9ca3af");
  labText.centerAlignText();
}

// Counts rows whose "dateOfAction" falls within [start, end] (inclusive).
function countThisWeek(rows, start, end) {
  let count = 0;
  rows.forEach(function (row) {
    const d = parseDate(row.dateOfAction);
    if (d && d >= start && d <= end) count++;
  });
  return count;
}

function getTodayItems(approach, presentation, closing, sr) {
  const today = new Date();
  const items = [];

  closing.forEach(function (row) {
    if (row.birthday) {
      const d = parseDate(row.birthday);
      if (d && d.getMonth() === today.getMonth() && d.getDate() === today.getDate()) {
        items.push({ name: row.name || "Unknown", detail: "Birthday", color: "#facc15" });
      }
    }
    if (row.paymentDue) {
      const d = parseDate(row.paymentDue);
      if (d && isSameDay(d, today)) {
        items.push({ name: row.name || "Unknown", detail: "Payment due", color: "#34d399" });
      }
    }
  });

  [].concat(approach, presentation, closing, sr).forEach(function (row) {
    if (row.followUpDate) {
      const d = parseDate(row.followUpDate);
      if (d && isSameDay(d, today)) {
        items.push({ name: row.name || "Unknown", detail: "Follow-up", color: "#f472b6" });
      }
    }
  });

  return items;
}

// Handles both "2026-07-17" (from real date cells) and "17/07/2026"
// (from manually typed text) formats.
function parseDate(val) {
  if (!val) return null;
  const str = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }
  const parts = str.split("/");
  if (parts.length === 3) {
    const d = new Date(parts[2], parts[1] - 1, parts[0]);
    return isNaN(d.getTime()) ? null : d;
  }
  const fallback = new Date(str);
  return isNaN(fallback.getTime()) ? null : fallback;
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// Monday of the current week, at midnight.
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday, 1 = Monday, ...
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Sunday of the current week, at 23:59:59.
function getWeekEnd(weekStart) {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

function formatToday() {
  const now = new Date();
  return now.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatShort(date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function showMessage(widget, title, body) {
  const t = widget.addText(title);
  t.font = Font.boldSystemFont(14);
  t.textColor = Color.white();
  widget.addSpacer(6);
  const b = widget.addText(body);
  b.font = Font.systemFont(11);
  b.textColor = new Color("#9ca3af");
}

function finish(widget) {
  if (config.runsInWidget) {
    Script.setWidget(widget);
  } else {
    widget.presentMedium();
  }
  Script.complete();
}

await main();
