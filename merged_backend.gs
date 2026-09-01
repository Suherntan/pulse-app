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
    today.setHours(0,0,0,0);
    
    var futureDate = new Date(today.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
    
    sheet.getRange(row, 11).setValue(futureDate).setNumberFormat("yyyy-mm-dd");
    
    SpreadsheetApp.flush();
    
    var lastRow = sheet.getLastRow();
    if (lastRow > 11) {
      var numColumns = sheet.getLastColumn();
      var fullRange = sheet.getRange(11, 1, lastRow - 10, numColumns);
      var data = fullRange.getValues();
      
      data.sort(function(a, b) {
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
  // AUTOMATION 3: DATE PICKER â†’ WEEK & DAY (COLUMN D)
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
// ==========================================
function setupSheetProtection() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetsToSetup = ["APPROACH", "PRESENTATION", "CLOSING", "SR"];
  
  sheetsToSetup.forEach(function(sheetName) {
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
    rules = rules.filter(function(r) {
      var ranges = r.getRanges();
      return !ranges.some(function(rg) { return rg.getA1Notation() === range.getA1Notation(); });
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
    existingProtections.forEach(function(p) {
      if (p.getDescription() && p.getDescription().indexOf("AUTO-SETUP") === 0) {
        p.remove();
      }
    });
    
    // Protect headers (Row 1-10)
    var headerProtect = sheet.getRange("A1:Z10").protect();
    headerProtect.setDescription("AUTO-SETUP: Header rows");
    headerProtect.setWarningOnly(false);
    
    // Protect Column B (Week â€” script writes here)
    var colBProtect = sheet.getRange("B11:B1000").protect();
    colBProtect.setDescription("AUTO-SETUP: Week column (auto-filled)");
    colBProtect.setWarningOnly(false);
    
    // Protect Column C (Day â€” script writes here)
    var colCProtect = sheet.getRange("C11:C1000").protect();
    colCProtect.setDescription("AUTO-SETUP: Day column (auto-filled)");
    colCProtect.setWarningOnly(false);
    
    // Protect Column K (Deadline â€” script writes here)
    var colKProtect = sheet.getRange("K11:K1000").protect();
    colKProtect.setDescription("AUTO-SETUP: Deadline column (auto-filled)");
    colKProtect.setWarningOnly(false);
  });
  
  SpreadsheetApp.getActive().toast("âœ… Setup complete! Dropdowns, colors, and protections applied.", "Done", 5);
}
// ==========================================
// DASHBOARD API - READ FUNCTIONS
// ==========================================

function doGet(e) {
  var action = e.parameter.action;
  try {
    switch(action) {
      case 'fetchAll': return jsonResponse(getAllSheetData());
      case 'fetchSheet': return jsonResponse(getSheetData(e.parameter.sheet));
      case 'reminders': return jsonResponse(getReminders());
      case 'weeklyStats': return jsonResponse(getWeeklyStats());
      case 'monthlyStats': return jsonResponse(getMonthlyStats());
      case 'searchClients': return jsonResponse(searchClients(e.parameter.q));
      default: return jsonResponse({error: 'Unknown action: ' + action});
    }
  } catch(err) { return jsonResponse({error: err.toString()}); }
}

function getAllSheetData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ["APPROACH", "PRESENTATION", "CLOSING", "SR", "PERFORMANCE TRACKER"];
  var result = {};
  sheets.forEach(function(name) {
    var sheet = ss.getSheetByName(name);
    if (sheet) result[name.toLowerCase()] = getSheetData(name);
  });
  return result;
}

function getSheetData(sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  var rows = [];
  for (var i = 1; i < data.length; i++) {
    var row = {};
    for (var j = 0; j < data[i].length; j++) row[j] = data[i][j];
    rows.push(row);
  }
  return rows;
}
function getReminders() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("CLOSING");
  if (!sheet) return { birthdays: [], payments: [] };
  var data = sheet.getDataRange().getValues();
  var today = new Date(); today.setHours(0,0,0,0);
  var weekFromNow = new Date(today); weekFromNow.setDate(today.getDate() + 7);
  var birthdays = [];
  var payments = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var name = row[4];
    var birthday = row[12];
    if (birthday && birthday instanceof Date) {
      var bd = new Date(today.getFullYear(), birthday.getMonth(), birthday.getDate());
      if (bd >= today && bd <= weekFromNow) {
        birthdays.push({ name: name, birthday: formatDate(birthday), daysUntil: Math.ceil((bd - today) / 86400000) });
      }
    }
    var paymentDue = row[13];
    if (paymentDue && paymentDue instanceof Date) {
      var pd = new Date(paymentDue);
      if (pd >= today && pd <= weekFromNow) {
        payments.push({ name: name, dueDate: formatDate(paymentDue), daysUntil: Math.ceil((pd - today) / 86400000) });
      }
    }
  }
  return { birthdays: birthdays.sort(function(a,b){return a.daysUntil - b.daysUntil;}), payments: payments.sort(function(a,b){return a.daysUntil - b.daysUntil;}) };
}

function getWeeklyStats() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var today = new Date();
  var startOfWeek = new Date(today); startOfWeek.setDate(today.getDate() - today.getDay() + 1); startOfWeek.setHours(0,0,0,0);
  var endOfWeek = new Date(startOfWeek); endOfWeek.setDate(startOfWeek.getDate() + 6); endOfWeek.setHours(23,59,59,999);
  var aSheet = ss.getSheetByName("APPROACH");
  var pSheet = ss.getSheetByName("PRESENTATION");
  var cSheet = ss.getSheetByName("CLOSING");
  var ac = aSheet ? countInRange(aSheet, startOfWeek, endOfWeek) : 0;
  var pc = pSheet ? countInRange(pSheet, startOfWeek, endOfWeek) : 0;
  var cc = cSheet ? countInRange(cSheet, startOfWeek, endOfWeek) : 0;
  return { approaches: ac, presentations: pc, closings: cc, approachTarget: 90, presentationTarget: 10 };
}

function getMonthlyStats() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var today = new Date();
  var startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  var endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
  var aSheet = ss.getSheetByName("APPROACH");
  var pSheet = ss.getSheetByName("PRESENTATION");
  var cSheet = ss.getSheetByName("CLOSING");
  var ac = aSheet ? countInRange(aSheet, startOfMonth, endOfMonth) : 0;
  var pc = pSheet ? countInRange(pSheet, startOfMonth, endOfMonth) : 0;
  var cc = cSheet ? countInRange(cSheet, startOfMonth, endOfMonth) : 0;
  return { approaches: ac, presentations: pc, closings: cc };
}

