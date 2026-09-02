/**
 * =====================================================================
 * P.U.L.S.E — Combined Google Apps Script (HEADER-BASED VERSION)
 * -----------------------------------------------------------------
 * This REPLACES your existing Code.gs. Every single automation below
 * now finds its columns by reading the HEADER TEXT (e.g. "NAME",
 * "BIRTHDAY", "NATURE") instead of assuming a fixed column number or
 * letter. You can freely reorder, insert, or remove columns on any
 * tab (APPROACH / PRESENTATION / CLOSING / SR) and everything below
 * will keep finding the right column automatically, AS LONG AS the
 * header text itself stays the same (e.g. don't rename "NAME" to
 * "CLIENT NAME" unless you also add that to COLUMN_HEADER_LABELS
 * below).
 *
 * New: a "Check Column Mapping" menu item lets you verify, any time
 * (especially right after moving a column), exactly which column
 * each automation is currently using on each tab.
 *
 * UPDATED IN THIS VERSION (for the Payment Mode / advance reminder
 * request): a new PAYMENT MODE column (Monthly / Quarterly /
 * Half-Yearly / Yearly) so an overdue premium due date rolls forward
 * to the next cycle by itself, plus a second, earlier "advance
 * notice" reminder tier (see PART 3) alongside the existing close-up
 * one. Everything else is unchanged from the script you shared.
 *
 * PART 0 — Shared header-lookup engine (used by everything below).
 * PART 1 — Row-moving / auto-deadline / week-day automation.
 * PART 2 — The JSON API the mobile web dashboard (index.html) talks to.
 * PART 3 — WhatsApp birthday & premium reminder links (click-to-send).
 * PART 4 — Custom blast-list WhatsApp link formulas.
 * PART 5 — Automatic birthday voucher email.
 * PART 6 — Diagnostic tools (voucher email + column mapping).
 * PART 7 — Bulk email tool: (a) send to whoever's on the current
 *          tracker tab, or (b) a free-typed "blast list" of names/
 *          emails living right below the template on the EMAIL
 *          TEMPLATE tab — same idea as your WhatsApp BLAST LIST, but
 *          it sends every email automatically in one click (no
 *          per-message tap needed like WhatsApp requires). Includes
 *          a "Delete All Sent" cleanup for that list. Message
 *          formatting: **bold**, *italic*, "- " bullets, and
 *          Alt+Enter (Option+Enter on Mac) for line breaks / blank
 *          lines inside the template cell.
 * PART 8 — Activity Log + Performance Tracker. Every time a row is
 *          newly dated on a tab, or moved to a new stage (Approach ->
 *          Presentation -> Closing, or -> SR), it's permanently
 *          recorded on an "ACTIVITY LOG" tab. This is what makes
 *          "how many approaches this year" a true running total that
 *          doesn't shrink when a row later moves to Presentation or
 *          Closing (moving a row also STAMPS today's date onto it, so
 *          it counts as this stage's own event too -- ask before
 *          assuming a row's Date of Action is still its original
 *          approach date). PERFORMANCE_TRACKER's formulas are updated
 *          (via a one-time menu button) to read from this log instead
 *          of counting live rows on each tab.
 * PART 9 — One-click import of Payment Mode + Mailing Address from a
 *          pasted Manulife client export, matched by Policy Number.
 *
 * THIS IS THE ONLY FILE YOU NEED. If you previously added a separate
 * "BulkEmail.gs" file, you can delete it — everything it did is now
 * folded into Part 7 below, using the same shared header-lookup engine
 * as the rest of the script.
 * =====================================================================
 */

// ===================================================================
// PART 0 — SHARED HEADER-LOOKUP ENGINE
// ===================================================================

// Every field any automation needs, and the header text(s) that count
// as a match (all caps, exact match after trimming). Add more variants
// here any time — e.g. if you rename a header, add the new text as an
// extra candidate rather than replacing the old one, so both old and
// new sheets/copies keep working.
var COLUMN_HEADER_LABELS = {
  status: ['PRESENTATION / CLOSING / SR', 'A / P / C', 'S / R', 'STATUS'],
  week: ['WEEK RANGE'],
  day: ['DAY'],
  dateOfAction: ['DATE OF ACTION'],
  name: ['NAME'],
  contact: ['CONTACT'],
  policyNumber: ['POLICY NUMBER'],
  productProposed: ['PRODUCT PROPOSED'],
  nature: ['NATURE'],
  percentage: ['PERCENTAGE'],
  followUpDate: ['DATE OF FOLLOW UP UPDATE', 'DATE OF FOLLOW UP'],
  remarks: ['FOLLOW UP UPDATE REMARKS', 'REMARKS'],
  birthday: ['BIRTHDAY', 'CLIENT BIRTHDAY'],
  paymentDue: ['PREMIUM DUE DATE', 'PAYMENT DUE DATE', 'PAYMENT DUE'],
  paymentMode: ['PAYMENT MODE', 'PREMIUM MODE'],
  mailingAddress: ['MAILING ADDRESS', 'ADDRESS'],
  email: ['EMAIL'],
  voucherSent: ['VOUCHER SENT'],
  greetingSent: ['GREETING SENT'],
  reminderSent: ['REMINDER SENT'],
  advanceReminderSent: ['ADVANCE REMINDER SENT'],
  originalDate: ['DATE FIRST APPROACHED', 'FIRST APPROACHED', 'ORIGINAL DATE OF ACTION', 'ORIGINAL DATE']
};

/**
 * Converts a 1-based column number to its A1 letter (1 -> "A", 27 -> "AA").
 */
function colToA1_(col) {
  var letter = '';
  while (col > 0) {
    var rem = (col - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    col = Math.floor((col - 1) / 26);
  }
  return letter;
}

/**
 * THE central header-lookup function. Scans rows 1-10 for a "NAME"
 * cell to find which physical row holds your real column headers,
 * then reads that row and matches every field in COLUMN_HEADER_LABELS
 * against it. Returns an object like:
 *   { status: 0, name: 4, contact: 5, ..., _headerRow: 10, _dataStartRow: 11 }
 * (0-based column indexes; -1 means "not found on this tab").
 */
function getColumnMap_(sheet) {
  var lastCol = sheet.getLastColumn();
  var scanRows = Math.min(10, sheet.getLastRow() || 1);
  var cols = {};
  for (var field in COLUMN_HEADER_LABELS) cols[field] = -1;

  if (lastCol < 1 || scanRows < 1) {
    cols.status = 0;
    cols._headerRow = 1;
    cols._dataStartRow = 2;
    return cols;
  }

  var block = sheet.getRange(1, 1, scanRows, lastCol).getValues();
  var headerRow = -1;
  for (var r = 0; r < block.length; r++) {
    for (var c = 0; c < block[r].length; c++) {
      if (String(block[r][c]).trim().toUpperCase() === 'NAME') {
        headerRow = r + 1; // 1-based
        break;
      }
    }
    if (headerRow !== -1) break;
  }
  if (headerRow === -1) headerRow = scanRows; // best-effort fallback

  var headers = sheet.getRange(headerRow, 1, 1, lastCol).getValues()[0]
    .map(function (h) { return String(h).trim().toUpperCase(); });

  for (var c2 = 0; c2 < headers.length; c2++) {
    var label = headers[c2];
    if (!label) continue;
    for (var field2 in COLUMN_HEADER_LABELS) {
      if (cols[field2] !== -1) continue;
      var candidates = COLUMN_HEADER_LABELS[field2];
      for (var i = 0; i < candidates.length; i++) {
        // "starts with" on purpose: real header cells often have extra
        // instructions typed into the same cell, e.g. "DATE OF ACTION
        // (Double click the CELL to use DATE PICKER)" -- an exact match
        // would miss that column entirely.
        if (label.indexOf(candidates[i]) === 0) { cols[field2] = c2; break; }
      }
    }
  }

  if (cols.status === -1) cols.status = 0; // safety net: assume column A if no match

  cols._headerRow = headerRow;
  cols._dataStartRow = headerRow + 1;
  return cols;
}

// Adds whichever of GREETING SENT / REMINDER SENT / ADVANCE REMINDER SENT
// are missing from this tab's header row (only the ones relevant to
// columns the tab actually has -- birthday and/or payment due date), then
// returns a freshly re-scanned column map. These columns are what "Mark
// Sent" writes to; without them the tick has nothing to persist to and
// the reminder just reappears on the next refresh.
function ensureReminderTrackingColumns_(sheet, cols) {
  var toAdd = [];
  if (cols.birthday > -1 && cols.greetingSent === -1) toAdd.push("GREETING SENT");
  if (cols.paymentDue > -1 && cols.reminderSent === -1) toAdd.push("REMINDER SENT");
  if (cols.paymentDue > -1 && cols.advanceReminderSent === -1) toAdd.push("ADVANCE REMINDER SENT");
  if (toAdd.length === 0) return cols;

  var startCol = sheet.getLastColumn() + 1;
  sheet.getRange(cols._headerRow, startCol, 1, toAdd.length).setValues([toAdd]).setFontWeight("bold");
  return getColumnMap_(sheet);
}

// Kept as an alias so BulkEmail.gs (which calls findFieldColumns_)
// keeps working unchanged.
function findFieldColumns_(sheet) {
  return getColumnMap_(sheet);
}

/**
 * Writes today's (or the given) date into a row's Date of Action
 * column, and recalculates Week/Day to match -- used when a row is
 * moved to a new stage by script (setValue() doesn't trigger onEdit
 * on its own, so this has to be done explicitly).
 */
function stampDateAndWeekDay_(sheet, cols, rowNum, dateVal) {
  if (cols.dateOfAction === -1) return;
  sheet.getRange(rowNum, cols.dateOfAction + 1).setValue(dateVal).setNumberFormat("yyyy-mm-dd");

  var firstDay = new Date(dateVal.getFullYear(), dateVal.getMonth(), 1).getDay();
  var offset = (firstDay + 6) % 7;
  var weekNum = Math.ceil((dateVal.getDate() + offset) / 7);
  var dayName = Utilities.formatDate(dateVal, Session.getScriptTimeZone(), "EEEE");

  if (cols.week > -1) sheet.getRange(rowNum, cols.week + 1).setValue("Week " + weekNum);
  if (cols.day > -1) sheet.getRange(rowNum, cols.day + 1).setValue(dayName);
}

/**
 * Finds (or creates) the "DATE FIRST APPROACHED" column on a tab, so
 * the original date is never lost even though Date of Action gets
 * overwritten to "today" every time a row changes stage. Updates the
 * passed-in `cols` object too, so callers don't need to re-look it up.
 */
function ensureOriginalDateColumn_(sheet, cols) {
  if (cols.originalDate > -1) return cols.originalDate;
  var headerRow = cols._headerRow;
  var newCol = sheet.getLastColumn() + 1;
  sheet.getRange(headerRow, newCol).setValue("DATE FIRST APPROACHED");
  cols.originalDate = newCol - 1; // 0-based
  return cols.originalDate;
}

/**
 * If the row's "DATE FIRST APPROACHED" cell is still empty, fills it
 * with dateVal. Never overwrites an existing value -- the point is to
 * capture the EARLIEST date a row ever had, once, and leave it alone
 * after that.
 */
function preserveOriginalDate_(sheet, cols, rowNum, dateVal) {
  if (!dateVal) return;
  var colIdx = ensureOriginalDateColumn_(sheet, cols);
  var cell = sheet.getRange(rowNum, colIdx + 1);
  if (!cell.getValue()) {
    cell.setValue(dateVal).setNumberFormat("yyyy-mm-dd");
  }
}

/**
 * One-time setup: adds the "DATE FIRST APPROACHED" column to all four
 * tracker tabs together, in the same run, so they land in the same
 * relative column position on each (important since the row-move
 * logic copies whole rows by position between these tabs).
 */
function addOriginalDateColumnToAllTabs() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tabs = ["APPROACH", "PRESENTATION", "CLOSING", "SR"];
  var added = [];

  tabs.forEach(function (tabName) {
    var sheet = ss.getSheetByName(tabName);
    if (!sheet) return;
    var cols = getColumnMap_(sheet);
    if (cols.originalDate === -1) {
      ensureOriginalDateColumn_(sheet, cols);
      added.push(tabName);
    }
  });

  SpreadsheetApp.getActive().toast(
    added.length > 0
      ? 'Added "DATE FIRST APPROACHED" to: ' + added.join(", ") + "."
      : 'Every tab already has a "DATE FIRST APPROACHED" column.',
    "PULSE Reminders", 5
  );
}


// ===================================================================
// PART 1 — ROW-MOVING / AUTO-DEADLINE / WEEK-DAY AUTOMATION
// ===================================================================

