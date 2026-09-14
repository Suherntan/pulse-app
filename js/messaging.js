// --- WhatsApp click-to-send + Email/Voucher blast triggers ---

var WA_TEMPLATE_KEY = 'pulse_wa_template';
var WA_COUNTRY_CODE = '60'; // Malaysia default, matches Code.gs's normalizePhone()

// Mirrors Code.gs's normalizePhone() so links generated here match what
// the Sheet's own WhatsApp Blast tool would produce.
function normalizePhoneJS(raw) {
    if (!raw) return '';
    var digits = String(raw).replace(/\D/g, '');
    if (!digits) return '';
    if (digits.indexOf(WA_COUNTRY_CODE) === 0) return digits;
    if (digits.indexOf('0') === 0) return WA_COUNTRY_CODE + digits.substring(1);
    return WA_COUNTRY_CODE + digits;
}

function buildWaLink(rawPhone, name, policy) {
    var phone = normalizePhoneJS(rawPhone);
    if (!phone) return '';
    var template = (document.getElementById('wa-template') && document.getElementById('wa-template').value)
        || localStorage.getItem(WA_TEMPLATE_KEY) || '';
    if (!template.trim()) return '';
    var message = template.split('{name}').join(name || '').split('{policy}').join(policy || '');
    return 'https://wa.me/' + phone + '?text=' + encodeURIComponent(message);
}

// --- Sheet-provided message wording (birthday / premium reminder) ---
// These come straight from Code.gs's BIRTHDAY_MESSAGE_TEMPLATE /
// PREMIUM_REMINDER_MESSAGE_TEMPLATE via the messageTemplates API action,
// so the Today tab's WhatsApp/Email buttons are ready to send immediately
// with the exact wording already set up in the Sheet — no separate
// template has to be typed into this app first.
var sheetMessageTemplates = null; // {agentName, birthday, premiumReminder}

async function loadSheetMessageTemplates() {
    try {
        sheetMessageTemplates = await API.fetchMessageTemplates();
    } catch (e) {
        sheetMessageTemplates = null; // offline / not deployed yet — callers fall back gracefully
    }
}

// Mirrors makeReminderRow()'s {name}/{dueDate}/{policyLine} substitution.
function fillReminderTemplate(template, row) {
    var policyLine = row.policyNumber ? ('(Policy No: ' + row.policyNumber + ')') : '';
    var dueDate = row.paymentDue ? formatNiceDate(row.paymentDue) : '';
    return template
        .split('{name}').join(row.name || '')
        .split('{dueDate}').join(dueDate)
        .split('{policyLine}').join(policyLine);
}

function buildPresetWaLink(rawPhone, template, row) {
    var phone = normalizePhoneJS(rawPhone);
    if (!phone || !template) return '';
    return 'https://wa.me/' + phone + '?text=' + encodeURIComponent(fillReminderTemplate(template, row));
}

function buildPresetMailtoLink(subject, template, row) {
    if (!template) return '';
    return 'mailto:?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(fillReminderTemplate(template, row));
}

function loadWaTemplate() {
    var el = document.getElementById('wa-template');
    if (!el) return;
    el.value = localStorage.getItem(WA_TEMPLATE_KEY) || '';
}

function saveWaTemplate() {
    var el = document.getElementById('wa-template');
    if (!el) return;
    localStorage.setItem(WA_TEMPLATE_KEY, el.value);
    if (typeof renderClientsList === 'function') renderClientsList(); // refresh the wa.me links with the new message
    if (lastFetchedData && document.getElementById('tab-today') && !document.getElementById('tab-today').classList.contains('hidden')) {
        renderTodayTab(lastFetchedData); // refresh Today's per-reminder WhatsApp buttons too
    }
    showToast('WhatsApp template saved');
}

// --- Email template (per-reminder mailto: links + the Email Blast tab) ---

var EMAIL_TEMPLATE_KEY = 'pulse_email_template'; // stores {subject, body}

function buildMailtoLink(name, policy) {
    var saved = {};
    try { saved = JSON.parse(localStorage.getItem(EMAIL_TEMPLATE_KEY) || '{}'); } catch (e) { saved = {}; }
    var subjectEl = document.getElementById('email-template-subject');
    var bodyEl = document.getElementById('email-template-body');
    var subject = (subjectEl && subjectEl.value) || saved.subject || '';
    var body = (bodyEl && bodyEl.value) || saved.body || '';
    if (!subject.trim() && !body.trim()) return '';
    subject = subject.split('{name}').join(name || '').split('{policy}').join(policy || '');
    body = body.split('{name}').join(name || '').split('{policy}').join(policy || '');
    return 'mailto:?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
}

function loadEmailTemplate() {
    var subjectEl = document.getElementById('email-template-subject');
    var bodyEl = document.getElementById('email-template-body');
    if (!subjectEl || !bodyEl) return;
    var saved = {};
    try { saved = JSON.parse(localStorage.getItem(EMAIL_TEMPLATE_KEY) || '{}'); } catch (e) { saved = {}; }
    subjectEl.value = saved.subject || '';
    bodyEl.value = saved.body || '';
}

function saveEmailTemplate() {
    var subjectEl = document.getElementById('email-template-subject');
    var bodyEl = document.getElementById('email-template-body');
    if (!subjectEl || !bodyEl) return;
    localStorage.setItem(EMAIL_TEMPLATE_KEY, JSON.stringify({ subject: subjectEl.value, body: bodyEl.value }));
    if (lastFetchedData && document.getElementById('tab-today') && !document.getElementById('tab-today').classList.contains('hidden')) {
        renderTodayTab(lastFetchedData); // refresh Today's per-reminder Email buttons too
    }
    showToast('Email template saved');
}

// --- Email Blast / Birthday Vouchers ---

function setSendResult(elId, ok, message) {
    var el = document.getElementById(elId);
    if (!el) return;
    el.textContent = message;
    el.className = 'send-result ' + (ok ? 'success' : 'error');
}

async function sendEmailBlastNow() {
    if (!confirm('Send the Email Blast now? This uses whatever is filled into your EMAIL TEMPLATE sheet and sends real emails from your Gmail right away.')) {
        return;
    }
    var btn = document.getElementById('send-email-btn');
    btn.disabled = true;
    btn.textContent = 'Sending...';
    setSendResult('send-email-result', true, '');
    try {
        var result = await API.sendEmailBlast();
        setSendResult('send-email-result', !!result.ok, result.message || (result.ok ? 'Done.' : 'Something went wrong.'));
    } catch (err) {
        setSendResult('send-email-result', false, 'Failed: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Send Email Blast Now';
    }
}

async function sendBirthdayVouchersNow() {
    if (!confirm('Send birthday voucher emails now, for anyone due today?')) {
        return;
    }
    var btn = document.getElementById('send-voucher-btn');
    btn.disabled = true;
    btn.textContent = 'Sending...';
    setSendResult('send-voucher-result', true, '');
    try {
        var result = await API.sendBirthdayVouchers();
        setSendResult('send-voucher-result', !!result.ok, result.message || (result.ok ? 'Done.' : 'Something went wrong.'));
    } catch (err) {
        setSendResult('send-voucher-result', false, 'Failed: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Send Birthday Vouchers Now';
    }
}