function countInRange(sheet, startDate, endDate) {
  var data = sheet.getDataRange().getValues();
  var count = 0;
  for (var i = 1; i < data.length; i++) {
    var d = data[i][3];
    if (d instanceof Date && d >= startDate && d <= endDate) count++;
  }
  return count;
}

function searchClients(query) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("CLOSING");
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  var results = [];
  var q = query.toLowerCase();
  for (var i = 1; i < data.length; i++) {
    var name = (data[i][4] || "").toLowerCase();
    var policy = (data[i][11] || "").toLowerCase();
    if (name.indexOf(q) !== -1 || policy.indexOf(q) !== -1) {
      results.push({ name: data[i][4], contact: data[i][5], policy: data[i][11], birthday: data[i][12], paymentDue: data[i][13] });
    }
  }
  return results;
}
// ==========================================
// DASHBOARD API - WRITE FUNCTIONS
// ==========================================

function doPost(e) {
  var action = e.parameter.action;
  try {
    var data = JSON.parse(e.postData.getContentText());
    switch(action) {
      case 'addActivity': return jsonResponse(addActivity(data));
      case 'addClientDetails': return jsonResponse(addClientDetails(data));
      default: return jsonResponse({error: 'Unknown action: ' + action});
    }
  } catch(err) { return jsonResponse({error: err.toString()}); }
}

function addActivity(record) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetName = record.activityType.toUpperCase();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return { success: false, error: 'Sheet not found: ' + sheetName };
  var dateParts = record.date.split("-");
  var dateStr = dateParts[2] + "/" + dateParts[1] + "/" + dateParts[0];
  var today = new Date();
  var weekNum = getWeekNumber(today);
  var dayName = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][today.getDay()];
  var rowData = [record.activityType, "Week " + weekNum, dayName, dateStr, record.name, record.contact || "", record.apeProposed || "", record.productProposed || "", record.nature || "", "", record.followUpDate ? record.followUpDate.split("-").reverse().join("/") : "", record.remarks || ""];
  sheet.appendRow(rowData);
  return { success: true };
}

function addClientDetails(record) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("CLOSING");
  if (!sheet) return { success: false, error: "CLOSING sheet not found" };
  var data = sheet.getDataRange().getValues();
  var targetRow = 0;
  for (var i = data.length - 1; i >= 1; i--) {
    if (data[i][4] === record.name) { targetRow = i + 1; break; }
  }
  if (!targetRow) {
    var today = new Date();
    var weekNum = getWeekNumber(today);
    var dayName = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][today.getDay()];
    var dateStr = today.getDate() + "/" + (today.getMonth()+1) + "/" + today.getFullYear();
    sheet.appendRow(["CLOSING", "Week " + weekNum, dayName, dateStr, record.name, record.contact || "", record.apeProposed || "", record.product || "", "", "", "", record.policyNumber || "", record.birthday || "", record.paymentDue || ""]);
    return { success: true };
  }
  sheet.getRange(targetRow, 13).setValue(record.policyNumber || "");
  sheet.getRange(targetRow, 14).setValue(record.birthday || "");
  sheet.getRange(targetRow, 15).setValue(record.paymentDue || "");
  return { success: true };
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function formatDate(date) {
  if (!(date instanceof Date)) return String(date);
  var d = date.getDate();
  var m = date.getMonth() + 1;
  var y = date.getFullYear();
  return d + "/" + m + "/" + y;
}

function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
  var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
}