function onEdit(e) {
  var range = e.range;
  var sheet = range.getSheet();
  var sheetName = sheet.getName();
  var row = range.getRow();
  var column = range.getColumn();
  var value = range.getValue();

  // Ticking "Mark Sent" on the reminders sheet -- this sheet's layout is
  // fully controlled by our own writeReminderSheet(), so its column
  // position is intentionally kept fixed rather than header-looked-up.
  if (sheetName === REMINDER_SHEET_NAME) {
    if (column === REMINDER_COL_MARK_SENT && row > 1 && value === true) {
      markReminderSent_(sheet, row);
    }
    return;
  }

  var allowedSheets = ["APPROACH", "PRESENTATION", "CLOSING", "SR"];
  if (allowedSheets.indexOf(sheetName) === -1) return;

  var cols = getColumnMap_(sheet);
  if (row <= cols._headerRow) return; // ignore edits on/above the header row

  // --- Status column edited: move the row to the matching tab ---
  if (column === cols.status + 1) {
    var rawStatus = value;
    if (!rawStatus) return;

    var statusValue = String(rawStatus).toUpperCase().trim();
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var targetSheetAPC = ss.getSheetByName(statusValue);
    if (!targetSheetAPC || sheetName === targetSheetAPC.getName()) return;

    var targetCols = getColumnMap_(targetSheetAPC);
    var targetStatusLetter = colToA1_(targetCols.status + 1);
    var targetValuesAPC = targetSheetAPC
      .getRange(targetStatusLetter + targetCols._dataStartRow + ":" + targetStatusLetter)
      .getValues();
    var nextRowAPC = targetCols._dataStartRow;
    for (var j = 0; j < targetValuesAPC.length; j++) {
      if (targetValuesAPC[j][0] === "") {
        nextRowAPC = targetCols._dataStartRow + j;
        break;
      }
    }

    var moveDate = new Date();
    moveDate.setHours(0, 0, 0, 0);

    if (statusValue === "SR") {
      var nameValue = cols.name > -1 ? sheet.getRange(row, cols.name + 1).getValue() : "";
      var contactValue = cols.contact > -1 ? sheet.getRange(row, cols.contact + 1).getValue() : "";

      // SR only copies name/contact across (not the whole row), so the
      // original date has to be carried over explicitly: use the
      // source's own "DATE FIRST APPROACHED" if it already has one,
      // otherwise fall back to its current Date of Action.
      var sourceOriginalDate = null;
      if (cols.originalDate > -1) {
        sourceOriginalDate = sheet.getRange(row, cols.originalDate + 1).getValue();
      }
      if (!sourceOriginalDate && cols.dateOfAction > -1) {
        sourceOriginalDate = sheet.getRange(row, cols.dateOfAction + 1).getValue();
      }

      if (targetCols.name > -1) targetSheetAPC.getRange(nextRowAPC, targetCols.name + 1).setValue(nameValue);
      if (targetCols.contact > -1) targetSheetAPC.getRange(nextRowAPC, targetCols.contact + 1).setValue(contactValue);
      targetSheetAPC.getRange(nextRowAPC, targetCols.status + 1).setValue("SR");
      preserveOriginalDate_(targetSheetAPC, targetCols, nextRowAPC, sourceOriginalDate);
      stampDateAndWeekDay_(targetSheetAPC, targetCols, nextRowAPC, moveDate);
      logActivity_("SR", nameValue, contactValue, moveDate);
      return;
    } else {
      // Whole-row copy: works as long as this tab and the target tab
      // share the same column layout as each other (they're meant to
      // mirror one another). If you reorder columns, do it identically
      // across APPROACH / PRESENTATION / CLOSING so this stays correct.
      var numCols = sheet.getLastColumn();
      if (numCols < 1) numCols = 1;
      var sourceRange = sheet.getRange(row, 1, 1, numCols);
      var destination = targetSheetAPC.getRange(nextRowAPC, 1);
      sourceRange.copyTo(destination);

      // Before we overwrite Date of Action with today, capture whatever
      // it currently holds (copied over from the source row) into
      // "DATE FIRST APPROACHED" -- but only if that column is still
      // empty, so the EARLIEST date ever recorded is what sticks, no
      // matter how many times this row moves stages after this.
      var priorDateOfAction = targetCols.dateOfAction > -1
        ? targetSheetAPC.getRange(nextRowAPC, targetCols.dateOfAction + 1).getValue()
        : null;
      preserveOriginalDate_(targetSheetAPC, targetCols, nextRowAPC, priorDateOfAction);

      // The Date of Action now reflects when THIS stage happened (e.g.
      // when it became a Closing), not the original approach date --
      // that's the "Option 1" behavior you asked for. Week/Day and the
      // Activity Log entry are updated to match, since a script-driven
      // change doesn't re-trigger onEdit on its own.
      var movedName = targetCols.name > -1 ? targetSheetAPC.getRange(nextRowAPC, targetCols.name + 1).getValue() : "";
      var movedContact = targetCols.contact > -1 ? targetSheetAPC.getRange(nextRowAPC, targetCols.contact + 1).getValue() : "";
      stampDateAndWeekDay_(targetSheetAPC, targetCols, nextRowAPC, moveDate);
      logActivity_(statusValue, movedName, movedContact, moveDate);

      sheet.deleteRow(row);
      return;
    }
  }

  // --- Nature column edited: auto-calculate follow-up deadline + sort ---
  if (cols.nature > -1 && column === cols.nature + 1) {
    if (range.getNumRows() !== 1 || range.getNumColumns() !== 1) return;
    if (cols.followUpDate === -1) return; // nowhere to write the deadline

    var natureValue = String(value).toLowerCase().trim();
    var daysToAdd = 0;
    if (natureValue === "hot") daysToAdd = 3;
    else if (natureValue === "warm" || natureValue === "f2") daysToAdd = 14;
    else if (natureValue === "cold" || natureValue === "f3") daysToAdd = 30;

    if (daysToAdd === 0) {
      sheet.getRange(row, cols.followUpDate + 1).clearContent();
      return;
    }

    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var futureDate = new Date(today.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
    sheet.getRange(row, cols.followUpDate + 1).setValue(futureDate).setNumberFormat("yyyy-mm-dd");

    SpreadsheetApp.flush();

    var lastRow = sheet.getLastRow();
    if (lastRow > cols._headerRow) {
      var numColumns = sheet.getLastColumn();
      var fullRange = sheet.getRange(cols._dataStartRow, 1, lastRow - cols._headerRow, numColumns);
      var data = fullRange.getValues();

      data.sort(function (a, b) {
        var valA = a[cols.followUpDate];
        var valB = b[cols.followUpDate];
        var dateA = (valA instanceof Date) ? valA : (valA ? new Date(valA) : null);
        var dateB = (valB instanceof Date) ? valB : (valB ? new Date(valB) : null);
        var hasDateA = dateA && !isNaN(dateA.getTime());
        var hasDateB = dateB && !isNaN(dateB.getTime());
        if (!hasDateA && !hasDateB) return 0;
        if (!hasDateA) return 1;
        if (!hasDateB) return -1;
        var diffA = dateA.getTime() - today.getTime();
        var diffB = dateB.getTime() - today.getTime();
        if (diffA >= 0 && diffB >= 0) return diffA - diffB;
        if (diffA < 0 && diffB < 0) return diffB - diffA;
        return diffA >= 0 ? -1 : 1;
      });

      fullRange.setValues(data);
    }
    return;
  }

  // --- Date of Action edited: auto-fill Week / Day ---
  if (cols.dateOfAction > -1 && column === cols.dateOfAction + 1) {
    var dateVal = value;

    if (!dateVal || !(dateVal instanceof Date)) {
      if (cols.week > -1) sheet.getRange(row, cols.week + 1).clearContent();
      if (cols.day > -1) sheet.getRange(row, cols.day + 1).clearContent();
      return;
    }

    var firstDay = new Date(dateVal.getFullYear(), dateVal.getMonth(), 1).getDay();
    var offset = (firstDay + 6) % 7;
    var weekNum = Math.ceil((dateVal.getDate() + offset) / 7);
    var dayName = Utilities.formatDate(dateVal, Session.getScriptTimeZone(), "EEEE");

    if (cols.week > -1) sheet.getRange(row, cols.week + 1).setValue("Week " + weekNum);
    if (cols.day > -1) sheet.getRange(row, cols.day + 1).setValue(dayName);

    // Also log this as an activity on whichever tab it happened on --
    // this is what catches a brand-new row typed straight into a tab
    // (a move between tabs is already logged separately, above). Note:
    // correcting an existing date later will also log again -- if that
    // happens, just delete the extra row on the ACTIVITY LOG tab.
    var nameForLog = cols.name > -1 ? sheet.getRange(row, cols.name + 1).getValue() : "";
    var contactForLog = cols.contact > -1 ? sheet.getRange(row, cols.contact + 1).getValue() : "";
    logActivity_(sheetName, nameForLog, contactForLog, dateVal);

    // First time this row ever gets a real date, capture it as the
    // original -- later moves to other stages won't overwrite this.
    preserveOriginalDate_(sheet, cols, row, dateVal);
  }
}


// ==========================================
// ONE-TIME SETUP FUNCTION — dropdowns, colors, protections. Header-based.
// ==========================================
function setupSheetProtection() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetsToSetup = ["APPROACH", "PRESENTATION", "CLOSING", "SR"];

  sheetsToSetup.forEach(function (sheetName) {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) return;

    var cols = getColumnMap_(sheet);
    var dataStart = cols._dataStartRow;
    var lastCol = Math.max(sheet.getLastColumn(), 11);

    if (cols.status > -1) {
      var statusLetter = colToA1_(cols.status + 1);
      var statusRule = SpreadsheetApp.newDataValidation()
        .requireValueInList(["APPROACH", "PRESENTATION", "CLOSING", "SR"], true)
        .setAllowInvalid(false)
        .setHelpText("Pick a status to move this row to that sheet")
        .build();
      sheet.getRange(statusLetter + dataStart + ":" + statusLetter + "1000").setDataValidation(statusRule);
    }

    if (cols.nature > -1) {
      var natureLetter = colToA1_(cols.nature + 1);
      var natureRule = SpreadsheetApp.newDataValidation()
        .requireValueInList(["Hot", "Warm", "Cold", "F2", "F3"], true)
        .setAllowInvalid(false)
        .setHelpText("Pick nature to auto-calculate deadline")
        .build();
      sheet.getRange(natureLetter + dataStart + ":" + natureLetter + "1000").setDataValidation(natureRule);
    }

    var range = sheet.getRange(dataStart, 1, Math.max(1000 - dataStart + 1, 1), lastCol);
    var rules = sheet.getConditionalFormatRules();
    rules = rules.filter(function (r) {
      var ranges = r.getRanges();
      return !ranges.some(function (rg) { return rg.getA1Notation() === range.getA1Notation(); });
    });

    if (cols.followUpDate > -1) {
      var fLetter = colToA1_(cols.followUpDate + 1);
      rules.push(SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied('=AND($' + fLetter + dataStart + '<>"", $' + fLetter + dataStart + '<TODAY())')
        .setBold(true)
        .setFontColor("#B71C1C")
        .setRanges([range])
        .build());
    }

    if (cols.nature > -1) {
      var nLetter = colToA1_(cols.nature + 1);
      rules.push(SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied('=LOWER($' + nLetter + dataStart + ')="hot"')
        .setBackground("#FFCDD2")
        .setRanges([range])
        .build());
      rules.push(SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied('=OR(LOWER($' + nLetter + dataStart + ')="warm", LOWER($' + nLetter + dataStart + ')="f2")')
        .setBackground("#FFE0B2")
        .setRanges([range])
        .build());
      rules.push(SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied('=OR(LOWER($' + nLetter + dataStart + ')="cold", LOWER($' + nLetter + dataStart + ')="f3")')
        .setBackground("#BBDEFB")
        .setRanges([range])
        .build());
    }

    sheet.setConditionalFormatRules(rules);

    var existingProtections = sheet.getProtections(SpreadsheetApp.ProtectionType.RANGE);
    existingProtections.forEach(function (p) {
      if (p.getDescription() && p.getDescription().indexOf("AUTO-SETUP") === 0) {
        p.remove();
      }
    });

    var headerProtect = sheet.getRange(1, 1, cols._headerRow, lastCol).protect();
    headerProtect.setDescription("AUTO-SETUP: Header rows");
    headerProtect.setWarningOnly(false);

    if (cols.week > -1) {
      var wLetter = colToA1_(cols.week + 1);
      var colWProtect = sheet.getRange(wLetter + dataStart + ":" + wLetter + "1000").protect();
      colWProtect.setDescription("AUTO-SETUP: Week column (auto-filled)");
      colWProtect.setWarningOnly(false);
    }
    if (cols.day > -1) {
      var dLetter = colToA1_(cols.day + 1);
      var colDProtect = sheet.getRange(dLetter + dataStart + ":" + dLetter + "1000").protect();
      colDProtect.setDescription("AUTO-SETUP: Day column (auto-filled)");
      colDProtect.setWarningOnly(false);
    }
    if (cols.followUpDate > -1) {
      var kLetter = colToA1_(cols.followUpDate + 1);
      var colKProtect = sheet.getRange(kLetter + dataStart + ":" + kLetter + "1000").protect();
      colKProtect.setDescription("AUTO-SETUP: Deadline column (auto-filled)");
      colKProtect.setWarningOnly(false);
    }
  });

  SpreadsheetApp.getActive().toast(
    "Setup complete! Dropdowns, colors, and protections applied — following your headers, wherever the columns are.",
    "Done", 5
  );
}


// ===================================================================
// PART 2 — DASHBOARD JSON API (for index.html / js/api.js)
// ===================================================================

var DASHBOARD_SHEETS = ["APPROACH", "PRESENTATION", "CLOSING", "SR"];

function doGet(e) {
  // Default to fetchAll when no ?action= is given -- your Scriptable
  // widget calls the bare URL with no query string, so it relies on
  // this default rather than passing an action explicitly.
  var action = (e && e.parameter && e.parameter.action) || 'fetchAll';

  try {
    switch (action) {
      case 'fetchAll':
        return jsonResponse(getAllSheetData());
      case 'fetchSheet':
        return jsonResponse(getSheetDataByName(e.parameter.sheet));
      case 'reminders':
        return jsonResponse(getReminders());
      case 'weeklyStats':
        return jsonResponse(getWeeklyStats());
      case 'monthlyStats':
        return jsonResponse(getMonthlyStats());
      case 'searchClients':
        return jsonResponse(searchClients(e.parameter.q));
      default:
        return jsonResponse({ error: 'Unknown action: ' + action });
    }
  } catch (err) {
    return jsonResponse({ error: err.toString() });
  }
}

function doPost(e) {
  var action = e.parameter.action;

  try {
    var data = JSON.parse(e.postData.getContentText());

    switch (action) {
      case 'addActivity':
        return jsonResponse(addActivity(data));
      case 'addClientDetails':
        return jsonResponse(addClientDetails(data));
      default:
        return jsonResponse({ error: 'Unknown action: ' + action });
    }
  } catch (err) {
    return jsonResponse({ error: err.toString() });
  }
}

function cellToDateString_(ss, val) {
  if (val === '' || val === null || typeof val === 'undefined') return '';
  if (Object.prototype.toString.call(val) === '[object Date]' && !isNaN(val.getTime())) {
    return Utilities.formatDate(val, ss.getSpreadsheetTimeZone(), 'yyyy-MM-dd');
  }
  return String(val);
}

function cellToString_(val) {
  if (val === '' || val === null || typeof val === 'undefined') return '';
  return String(val);
}

// Reads every data row of a tracking sheet into a clean, field-named
// object, using this tab's own detected header row / data start row.
function readSheetRows_(ss, sheet) {
  var cols = getColumnMap_(sheet);
  var lastRow = sheet.getLastRow();
  if (lastRow < cols._dataStartRow) return [];

  var numCols = sheet.getLastColumn();
  var values = sheet.getRange(cols._dataStartRow, 1, lastRow - cols._dataStartRow + 1, numCols).getValues();

  var rows = [];
  for (var i = 0; i < values.length; i++) {
    var raw = values[i];
    var name = cols.name > -1 ? cellToString_(raw[cols.name]) : '';
    if (!name) continue;

    rows.push({
      rowNumber: cols._dataStartRow + i,
      status: cols.status > -1 ? cellToString_(raw[cols.status]) : '',
      week: cols.week > -1 ? cellToString_(raw[cols.week]) : '',
      day: cols.day > -1 ? cellToString_(raw[cols.day]) : '',
      dateOfAction: cols.dateOfAction > -1 ? cellToDateString_(ss, raw[cols.dateOfAction]) : '',
      name: name,
      contact: cols.contact > -1 ? cellToString_(raw[cols.contact]) : '',
      policyNumber: cols.policyNumber > -1 ? cellToString_(raw[cols.policyNumber]) : '',
      productProposed: cols.productProposed > -1 ? cellToString_(raw[cols.productProposed]) : '',
      nature: cols.nature > -1 ? cellToString_(raw[cols.nature]) : '',
      percentage: cols.percentage > -1 ? cellToString_(raw[cols.percentage]) : '',
      followUpDate: cols.followUpDate > -1 ? cellToDateString_(ss, raw[cols.followUpDate]) : '',
      remarks: cols.remarks > -1 ? cellToString_(raw[cols.remarks]) : '',
      birthday: cols.birthday > -1 ? cellToDateString_(ss, raw[cols.birthday]) : '',
      paymentDue: cols.paymentDue > -1 ? cellToDateString_(ss, raw[cols.paymentDue]) : '',
      email: cols.email > -1 ? cellToString_(raw[cols.email]) : ''
    });
  }

  return rows;
}

function getAllSheetData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var result = {};

  DASHBOARD_SHEETS.forEach(function (name) {
    var sheet = ss.getSheetByName(name);
    // Keeping the sheet name's original case (APPROACH/PRESENTATION/
    // CLOSING/SR) -- your Scriptable widget reads data.APPROACH etc.
    // in all caps, and JavaScript keys are case-sensitive.
    result[name] = sheet ? readSheetRows_(ss, sheet) : [];
  });

  return result;
}

function getSheetDataByName(sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  return readSheetRows_(ss, sheet);
}

function getReminders() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var today = new Date();
  today.setHours(0, 0, 0, 0);
  var weekFromNow = new Date(today);
  weekFromNow.setDate(today.getDate() + 7);

  var birthdays = [];
  var payments = [];

  DASHBOARD_SHEETS.forEach(function (tabName) {
    var sheet = ss.getSheetByName(tabName);
    if (!sheet) return;
    var rows = readSheetRows_(ss, sheet);

    rows.forEach(function (row) {
      if (row.birthday) {
        var bd = new Date(row.birthday + 'T00:00:00');
        if (!isNaN(bd.getTime())) {
          var thisYearBirth = new Date(today.getFullYear(), bd.getMonth(), bd.getDate());
          if (thisYearBirth < today) thisYearBirth.setFullYear(today.getFullYear() + 1);
          if (thisYearBirth <= weekFromNow) {
            birthdays.push({
              name: row.name,
              birthday: row.birthday,
              daysUntil: Math.round((thisYearBirth - today) / 86400000)
            });
          }
        }
      }
      if (row.paymentDue) {
        var pd = new Date(row.paymentDue + 'T00:00:00');
        if (!isNaN(pd.getTime()) && pd >= today && pd <= weekFromNow) {
          payments.push({
            name: row.name,
            dueDate: row.paymentDue,
            daysUntil: Math.round((pd - today) / 86400000)
          });
        }
      }
    });
  });

  return {
    birthdays: birthdays.sort(function (a, b) { return a.daysUntil - b.daysUntil; }),
    payments: payments.sort(function (a, b) { return a.daysUntil - b.daysUntil; })
  };
}

function getWeeklyStats() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var today = new Date();
  var startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + 1);
  startOfWeek.setHours(0, 0, 0, 0);
  var endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  return {
    approaches: countRowsInRange_(ss, 'APPROACH', startOfWeek, endOfWeek),
    presentations: countRowsInRange_(ss, 'PRESENTATION', startOfWeek, endOfWeek),
    closings: countRowsInRange_(ss, 'CLOSING', startOfWeek, endOfWeek),
    approachTarget: 90,
    presentationTarget: 10
  };
}

function getMonthlyStats() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var today = new Date();
  var startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  var endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

  return {
    approaches: countRowsInRange_(ss, 'APPROACH', startOfMonth, endOfMonth),
    presentations: countRowsInRange_(ss, 'PRESENTATION', startOfMonth, endOfMonth),
    closings: countRowsInRange_(ss, 'CLOSING', startOfMonth, endOfMonth)
  };
}

function countRowsInRange_(ss, sheetName, startDate, endDate) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return 0;
  var rows = readSheetRows_(ss, sheet);
  var count = 0;
  rows.forEach(function (row) {
    if (!row.dateOfAction) return;
    var d = new Date(row.dateOfAction + 'T00:00:00');
    if (!isNaN(d.getTime()) && d >= startDate && d <= endDate) count++;
  });
  return count;
}

function addActivity(record) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetName = String(record.activityType || '').toUpperCase();
  var sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    return { success: false, error: 'Sheet not found: ' + sheetName };
  }

  var cols = getColumnMap_(sheet);
  var numCols = Math.max(sheet.getLastColumn(), 11);
  var rowValues = new Array(numCols).fill('');

  var today = new Date();
  var weekNum = getWeekNumber_(today);
  var dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][today.getDay()];
  var actionDate = record.date ? new Date(record.date + 'T00:00:00') : today;
  var dateStr = actionDate.getDate() + '/' + (actionDate.getMonth() + 1) + '/' + actionDate.getFullYear();

  if (cols.status > -1) rowValues[cols.status] = sheetName;
  if (cols.week > -1) rowValues[cols.week] = 'Week ' + weekNum;
  if (cols.day > -1) rowValues[cols.day] = dayName;
  if (cols.dateOfAction > -1) rowValues[cols.dateOfAction] = dateStr;
  if (cols.name > -1) rowValues[cols.name] = record.name || '';
  if (cols.contact > -1) rowValues[cols.contact] = record.contact || '';
  if (cols.productProposed > -1) rowValues[cols.productProposed] = record.productProposed || '';
  if (cols.nature > -1) rowValues[cols.nature] = record.nature || '';
  if (cols.followUpDate > -1 && record.followUpDate) {
    var fu = new Date(record.followUpDate + 'T00:00:00');
    rowValues[cols.followUpDate] = fu.getDate() + '/' + (fu.getMonth() + 1) + '/' + fu.getFullYear();
  }
  if (cols.remarks > -1) rowValues[cols.remarks] = record.remarks || '';

  sheet.appendRow(rowValues);

  return { success: true };
}

