// ============================================
// P.U.L.S.E Dashboard - Google Apps Script Backend
// Paste this code into your Google Sheet's Apps Script editor
// ============================================

/**
 * Main handler for GET requests
 */
function doGet(e) {
  var action = e.parameter.action;
  
  try {
    switch(action) {
      case 'fetchAll':
        return jsonResponse(getAllSheetData());
      case 'fetchSheet':
        var sheetName = e.parameter.sheet;
        return jsonResponse(getSheetData(sheetName));
      case 'reminders':
        return jsonResponse(getReminders());
      case 'weeklyStats':
        return jsonResponse(getWeeklyStats());
      case 'monthlyStats':
        return jsonResponse(getMonthlyStats());
      case 'searchClients':
        var query = e.parameter.q;
        return jsonResponse(searchClients(query));
      default:
        return jsonResponse({error: 'Unknown action: ' + action});
    }
  } catch(err) {
    return jsonResponse({error: err.toString()});
  }
}

/**
 * Main handler for POST requests
 */
function doPost(e) {
  var action = e.parameter.action;
  
  try {
    var data = JSON.parse(e.postData.getContentText());
    
    switch(action) {
      case 'addActivity':
        return jsonResponse(addActivity(data));
      case 'addClientDetails':
        return jsonResponse(addClientDetails(data));
      default:
        return jsonResponse({error: 'Unknown action: ' + action});
    }
  } catch(err) {
    return jsonResponse({error: err.toString()});
  }
}

// ============================================
// DATA RETRIEVAL FUNCTIONS
// ============================================

function getAllSheetData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ['APPROACH', 'PRESENTATION', 'CLOSING', 'SR', 'PERFORMANCE TRACKER'];
  var result = {};
  
  sheets.forEach(function(name) {
    var sheet = ss.getSheetByName(name);
    if (sheet) {
      result[name.toLowerCase()] = getSheetData(name);
    }
  });
  
  return result;
}

function getSheetData(sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    return [];
  }
  
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var rows = [];
  
  for (var i = 1; i < data.length; i++) {
    var row = {};
    for (var j = 0; j < headers.length; j++) {
      row[j] = data[i][j];
    }
    rows.push(row);
  }
  
  return rows;
}

function getReminders() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var closingSheet = ss.getSheetByName('CLOSING');
  
  if (!closingSheet) {
    return { birthdays: [], payments: [] };
  }
  
  var data = closingSheet.getDataRange().getValues();
  var today = new Date();
  today.setHours(0, 0, 0, 0);
  var weekFromNow = new Date(today);
  weekFromNow.setDate(today.getDate() + 7);
  
  var birthdays = [];
  var payments = [];
  
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var name = row[4]; // Column E = Name
    
    // Check birthday (Column N = index 13)
    var birthday = row[13];
    if (birthday && isValidDate(birthday)) {
      var birthDate = new Date(birthday);
      var thisYearBirth = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
      if (thisYearBirth >= today && thisYearBirth <= weekFromNow) {
        birthdays.push({
          name: name,
          birthday: formatDate(birthday),
          daysUntil: Math.ceil((thisYearBirth - today) / 86400000)
        });
      }
    }
    
    // Check payment due (Column O = index 14)
    var paymentDue = row[14];
    if (paymentDue && isValidDate(paymentDue)) {
      var payDate = new Date(paymentDue);
      if (payDate >= today && payDate <= weekFromNow) {
        payments.push({
          name: name,
          dueDate: formatDate(paymentDue),
          daysUntil: Math.ceil((payDate - today) / 86400000)
        });
      }
    }
  }
  
  return {
    birthdays: birthdays.sort(function(a,b){return a.daysUntil - b.daysUntil;}),
    payments: payments.sort(function(a,b){return a.daysUntil - b.daysUntil;})
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
  
  var approachSheet = ss.getSheetByName('APPROACH');
  var presentationSheet = ss.getSheetByName('PRESENTATION');
  var closingSheet = ss.getSheetByName('CLOSING');
  
  var approachCount = approachSheet ? countActivitiesInRange(approachSheet, startOfWeek, endOfWeek) : 0;
  var presentationCount = presentationSheet ? countActivitiesInRange(presentationSheet, startOfWeek, endOfWeek) : 0;
  var closingCount = closingSheet ? countActivitiesInRange(closingSheet, startOfWeek, endOfWeek) : 0;
  
  return {
    approaches: approachCount,
    presentations: presentationCount,
    closings: closingCount,
    approachTarget: 90,
    presentationTarget: 10
  };
}

