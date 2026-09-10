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

function loadWaTemplate() {
    var el = document.getElementById('wa-template');
    if (!el) return;
    el.value = localStorage.getItem(WA_TEMPLATE_KEY) || '';
}

function saveWaTemplate() {
    var el = document.getElementById('wa-template');
    if (!el) return;
    localStorage.setItem(WA_TEMPLATE_KEY, el.value);
    renderClientsList(); // refresh the wa.me links with the new message
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