function addClientDetails(record) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('CLOSING');

  if (!sheet) {
    return { success: false, error: 'CLOSING sheet not found' };
  }

  var cols = getColumnMap_(sheet);
  if (cols.name === -1) {
    return { success: false, error: 'Could not find a NAME column on CLOSING' };
  }

  var lastRow = sheet.getLastRow();
  var targetRow = 0;

  if (lastRow >= cols._dataStartRow) {
    var nameValues = sheet.getRange(cols._dataStartRow, cols.name + 1, lastRow - cols._dataStartRow + 1, 1).getValues();
    for (var i = nameValues.length - 1; i >= 0; i--) {
      if (String(nameValues[i][0]).trim() === String(record.name).trim()) {
        targetRow = cols._dataStartRow + i;
        break;
      }
    }
  }

  if (!targetRow) {
    var numCols = Math.max(sheet.getLastColumn(), 11);
    var rowValues = new Array(numCols).fill('');
    var today = new Date();
    var weekNum = getWeekNumber_(today);
    var dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][today.getDay()];
    var dateStr = today.getDate() + '/' + (today.getMonth() + 1) + '/' + today.getFullYear();

    if (cols.status > -1) rowValues[cols.status] = 'CLOSING';
    if (cols.week > -1) rowValues[cols.week] = 'Week ' + weekNum;
    if (cols.day > -1) rowValues[cols.day] = dayName;
    if (cols.dateOfAction > -1) rowValues[cols.dateOfAction] = dateStr;
    if (cols.name > -1) rowValues[cols.name] = record.name || '';
    if (cols.contact > -1) rowValues[cols.contact] = record.contact || '';
    if (cols.productProposed > -1) rowValues[cols.productProposed] = record.productProposed || record.product || '';
    if (cols.policyNumber > -1) rowValues[cols.policyNumber] = record.policyNumber || '';
    if (cols.birthday > -1 && record.birthday) rowValues[cols.birthday] = new Date(record.birthday + 'T00:00:00');
    if (cols.paymentDue > -1 && record.paymentDue) rowValues[cols.paymentDue] = new Date(record.paymentDue + 'T00:00:00');

    sheet.appendRow(rowValues);
    return { success: true, created: true };
  }

  if (cols.policyNumber > -1) sheet.getRange(targetRow, cols.policyNumber + 1).setValue(record.policyNumber || '');
  if (cols.birthday > -1 && record.birthday) sheet.getRange(targetRow, cols.birthday + 1).setValue(new Date(record.birthday + 'T00:00:00')).setNumberFormat('yyyy-mm-dd');
  if (cols.paymentDue > -1 && record.paymentDue) sheet.getRange(targetRow, cols.paymentDue + 1).setValue(new Date(record.paymentDue + 'T00:00:00')).setNumberFormat('yyyy-mm-dd');

  return { success: true, created: false };
}

function searchClients(query) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('CLOSING');
  if (!sheet || !query) return [];

  var rows = readSheetRows_(ss, sheet);
  var q = String(query).toLowerCase();

  return rows.filter(function (row) {
    return row.name.toLowerCase().indexOf(q) !== -1 || row.policyNumber.toLowerCase().indexOf(q) !== -1;
  }).map(function (row) {
    return {
      name: row.name,
      contact: row.contact,
      policy: row.policyNumber,
      birthday: row.birthday,
      paymentDue: row.paymentDue
    };
  });
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getWeekNumber_(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}


/**
 * ===================================================================
 * PART 3 — WHATSAPP BIRTHDAY & PREMIUM REMINDER LINKS (header-based)
 * ===================================================================
 * Two reminder tiers for premium due dates:
 *   - CLOSE-UP: due today, within PREMIUM_REMINDER_DAYS_BEFORE days,
 *     or up to REMINDER_CATCHUP_DAYS overdue. Asks about arranging
 *     payment. (unchanged wording from what you had)
 *   - ADVANCE NOTICE: fires earlier, from PREMIUM_REMINDER_DAYS_BEFORE+1
 *     days out through PREMIUM_ADVANCE_REMINDER_DAYS_BEFORE days out.
 *     Purely informational, no call to action.
 * Each tier tracks its own "already sent" state (REMINDER SENT vs
 * ADVANCE REMINDER SENT columns) so sending the advance one doesn't
 * suppress the close-up one later.
 *
 * PAYMENT MODE column (Monthly / Quarterly / Half-Yearly / Yearly):
 * once a due date is in the past, the script rolls it forward on its
 * own (1/3/6/12 months at a time) and saves that back to the sheet —
 * add a PAYMENT MODE header next to PREMIUM DUE DATE and fill it in
 * per client. Leave blank to keep the old behaviour (just shows as
 * overdue via the catch-up window, no auto-rolling).
 * ===================================================================
 */

// ---- PER-AGENT SETTINGS (read from a "SETTINGS" tab on THIS sheet, not
// hardcoded here) -- this is what makes this exact same Code.gs file safe
// to hand to any other agent without editing a single line of script.
// See getAgentSettings_() below: on first run it creates a "SETTINGS" tab
// with two cells to fill in (Agent Name, Agent WhatsApp Number, and an
// optional Country Code) -- fill those in once per sheet, and every
// message/menu/email below picks them up automatically. Use {agent} in
// any message template below and it gets replaced with the Agent Name
// from SETTINGS at send time.
var AGENT_SETTINGS_SHEET_NAME = "SETTINGS";

// {policyLine} is filled in by makeReminderRow() -- it becomes a line like
// "(Policy No: 12345)" when the client's row has a policy number, or an
// empty string when it doesn't, so the message never reads oddly either way.
var BIRTHDAY_MESSAGE_TEMPLATE =
  "Hi {name}! Wishing you a very Happy Birthday! Wishing you good health and happiness always. - {agent}{policyLine}";

// The CLOSE-UP reminder — due today, within PREMIUM_REMINDER_DAYS_BEFORE days, or up to REMINDER_CATCHUP_DAYS overdue.
var PREMIUM_REMINDER_MESSAGE_TEMPLATE =
  "Hi {name}, a gentle reminder on your Manulife policy{policyLine} premium due on {dueDate}. Please disregard this message if payment had been made. Thank you!";

// The ADVANCE reminder — fires earlier (see PREMIUM_ADVANCE_REMINDER_DAYS_BEFORE), purely informational.
var PREMIUM_ADVANCE_REMINDER_MESSAGE_TEMPLATE =
  "Hi {name}, a reminder on your Manulife policy{policyLine} premium will due on {dueDate}. Please disregard this message if payment had been made. Thank you!";

var COUNTRY_CODE = "60"; // Default/fallback only -- overridden per-sheet by SETTINGS!B3 if you fill that in (see getAgentSettings_).
var PREMIUM_REMINDER_DAYS_BEFORE = 3;
var PREMIUM_ADVANCE_REMINDER_DAYS_BEFORE = 14; // advance tier window: from PREMIUM_REMINDER_DAYS_BEFORE+1 days out, through this many days out
var REMINDER_CATCHUP_DAYS = 7; // keep resurfacing an unsent close-up reminder for this many days after it's overdue
var TRACKING_SHEETS = ["APPROACH", "PRESENTATION", "CLOSING"];
var REMINDER_SHEET_NAME = "TODAY - SEND REMINDERS";

// Column layout of the script-owned "TODAY - SEND REMINDERS" sheet (1-based).
// Everything that reads/writes that sheet uses these constants instead of
// raw numbers -- change the order here (e.g. to move a column) and every
// function below follows automatically. The two action columns are kept
// first/leftmost on purpose, so they're visible without scrolling past the
// message preview.
var REMINDER_COL_WHATSAPP_LINK = 1; // "Click to Open WhatsApp"
var REMINDER_COL_MARK_SENT = 2;     // "Mark Sent (tick to remove)"
var REMINDER_COL_TYPE = 3;
var REMINDER_COL_FROM_TAB = 4;
var REMINDER_COL_NAME = 5;
var REMINDER_COL_PHONE_ENTERED = 6;
var REMINDER_COL_PHONE_LINK = 7;
var REMINDER_COL_DATE = 8;
var REMINDER_COL_MESSAGE = 9;
var REMINDER_SHEET_NUM_COLS = 9;

// Row highlight colour per reminder type, so birthdays/payments/advance
// notices are easy to tell apart at a glance on the reminders sheet.
var REMINDER_TYPE_COLORS = {
  "Birthday": "#fff3cd",
  "Premium Due": "#d4edda",
  "Premium Due (Advance Notice)": "#d1ecf1"
};

var BIRTHDAY_VOUCHER_DAYS_BEFORE = 30;
var VOUCHER_REDEEM_MESSAGE_TO_AGENT =
  "Hi {agent}, this is {name}. I'd like to redeem my Birthday Coffee Voucher! Please let me know a good time to meet.";
var BIRTHDAY_VOUCHER_EMAIL_SUBJECT = "🎂 A Birthday Treat is Waiting for You, {name}!";
var BIRTHDAY_VOUCHER_EMAIL_BODY =
  "Hi {name},\n\n" +
  "Your birthday is coming up soon! To celebrate, we'd love to treat you to a coffee on us.\n\n" +
  "Click the link below to redeem your Birthday Coffee Voucher — it'll open WhatsApp with a message ready to send us:\n{redeemLink}\n\n" +
  "Wishing you an early Happy Birthday!\n- {agent}";

/**
 * Reads this sheet's own Agent Name / WhatsApp Number / Country Code from
 * a "SETTINGS" tab, creating that tab with fill-in-the-blank defaults the
 * first time it's needed. This is what lets the EXACT SAME Code.gs file
 * be handed to a different agent with zero script edits -- they just fill
 * in B1/B2/B3 on their own SETTINGS tab once.
 */
function getAgentSettings_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(AGENT_SETTINGS_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(AGENT_SETTINGS_SHEET_NAME);
    sheet.getRange("A1").setValue("Agent Name").setFontWeight("bold");
    sheet.getRange("B1").setValue("YOUR NAME HERE");
    sheet.getRange("A2").setValue("Agent WhatsApp Number").setFontWeight("bold");
    sheet.getRange("B2").setValue("PASTE_YOUR_OWN_WHATSAPP_NUMBER_HERE");
    sheet.getRange("A3").setValue("Country Code (for WhatsApp numbers)").setFontWeight("bold");
    sheet.getRange("B3").setValue(COUNTRY_CODE);
    sheet.getRange("A1:A3").setNote("Fill in B1/B2/B3 once -- every reminder message, voucher email, and menu item on this sheet will use these automatically.");
    sheet.setColumnWidth(1, 260);
    sheet.setColumnWidth(2, 260);
  }

  var agentName = String(sheet.getRange("B1").getValue() || "").trim();
  var agentWhatsApp = String(sheet.getRange("B2").getValue() || "").trim();
  var countryCode = String(sheet.getRange("B3").getValue() || "").trim();

  return {
    agentName: agentName || "Your Advisor",
    agentWhatsApp: agentWhatsApp,
    countryCode: countryCode || COUNTRY_CODE
  };
}

// Replaces {agent} in a message template with the sheet's own Agent Name
// from SETTINGS. Every function that builds a customer-facing message
// should run its template through this before sending.
function fillAgentName_(template, agentName) {
  return String(template).split("{agent}").join(agentName);
}

// Menu entry point: makes sure the SETTINGS tab exists (creating it with
// fill-in-the-blank defaults if this is the first time on a new sheet)
// and jumps straight to it so the agent can fill in their details.
function openAgentSettings() {
  getAgentSettings_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setActiveSheet(ss.getSheetByName(AGENT_SETTINGS_SHEET_NAME));
}


function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("PULSE Reminders")
    .addItem("My Settings (Agent Name & WhatsApp Number)", "openAgentSettings")
    .addSeparator()
    .addItem("Refresh Today's Reminders", "buildTodayReminders")
    .addItem("Debug: Why Does This Reminder Keep Coming Back?", "debugRemindersCheck")
    .addItem("Send Birthday Voucher Emails Now", "sendBirthdayVoucherEmails")
    .addItem("Debug: Why Didn't The Voucher Email Send?", "debugVoucherCheck")
    .addItem("Check Column Mapping (after moving columns)", "checkColumnMapping")
    .addItem("Check For Duplicate Reminder Columns", "checkDuplicateReminderColumns")
    .addSeparator()
    .addItem("Turn On Daily Auto-Refresh + Auto-Emails (7am)", "createDailyTrigger")
    .addItem("Turn Off Daily Auto-Refresh + Auto-Emails", "removeDailyTrigger")
    .addSeparator()
    .addItem("Set Up Bulk Email Template", "setupBulkEmailTemplateSheet")
    .addItem("Send Bulk Email (this tab)", "sendBulkEmail")
    .addSeparator()
    .addItem("Send Email Blast (list below template)", "sendEmailBlast")
    .addItem("Delete All Sent From Blast List", "deleteSentBlastRows")
    .addItem("Debug: Blast List (why \"already sent\"?)", "debugEmailBlastList")
    .addSeparator()
    .addItem("Add 'Date First Approached' Column (one-time)", "addOriginalDateColumnToAllTabs")
    .addItem("Set Up Performance Tracker Formulas (one-time)", "setupPerformanceTrackerFormulas")
    .addItem("Backfill Activity Log From Current Data (one-time)", "backfillActivityLog")
    .addSeparator()
    .addItem("Import Payment Mode + Mailing Address (from Manulife export)", "importPaymentModeAndAddress")
    .addItem("Remove Duplicate Client Rows (by Policy Number)", "removeDuplicateClientRows")
    .addToUi();
}


function buildTodayReminders() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var today = new Date();
  today.setHours(0, 0, 0, 0);

  var settings = getAgentSettings_();
  COUNTRY_CODE = settings.countryCode; // per-sheet override for this execution (see getAgentSettings_)
  var birthdayMessage = fillAgentName_(BIRTHDAY_MESSAGE_TEMPLATE, settings.agentName);

  // Carry forward whatever's still sitting on the REMINDERS sheet from the
  // last run -- anything still there hasn't been ticked "Mark Sent" yet, so
  // a forgotten reminder stays put instead of vanishing on the next refresh.
  // New reminders just get appended alongside it.
  var reminderRows = readExistingReminderRows_(ss);
  var seen = {};
  reminderRows.forEach(function (r) {
    seen[r[0] + "|" + r[4]] = true; // type + phone used for link
  });

  TRACKING_SHEETS.forEach(function (tabName) {
    var sheet = ss.getSheetByName(tabName);
    if (!sheet) return;

    var cols = getColumnMap_(sheet);
    var lastRow = sheet.getLastRow();
    if (lastRow < cols._dataStartRow) return;
    if (cols.birthday === -1 && cols.paymentDue === -1) return;

    // Without a GREETING SENT / REMINDER SENT / ADVANCE REMINDER SENT
    // column to write to, ticking "Mark Sent" has nowhere to persist that
    // fact -- so the reminder just comes back on the next refresh. Create
    // whichever of those are missing (once) instead of relying on someone
    // adding them by hand.
    cols = ensureReminderTrackingColumns_(sheet, cols);

    var numCols = sheet.getLastColumn();
    var data = sheet.getRange(cols._dataStartRow, 1, lastRow - cols._dataStartRow + 1, numCols).getValues();

    data.forEach(function (row, idx) {
      var name = cols.name > -1 ? row[cols.name] : "";
      var contact = cols.contact > -1 ? row[cols.contact] : "";
      if (!name) return;

      var absoluteRow = cols._dataStartRow + idx;
      var birthday = cols.birthday > -1 ? row[cols.birthday] : null;
      var premiumDue = cols.paymentDue > -1 ? row[cols.paymentDue] : null;
      var paymentMode = cols.paymentMode > -1 ? row[cols.paymentMode] : null;
      var policyNumber = cols.policyNumber > -1 ? cellToString_(row[cols.policyNumber]) : "";
      // Multiple policy numbers are stored together separated by "/" (e.g.
      // "739760-0/739758-0") -- too ambiguous to name just one in the
      // message, so leave the policy number out of it entirely.
      if (policyNumber.indexOf("/") > -1) policyNumber = "";
      var phoneKey = normalizePhone(contact);

      if (birthday instanceof Date) {
        var birthThisYear = new Date(today.getFullYear(), birthday.getMonth(), birthday.getDate());
        var daysSinceBirthday = Math.round((today.getTime() - birthThisYear.getTime()) / (24 * 60 * 60 * 1000));
        var alreadyGreeted = cols.greetingSent > -1 &&
          row[cols.greetingSent] instanceof Date &&
          row[cols.greetingSent].getFullYear() === today.getFullYear();

        if (daysSinceBirthday >= 0 && daysSinceBirthday <= REMINDER_CATCHUP_DAYS && !alreadyGreeted) {
          var birthdayKey = "Birthday|" + phoneKey;
          if (phoneKey && !seen[birthdayKey]) {
            seen[birthdayKey] = true;
            reminderRows.push(makeReminderRow("Birthday", tabName, name, contact, birthThisYear, birthdayMessage, daysSinceBirthday, policyNumber));
          }
        }
      }

      if (premiumDue instanceof Date) {
        // If the due date has already passed and we know the payment
        // mode, roll it forward to the next cycle automatically (and
        // save that back to the sheet) instead of it just sitting
        // there as overdue forever. If the mode is blank, leave the
        // date alone -- the old catch-up-window behaviour still applies.
        var effectiveDue = advanceDueDateIfPast_(sheet, cols, absoluteRow, premiumDue, today, paymentMode);
        var dueDateOnly = new Date(effectiveDue.getFullYear(), effectiveDue.getMonth(), effectiveDue.getDate());
        var diffDays = Math.round((dueDateOnly.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));

        // ---- Close-up tier: due today, within PREMIUM_REMINDER_DAYS_BEFORE days, or up to REMINDER_CATCHUP_DAYS overdue ----
        var alreadyReminded = cols.reminderSent > -1 &&
          row[cols.reminderSent] instanceof Date &&
          isSameCalendarDay_(row[cols.reminderSent], dueDateOnly);

        if (diffDays >= -REMINDER_CATCHUP_DAYS && diffDays <= PREMIUM_REMINDER_DAYS_BEFORE && !alreadyReminded) {
          var premiumKey = "Premium Due|" + phoneKey;
          if (phoneKey && !seen[premiumKey]) {
            seen[premiumKey] = true;
            reminderRows.push(makeReminderRow("Premium Due", tabName, name, contact, effectiveDue, PREMIUM_REMINDER_MESSAGE_TEMPLATE, diffDays < 0 ? -diffDays : 0, policyNumber));
          }
        }

        // ---- Advance tier: heads-up, further out, purely informational ----
        var alreadyAdvanceReminded = cols.advanceReminderSent > -1 &&
          row[cols.advanceReminderSent] instanceof Date &&
          isSameCalendarDay_(row[cols.advanceReminderSent], dueDateOnly);

        if (diffDays > PREMIUM_REMINDER_DAYS_BEFORE && diffDays <= PREMIUM_ADVANCE_REMINDER_DAYS_BEFORE && !alreadyAdvanceReminded) {
          var advanceKey = "Premium Due (Advance Notice)|" + phoneKey;
          if (phoneKey && !seen[advanceKey]) {
            seen[advanceKey] = true;
            reminderRows.push(makeReminderRow("Premium Due (Advance Notice)", tabName, name, contact, effectiveDue, PREMIUM_ADVANCE_REMINDER_MESSAGE_TEMPLATE, 0, policyNumber));
          }
        }
      }
    });
  });

  writeReminderSheet(ss, reminderRows);
}