function getMonthlyStats() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var today = new Date();
  var startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  var endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
  
  var approachSheet = ss.getSheetByName('APPROACH');
  var presentationSheet = ss.getSheetByName('PRESENTATION');
  var closingSheet = ss.getSheetByName('CLOSING');
  
  var approachCount = approachSheet ? countActivitiesInRange(approachSheet, startOfMonth, endOfMonth) : 0;
  var presentationCount = presentationSheet ? countActivitiesInRange(presentationSheet, startOfMonth, endOfMonth) : 0;
  var closingCount = closingSheet ? countActivitiesInRange(closingSheet, startOfMonth, endOfMonth) : 0;
  
  return {
    approaches: approachCount,
    presentations: presentationCount,
    closings: closingCount
  };
}

function countActivitiesInRange(sheet, startDate, endDate) {
  var data = sheet.getDataRange().getValues();
  var count = 0;
  
  for (var i = 1; i < data.length; i++) {
    var dateCell = data[i][3]; // Column D = Date of Action
    if (dateCell && dateCell instanceof Date) {
      if (dateCell >= startDate && dateCell <= endDate) {
        count++;
      }
    }
  }
  
  return count;
}

// ============================================
// DATA WRITING FUNCTIONS
// ============================================

function addActivity(record) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetName = record.activityType.toUpperCase();
  var sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    return { success: false, error: 'Sheet not found: ' + sheetName };
  }
  
  var dateParts = record.date.split('-');
  var dateStr = dateParts[2] + '/' + dateParts[1] + '/' + dateParts[0];
  
  var today = new Date();
  var weekNum = getWeekNumber(today);
  var dayName = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][today.getDay()];
  
  var rowData = [
    record.activityType,
    'Week ' + weekNum,
    dayName,
    dateStr,
    record.name,
    record.contact || '',
    record.apeProposed || '',
    record.productProposed || '',
    record.nature || '',
    '',
    record.followUpDate ? (record.followUpDate.split('-').reverse().join('/')) : '',
    record.remarks || ''
  ];
  
  sheet.appendRow(rowData);
  
  return { success: true };
}

function addClientDetails(record) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('CLOSING');
  
  if (!sheet) {
    return { success: false, error: 'CLOSING sheet not found' };
  }
  
  // Find the row with matching name (most recent entry)
  var data = sheet.getDataRange().getValues();
  var targetRow = 0;
  
  for (var i = data.length - 1; i >= 1; i--) {
    if (data[i][4] === record.name) {
      targetRow = i + 1; // 1-based
      break;
    }
  }
  
  if (!targetRow) {
    // No matching row found, append new row with client details
    var today = new Date();
    var weekNum = getWeekNumber(today);
    var dayName = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][today.getDay()];
    var dateStr = today.getDate() + '/' + (today.getMonth()+1) + '/' + today.getFullYear();
    
    sheet.appendRow([
      'CLOSING',
      'Week ' + weekNum,
      dayName,
      dateStr,
      record.name,
      record.contact || '',
      record.apeProposed || '',
      record.product || '',
      '',
      '',
      '',
      record.policyNumber || '',
      record.birthday || '',
      record.paymentDue || ''
    ]);
    return { success: true };
  }
  
  // Update existing row: Policy Number (Col L=index 11), Birthday (Col M=index 12), Payment Due (Col N=index 13)
  sheet.getRange(targetRow, 12).setValue(record.policyNumber || '');
  sheet.getRange(targetRow, 13).setValue(record.birthday || '');
  sheet.getRange(targetRow, 14).setValue(record.paymentDue || '');
  
  return { success: true };
}

function searchClients(query) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('CLOSING');
  
  if (!sheet) {
    return [];
  }
  
  var data = sheet.getDataRange().getValues();
  var results = [];
  var q = query.toLowerCase();
  
  for (var i = 1; i < data.length; i++) {
    var name = (data[i][4] || '').toLowerCase();
    var policy = (data[i][11] || '').toLowerCase();
    
    if (name.indexOf(q) !== -1 || policy.indexOf(q) !== -1) {
      results.push({
        name: data[i][4],
        contact: data[i][5],
        policy: data[i][11],
        birthday: data[i][12],
        paymentDue: data[i][13]
      });
    }
  }
  
  return results;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function isValidDate(d) {
  return d instanceof Date && !isNaN(d.getTime());
}

function formatDate(date) {
  if (!(date instanceof Date)) {
    return String(date);
  }
  var d = date.getDate();
  var m = date.getMonth() + 1;
  var y = date.getFullYear();
  return d + '/' + m + '/' + y;
}

function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
  var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
}