/**
 * P.U.L.S.E — Combined Google Apps Script
 * -----------------------------------------------------------------
 * This file has TWO separate jobs living side by side. They don't
 * interfere with each other:
 *
 *   1) onEdit(e) + setupSheetProtection() — YOUR ORIGINAL AUTOMATION.
 *      Moves rows between sheets when Status changes, auto-fills
 *      the deadline when Nature changes, and auto-fills Week/Day
 *      when Date of Action changes. Unchanged from what you had.
 *
 *   2) doGet(e) + readTab() — THE DASHBOARD DATA FEED.
 *      Lets your phone widget / web dashboard read your sheet as
 *      JSON. This is the part I added.
 *
 * If you ever need to replace one part, only replace that part —
 * don't delete the whole file, or the other half breaks again.
 */

// ===================================================================
// PART 1 — YOUR ORIGINAL AUTOMATION (unchanged)
// ===================================================================

function onEdit(e) {
  var range = e.range;
  var sheet = range.getSheet();
  var sheetName = sheet.getName();
  var row = range.getRow();
  var column = range.getColumn();
  var value = range.getValue();

  // Guard clause: Only run automations on data rows (Row 11 or lower)
  if (row < 11) return;

  // List of tracking sheets where these rules apply
  var allowedSheets = ["APPROACH", "PRESENTATION", "CLOSING", "SR"];
  if (allowedSheets.indexOf(sheetName) === -1) return;

  // ==========================================
  // AUTOMATION 1: SHEET TRANSFER / COPY (COLUMN A)
  // ==========================================
  if (column === 1) {
    var rawStatus = value;
    if (!rawStatus) return;

    var statusValue = String(rawStatus).toUpperCase().trim();
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var targetSheetAPC = ss.getSheetByName(statusValue);

    if (!targetSheetAPC || sheetName === targetSheetAPC.getName()) return;

    var targetValuesAPC = targetSheetAPC.getRange("A11:A").getValues();
    var nextRowAPC = 11;
    for (var j = 0; j < targetValuesAPC.length; j++) {
      if (targetValuesAPC[j][0] === "") {
        nextRowAPC = 11 + j;
        break;
      }
    }

    if (statusValue === "SR") {
      var nameValue = sheet.getRange(row, 5).getValue();
      var contactValue = sheet.getRange(row, 6).getValue();

      targetSheetAPC.getRange(nextRowAPC, 5).setValue(nameValue);
      targetSheetAPC.getRange(nextRowAPC, 6).setValue(contactValue);
      targetSheetAPC.getRange(nextRowAPC, 1).setValue("SR");
      return;
    }
    else {
      var numCols = sheet.getLastColumn();
      if (numCols < 1) numCols = 1;
      var sourceRange = sheet.getRange(row, 1, 1, numCols);

      var destination = targetSheetAPC.getRange(nextRowAPC, 1);
      sourceRange.copyTo(destination);
      sheet.deleteRow(row);
      return;
    }
  }

  // ==========================================
  // AUTOMATION 2: AUTO-DEADLINE & SMART SORT (COLUMN I)
  // ==========================================
  if (column === 9) {
    if (range.getNumRows() !== 1 || range.getNumColumns() !== 1) return;

    var natureValue = String(value).toLowerCase().trim();
    var daysToAdd = 0;

    if (natureValue === "hot") {
      daysToAdd = 3;
    } else if (natureValue === "warm" || natureValue === "f2") {
      daysToAdd = 14;
    } else if (natureValue === "cold" || natureValue === "f3") {
      daysToAdd = 30;
    }

    if (daysToAdd === 0) {
      sheet.getRange(row, 11).clearContent();
      return;
    }

    var today = new Date();
    today.setHours(0, 0, 0, 0);

    var futureDate = new Date(today.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

    sheet.getRange(row, 11).setValue(futureDate).setNumberFormat("yyyy-mm-dd");

    SpreadsheetApp.flush();

    var lastRow = sheet.getLastRow();
    if (lastRow > 11) {
      var numColumns = sheet.getLastColumn();
      var fullRange = sheet.getRange(11, 1, lastRow - 10, numColumns);
      var data = fullRange.getValues();

      data.sort(function (a, b) {
        var valA = a[10];
        var valB = b[10];

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
  }

  // ==========================================
  // AUTOMATION 3: DATE PICKER -> WEEK & DAY (COLUMN D)
  // Applies to ALL sheets (including SR)
  // Week of the MONTH (max Week 5)
  // ==========================================
  if (column === 4) {
    var dateVal = value;

    if (!dateVal || !(dateVal instanceof Date)) {
      sheet.getRange(row, 2, 1, 2).clearContent();
      return;
    }

    var firstDay = new Date(dateVal.getFullYear(), dateVal.getMonth(), 1).getDay();
    var offset = (firstDay + 6) % 7;
    var weekNum = Math.ceil((dateVal.getDate() + offset) / 7);

    var dayName = Utilities.formatDate(dateVal, Session.getScriptTimeZone(), "EEEE");

    sheet.getRange(row, 2).setValue("Week " + weekNum);
    sheet.getRange(row, 3).setValue(dayName);
  }
}


// ==========================================
// ONE-TIME SETUP FUNCTION
// Run manually to set up:
// - Data validation dropdowns (Column A & I)
// - Conditional formatting (row colors by nature)
// - Protected ranges (headers + script-controlled cells)
// You do NOT need to run this again unless dropdowns/colors/
// protections themselves are missing from your sheet.
// ==========================================
function setupSheetProtection() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetsToSetup = ["APPROACH", "PRESENTATION", "CLOSING", "SR"];

  sheetsToSetup.forEach(function (sheetName) {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) return;

    // ---- 1. DATA VALIDATION on Column A (Status) ----
    var statusRule = SpreadsheetApp.newDataValidation()
      .requireValueInList(["APPROACH", "PRESENTATION", "CLOSING", "SR"], true)
      .setAllowInvalid(false)
      .setHelpText("Pick a status to move this row to that sheet")
      .build();
    sheet.getRange("A11:A1000").setDataValidation(statusRule);

    // ---- 2. DATA VALIDATION on Column I (Nature) ----
    var natureRule = SpreadsheetApp.newDataValidation()
      .requireValueInList(["Hot", "Warm", "Cold", "F2", "F3"], true)
      .setAllowInvalid(false)
      .setHelpText("Pick nature to auto-calculate deadline")
      .build();
    sheet.getRange("I11:I1000").setDataValidation(natureRule);

    // ---- 3. CONDITIONAL FORMATTING ----
    var range = sheet.getRange("A11:K1000");
    var rules = sheet.getConditionalFormatRules();

    // Remove old rules on this range to avoid duplicates
    rules = rules.filter(function (r) {
      var ranges = r.getRanges();
      return !ranges.some(function (rg) { return rg.getA1Notation() === range.getA1Notation(); });
    });

    // Rule: OVERDUE (dark red bold text)
    rules.push(SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=AND($K11<>"", $K11<TODAY())')
      .setBold(true)
      .setFontColor("#B71C1C")
      .setRanges([range])
      .build());

    // Rule: HOT (light red)
    rules.push(SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=LOWER($I11)="hot"')
      .setBackground("#FFCDD2")
      .setRanges([range])
      .build());

    // Rule: WARM / F2 (light orange)
    rules.push(SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=OR(LOWER($I11)="warm", LOWER($I11)="f2")')
      .setBackground("#FFE0B2")
      .setRanges([range])
      .build());

    // Rule: COLD / F3 (light blue)
    rules.push(SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=OR(LOWER($I11)="cold", LOWER($I11)="f3")')
      .setBackground("#BBDEFB")
      .setRanges([range])
      .build());

    sheet.setConditionalFormatRules(rules);

    // ---- 4. PROTECTED RANGES ----
    var existingProtections = sheet.getProtections(SpreadsheetApp.ProtectionType.RANGE);
    existingProtections.forEach(function (p) {
      if (p.getDescription() && p.getDescription().indexOf("AUTO-SETUP") === 0) {
        p.remove();
      }
    });

    // Protect headers (Row 1-10)
    var headerProtect = sheet.getRange("A1:Z10").protect();
    headerProtect.setDescription("AUTO-SETUP: Header rows");
    headerProtect.setWarningOnly(false);

    // Protect Column B (Week — script writes here)
    var colBProtect = sheet.getRange("B11:B1000").protect();
    colBProtect.setDescription("AUTO-SETUP: Week column (auto-filled)");
    colBProtect.setWarningOnly(false);

    // Protect Column C (Day — script writes here)
    var colCProtect = sheet.getRange("C11:C1000").protect();
    colCProtect.setDescription("AUTO-SETUP: Day column (auto-filled)");
    colCProtect.setWarningOnly(false);

    // Protect Column K (Deadline — script writes here)
    var colKProtect = sheet.getRange("K11:K1000").protect();
    colKProtect.setDescription("AUTO-SETUP: Deadline column (auto-filled)");
    colKProtect.setWarningOnly(false);
  });

  SpreadsheetApp.getActive().toast("Setup complete! Dropdowns, colors, and protections applied.", "Done", 5);
}


// ===================================================================
// PART 2 — DASHBOARD DATA FEED (added for the phone widget/web page)
// ===================================================================

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var tabNames = ['APPROACH', 'PRESENTATION', 'CLOSING', 'SR'];
    var data = {};

    tabNames.forEach(function (tabName) {
      data[tabName] = readTab(ss, tabName);
    });

    var output = { data: data };
    return ContentService
      .createTextOutput(JSON.stringify(output))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    var errorOutput = { error: err.toString() };
    return ContentService
      .createTextOutput(JSON.stringify(errorOutput))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function readTab(ss, tabName) {
  var sheet = ss.getSheetByName(tabName);
  if (!sheet) return [];

  var values = sheet.getDataRange().getValues();
  if (values.length === 0) return [];

  // Find the header row: the row containing a cell that reads "NAME".
  var headerRowIndex = -1;
  for (var r = 0; r < values.length; r++) {
    for (var c = 0; c < values[r].length; c++) {
      if (String(values[r][c]).trim().toUpperCase() === 'NAME') {
        headerRowIndex = r;
        break;
      }
    }
    if (headerRowIndex !== -1) break;
  }
  if (headerRowIndex === -1) return [];

  // Map header text -> column index.
  var headerRow = values[headerRowIndex];
  var headerMap = {};
  for (var c = 0; c < headerRow.length; c++) {
    var label = String(headerRow[c]).trim().toUpperCase();
    if (label) headerMap[label] = c;
  }

  function findCol(names) {
    for (var i = 0; i < names.length; i++) {
      if (headerMap.hasOwnProperty(names[i])) return headerMap[names[i]];
    }
    return -1;
  }

  var colName = findCol(['NAME']);
  var colContact = findCol(['CONTACT']);
  var colDateOfAction = findCol(['DATE OF ACTION']);
  var colFollowUp = findCol(['DATE OF FOLLOW UP']);
  var colNature = findCol(['NATURE']);
  var colBirthday = findCol(['BIRTHDAY', 'CLIENT BIRTHDAY']);
  var colPaymentDue = findCol(['PAYMENT DUE DATE', 'PAYMENT DUE']);
  var colRemarks = findCol(['FOLLOW UP UPDATE REMARKS', 'REMARKS']);

  function cellToString(val) {
    if (val === '' || val === null || typeof val === 'undefined') return '';
    if (Object.prototype.toString.call(val) === '[object Date]') {
      // Normalize to yyyy-MM-dd so the phone widget can read it reliably.
      return Utilities.formatDate(val, ss.getSpreadsheetTimeZone(), 'yyyy-MM-dd');
    }
    return String(val);
  }

  var rows = [];
  for (var r = headerRowIndex + 1; r < values.length; r++) {
    var raw = values[r];
    var name = colName > -1 ? cellToString(raw[colName]) : '';
    if (!name) continue; // skip blank rows

    // Column A always holds the current Status (see onEdit Automation 1).
    // A row only truly "belongs" to this tab if Status matches the tab
    // name — this excludes leftover SR duplicate rows that Automation 1
    // intentionally leaves behind in their original sheet.
    var status = String(raw[0] || '').trim().toUpperCase();
    if (status && status !== tabName) continue;

    rows.push({
      name: name,
      contact: colContact > -1 ? cellToString(raw[colContact]) : '',
      dateOfAction: colDateOfAction > -1 ? cellToString(raw[colDateOfAction]) : '',
      followUpDate: colFollowUp > -1 ? cellToString(raw[colFollowUp]) : '',
      nature: colNature > -1 ? cellToString(raw[colNature]) : '',
      birthday: colBirthday > -1 ? cellToString(raw[colBirthday]) : '',
      paymentDue: colPaymentDue > -1 ? cellToString(raw[colPaymentDue]) : '',
      remarks: colRemarks > -1 ? cellToString(raw[colRemarks]) : ''
    });
  }

  return rows;
}