// If the due date is in the past AND we know the payment mode, rolls
// the date forward (1/3/6/12 months at a time, looping in case it's
// been a while) until it's in the future, and writes the new date
// back into the sheet. Returns the (possibly updated) due date to use.
function advanceDueDateIfPast_(sheet, cols, absoluteRow, dueDate, today, rawPaymentMode) {
  if (cols.paymentDue === -1) return dueDate;
  var monthsToAdd = paymentModeToMonths_(rawPaymentMode);
  if (!monthsToAdd) return dueDate; // no mode set (or not recognised) -- leave the date alone

  var newDate = new Date(dueDate.getTime());
  var rolled = false;
  while (newDate < today) {
    newDate.setMonth(newDate.getMonth() + monthsToAdd);
    rolled = true;
  }
  if (rolled) {
    sheet.getRange(absoluteRow, cols.paymentDue + 1).setValue(newDate).setNumberFormat("yyyy-mm-dd");
  }
  return newDate;
}

// Turns "Monthly" / "Quarterly" / "Half-Yearly" / "Yearly" (any
// spacing, hyphenation, or case) into a number of months. Returns 0
// if not recognised (or blank).
function paymentModeToMonths_(rawMode) {
  if (!rawMode) return 0;
  var m = String(rawMode).trim().toUpperCase().replace(/[\s\-_]/g, "");
  if (m === "MONTHLY") return 1;
  if (m === "QUARTERLY") return 3;
  if (m === "HALFYEARLY" || m === "SEMIANNUAL" || m === "SEMIANNUALLY" || m === "SIXMONTHLY") return 6;
  if (m === "YEARLY" || m === "ANNUAL" || m === "ANNUALLY") return 12;
  return 0;
}


// Called from onEdit() when the agent ticks "Mark Sent" on a reminder row.
function markReminderSent_(reminderSheet, row) {
  var rowValues = reminderSheet.getRange(row, 1, 1, REMINDER_SHEET_NUM_COLS).getValues()[0];
  var type = rowValues[REMINDER_COL_TYPE - 1];
  var fromTab = rowValues[REMINDER_COL_FROM_TAB - 1];
  var clientName = rowValues[REMINDER_COL_NAME - 1];

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sourceSheet = ss.getSheetByName(fromTab);

  if (sourceSheet) {
    var cols = getColumnMap_(sourceSheet);
    cols = ensureReminderTrackingColumns_(sourceSheet, cols);
    var lastRow = sourceSheet.getLastRow();

    if (cols.name > -1 && lastRow >= cols._dataStartRow) {
      var nameValues = sourceSheet.getRange(cols._dataStartRow, cols.name + 1, lastRow - cols._dataStartRow + 1, 1).getValues();
      var targetRow = 0;
      for (var i = nameValues.length - 1; i >= 0; i--) {
        if (String(nameValues[i][0]).trim() === String(clientName).trim()) {
          targetRow = cols._dataStartRow + i;
          break;
        }
      }

      if (targetRow) {
        var today = new Date();
        if (type === "Birthday" && cols.greetingSent > -1) {
          sourceSheet.getRange(targetRow, cols.greetingSent + 1).setValue(today).setNumberFormat("yyyy-mm-dd");
        } else if (type === "Premium Due" && cols.reminderSent > -1 && cols.paymentDue > -1) {
          var currentDue = sourceSheet.getRange(targetRow, cols.paymentDue + 1).getValue();
          sourceSheet.getRange(targetRow, cols.reminderSent + 1).setValue(currentDue).setNumberFormat("yyyy-mm-dd");
        } else if (type === "Premium Due (Advance Notice)" && cols.advanceReminderSent > -1 && cols.paymentDue > -1) {
          var currentDueAdvance = sourceSheet.getRange(targetRow, cols.paymentDue + 1).getValue();
          sourceSheet.getRange(targetRow, cols.advanceReminderSent + 1).setValue(currentDueAdvance).setNumberFormat("yyyy-mm-dd");
        }
      }
    }
  }

  reminderSheet.deleteRow(row);
}

function makeReminderRow(type, tabName, name, contact, relevantDate, template, overdueDays, policyNumber) {
  var phone = normalizePhone(contact);
  var dateText = Utilities.formatDate(relevantDate, Session.getScriptTimeZone(), "dd MMM yyyy");
  // Birthday keeps the policy line trailing the message (with its own
  // leading space); the premium templates insert it right after the word
  // "policy" with no leading space, e.g. "...Manulife policy(Policy No: X) premium...".
  var policyLine = "";
  if (policyNumber) {
    policyLine = type === "Birthday" ? (" (Policy No: " + policyNumber + ")") : ("(Policy No: " + policyNumber + ")");
  }
  var message = template.replace("{name}", name).replace("{dueDate}", dateText).replace("{policyLine}", policyLine);
  var link = phone ? ("https://wa.me/" + phone + "?text=" + encodeURIComponent(message)) : "";
  var dateColumnText = dateText;
  if (overdueDays && overdueDays > 0) {
    dateColumnText = dateText + " (" + overdueDays + " day" + (overdueDays === 1 ? "" : "s") + " overdue)";
  }

  return [type, tabName, name, contact, phone || "CHECK NUMBER", dateColumnText, message, link];
}

function isSameCalendarDay_(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function normalizePhone(raw) {
  if (!raw) return "";
  var digits = String(raw).replace(/\D/g, "");
  if (!digits) return "";

  if (digits.indexOf(COUNTRY_CODE) === 0) {
    return digits;
  }
  if (digits.indexOf("0") === 0) {
    return COUNTRY_CODE + digits.substring(1);
  }
  return COUNTRY_CODE + digits;
}

// Reads back whatever's currently on the reminders sheet (skipping the
// "nothing due today" placeholder row and any blank rows) so
// buildTodayReminders() can carry unsent reminders across a refresh
// instead of wiping them out every time it runs.
function readExistingReminderRows_(ss) {
  var sheet = ss.getSheetByName(REMINDER_SHEET_NAME);
  if (!sheet) return [];
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  var values = sheet.getRange(2, 1, lastRow - 1, REMINDER_SHEET_NUM_COLS).getValues();
  var formulas = sheet.getRange(2, REMINDER_COL_WHATSAPP_LINK, lastRow - 1, 1).getFormulas();
  var rows = [];
  for (var i = 0; i < values.length; i++) {
    var r = values[i];
    var type = r[REMINDER_COL_TYPE - 1];
    var name = r[REMINDER_COL_NAME - 1];
    if (!type || !name) continue; // skip blanks / the placeholder row
    rows.push([
      type,
      r[REMINDER_COL_FROM_TAB - 1],
      name,
      r[REMINDER_COL_PHONE_ENTERED - 1],
      r[REMINDER_COL_PHONE_LINK - 1],
      r[REMINDER_COL_DATE - 1],
      r[REMINDER_COL_MESSAGE - 1],
      extractHyperlinkUrl_(formulas[i][0])
    ]);
  }
  return rows;
}

// Pulls the raw wa.me URL back out of a =HYPERLINK("url","Click to Send") formula.
function extractHyperlinkUrl_(formula) {
  if (!formula) return "";
  var m = formula.match(/HYPERLINK\("([^"]*)"/i);
  return m ? m[1] : "";
}

function writeReminderSheet(ss, reminderRows) {
  var sheet = ss.getSheetByName(REMINDER_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(REMINDER_SHEET_NAME);
  }
  sheet.clear();

  // Built from the REMINDER_COL_* constants above rather than a literal
  // array, so the two action columns stay in sync with wherever those
  // constants say they are (currently: front/leftmost).
  var headers = [];
  headers[REMINDER_COL_WHATSAPP_LINK - 1] = "Click to Open WhatsApp";
  headers[REMINDER_COL_MARK_SENT - 1] = "Mark Sent (tick to remove)";
  headers[REMINDER_COL_TYPE - 1] = "Type";
  headers[REMINDER_COL_FROM_TAB - 1] = "From Tab";
  headers[REMINDER_COL_NAME - 1] = "Name";
  headers[REMINDER_COL_PHONE_ENTERED - 1] = "Phone (as entered)";
  headers[REMINDER_COL_PHONE_LINK - 1] = "Phone (used for link)";
  headers[REMINDER_COL_DATE - 1] = "Date";
  headers[REMINDER_COL_MESSAGE - 1] = "Message Preview";
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold");

  if (reminderRows.length === 0) {
    sheet.getRange(2, 1).setValue("No birthdays or premium reminders due today. 🎉");
    sheet.autoResizeColumns(1, headers.length);
    return;
  }

  // reminderRows entries are [type, tabName, name, contact, phone, dateColumnText, message, link].
  var displayRows = reminderRows.map(function (r) {
    var row = [];
    row[REMINDER_COL_WHATSAPP_LINK - 1] = ""; // filled in below via HYPERLINK formula
    row[REMINDER_COL_MARK_SENT - 1] = false;
    row[REMINDER_COL_TYPE - 1] = r[0];
    row[REMINDER_COL_FROM_TAB - 1] = r[1];
    row[REMINDER_COL_NAME - 1] = r[2];
    row[REMINDER_COL_PHONE_ENTERED - 1] = r[3];
    row[REMINDER_COL_PHONE_LINK - 1] = r[4];
    row[REMINDER_COL_DATE - 1] = r[5];
    row[REMINDER_COL_MESSAGE - 1] = r[6];
    return row;
  });
  sheet.getRange(2, 1, displayRows.length, headers.length).setValues(displayRows);

  var checkboxRule = SpreadsheetApp.newDataValidation().requireCheckbox().build();
  sheet.getRange(2, REMINDER_COL_MARK_SENT, displayRows.length, 1).setDataValidation(checkboxRule);

  for (var i = 0; i < reminderRows.length; i++) {
    var link = reminderRows[i][7];
    var rowNum = i + 2;
    if (link) {
      sheet.getRange(rowNum, REMINDER_COL_WHATSAPP_LINK).setFormula('=HYPERLINK("' + link + '","Click to Send")');
    }

    // Colour the whole row by reminder type so birthdays/payments/advance
    // notices are easy to tell apart at a glance.
    var color = REMINDER_TYPE_COLORS[reminderRows[i][0]];
    if (color) {
      sheet.getRange(rowNum, 1, 1, headers.length).setBackground(color);
    }
  }

  sheet.autoResizeColumns(1, headers.length);
  sheet.setFrozenRows(1);
}


function runDailyAutomation() {
  buildTodayReminders();
  sendBirthdayVoucherEmails();
}

function createDailyTrigger() {
  removeDailyTrigger();
  ScriptApp.newTrigger("runDailyAutomation")
    .timeBased()
    .everyDays(1)
    .atHour(7)
    .create();
  SpreadsheetApp.getActive().toast("Daily auto-refresh + auto-emails turned ON (around 7am).", "PULSE Reminders", 5);
}

function removeDailyTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function (t) {
    var fn = t.getHandlerFunction();
    if (fn === "runDailyAutomation" || fn === "buildTodayReminders") {
      ScriptApp.deleteTrigger(t);
    }
  });
  SpreadsheetApp.getActive().toast("Daily auto-refresh + auto-emails turned OFF.", "PULSE Reminders", 5);
}


/**
 * ===================================================================
 * PART 4 — CUSTOM BLAST LIST (for your own free-typed message)
 * ===================================================================
 * These are formula functions — they take name/phone/message straight
 * from cells you point at, so there's nothing to header-lookup here.
 * ===================================================================
 */

/**
 * @param {string} rawPhone The phone number as typed in your sheet.
 * @return {string} A WhatsApp-ready phone number (digits only, with country code).
 * @customfunction
 */
function BLAST_PHONE(rawPhone) {
  return normalizePhone(rawPhone);
}

/**
 * @param {string} name The contact's name (used to fill in {name}).
 * @param {string} rawPhone The contact's phone number, any format.
 * @param {string} messageTemplate Your message text — include {name} anywhere you want it personalized.
 * @return {string} A wa.me link that opens WhatsApp with the message ready to send.
 * @customfunction
 */
function BLAST_LINK(name, rawPhone, messageTemplate) {
  var phone = normalizePhone(rawPhone);
  if (!phone) return "";
  var message = String(messageTemplate || "").split("{name}").join(name || "");
  return "https://wa.me/" + phone + "?text=" + encodeURIComponent(message);
}


/**
 * ===================================================================
 * PART 5 — AUTOMATIC BIRTHDAY VOUCHER EMAIL (header-based)
 * ===================================================================
 */
function sendBirthdayVoucherEmails() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var today = new Date();
  today.setHours(0, 0, 0, 0);
  var sentCount = 0;

  var settings = getAgentSettings_();
  COUNTRY_CODE = settings.countryCode; // per-sheet override for this execution (see getAgentSettings_)
  var redeemMessageTemplate = fillAgentName_(VOUCHER_REDEEM_MESSAGE_TO_AGENT, settings.agentName);
  var voucherEmailBodyTemplate = fillAgentName_(BIRTHDAY_VOUCHER_EMAIL_BODY, settings.agentName);

  TRACKING_SHEETS.forEach(function (tabName) {
    var sheet = ss.getSheetByName(tabName);
    if (!sheet) return;

    var cols = getColumnMap_(sheet);
    var lastRow = sheet.getLastRow();
    if (lastRow < cols._dataStartRow) return;
    if (cols.birthday === -1 || cols.email === -1) return;

    var numCols = sheet.getLastColumn();
    var data = sheet.getRange(cols._dataStartRow, 1, lastRow - cols._dataStartRow + 1, numCols).getValues();

    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      var name = cols.name > -1 ? row[cols.name] : "";
      var email = row[cols.email];
      var birthday = row[cols.birthday];

      if (!name || !email || !(birthday instanceof Date)) continue;

      var birthdayThisYear = new Date(today.getFullYear(), birthday.getMonth(), birthday.getDate());
      if (birthdayThisYear < today) {
        birthdayThisYear = new Date(today.getFullYear() + 1, birthday.getMonth(), birthday.getDate());
      }
      var diffDays = Math.round((birthdayThisYear.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
      if (diffDays !== BIRTHDAY_VOUCHER_DAYS_BEFORE) continue;

      var sentCell = cols.voucherSent > -1 ? row[cols.voucherSent] : null;
      var alreadySentThisYear = sentCell instanceof Date && sentCell.getFullYear() === today.getFullYear();
      if (alreadySentThisYear) continue;

      var redeemMessage = redeemMessageTemplate.split("{name}").join(name);
      var redeemLink = settings.agentWhatsApp
        ? "https://wa.me/" + normalizePhone(settings.agentWhatsApp) + "?text=" + encodeURIComponent(redeemMessage)
        : "";

      var subject = String(BIRTHDAY_VOUCHER_EMAIL_SUBJECT).split("{name}").join(name);
      var body = voucherEmailBodyTemplate
        .split("{name}").join(name)
        .split("{redeemLink}").join(redeemLink);

      try {
        MailApp.sendEmail(String(email).trim(), subject, body);
        sentCount++;
        if (cols.voucherSent > -1) {
          sheet.getRange(cols._dataStartRow + i, cols.voucherSent + 1).setValue(today).setNumberFormat("yyyy-mm-dd");
        }
      } catch (err) {
        // Skip a bad address and keep going with the rest.
      }
    }
  });

  if (sentCount > 0) {
    SpreadsheetApp.getActive().toast(sentCount + " birthday voucher email(s) sent.", "PULSE Reminders", 5);
  }
}


/**
 * ===================================================================
 * PART 6 — DIAGNOSTIC TOOLS
 * ===================================================================
 */
/**
 * Diagnoses, per client row, exactly why (or why not) a birthday/payment
 * reminder would show up on today's refresh -- and specifically flags the
 * "Mark Sent doesn't stick" bug: a GREETING SENT / REMINDER SENT / ADVANCE
 * REMINDER SENT column that's missing, so a ticked reminder has nowhere to
 * record itself and just comes back on the next refresh. Read-only: it
 * doesn't create columns or change any dates itself (buildTodayReminders
 * and markReminderSent_ do that automatically now).
 */
