/**
 * PULSE CONNECTOR – the only code in an advisor's own Google Sheet.
 *
 * All PULSE automation lives in the "PULSE" library owned by Su Hern.
 * This file just connects this Sheet to it. Please don't edit it.
 *
 * Setup (once): Extensions > Apps Script > Libraries (+) > paste the
 * PULSE library Script ID > Look up > Version: latest > Identifier: PULSE > Add.
 * Then Deploy > New deployment > Web app (Execute as: Me, Who has access: Anyone).
 *
 * PULSE is provided under the PULSE trial / licence agreement. If access to
 * the library is removed, the automation and the app stop; this Sheet and
 * its data stay yours.
 */

// Hands this Sheet's own settings, cache, lock and triggers to the library,
// so nothing is shared with other advisors.
function use_() {
  PULSE.pulseUse({
    props: PropertiesService.getScriptProperties(),
    cache: CacheService.getScriptCache(),
    lock: LockService.getScriptLock(),
    app: ScriptApp
  });
}

// The PULSE app (web link)
function doGet(e) { use_(); return PULSE.doGet(e); }
function doPost(e) { use_(); return PULSE.doPost(e); }

// Sheet events
function onOpen(e) { use_(); return PULSE.onOpen(e); }
function onEdit(e) { use_(); return PULSE.onEdit(e); }

// Menu items and timers (names must match the library)
function addOriginalDateColumnToAllTabs(e) { use_(); return PULSE.addOriginalDateColumnToAllTabs(e); }
function antConnectMaster(e) { use_(); return PULSE.antConnectMaster(e); }
function antFlushOutbox(e) { use_(); return PULSE.antFlushOutbox(e); }
function antRecheckLicence(e) { use_(); return PULSE.antRecheckLicence(e); }
function antSendAllToMaster(e) { use_(); return PULSE.antSendAllToMaster(e); }
function antSetup(e) { use_(); return PULSE.antSetup(e); }
function antShowFolderLink(e) { use_(); return PULSE.antShowFolderLink(e); }
function backfillActivityLog(e) { use_(); return PULSE.backfillActivityLog(e); }
function buildTodayReminders(e) { use_(); return PULSE.buildTodayReminders(e); }
function checkColumnMapping(e) { use_(); return PULSE.checkColumnMapping(e); }
function checkDuplicateReminderColumns(e) { use_(); return PULSE.checkDuplicateReminderColumns(e); }
function createDailyTrigger(e) { use_(); return PULSE.createDailyTrigger(e); }
function createMonthlyManulifeReminder(e) { use_(); return PULSE.createMonthlyManulifeReminder(e); }
function debugEmailBlastList(e) { use_(); return PULSE.debugEmailBlastList(e); }
function debugRemindersCheck(e) { use_(); return PULSE.debugRemindersCheck(e); }
function debugVoucherCheck(e) { use_(); return PULSE.debugVoucherCheck(e); }
function deleteSentBlastRows(e) { use_(); return PULSE.deleteSentBlastRows(e); }
function importPaymentModeAndAddress(e) { use_(); return PULSE.importPaymentModeAndAddress(e); }
function openAgentSettings(e) { use_(); return PULSE.openAgentSettings(e); }
function refreshWhatsAppBlastLinks(e) { use_(); return PULSE.refreshWhatsAppBlastLinks(e); }
function remindManulifeImport(e) { use_(); return PULSE.remindManulifeImport(e); }
function removeDailyTrigger(e) { use_(); return PULSE.removeDailyTrigger(e); }
function removeDuplicateClientRows(e) { use_(); return PULSE.removeDuplicateClientRows(e); }
function removeMonthlyManulifeReminder(e) { use_(); return PULSE.removeMonthlyManulifeReminder(e); }
function runDailyAutomation(e) { use_(); return PULSE.runDailyAutomation(e); }
function sendBirthdayVoucherEmails(e) { use_(); return PULSE.sendBirthdayVoucherEmails(e); }
function sendBulkEmail(e) { use_(); return PULSE.sendBulkEmail(e); }
function sendEmailBlast(e) { use_(); return PULSE.sendEmailBlast(e); }
function setupBulkEmailTemplateSheet(e) { use_(); return PULSE.setupBulkEmailTemplateSheet(e); }
function setupPerformanceTrackerFormulas(e) { use_(); return PULSE.setupPerformanceTrackerFormulas(e); }
function setupWhatsAppBlastSheet(e) { use_(); return PULSE.setupWhatsAppBlastSheet(e); }
function syncAppointmentStatusFromCalendar(e) { use_(); return PULSE.syncAppointmentStatusFromCalendar(e); }