function debugRemindersCheck() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var today = new Date();
  today.setHours(0, 0, 0, 0);

  var debugSheet = ss.getSheetByName("REMINDERS DEBUG");
  if (!debugSheet) {
    debugSheet = ss.insertSheet("REMINDERS DEBUG");
  }
  debugSheet.clear();
  var report = [["Sheet", "Row", "Name", "Type", "Reason"]];

  TRACKING_SHEETS.forEach(function (tabName) {
    var sheet = ss.getSheetByName(tabName);
    if (!sheet) {
      report.push([tabName, "-", "-", "-", "This sheet doesn't exist (check the exact tab name)."]);
      return;
    }

    var cols = getColumnMap_(sheet);
    var lastRow = sheet.getLastRow();
    if (lastRow < cols._dataStartRow) {
      report.push([tabName, "-", "-", "-", "No data rows found below the header row (row " + cols._headerRow + ")."]);
      return;
    }

    report.push([tabName, "-", "(headers found)", "-",
      "Header row: " + cols._headerRow +
      " | BIRTHDAY: " + (cols.birthday > -1 ? colToA1_(cols.birthday + 1) : "missing") +
      " | GREETING SENT: " + (cols.greetingSent > -1 ? colToA1_(cols.greetingSent + 1) : "MISSING -- Mark Sent for a birthday can't persist until this column exists (auto-created next time you refresh reminders or tick Mark Sent)") +
      " | PREMIUM DUE DATE: " + (cols.paymentDue > -1 ? colToA1_(cols.paymentDue + 1) : "missing") +
      " | REMINDER SENT: " + (cols.reminderSent > -1 ? colToA1_(cols.reminderSent + 1) : "MISSING -- same issue for premium due reminders") +
      " | ADVANCE REMINDER SENT: " + (cols.advanceReminderSent > -1 ? colToA1_(cols.advanceReminderSent + 1) : "MISSING -- same issue for advance-notice reminders")]);

    if (cols.birthday === -1 && cols.paymentDue === -1) {
      report.push([tabName, "-", "-", "-", "Skipping this whole sheet -- needs a BIRTHDAY or PREMIUM DUE DATE header to check."]);
      return;
    }

    var numCols = sheet.getLastColumn();
    var data = sheet.getRange(cols._dataStartRow, 1, lastRow - cols._dataStartRow + 1, numCols).getValues();

    data.forEach(function (row, idx) {
      var name = cols.name > -1 ? row[cols.name] : "";
      if (!name) return;
      var rowNum = cols._dataStartRow + idx;

      var birthday = cols.birthday > -1 ? row[cols.birthday] : null;
      if (birthday instanceof Date) {
        var birthThisYear = new Date(today.getFullYear(), birthday.getMonth(), birthday.getDate());
        var daysSinceBirthday = Math.round((today.getTime() - birthThisYear.getTime()) / (24 * 60 * 60 * 1000));
        var sentCell = cols.greetingSent > -1 ? row[cols.greetingSent] : null;
        var alreadyGreeted = sentCell instanceof Date && sentCell.getFullYear() === today.getFullYear();
        var inWindow = daysSinceBirthday >= 0 && daysSinceBirthday <= REMINDER_CATCHUP_DAYS;

        if (cols.greetingSent === -1) {
          if (inWindow) {
            report.push([tabName, rowNum, name, "Birthday", "Would show today (birthday was " + daysSinceBirthday + " day(s) ago), and Mark Sent CANNOT persist -- no GREETING SENT column on this tab yet."]);
          }
        } else if (alreadyGreeted) {
          report.push([tabName, rowNum, name, "Birthday", "Already marked sent this year (GREETING SENT = " + Utilities.formatDate(sentCell, Session.getScriptTimeZone(), "dd MMM yyyy") + ") -- won't show again until next year's birthday."]);
        } else if (inWindow) {
          report.push([tabName, rowNum, name, "Birthday", "Would show today (birthday was " + daysSinceBirthday + " day(s) ago) -- not marked sent yet."]);
        } else if (daysSinceBirthday > REMINDER_CATCHUP_DAYS) {
          report.push([tabName, rowNum, name, "Birthday", "Birthday was " + daysSinceBirthday + " day(s) ago -- past the " + REMINDER_CATCHUP_DAYS + "-day catch-up window, so it won't show anymore even though it was never marked sent."]);
        }
      }

      var premiumDue = cols.paymentDue > -1 ? row[cols.paymentDue] : null;
      if (premiumDue instanceof Date) {
        var dueDateOnly = new Date(premiumDue.getFullYear(), premiumDue.getMonth(), premiumDue.getDate());
        var diffDays = Math.round((dueDateOnly.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
        var overdueText = diffDays < 0 ? (-diffDays + " day(s) overdue") : ("in " + diffDays + " day(s)");

        var reminderSentCell = cols.reminderSent > -1 ? row[cols.reminderSent] : null;
        var alreadyReminded = reminderSentCell instanceof Date && isSameCalendarDay_(reminderSentCell, dueDateOnly);
        var advanceSentCell = cols.advanceReminderSent > -1 ? row[cols.advanceReminderSent] : null;
        var alreadyAdvanceReminded = advanceSentCell instanceof Date && isSameCalendarDay_(advanceSentCell, dueDateOnly);

        if (diffDays >= -REMINDER_CATCHUP_DAYS && diffDays <= PREMIUM_REMINDER_DAYS_BEFORE) {
          if (cols.reminderSent === -1) {
            report.push([tabName, rowNum, name, "Premium Due", "Would show today (due " + overdueText + "), and Mark Sent CANNOT persist -- no REMINDER SENT column on this tab yet."]);
          } else if (alreadyReminded) {
            report.push([tabName, rowNum, name, "Premium Due", "Already marked sent for this due date (" + Utilities.formatDate(dueDateOnly, Session.getScriptTimeZone(), "dd MMM yyyy") + ") -- won't show again until the due date changes (next cycle, or you edit it)."]);
          } else {
            report.push([tabName, rowNum, name, "Premium Due", "Would show today (due " + overdueText + ") -- not marked sent yet."]);
          }
        } else if (diffDays > PREMIUM_REMINDER_DAYS_BEFORE && diffDays <= PREMIUM_ADVANCE_REMINDER_DAYS_BEFORE) {
          if (cols.advanceReminderSent === -1) {
            report.push([tabName, rowNum, name, "Premium Due (Advance)", "Would show today (due in " + diffDays + " day(s)), and Mark Sent CANNOT persist -- no ADVANCE REMINDER SENT column on this tab yet."]);
          } else if (alreadyAdvanceReminded) {
            report.push([tabName, rowNum, name, "Premium Due (Advance)", "Already marked sent for this due date -- won't show again until it changes."]);
          } else {
            report.push([tabName, rowNum, name, "Premium Due (Advance)", "Would show today (due in " + diffDays + " day(s)) -- not marked sent yet."]);
          }
        } else if (diffDays < -REMINDER_CATCHUP_DAYS) {
          report.push([tabName, rowNum, name, "Premium Due", "Due date is " + (-diffDays) + " day(s) overdue -- past the " + REMINDER_CATCHUP_DAYS + "-day catch-up window. If a PAYMENT MODE is set, the next refresh will roll it forward to the next cycle automatically."]);
        }
      }
    });
  });

  if (report.length === 1) {
    report.push(["-", "-", "-", "-", "No birthday or payment-due rows found close enough to today to check."]);
  }

  debugSheet.getRange(1, 1, report.length, 5).setValues(report);
  debugSheet.getRange(1, 1, 1, 5).setFontWeight("bold");
  debugSheet.autoResizeColumns(1, 5);
  debugSheet.setFrozenRows(1);
  SpreadsheetApp.getActive().toast("Check the 'REMINDERS DEBUG' tab for the results.", "PULSE Reminders", 5);
}

function debugVoucherCheck() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var today = new Date();
  today.setHours(0, 0, 0, 0);

  var debugSheet = ss.getSheetByName("VOUCHER DEBUG");
  if (!debugSheet) {
    debugSheet = ss.insertSheet("VOUCHER DEBUG");
  }
  debugSheet.clear();
  var report = [["Sheet", "Row", "Name", "Reason"]];

  TRACKING_SHEETS.forEach(function (tabName) {
    var sheet = ss.getSheetByName(tabName);
    if (!sheet) {
      report.push([tabName, "-", "-", "This sheet doesn't exist (check the exact tab name)."]);
      return;
    }

    var cols = getColumnMap_(sheet);
    var lastRow = sheet.getLastRow();
    if (lastRow < cols._dataStartRow) {
      report.push([tabName, "-", "-", "No data rows found below the header row (row " + cols._headerRow + ")."]);
      return;
    }

    report.push([tabName, "-", "(headers found)",
      "Header row detected: " + cols._headerRow +
      " | NAME column: " + (cols.name > -1 ? colToA1_(cols.name + 1) : "MISSING") +
      " | BIRTHDAY column: " + (cols.birthday > -1 ? colToA1_(cols.birthday + 1) : "MISSING") +
      " | EMAIL column: " + (cols.email > -1 ? colToA1_(cols.email + 1) : "MISSING") +
      " | VOUCHER SENT column: " + (cols.voucherSent > -1 ? colToA1_(cols.voucherSent + 1) : "missing (ok if not set up yet)")]);

    if (cols.birthday === -1 || cols.email === -1) {
      report.push([tabName, "-", "-", "Skipping this whole sheet for voucher emails — needs BOTH a BIRTHDAY and an EMAIL header to work."]);
      return;
    }

    var numCols = sheet.getLastColumn();
    var data = sheet.getRange(cols._dataStartRow, 1, lastRow - cols._dataStartRow + 1, numCols).getValues();

    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      var name = cols.name > -1 ? row[cols.name] : "";
      var email = row[cols.email];
      var birthday = row[cols.birthday];
      var rowNum = cols._dataStartRow + i;

      if (!name) continue;

      if (!email) {
        report.push([tabName, rowNum, name, "No EMAIL filled in for this row — skipped."]);
        continue;
      }
      if (!(birthday instanceof Date)) {
        report.push([tabName, rowNum, name, "BIRTHDAY cell isn't a real date (it might be typed as plain text) — skipped. Value found: " + JSON.stringify(birthday)]);
        continue;
      }

      var birthdayThisYear = new Date(today.getFullYear(), birthday.getMonth(), birthday.getDate());
      if (birthdayThisYear < today) {
        birthdayThisYear = new Date(today.getFullYear() + 1, birthday.getMonth(), birthday.getDate());
      }
      var diffDays = Math.round((birthdayThisYear.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));

      var sentCell = cols.voucherSent > -1 ? row[cols.voucherSent] : null;
      var alreadySentThisYear = sentCell instanceof Date && sentCell.getFullYear() === today.getFullYear();

      if (diffDays !== BIRTHDAY_VOUCHER_DAYS_BEFORE) {
        report.push([tabName, rowNum, name, "Birthday is " + diffDays + " day(s) from today, but the setting (BIRTHDAY_VOUCHER_DAYS_BEFORE) is " + BIRTHDAY_VOUCHER_DAYS_BEFORE + " — doesn't match, so no email today."]);
      } else if (alreadySentThisYear) {
        report.push([tabName, rowNum, name, "Matches the day, BUT 'VOUCHER SENT' already has a date this year — clear that cell and re-run to force a resend."]);
      } else {
        report.push([tabName, rowNum, name, "SHOULD SEND — everything matches. If it still didn't arrive, check your email's Spam folder, and double-check the EMAIL address is typed correctly: " + email]);
      }
    }
  });

  debugSheet.getRange(1, 1, report.length, 4).setValues(report);
  debugSheet.getRange(1, 1, 1, 4).setFontWeight("bold");
  debugSheet.autoResizeColumns(1, 4);
  debugSheet.setFrozenRows(1);
  SpreadsheetApp.getActive().toast("Check the 'VOUCHER DEBUG' tab for the results.", "PULSE Reminders", 5);
}

/**
 * Shows exactly which column every automation is using on every tab,
 * right now. Run this any time you've reordered columns to confirm
 * everything still lines up correctly.
 */
function checkColumnMapping() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetsToCheck = ["APPROACH", "PRESENTATION", "CLOSING", "SR"];
  var reportSheet = ss.getSheetByName("COLUMN CHECK");
  if (!reportSheet) reportSheet = ss.insertSheet("COLUMN CHECK");
  reportSheet.clear();

  var fieldOrder = ["status", "week", "day", "dateOfAction", "name", "contact",
    "policyNumber", "productProposed", "nature", "percentage", "followUpDate",
    "remarks", "birthday", "paymentDue", "paymentMode", "email", "voucherSent",
    "greetingSent", "reminderSent", "advanceReminderSent"];
  var report = [["Tab", "Header Row Detected"].concat(fieldOrder)];

  sheetsToCheck.forEach(function (tabName) {
    var sheet = ss.getSheetByName(tabName);
    if (!sheet) {
      report.push([tabName, "sheet not found"]);
      return;
    }
    var cols = getColumnMap_(sheet);
    var rowOut = [tabName, cols._headerRow];
    fieldOrder.forEach(function (f) {
      rowOut.push(cols[f] > -1 ? colToA1_(cols[f] + 1) : "— not found —");
    });
    report.push(rowOut);
  });

  reportSheet.getRange(1, 1, report.length, report[0].length).setValues(report);
  reportSheet.getRange(1, 1, 1, report[0].length).setFontWeight("bold");
  reportSheet.autoResizeColumns(1, report[0].length);
  reportSheet.setFrozenRows(1);
  SpreadsheetApp.getActive().toast(
    "Check the 'COLUMN CHECK' tab — shows exactly which column each automation is using on each tab right now.",
    "PULSE Reminders", 5
  );
}

/**
 * Scans each tracking tab's header row for more than one column matching
 * GREETING SENT / REMINDER SENT / ADVANCE REMINDER SENT. This can only
 * happen if ensureReminderTrackingColumns_ ever ran against a header row
 * it mis-detected and appended a second copy instead of finding the real
 * one. getColumnMap_() always uses the FIRST match and silently ignores
 * the rest, so a duplicate doesn't break anything today -- it just means
 * a second column is sitting there unused, which is worth knowing about
 * before it causes confusion later. Read-only: reports duplicates, never
 * deletes a column itself (a column that might already hold sent-dates
 * isn't something to remove automatically).
 */
function checkDuplicateReminderColumns() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var reportSheet = ss.getSheetByName("DUPLICATE COLUMNS CHECK");
  if (!reportSheet) reportSheet = ss.insertSheet("DUPLICATE COLUMNS CHECK");
  reportSheet.clear();

  var fieldsToCheck = {
    greetingSent: ["GREETING SENT"],
    reminderSent: ["REMINDER SENT"],
    advanceReminderSent: ["ADVANCE REMINDER SENT"]
  };

  var report = [["Tab", "Column Header", "Found In Columns", "Note"]];
  var anyDuplicates = false;

  TRACKING_SHEETS.forEach(function (tabName) {
    var sheet = ss.getSheetByName(tabName);
    if (!sheet) return;

    var cols = getColumnMap_(sheet);
    var lastCol = sheet.getLastColumn();
    if (lastCol < 1) return;

    var headers = sheet.getRange(cols._headerRow, 1, 1, lastCol).getValues()[0]
      .map(function (h) { return String(h).trim().toUpperCase(); });

    for (var field in fieldsToCheck) {
      var candidates = fieldsToCheck[field];
      var matches = [];
      for (var c = 0; c < headers.length; c++) {
        if (!headers[c]) continue;
        for (var i = 0; i < candidates.length; i++) {
          if (headers[c].indexOf(candidates[i]) === 0) {
            matches.push(colToA1_(c + 1));
            break;
          }
        }
      }
      if (matches.length > 1) {
        anyDuplicates = true;
        report.push([tabName, candidates[0], matches.join(", "),
          "Only " + matches[0] + " is actually being used (the script always takes the first match) — " +
          matches.slice(1).join(", ") + " " + (matches.length === 2 ? "is" : "are") +
          " unused. Safe to delete once you've confirmed it's empty or moved any data you need off it."]);
      }
    }
  });

  if (!anyDuplicates) {
    report.push(["-", "-", "-", "No duplicate GREETING SENT / REMINDER SENT / ADVANCE REMINDER SENT columns found — all clear."]);
  }

  reportSheet.getRange(1, 1, report.length, 4).setValues(report);
  reportSheet.getRange(1, 1, 1, 4).setFontWeight("bold");
  reportSheet.autoResizeColumns(1, 4);
  reportSheet.setFrozenRows(1);
  SpreadsheetApp.getActive().toast(
    anyDuplicates
      ? "Found duplicate reminder-tracking columns — check the 'DUPLICATE COLUMNS CHECK' tab."
      : "No duplicate reminder-tracking columns found.",
    "PULSE Reminders", 5
  );
}


/**
 * ===================================================================
 * PART 7 — BULK EMAIL (same template, many addresses)
 * -----------------------------------------------------------------
 * Reuses the exact same getColumnMap_() engine as everything else
 * above, so it automatically follows the NAME and EMAIL columns
 * wherever they are, on whichever tab you're on.
 *
 * FORMATTING IN YOUR MESSAGE (cell B2 on EMAIL TEMPLATE):
 *   **word**     -> bold
 *   *word*       -> italic
 *   - some line  -> bullet point
 *   Alt+Enter (Option+Enter on Mac) inside the cell -> new line /
 *     blank line (a plain Enter just exits the cell instead)
 * ===================================================================
 */

var BULK_EMAIL_TEMPLATE_SHEET = "EMAIL TEMPLATE";
var BULK_EMAIL_SENT_HEADER = "BULK EMAIL SENT";

// The free-typed blast list lives on the SAME "EMAIL TEMPLATE" tab,
// underneath the subject/body — same idea as your WhatsApp "BLAST
// LIST" sheet (message up top, names/contacts listed below it).
var BLAST_LIST_HEADER_ROW = 5; // row with NAME / EMAIL / SENT headers
var BLAST_LIST_START_ROW = 6;  // first row you type recipients into

/**
 * Creates the EMAIL TEMPLATE tab (subject/body + attachment link +
 * the blast list section below it) if it doesn't already exist. If
 * the tab already exists but was made before the attachment/blast
 * list features, this just adds the missing pieces underneath
 * without touching your subject or body. Safe to run more than once.
 */
function setupBulkEmailTemplateSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(BULK_EMAIL_TEMPLATE_SHEET);
  var isNew = !sheet;

  if (isNew) {
    var settings = getAgentSettings_();
    sheet = ss.insertSheet(BULK_EMAIL_TEMPLATE_SHEET);
    sheet.getRange("A1").setValue("SUBJECT");
    sheet.getRange("B1").setValue("Quick update from your advisor, {{NAME}}");
    sheet.getRange("A2").setValue("BODY");
    sheet.getRange("B2").setValue(
      "Hi {{NAME}},\n\n" +
      "Just a quick note to follow up regarding {{PRODUCT PROPOSED}}.\n\n" +
      "Wrap any word in **double stars** to make it **bold**, or *single stars* for *italic*.\n" +
      "Start a line with a dash and a space to make a bullet point, like:\n" +
      "- first point\n" +
      "- second point\n\n" +
      "Please let me know if you have any questions.\n\n" +
      "Best regards,\n" + settings.agentName
    );
    sheet.getRange("A3").setValue("ATTACHMENT / POSTER LINK (optional)").setFontWeight("bold");
    sheet.getRange("B3").setNote(
      'Paste a Google Drive share link here (right-click the file in Drive > "Get link", ' +
      'make sure it\'s set to "Anyone with the link"). Leave blank for no attachment. ' +
      "An image is also shown as a picture inside the email; other files (PDF etc.) are " +
      "attached as a downloadable file. Same file is used for every send until you change it."
    );
    sheet.setColumnWidth(1, 100);
    sheet.setColumnWidth(2, 500);
  }

  var addedAttachmentRow = ensureAttachmentRow_(sheet);
  var addedListSection = ensureBulkEmailListSection_(sheet);

  if (isNew) {
    SpreadsheetApp.getUi().alert(
      'Created the "' + BULK_EMAIL_TEMPLATE_SHEET + '" tab.\n\n' +
      "Edit cell B1 for the subject line and B2 for the message body (both support {{NAME}} " +
      'and any other header on your tracker tabs, e.g. {{PRODUCT PROPOSED}}). Wrap words in ' +
      '**double stars** for bold, *single stars* for italic, and start a line with "- " for a bullet point. ' +
      "Use Alt+Enter (Option+Enter on Mac) inside the cell for a new line.\n\n" +
      'Paste a Google Drive link into B3 to attach a file or show a poster image — optional.\n\n' +
      'For a plain email blast, type or paste your recipients into the "NAME" and "EMAIL" ' +
      "columns starting row " + BLAST_LIST_START_ROW + " (below the template), then use " +
      '"Send Email Blast" from the menu.'
    );
  } else if (addedAttachmentRow || addedListSection) {
    SpreadsheetApp.getUi().alert(
      'Your existing "' + BULK_EMAIL_TEMPLATE_SHEET + '" tab has been upgraded — B3 now takes an ' +
      "optional Google Drive link for an attachment/poster, **double stars** makes text bold, " +
      '*single stars* makes text italic, lines starting with "- " become bullet points, and the ' +
      "blast list has shifted down to row " + BLAST_LIST_START_ROW + " onward " +
      "(so it doesn't overlap the new B3 field). Type or paste names/emails there, then use " +
      '"Send Email Blast" from the menu.'
    );
  } else {
    SpreadsheetApp.getUi().alert('The "' + BULK_EMAIL_TEMPLATE_SHEET + '" tab is already set up.');
  }
}

/**
 * Makes sure the "ATTACHMENT / POSTER LINK" row exists at A3/B3. If
 * the tab was set up before this feature existed (list header was at
 * the old row 4), this inserts a new row 3 to make room, which shifts
 * the old blank row and the blast list header/rows down by one — that
 * shift is exactly why BLAST_LIST_HEADER_ROW/START_ROW moved to 5/6.
 * Returns true if it just added the row, false if already there.
 */
function ensureAttachmentRow_(sheet) {
  var a3 = sheet.getRange("A3").getValue().toString().trim().toUpperCase();
  if (a3.indexOf("ATTACHMENT") === 0) {
    return false; // already migrated
  }
  sheet.insertRowBefore(3);
  sheet.getRange("A3").setValue("ATTACHMENT / POSTER LINK (optional)").setFontWeight("bold");
  sheet.getRange("B3").setNote(
    'Paste a Google Drive share link here (right-click the file in Drive > "Get link", ' +
    'make sure it\'s set to "Anyone with the link"). Leave blank for no attachment. ' +
    "An image is also shown as a picture inside the email; other files (PDF etc.) are " +
    "attached as a downloadable file. Same file is used for every send until you change it."
  );
  return true;
}

/**
 * Scans row BLAST_LIST_HEADER_ROW for NAME / EMAIL / SENT (by header
 * text, not fixed position), adding SENT in the next empty column if
 * it's missing. Any OTHER columns in between (like COMPANY NAME) are
 * left completely alone and usable as {{COMPANY NAME}} in your message.
 * Returns { nameCol, emailCol, sentCol, headers, lastCol } (0-based
 * column indexes, headers is the full header row as an array).
 */
function getBlastListColumns_(sheet) {
  var lastCol = Math.max(sheet.getLastColumn(), 3);
  var headers = sheet.getRange(BLAST_LIST_HEADER_ROW, 1, 1, lastCol).getValues()[0]
    .map(function (h) { return String(h).trim().toUpperCase(); });

  var nameCol = headers.indexOf("NAME");
  var emailCol = headers.indexOf("EMAIL");
  var sentCol = headers.indexOf("SENT");

  if (nameCol === -1) {
    sheet.getRange(BLAST_LIST_HEADER_ROW, 1).setValue("NAME").setFontWeight("bold");
    nameCol = 0;
    headers[0] = "NAME";
  }
  if (emailCol === -1) {
    sheet.getRange(BLAST_LIST_HEADER_ROW, 2).setValue("EMAIL").setFontWeight("bold");
    emailCol = 1;
    headers[1] = "EMAIL";
  }
  if (sentCol === -1) {
    var newCol = Math.max(lastCol, headers.length) + 1;
    sheet.getRange(BLAST_LIST_HEADER_ROW, newCol).setValue("SENT").setFontWeight("bold");
    sentCol = newCol - 1;
    headers[sentCol] = "SENT";
    lastCol = newCol;
  }

  return { nameCol: nameCol, emailCol: emailCol, sentCol: sentCol, headers: headers, lastCol: Math.max(lastCol, sentCol + 1) };
}

/**
 * Makes sure the NAME / EMAIL / SENT header row for the blast list
 * exists below the template (adding SENT if it's missing, without
 * touching any other field you've added). Returns true if it just
 * added something, false if everything was already there.
 */
function ensureBulkEmailListSection_(sheet) {
  var existing = sheet.getRange(BLAST_LIST_HEADER_ROW, 1, 1, Math.max(sheet.getLastColumn(), 3)).getValues()[0]
    .map(function (v) { return String(v).trim().toUpperCase(); });

  if (existing[0] === "NAME" && existing[1] === "EMAIL" && existing.indexOf("SENT") > -1) {
    return false; // already fully set up
  }

  getBlastListColumns_(sheet); // creates whatever's missing
  sheet.setColumnWidth(2, Math.max(sheet.getColumnWidth(2), 220));
  return true;
}

/**
 * Finds (or creates) the "BULK EMAIL SENT" tracking column on the
 * given sheet, on the same real header row getColumnMap_() detected.
 * Returns the 0-based column index.
 */
function findOrCreateBulkEmailSentColumn_(sheet, cols) {
  var headerRow = cols._headerRow;
  var lastCol = sheet.getLastColumn();
  var headers = sheet.getRange(headerRow, 1, 1, lastCol).getValues()[0];

  for (var c = 0; c < headers.length; c++) {
    if (String(headers[c]).trim().toUpperCase() === BULK_EMAIL_SENT_HEADER) {
      return c; // 0-based
    }
  }

  var newCol = lastCol + 1;
  sheet.getRange(headerRow, newCol).setValue(BULK_EMAIL_SENT_HEADER);
  return newCol - 1; // 0-based
}

/**
 * Sends personalized bulk email to everyone on the active tab who
 * has an email address (found via getColumnMap_) and hasn't already
 * been sent one.
 */
function sendBulkEmail() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var dataSheet = ss.getActiveSheet();

  if (dataSheet.getName() === BULK_EMAIL_TEMPLATE_SHEET) {
    ui.alert('Please switch to your data tab (e.g. "APPROACH") before sending - ' +
      "this is the template tab.");
    return;
  }

  var templateSheet = ss.getSheetByName(BULK_EMAIL_TEMPLATE_SHEET);
  if (!templateSheet) {
    ui.alert('No email template found yet. Run "Set Up Bulk Email Template" first.');
    return;
  }
  ensureAttachmentRow_(templateSheet);

  var subjectTemplate = templateSheet.getRange("B1").getValue().toString();
  var bodyTemplate = templateSheet.getRange("B2").getValue().toString();
  if (!subjectTemplate || !bodyTemplate) {
    ui.alert('Your email template is empty. Open the "' + BULK_EMAIL_TEMPLATE_SHEET +
      '" tab and fill in B1 (subject) and B2 (message).');
    return;
  }

  var attachmentInfo = getEmailAttachmentInfo_(templateSheet.getRange("B3").getValue());
  if (attachmentInfo && attachmentInfo.error) {
    ui.alert('Could not open the attachment/poster link in B3 (' + attachmentInfo.error + '). ' +
      'Sending without it — check the Drive link is set to "Anyone with the link can view."');
    attachmentInfo = null;
  }

  var cols = getColumnMap_(dataSheet);
  if (cols.name === -1 || cols.email === -1) {
    ui.alert('This tab needs a "NAME" column and an "EMAIL" column to send bulk email. ' +
      "Try this on the APPROACH, PRESENTATION, or CLOSING tab instead.");
    return;
  }

  var lastRow = dataSheet.getLastRow();
  if (lastRow < cols._dataStartRow) {
    ui.alert("This tab has no data rows to send to.");
    return;
  }

  var sentCol = findOrCreateBulkEmailSentColumn_(dataSheet, cols);
  var lastCol = dataSheet.getLastColumn();
  var values = dataSheet.getRange(cols._dataStartRow, 1, lastRow - cols._dataStartRow + 1, lastCol).getValues();
  var headers = dataSheet.getRange(cols._headerRow, 1, 1, lastCol).getValues()[0]
    .map(function (h) { return h.toString().trim().toUpperCase(); });

  var rowsToSend = [];
  for (var i = 0; i < values.length; i++) {
    var name = (values[i][cols.name] || "").toString().trim();
    var email = (values[i][cols.email] || "").toString().trim();
    var alreadySent = sentCol < values[i].length ? values[i][sentCol] : "";
    if (name && email && !alreadySent) {
      rowsToSend.push(i);
    }
  }

  if (rowsToSend.length === 0) {
    ui.alert("No one to email - everyone with an email address on this tab has already " +
      'been sent one (check the "' + BULK_EMAIL_SENT_HEADER + '" column), or nobody has an ' +
      "email address filled in yet.");
    return;
  }

  var remainingQuota = MailApp.getRemainingDailyQuota();
  if (remainingQuota < rowsToSend.length) {
    ui.alert(
      "Not enough email quota left today.\n\n" +
      "You want to send: " + rowsToSend.length + "\n" +
      "Remaining today: " + remainingQuota + "\n\n" +
      "Personal Gmail accounts get about 500 emails/day. Try again later, or in smaller batches."
    );
    return;
  }

  var confirm = ui.alert(
    "Ready to send",
    "This will send " + rowsToSend.length + " personalized email(s) from your Gmail. Continue?",
    ui.ButtonSet.YES_NO
  );
  if (confirm !== ui.Button.YES) return;

  var sentCount = 0;
  var failCount = 0;

  rowsToSend.forEach(function (i) {
    var row = values[i];
    var email = row[cols.email].toString().trim();
    var subject = stripBoldMarkers_(fillBulkEmailTemplate_(subjectTemplate, headers, row));
    var filledBody = fillBulkEmailTemplate_(bodyTemplate, headers, row);
    var plainBody = stripBoldMarkers_(filledBody);
    var htmlBody = boldMarkdownToHtml_(filledBody);
    var sheetRowNum = cols._dataStartRow + i;
    var mailOptions = { htmlBody: htmlBody };
    if (attachmentInfo) {
      mailOptions.attachments = [attachmentInfo.blob];
      if (attachmentInfo.isImage) {
        mailOptions.inlineImages = { posterImage: attachmentInfo.blob };
        mailOptions.htmlBody += '<br><br><img src="cid:posterImage" style="max-width:500px;">';
      }
    }

    try {
      GmailApp.sendEmail(email, subject, plainBody, mailOptions);
      dataSheet.getRange(sheetRowNum, sentCol + 1).setValue(new Date());
      sentCount++;
    } catch (e) {
      dataSheet.getRange(sheetRowNum, sentCol + 1).setValue("FAILED: " + e.message);
      failCount++;
    }
  });

  ui.alert("Done. Sent: " + sentCount + ". Failed: " + failCount +
    (failCount > 0 ? "\n\nCheck the \"" + BULK_EMAIL_SENT_HEADER + "\" column for error details." : ""));
}

/**
 * Sends the subject/body from EMAIL TEMPLATE (B1/B2) to everyone
 * listed in the blast list section below it (row BLAST_LIST_START_ROW
 * onward) who has an email and hasn't already been marked SENT.
 * Unlike WhatsApp's click-to-send links, this sends every email
 * automatically in one go — no per-message tapping needed.
 */
function sendEmailBlast() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(BULK_EMAIL_TEMPLATE_SHEET);

  if (!sheet) {
    ui.alert('No "' + BULK_EMAIL_TEMPLATE_SHEET + '" tab yet. Run "Set Up Bulk Email Template" first.');
    return;
  }

  ensureAttachmentRow_(sheet);
  ensureBulkEmailListSection_(sheet);
  var listCols = getBlastListColumns_(sheet);

  var subjectTemplate = sheet.getRange("B1").getValue().toString();
  var bodyTemplate = sheet.getRange("B2").getValue().toString();
  if (!subjectTemplate || !bodyTemplate) {
    ui.alert("Your email template is empty. Fill in B1 (subject) and B2 (message) first.");
    return;
  }

  var attachmentInfo = getEmailAttachmentInfo_(sheet.getRange("B3").getValue());
  if (attachmentInfo && attachmentInfo.error) {
    ui.alert('Could not open the attachment/poster link in B3 (' + attachmentInfo.error + '). ' +
      'Sending without it — check the Drive link is set to "Anyone with the link can view."');
    attachmentInfo = null;
  }

  var lastRow = sheet.getLastRow();
  if (lastRow < BLAST_LIST_START_ROW) {
    ui.alert('No recipients yet. Type or paste names/emails starting row ' + BLAST_LIST_START_ROW + ', below the template.');
    return;
  }

  var values = sheet.getRange(BLAST_LIST_START_ROW, 1, lastRow - BLAST_LIST_START_ROW + 1, listCols.lastCol).getValues();

  var rowsToSend = [];
  for (var i = 0; i < values.length; i++) {
    var name = (values[i][listCols.nameCol] || "").toString().trim();
    var email = (values[i][listCols.emailCol] || "").toString().trim();
    var alreadySent = values[i][listCols.sentCol];
    if (email && !alreadySent) {
      rowsToSend.push(i);
    }
  }

  if (rowsToSend.length === 0) {
    ui.alert("Nothing to send — everyone in the list already has a SENT date, or the list is empty. " +
      "(If this looks wrong, run the debug tool to see the raw SENT column values.)");
    return;
  }

  var remainingQuota = MailApp.getRemainingDailyQuota();
  if (remainingQuota < rowsToSend.length) {
    ui.alert(
      "Not enough email quota left today.\n\n" +
      "You want to send: " + rowsToSend.length + "\n" +
      "Remaining today: " + remainingQuota + "\n\n" +
      "Personal Gmail accounts get about 500 emails/day. Try again later, or in smaller batches."
    );
    return;
  }

  var confirm = ui.alert(
    "Ready to blast",
    "This will send " + rowsToSend.length + " email(s) from your Gmail, right now, no further taps needed. Continue?",
    ui.ButtonSet.YES_NO
  );
  if (confirm !== ui.Button.YES) return;

  var sentCount = 0;
  var failCount = 0;

  rowsToSend.forEach(function (i) {
    var row = values[i];
    var email = row[listCols.emailCol].toString().trim();
    var subject = stripBoldMarkers_(fillBulkEmailTemplate_(subjectTemplate, listCols.headers, row));
    var filledBody = fillBulkEmailTemplate_(bodyTemplate, listCols.headers, row);
    var plainBody = stripBoldMarkers_(filledBody);
    var htmlBody = boldMarkdownToHtml_(filledBody);
    var sheetRowNum = BLAST_LIST_START_ROW + i;
    var mailOptions = { htmlBody: htmlBody };
    if (attachmentInfo) {
      mailOptions.attachments = [attachmentInfo.blob];
      if (attachmentInfo.isImage) {
        mailOptions.inlineImages = { posterImage: attachmentInfo.blob };
        mailOptions.htmlBody += '<br><br><img src="cid:posterImage" style="max-width:500px;">';
      }
    }

    try {
      GmailApp.sendEmail(email, subject, plainBody, mailOptions);
      sheet.getRange(sheetRowNum, listCols.sentCol + 1).setValue(new Date());
      sentCount++;
    } catch (e) {
      sheet.getRange(sheetRowNum, listCols.sentCol + 1).setValue("FAILED: " + e.message);
      failCount++;
    }
  });

  ui.alert("Blast done. Sent: " + sentCount + ". Failed: " + failCount +
    (failCount > 0 ? '\n\nCheck the "SENT" column for error details.' : ""));
}

/**
 * Removes every row from the blast list that's already marked SENT,
 * so the list doesn't keep growing with old, completed entries.
 * Rows still waiting to be sent are left exactly where they are.
 */
function deleteSentBlastRows() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(BULK_EMAIL_TEMPLATE_SHEET);

  if (!sheet) {
    ui.alert('No "' + BULK_EMAIL_TEMPLATE_SHEET + '" tab yet.');
    return;
  }

  ensureAttachmentRow_(sheet);
  ensureBulkEmailListSection_(sheet);
  var listCols = getBlastListColumns_(sheet);

  var lastRow = sheet.getLastRow();
  if (lastRow < BLAST_LIST_START_ROW) {
    ui.alert("The blast list is already empty.");
    return;
  }

  var numRows = lastRow - BLAST_LIST_START_ROW + 1;
  var values = sheet.getRange(BLAST_LIST_START_ROW, 1, numRows, listCols.lastCol).getValues();

  var remaining = [];
  var deletedCount = 0;
  values.forEach(function (row) {
    if (row[listCols.sentCol]) {
      deletedCount++;
    } else {
      remaining.push(row);
    }
  });

  if (deletedCount === 0) {
    ui.alert("Nothing to delete — no rows in the blast list are marked SENT yet.");
    return;
  }

  var confirm = ui.alert(
    "Delete sent rows",
    "This will remove " + deletedCount + " row(s) already marked SENT from the blast list, " +
    "keeping the " + remaining.length + " row(s) not yet sent. Continue?",
    ui.ButtonSet.YES_NO
  );
  if (confirm !== ui.Button.YES) return;

  sheet.getRange(BLAST_LIST_START_ROW, 1, numRows, listCols.lastCol).clearContent();
  if (remaining.length > 0) {
    sheet.getRange(BLAST_LIST_START_ROW, 1, remaining.length, listCols.lastCol).setValues(remaining);
  }

  ui.alert("Deleted " + deletedCount + " sent row(s). " + remaining.length + " row(s) remain in the list.");
}

/**
 * DIAGNOSTIC (optional) — shows exactly what's in your blast list
 * right now, using the same header-based column lookup as the real
 * send function. Does NOT send anything. Run manually from the
 * Apps Script function dropdown (Run button) when something looks
 * wrong — e.g. "everyone already sent" when nobody has been.
 */
function debugEmailBlastList() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(BULK_EMAIL_TEMPLATE_SHEET);

  var debugSheet = ss.getSheetByName("BLAST DEBUG");
  if (!debugSheet) debugSheet = ss.insertSheet("BLAST DEBUG");
  debugSheet.clear();

  var report = [["Check", "Result"]];

  if (!sheet) {
    report.push(['"' + BULK_EMAIL_TEMPLATE_SHEET + '" tab', "DOES NOT EXIST — run 'Set Up Bulk Email Template' first."]);
    debugSheet.getRange(1, 1, report.length, 2).setValues(report);
    debugSheet.getRange(1, 1, 1, 2).setFontWeight("bold");
    return;
  }

  var listCols = getBlastListColumns_(sheet);

  report.push(['"' + BULK_EMAIL_TEMPLATE_SHEET + '" tab', "found"]);
  report.push(["Header row " + BLAST_LIST_HEADER_ROW, listCols.headers.join(" | ")]);
  report.push(["NAME column", colToA1_(listCols.nameCol + 1)]);
  report.push(["EMAIL column", colToA1_(listCols.emailCol + 1)]);
  report.push(["SENT column", colToA1_(listCols.sentCol + 1)]);
  report.push(["Sheet's last row", sheet.getLastRow()]);
  report.push(["", ""]);

  var headerRowOut = ["Row #", "NAME"];
  for (var h = 0; h < listCols.headers.length; h++) {
    if (h !== listCols.nameCol) headerRowOut.push(listCols.headers[h]);
  }
  report.push(headerRowOut);

  var lastRow = sheet.getLastRow();
  if (lastRow >= BLAST_LIST_START_ROW) {
    var values = sheet.getRange(BLAST_LIST_START_ROW, 1, lastRow - BLAST_LIST_START_ROW + 1, listCols.lastCol).getValues();
    for (var i = 0; i < values.length; i++) {
      var rowNum = BLAST_LIST_START_ROW + i;
      var rowOut = [rowNum, values[i][listCols.nameCol]];
      for (var c = 0; c < values[i].length; c++) {
        if (c === listCols.nameCol) continue;
        var val = values[i][c];
        var label = c === listCols.sentCol ? " (SENT: " + JSON.stringify(val) + ")" : "";
        rowOut.push(String(val) + label);
      }
      report.push(rowOut);
    }
  } else {
    report.push(["(no rows found from row " + BLAST_LIST_START_ROW + " onward)"]);
  }

  var maxLen = report.reduce(function (m, r) { return Math.max(m, r.length); }, 0);
  var padded = report.map(function (r) { while (r.length < maxLen) r.push(""); return r; });

  debugSheet.getRange(1, 1, padded.length, maxLen).setValues(padded);
  debugSheet.getRange(1, 1, 1, maxLen).setFontWeight("bold");
  debugSheet.autoResizeColumns(1, maxLen);
  debugSheet.setFrozenRows(1);

  SpreadsheetApp.getActive().toast("Check the 'BLAST DEBUG' tab for the results.", "PULSE Reminders", 5);
}

/**
 * Replaces {{HEADER NAME}} placeholders using the header row found
 * on the active tab (works even though headers differ across tabs).
 */
function fillBulkEmailTemplate_(template, headers, row) {
  return template.replace(/{{\s*([^}]+?)\s*}}/g, function (match, key) {
    var idx = headers.indexOf(key.trim().toUpperCase());
    if (idx === -1) return match;
    var val = row[idx];
    if (val instanceof Date) {
      return Utilities.formatDate(val, Session.getScriptTimeZone(), "dd MMM yyyy");
    }
    return val === null || val === undefined ? "" : val.toString();
  });
}

/**
 * Converts **double-star** markers into real bold (<b>), *single-star*
 * markers into italic (<i>), turns any line starting with "- " or "* "
 * into a real bullet point (<ul><li>), and turns remaining line breaks
 * into <br> — so the message displays properly as HTML email. Also
 * escapes stray < > & so pasted text can't break the email's HTML.
 */
function boldMarkdownToHtml_(text) {
  var escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Order matters: catch ***bold+italic*** before ** and * separately,
  // so three-star text doesn't get chopped up into overlapping tags.
  escaped = escaped.replace(/\*\*\*(.+?)\*\*\*/g, "<b><i>$1</i></b>");
  escaped = escaped.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");

  var lines = escaped.split("\n");
  var htmlParts = [];
  var inList = false;

  lines.forEach(function (line) {
    var bulletMatch = line.match(/^\s*[-*]\s+(.*)$/);
    if (bulletMatch) {
      if (!inList) {
        htmlParts.push("<ul style=\"margin:4px 0;padding-left:20px;\">");
        inList = true;
      }
      htmlParts.push("<li>" + applyItalic_(bulletMatch[1]) + "</li>");
    } else {
      if (inList) {
        htmlParts.push("</ul>");
        inList = false;
      }
      htmlParts.push(applyItalic_(line) + "<br>");
    }
  });
  if (inList) htmlParts.push("</ul>");

  return htmlParts.join("");
}

// Turns *single-star* text into italic. Only matches a star pair with
// no space right after the opening star, so it can't accidentally
// grab a "* " bullet marker at the start of a line.
function applyItalic_(line) {
  return line.replace(/\*(\S(?:.*?\S)?)\*/g, "<i>$1</i>");
}

/**
 * Removes ** and * markers for the plain-text fallback version of the
 * email (and for the subject line, which can't show bold/italic at all).
 */
function stripBoldMarkers_(text) {
  return text.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(\S(?:.*?\S)?)\*/g, "$1");
}

/**
 * Reads the Google Drive link from the template's B3 cell and
 * returns { blob, isImage, name } ready to attach/embed, or null if
 * B3 is empty. Returns { error } if the link couldn't be opened
 * (wrong sharing permissions, bad link, etc.) so callers can warn
 * the user instead of the whole send silently failing.
 */
function getEmailAttachmentInfo_(linkValue) {
  var trimmed = (linkValue || "").toString().trim();
  if (!trimmed) return null;

  var id = extractDriveFileId_(trimmed);
  if (!id) {
    return { error: "couldn't find a Google Drive file ID in that link" };
  }

  try {
    var file = DriveApp.getFileById(id);
    var blob = file.getBlob();
    var mime = blob.getContentType() || "";
    return { blob: blob, isImage: mime.indexOf("image/") === 0, name: file.getName() };
  } catch (e) {
    return { error: e.message };
  }
}

/**
 * Pulls a Drive file ID out of the common share-link formats, or
 * accepts a bare file ID typed directly.
 */
function extractDriveFileId_(link) {
  var m = link.match(/\/d\/([a-zA-Z0-9_-]{10,})/);
  if (m) return m[1];
  m = link.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  if (m) return m[1];
  if (/^[a-zA-Z0-9_-]{10,}$/.test(link)) return link;
  return null;
}


/**
 * ===================================================================
 * PART 8 — ACTIVITY LOG + PERFORMANCE TRACKER
 * -----------------------------------------------------------------
 * A permanent, ever-growing record of "this stage happened, on this
 * date, for this person" -- written to automatically. This is what
 * lets PERFORMANCE_TRACKER show a TRUE year-long total instead of a
 * live snapshot that shrinks whenever a row moves off a tab.
 * ===================================================================
 */

var ACTIVITY_LOG_SHEET_NAME = "ACTIVITY LOG";
var PERFORMANCE_TRACKER_SHEET_NAME = "PERFORMANCE_TRACKER";
var PERFORMANCE_TRACKER_STAGES = ["APPROACH", "PRESENTATION", "CLOSING", "SR"];
var PERFORMANCE_TRACKER_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Creates the ACTIVITY LOG tab if it doesn't already exist. Safe to
 * call any time -- this is the script's own sheet, not one you need
 * to touch directly (though you can always look at it, or delete a
 * row if something got logged by mistake, e.g. from a date typo fix).
 */
function ensureActivityLogSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(ACTIVITY_LOG_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(ACTIVITY_LOG_SHEET_NAME);
    sheet.getRange(1, 1, 1, 4).setValues([["DATE", "STAGE", "NAME", "CONTACT"]]).setFontWeight("bold");
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 100);
    sheet.setColumnWidth(2, 110);
    sheet.setColumnWidth(3, 220);
    sheet.setColumnWidth(4, 140);
  }
  return sheet;
}

/**
 * Appends one row to the Activity Log. Called automatically whenever
 * a Date of Action is typed/edited, or a row moves to a new stage --
 * you shouldn't normally need to call this yourself.
 */
function logActivity_(stage, name, contact, dateVal) {
  if (!name) return; // nothing meaningful to log
  var sheet = ensureActivityLogSheet_();
  sheet.appendRow([dateVal, stage, name, contact || ""]);
}

/**
 * One-time (or run-again-safely) setup: points every month/stage cell
 * on PERFORMANCE_TRACKER at the ACTIVITY LOG instead of counting live
 * rows on each tracking tab. Finds the "MONTH" header row and
 * "SELECT YEAR" cell by reading their labels, rather than assuming a
 * fixed row/column -- same header-based approach as the rest of the
 * script, so it's safe even if PERFORMANCE_TRACKER's layout shifts.
 */
function setupPerformanceTrackerFormulas() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(PERFORMANCE_TRACKER_SHEET_NAME);
  if (!sheet) {
    ui.alert('Could not find a "' + PERFORMANCE_TRACKER_SHEET_NAME + '" tab -- setup cancelled.');
    return;
  }

  ensureActivityLogSheet_();

  var lastRow = Math.min(Math.max(sheet.getLastRow(), 1), 40);
  var lastCol = Math.max(sheet.getLastColumn(), 6);
  var block = sheet.getRange(1, 1, lastRow, lastCol).getValues();

  var headerRow = -1, monthCol = -1, yearCell = null;

  for (var r = 0; r < block.length; r++) {
    for (var c = 0; c < block[r].length; c++) {
      var v = String(block[r][c]).trim().toUpperCase();
      if (v === "MONTH" && headerRow === -1) { headerRow = r; monthCol = c; }
      if (v === "SELECT YEAR" && !yearCell) { yearCell = { row: r, col: c }; }
    }
  }

  if (headerRow === -1) {
    ui.alert('Could not find a "MONTH" header on the ' + PERFORMANCE_TRACKER_SHEET_NAME + ' tab -- setup cancelled. Tell me the exact header text you see and I\'ll fix the lookup.');
    return;
  }
  if (!yearCell) {
    ui.alert('Could not find a "SELECT YEAR" cell -- setup cancelled. Tell me the exact label you see and I\'ll fix the lookup.');
    return;
  }

  var headerValues = block[headerRow];
  var stageCols = {};
  for (var c2 = 0; c2 < headerValues.length; c2++) {
    var label = String(headerValues[c2]).trim().toUpperCase();
    if (PERFORMANCE_TRACKER_STAGES.indexOf(label) !== -1) {
      stageCols[label] = c2;
    }
  }

  var yearRef = "$" + colToA1_(yearCell.col + 2) + "$" + (yearCell.row + 1); // cell to the right of the "SELECT YEAR" label
  var monthNamesFormula = '{"Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"}';
  var logDateRange = "'" + ACTIVITY_LOG_SHEET_NAME + "'!$A:$A";
  var logStageRange = "'" + ACTIVITY_LOG_SHEET_NAME + "'!$B:$B";
  var monthRowStart = headerRow + 2; // 1-based sheet row right after the header
  var written = 0;
  var skippedMonths = [];

  for (var m = 0; m < PERFORMANCE_TRACKER_MONTHS.length; m++) {
    var sheetRow = monthRowStart + m;
    var actualMonthLabel = String(sheet.getRange(sheetRow, monthCol + 1).getValue()).trim();
    if (actualMonthLabel.toLowerCase().indexOf(PERFORMANCE_TRACKER_MONTHS[m].toLowerCase()) !== 0) {
      skippedMonths.push(PERFORMANCE_TRACKER_MONTHS[m] + " (row " + sheetRow + ' has "' + actualMonthLabel + '")');
      continue; // row doesn't line up with the expected month -- skip rather than guess wrong
    }

    var monthCellA1 = "$" + colToA1_(monthCol + 1) + sheetRow;

    for (var stage in stageCols) {
      var colIndex = stageCols[stage];
      var formula = '=COUNTIFS(' + logDateRange + ', ">="&DATE(' + yearRef + ', MATCH(' + monthCellA1 + ', ' + monthNamesFormula + ', 0), 1), '
        + logDateRange + ', "<="&EOMONTH(DATE(' + yearRef + ', MATCH(' + monthCellA1 + ', ' + monthNamesFormula + ', 0), 1), 0), '
        + logStageRange + ', "' + stage + '")';
      sheet.getRange(sheetRow, colIndex + 1).setFormula(formula);
      written++;
    }
  }

  var message = "Performance Tracker updated: " + written + " formula(s) now pull from the ACTIVITY LOG instead of the live tabs.";
  if (skippedMonths.length > 0) {
    message += "\n\nCouldn't line up these months, so they were left untouched: " + skippedMonths.join(", ") +
      ". If those rows are actually your months, tell me and I'll adjust.";
  }
  ui.alert(message);
}

/**
 * One-time: seeds the Activity Log with every row currently sitting
 * on APPROACH/PRESENTATION/CLOSING/SR, using each row's CURRENT Date
 * of Action and CURRENT tab as a best-effort stand-in for history
 * (it can't know the true original approach date for something that
 * already moved before this system existed). Safe to run once;
 * running it again will add duplicate entries for anything already
 * logged, so only use this the first time you set this up.
 */
function backfillActivityLog() {
  var ui = SpreadsheetApp.getUi();
  var confirm = ui.alert(
    "Backfill Activity Log",
    "This adds one log entry for every row currently on APPROACH, PRESENTATION, CLOSING, and SR, " +
    "dated by each row's current Date of Action. It only ADDS entries, never removes anything. " +
    "Only run this once -- running it again will create duplicates. Continue?",
    ui.ButtonSet.YES_NO
  );
  if (confirm !== ui.Button.YES) return;

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var count = 0;

  PERFORMANCE_TRACKER_STAGES.forEach(function (tabName) {
    var sheet = ss.getSheetByName(tabName);
    if (!sheet) return;
    var cols = getColumnMap_(sheet);
    var lastRow = sheet.getLastRow();
    if (lastRow < cols._dataStartRow || cols.name === -1 || cols.dateOfAction === -1) return;

    var numCols = sheet.getLastColumn();
    var data = sheet.getRange(cols._dataStartRow, 1, lastRow - cols._dataStartRow + 1, numCols).getValues();

    data.forEach(function (row, i) {
      var name = row[cols.name];
      var dateVal = row[cols.dateOfAction];
      if (!name || !(dateVal instanceof Date)) return;
      var contact = cols.contact > -1 ? row[cols.contact] : "";
      logActivity_(tabName, name, contact, dateVal);
      preserveOriginalDate_(sheet, cols, cols._dataStartRow + i, dateVal);
      count++;
    });
  });

  SpreadsheetApp.getActive().toast(count + " historical row(s) added to the Activity Log.", "PULSE Reminders", 5);
}


/**
 * ===================================================================
 * PART 9 — IMPORT PAYMENT MODE + MAILING ADDRESS (from Manulife export)
 * -----------------------------------------------------------------
 * One-click import: reads a "MANULIFE IMPORT" tab (paste the Manulife
 * client export in -- the whole exported Excel/CSV is fine, this only
 * looks for columns named "Policy Number", "Payment Mode", and
 * "Mailing Address" by header text, same header-based approach as
 * everywhere else in this script) and writes Payment Mode + Mailing
 * Address into the matching row on APPROACH/PRESENTATION/CLOSING,
 * matched by Policy Number. Creates the PAYMENT MODE / MAILING ADDRESS
 * columns on a tab automatically if they don't exist yet.
 *
 * SETUP: create a sheet tab named exactly "MANULIFE IMPORT", paste
 * your exported client data into it (row 1 = headers), then run
 * "PULSE Reminders" -> "Import Payment Mode + Mailing Address" from
 * the menu. Run it again any time you have a fresh export -- matching
 * rows get their Payment Mode / Mailing Address overwritten with the
 * freshly imported values.
 * ===================================================================
 */

var MANULIFE_IMPORT_SHEET_NAME = "MANULIFE IMPORT";

function importPaymentModeAndAddress() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var importSheet = ss.getSheetByName(MANULIFE_IMPORT_SHEET_NAME);

  if (!importSheet) {
    ui.alert(
      'No "' + MANULIFE_IMPORT_SHEET_NAME + '" tab found.\n\n' +
      'Create a new sheet tab named exactly "' + MANULIFE_IMPORT_SHEET_NAME + '", ' +
      'paste your Manulife client export into it (the whole exported file is fine -- ' +
      'row 1 should be the column headers), then run this again.'
    );
    return;
  }

  var lastRow = importSheet.getLastRow();
  var lastCol = importSheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) {
    ui.alert('The "' + MANULIFE_IMPORT_SHEET_NAME + '" tab is empty -- paste your exported data in first (row 1 = headers).');
    return;
  }

  var headers = importSheet.getRange(1, 1, 1, lastCol).getValues()[0]
    .map(function (h) { return String(h).trim().toUpperCase(); });
  var policyCol = headers.indexOf('POLICY NUMBER');
  var modeCol = headers.indexOf('PAYMENT MODE');
  var addressCol = headers.indexOf('MAILING ADDRESS');
  var nameCol = headers.indexOf('CLIENT NAME (POLICY OWNER)');
  var contactCol = headers.indexOf('CONTACT NUMBER');
  var emailCol = headers.indexOf('EMAIL ADDRESS');
  var birthdayCol = headers.indexOf('BIRTHDAY');
  var dueDateCol = headers.indexOf('PREMIUM DUE DATE');

  if (policyCol === -1) {
    ui.alert('Could not find a "Policy Number" column on the "' + MANULIFE_IMPORT_SHEET_NAME + '" tab -- check your header row.');
    return;
  }
  if (modeCol === -1 && addressCol === -1) {
    ui.alert('Could not find a "Payment Mode" or "Mailing Address" column on the "' + MANULIFE_IMPORT_SHEET_NAME + '" tab -- nothing to import.');
    return;
  }

  // Manulife's export always includes a trailing "-0" (or "-1", "-2"...)
  // suffix on the policy number (e.g. "812227-0"), but a lot of client
  // sheets are hand-typed with just the base number ("812227"). An exact
  // string match would silently skip every one of those rows, so this
  // also builds a "normalized" (suffix stripped) lookup as a fallback --
  // used only when it's unambiguous (see normalizedMap below). Each entry
  // also keeps the full row (name/contact/email/birthday/due date), not
  // just Payment Mode + Mailing Address, so a policy with no matching row
  // anywhere in the tracker can still be added as a brand-new one.
  var importValues = importSheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  var importMap = {};
  var normalizedMap = {};
  var normalizedSource = {}; // normalized base -> the one raw policy number it came from (unambiguous cases only)
  importValues.forEach(function (row) {
    var policyNo = String(row[policyCol]).trim();
    if (!policyNo) return;
    var entry = {
      paymentMode: modeCol > -1 ? String(row[modeCol]).trim() : '',
      mailingAddress: addressCol > -1 ? String(row[addressCol]).trim() : '',
      name: nameCol > -1 ? String(row[nameCol]).trim() : '',
      contact: contactCol > -1 ? String(row[contactCol]).trim() : '',
      email: emailCol > -1 ? String(row[emailCol]).trim() : '',
      birthday: birthdayCol > -1 ? row[birthdayCol] : '',
      dueDate: dueDateCol > -1 ? row[dueDateCol] : ''
    };
    importMap[policyNo] = entry;

    var norm = normalizePolicyNumber_(policyNo);
    if (norm && norm !== policyNo) {
      if (!normalizedMap.hasOwnProperty(norm)) {
        normalizedMap[norm] = entry;
        normalizedSource[norm] = policyNo;
      } else if (normalizedMap[norm] !== null &&
        JSON.stringify(normalizedMap[norm]) !== JSON.stringify(entry)) {
        // Two different full policy numbers share the same base number
        // with different data (e.g. "812227-0" and "812227-1") -- too
        // ambiguous to guess, so this base number is excluded from the
        // fallback entirely rather than risking the wrong data.
        normalizedMap[norm] = null;
        normalizedSource[norm] = null;
      }
    }
  });

  var matchedKeys = {}; // exact import policy numbers that were successfully matched to a tracker row
  var totalMatched = 0;
  var perTabReport = [];

  TRACKING_SHEETS.forEach(function (tabName) {
    var sheet = ss.getSheetByName(tabName);
    if (!sheet) return;

    var cols = getColumnMap_(sheet);
    if (cols.policyNumber === -1) {
      perTabReport.push(tabName + ": no Policy Number column, skipped");
      return;
    }

    var tabLastRow = sheet.getLastRow();
    if (tabLastRow < cols._dataStartRow) return;

    if (modeCol > -1) ensureColumnByField_(sheet, cols, 'paymentMode', 'PAYMENT MODE');
    if (addressCol > -1) ensureColumnByField_(sheet, cols, 'mailingAddress', 'MAILING ADDRESS');

    var numCols = sheet.getLastColumn();
    var data = sheet.getRange(cols._dataStartRow, 1, tabLastRow - cols._dataStartRow + 1, numCols).getValues();
    var matched = 0;

    data.forEach(function (row, idx) {
      var cellRaw = cols.policyNumber > -1 ? row[cols.policyNumber] : '';
      if (!cellRaw) return;

      // Some rows carry more than one policy number in the same cell,
      // separated by "/" (e.g. "739760-0/739758-0") for clients with
      // multiple policies -- check every piece, not just the whole cell.
      var pieces = String(cellRaw).split('/').map(function (p) { return p.trim(); }).filter(function (p) { return p; });
      var matchedEntries = [];
      pieces.forEach(function (piece) {
        var entry = importMap[piece];
        var usedKey = entry ? piece : null;
        if (!entry) {
          var norm = normalizePolicyNumber_(piece);
          entry = normalizedMap[norm];
          usedKey = entry ? normalizedSource[norm] : null;
        }
        if (entry) {
          matchedEntries.push(entry);
          if (usedKey) matchedKeys[usedKey] = true;
        }
      });
      if (matchedEntries.length === 0) return;

      // Multiple policies on one row can have different payment modes --
      // combine them the same way the sheet already combines policy
      // numbers (joined by "/"), deduped. Mailing address should be the
      // same physical address for every policy under one owner, so just
      // use the first non-empty one found.
      var modes = [];
      var address = '';
      matchedEntries.forEach(function (e) {
        if (e.paymentMode && modes.indexOf(e.paymentMode) === -1) modes.push(e.paymentMode);
        if (!address && e.mailingAddress) address = e.mailingAddress;
      });

      var absoluteRow = cols._dataStartRow + idx;
      if (cols.paymentMode > -1 && modes.length) {
        sheet.getRange(absoluteRow, cols.paymentMode + 1).setValue(modes.join('/'));
      }
      if (cols.mailingAddress > -1 && address) {
        sheet.getRange(absoluteRow, cols.mailingAddress + 1).setValue(address);
      }
      matched++;
    });

    totalMatched += matched;
    perTabReport.push(tabName + ": " + matched + " row(s) matched and filled");
  });

  // Anything in the import sheet that never matched a row anywhere in the
  // tracker is a client (or a policy for an existing client) that isn't
  // tracked yet -- add those as new rows on APPROACH rather than silently
  // dropping them. Policies for the SAME client (same name + contact) are
  // grouped into a single new row with their policy numbers joined by
  // "/", matching the convention already used in this sheet.
  var unmatchedGroups = {};
  var unmatchedGroupOrder = [];
  Object.keys(importMap).forEach(function (policyNo) {
    if (matchedKeys[policyNo]) return;
    var e = importMap[policyNo];
    if (!e.name) return; // nothing to add without at least a name
    var groupKey = e.name.toUpperCase() + '|' + e.contact;
    if (!unmatchedGroups[groupKey]) {
      unmatchedGroups[groupKey] = {
        name: e.name, contact: e.contact, email: e.email,
        birthday: e.birthday, dueDate: e.dueDate,
        policyNumbers: [], paymentModes: [], mailingAddress: e.mailingAddress
      };
      unmatchedGroupOrder.push(groupKey);
    }
    var g = unmatchedGroups[groupKey];
    g.policyNumbers.push(policyNo);
    if (e.paymentMode && g.paymentModes.indexOf(e.paymentMode) === -1) g.paymentModes.push(e.paymentMode);
    if (!g.mailingAddress && e.mailingAddress) g.mailingAddress = e.mailingAddress;
    if (!g.dueDate && e.dueDate) g.dueDate = e.dueDate;
    if (!g.birthday && e.birthday) g.birthday = e.birthday;
  });

  var addedCount = addUnmatchedClientsToApproach_(ss, unmatchedGroupOrder, unmatchedGroups, modeCol, addressCol);

  var ambiguousCount = Object.keys(normalizedMap).filter(function (k) { return normalizedMap[k] === null; }).length;
  var ambiguousNote = ambiguousCount > 0
    ? "\n\nNote: " + ambiguousCount + " base policy number(s) had multiple different entries in the import sheet " +
      "(e.g. \"-0\" and \"-1\" with different data) and were skipped for the suffix-less fallback match to avoid " +
      "guessing wrong -- those need the full policy number (with suffix) typed in your tracker to match."
    : "";
  var addedNote = addedCount > 0
    ? "\n\nAdded " + addedCount + " new client(s)/policy group(s) to APPROACH that weren't in your tracker at all yet."
    : "";

  ui.alert(
    "Import complete.\n\n" +
    perTabReport.join("\n") + "\n\n" +
    "Total: " + totalMatched + " row(s) updated, out of " + Object.keys(importMap).length + " policy number(s) in the import sheet." +
    ambiguousNote + addedNote
  );
}

/**
 * Adds one new row per group (see unmatchedGroups above) to the first
 * empty data row on APPROACH -- Name, Contact, Policy Number(s) joined
 * by "/", Email, Birthday, Premium Due Date, Payment Mode, Mailing
 * Address -- and stamps it the same way a normal row-move would (Week/
 * Day, Date First Approached, Activity Log entry). Returns how many
 * rows were added.
 */
function addUnmatchedClientsToApproach_(ss, groupOrder, groups, modeCol, addressCol) {
  if (groupOrder.length === 0) return 0;

  var sheet = ss.getSheetByName('APPROACH');
  if (!sheet) return 0;

  var cols = getColumnMap_(sheet);
  if (cols.name === -1) return 0;

  if (modeCol > -1) ensureColumnByField_(sheet, cols, 'paymentMode', 'PAYMENT MODE');
  if (addressCol > -1) ensureColumnByField_(sheet, cols, 'mailingAddress', 'MAILING ADDRESS');

  var today = new Date();
  today.setHours(0, 0, 0, 0);
  var added = 0;

  groupOrder.forEach(function (key) {
    var g = groups[key];

    // Find the next truly empty row (by Name) each time, since we're
    // adding one row at a time and the sheet grows as we go.
    var lastRow = sheet.getLastRow();
    var nextRow = cols._dataStartRow;
    if (lastRow >= cols._dataStartRow) {
      var nameValues = sheet.getRange(cols._dataStartRow, cols.name + 1, lastRow - cols._dataStartRow + 1, 1).getValues();
      nextRow = lastRow + 1;
      for (var i = 0; i < nameValues.length; i++) {
        if (!nameValues[i][0]) { nextRow = cols._dataStartRow + i; break; }
      }
    }

    if (cols.status > -1) sheet.getRange(nextRow, cols.status + 1).setValue('APPROACH');
    sheet.getRange(nextRow, cols.name + 1).setValue(g.name);
    if (cols.contact > -1) sheet.getRange(nextRow, cols.contact + 1).setValue(g.contact || '');
    if (cols.policyNumber > -1) sheet.getRange(nextRow, cols.policyNumber + 1).setValue(g.policyNumbers.join('/'));
    if (cols.email > -1 && g.email) sheet.getRange(nextRow, cols.email + 1).setValue(g.email);
    if (cols.birthday > -1 && g.birthday) {
      var bd = (g.birthday instanceof Date) ? g.birthday : new Date(g.birthday);
      if (!isNaN(bd.getTime())) sheet.getRange(nextRow, cols.birthday + 1).setValue(bd).setNumberFormat('yyyy-mm-dd');
    }
    if (cols.paymentDue > -1 && g.dueDate) {
      var dd = (g.dueDate instanceof Date) ? g.dueDate : new Date(g.dueDate);
      if (!isNaN(dd.getTime())) sheet.getRange(nextRow, cols.paymentDue + 1).setValue(dd).setNumberFormat('yyyy-mm-dd');
    }
    if (cols.paymentMode > -1 && g.paymentModes.length) sheet.getRange(nextRow, cols.paymentMode + 1).setValue(g.paymentModes.join('/'));
    if (cols.mailingAddress > -1 && g.mailingAddress) sheet.getRange(nextRow, cols.mailingAddress + 1).setValue(g.mailingAddress);

    stampDateAndWeekDay_(sheet, cols, nextRow, today);
    preserveOriginalDate_(sheet, cols, nextRow, today);
    logActivity_('APPROACH', g.name, g.contact, today);
    added++;
  });

  return added;
}

/**
 * Finds and removes duplicate client rows -- ACROSS APPROACH/PRESENTATION/
 * CLOSING, not just within a single one of them, so a client who never got
 * cleared out of an earlier stage (e.g. still sitting in APPROACH after
 * already progressing to CLOSING) is caught too. Only touches real data
 * rows (never the header row or anything above it). Keys off Policy
 * Number when present (falling back to Name + Contact for early-stage
 * leads that don't have a policy number yet). When the same client is
 * found on more than one tab, the row on the FURTHEST-ALONG stage
 * (APPROACH -> PRESENTATION -> CLOSING, per TRACKING_SHEETS order) is
 * kept and the earlier one(s) removed, since that reflects where the
 * client actually is now; duplicates within the same tab keep the FIRST
 * occurrence as before. Shows exactly what it found and asks for
 * confirmation before deleting anything.
 */
function removeDuplicateClientRows() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var allRows = [];
  TRACKING_SHEETS.forEach(function (tabName, tabIndex) {
    var sheet = ss.getSheetByName(tabName);
    if (!sheet) return;

    var cols = getColumnMap_(sheet);
    var lastRow = sheet.getLastRow();
    if (lastRow < cols._dataStartRow) return;

    var numCols = sheet.getLastColumn();
    var data = sheet.getRange(cols._dataStartRow, 1, lastRow - cols._dataStartRow + 1, numCols).getValues();

    data.forEach(function (row, idx) {
      var name = cols.name > -1 ? String(row[cols.name]).trim() : '';
      if (!name) return; // skip blank rows

      var policyNo = cols.policyNumber > -1 ? String(row[cols.policyNumber]).trim() : '';
      var contact = cols.contact > -1 ? String(row[cols.contact]).trim() : '';
      var key = policyNo ? ('POLICY|' + policyNo) : ('NAMECONTACT|' + name.toUpperCase() + '|' + contact);

      allRows.push({ tabName: tabName, tabIndex: tabIndex, row: cols._dataStartRow + idx, name: name, key: key });
    });
  });

  var byKey = {};
  allRows.forEach(function (r) {
    if (!byKey[r.key]) byKey[r.key] = [];
    byKey[r.key].push(r);
  });

  var plan = {}; // tabName -> [{row, name}, ...]
  var totalToRemove = 0;

  Object.keys(byKey).forEach(function (key) {
    var entries = byKey[key];
    if (entries.length < 2) return;

    var maxTabIndex = entries.reduce(function (m, e) { return Math.max(m, e.tabIndex); }, -1);
    var onFurthestTab = entries.filter(function (e) { return e.tabIndex === maxTabIndex; });
    var keep = onFurthestTab[0]; // first row found on the furthest-along tab

    entries.forEach(function (e) {
      if (e === keep) return;
      if (!plan[e.tabName]) plan[e.tabName] = [];
      plan[e.tabName].push({ row: e.row, name: e.name });
      totalToRemove++;
    });
  });

  if (totalToRemove === 0) {
    ui.alert("No duplicates found across APPROACH, PRESENTATION, or CLOSING (checked by Policy Number, or Name + Contact for rows with no policy number yet -- including the same client sitting on two different tabs at once).");
    return;
  }

  var previewLines = [];
  Object.keys(plan).forEach(function (tabName) {
    var rows = plan[tabName];
    previewLines.push(tabName + ": " + rows.length + " duplicate row(s)");
    rows.slice(0, 5).forEach(function (d) {
      previewLines.push("   - row " + d.row + ": " + d.name);
    });
    if (rows.length > 5) {
      previewLines.push("   ...and " + (rows.length - 5) + " more");
    }
  });

  var confirm = ui.alert(
    "Remove duplicate rows?",
    "Found " + totalToRemove + " duplicate row(s). When the same client is on two different tabs, the row on the " +
    "FURTHEST-ALONG stage (APPROACH -> PRESENTATION -> CLOSING) is kept and the earlier one is removed; within the " +
    "same tab, the FIRST occurrence is kept:\n\n" +
    previewLines.join("\n") +
    "\n\nThis can't be undone from within the script, though Google Sheets' own File -> Version history " +
    "can still restore the sheet afterward if something looks wrong. Continue?",
    ui.ButtonSet.YES_NO
  );
  if (confirm !== ui.Button.YES) return;

  var totalRemoved = 0;
  Object.keys(plan).forEach(function (tabName) {
    var sheet = ss.getSheetByName(tabName);
    var rows = plan[tabName].map(function (d) { return d.row; }).sort(function (a, b) { return b - a; });
    rows.forEach(function (r) { sheet.deleteRow(r); }); // bottom-up so earlier row numbers don't shift mid-delete
    totalRemoved += rows.length;
  });

  ui.alert("Removed " + totalRemoved + " duplicate row(s) across " + Object.keys(plan).length + " tab(s).");
}

// Strips a trailing "-<digits>" suffix (e.g. "812227-0" -> "812227") so
// a policy number typed without it can still be matched against the
// Manulife export, which always includes it.
function normalizePolicyNumber_(raw) {
  return String(raw).trim().replace(/-\d+$/, '');
}

/**
 * Finds (or creates) a column by field key + header text, on the same
 * header row getColumnMap_() detected. Updates cols in place.
 */
function ensureColumnByField_(sheet, cols, fieldKey, headerText) {
  if (cols[fieldKey] > -1) return cols[fieldKey];
  var headerRow = cols._headerRow;
  var newCol = sheet.getLastColumn() + 1;
  sheet.getRange(headerRow, newCol).setValue(headerText);
  cols[fieldKey] = newCol - 1;
  return cols[fieldKey];
}
