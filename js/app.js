/* P.U.L.S.E Dashboard - Main App Logic */

// App startup is gated by lock.js — it calls initApp() itself once the
// correct password has been entered (or immediately, if already unlocked).

var lastFetchedData = null; // cached fetchAll() result, reused across tabs/filters

async function initApp() {
    showLoading(true);

    var dateInput = document.getElementById('activity-date');
    if (dateInput && !dateInput.value) dateInput.value = todayStr();

    var savedUrl = API.getApiUrl();
    if (savedUrl && savedUrl.length > 20) {
        await connectDashboard(savedUrl);
    } else {
        showLoading(false);
        showScreen('setup');
    }
}

// Wired to the "Save & Continue" button on the setup screen.
async function testConnection() {
    var input = document.getElementById('api-url');
    var url = input ? input.value.trim() : '';
    var errorBox = document.getElementById('setup-error');

    if (!url || url.length < 20) {
        if (errorBox) errorBox.textContent = 'Please enter a valid deployment URL first.';
        return;
    }

    if (errorBox) errorBox.textContent = '';
    API.saveApiUrl(url);
    await connectDashboard(url);
}

async function connectDashboard(url) {
    try {
        showLoading(true);
        var response = await fetch(url + (url.indexOf('?') === -1 ? '?' : '&') + 'action=fetchAll', {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });
        if (response.ok) {
            var data = await response.json();
            if (data.error) {
                showLoading(false);
                showScreen('setup');
                var errorBox = document.getElementById('setup-error');
                if (errorBox) errorBox.textContent = 'Backend error: ' + data.error;
            } else {
                showScreen('dashboard');
                updateDateDisplay();
                updateWeekRange();
                await loadAllData();
                showLoading(false);
            }
        } else {
            showLoading(false);
            showScreen('setup');
            var errorBox2 = document.getElementById('setup-error');
            if (errorBox2) errorBox2.textContent = 'Cannot connect. Check your URL and try again.';
        }
    } catch (error) {
        console.error('Connection failed:', error);
        showLoading(false);
        showScreen('setup');
        var errorBox3 = document.getElementById('setup-error');
        if (errorBox3) errorBox3.textContent = 'Network error. Make sure you are online.';
    }
}

function showScreen(screenName) {
    document.getElementById('loading-screen').classList.add('hidden');
    document.getElementById('setup-screen').classList.add('hidden');
    document.getElementById('dashboard').classList.add('hidden');
    switch (screenName) {
        case 'loading': document.getElementById('loading-screen').classList.remove('hidden'); break;
        case 'setup': document.getElementById('setup-screen').classList.remove('hidden'); break;
        case 'dashboard': document.getElementById('dashboard').classList.remove('hidden'); break;
    }
}

function showLoading(show) {
    var el = document.getElementById('loading-screen');
    if (!el) return;
    if (show) el.classList.remove('hidden'); else el.classList.add('hidden');
}

function showToast(message) {
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = message;
    el.classList.remove('hidden');
    setTimeout(function () { el.classList.add('hidden'); }, 3000);
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(function (el) { el.classList.add('hidden'); el.classList.remove('active'); });
    document.querySelectorAll('.tab').forEach(function (el) { el.classList.remove('active'); });
    var tc = document.getElementById('tab-' + tabName);
    if (tc) { tc.classList.remove('hidden'); tc.classList.add('active'); }
    var tb = document.querySelector('.tab[data-tab="' + tabName + '"]');
    if (tb) tb.classList.add('active');

    if (tabName === 'today') renderTodayTab(lastFetchedData);
    else if (tabName === 'tracker') renderTrackerTab(lastFetchedData);
    else if (tabName === 'clients') renderClientsTab(lastFetchedData);
    else if (tabName === 'funds') renderFundsTab();
    else if (tabName === 'send') { loadWaTemplate(); loadEmailTemplate(); }
}

// --- Date Functions ---
function updateDateDisplay() {
    var now = new Date();
    var options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('current-date').textContent = now.toLocaleDateString('en-US', options);
}
function updateWeekRange() {
    var now = new Date();
    var weekNum = getWeekNumber(now);
    document.getElementById('current-week-range').textContent = 'Week ' + weekNum + ' of ' + now.getFullYear();
}
function getWeekNumber(date) {
    var d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    var dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}
function todayStr() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function parseYMD(dateStr) {
    if (!dateStr) return null;
    var d = new Date(dateStr + 'T00:00:00');
    return isNaN(d.getTime()) ? null : d;
}
function isSameMonthDay(a, b) {
    return a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function isSameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function formatNiceDate(dateStr) {
    var d = parseYMD(dateStr);
    if (!d) return dateStr || '';
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

// --- Data Loading ---
async function loadAllData() {
    try {
        lastFetchedData = await API.fetchAllData();
    } catch (error) {
        console.error('Load all data error:', error);
        showToast('Failed to load data from your Sheet.');
        lastFetchedData = { approach: [], presentation: [], closing: [], sr: [] };
    }
    if (typeof loadSheetMessageTemplates === 'function') await loadSheetMessageTemplates();
    renderTodayTab(lastFetchedData);
    renderTrackerTab(lastFetchedData);
    renderClientsTab(lastFetchedData);
}

function allRows(data) {
    if (!data) return [];
    return [].concat(data.approach || [], data.presentation || [], data.closing || [], data.sr || []);
}

// --- TODAY TAB ---
function renderTodayTab(data) {
    if (!data) return;
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var todayYMD = todayStr();

    // Birthdays + payments can live on APPROACH, PRESENTATION or CLOSING.
    var birthdaySource = [].concat(data.approach || [], data.presentation || [], data.closing || []);

    var todayBirthdays = birthdaySource.filter(function (row) {
        var d = parseYMD(row.birthday);
        return d && isSameMonthDay(d, today);
    });
    renderReminderList('birthdays-list', todayBirthdays, 'Birthday today!', 'No birthdays today', 'birthday');

    var todayPayments = birthdaySource.filter(function (row) {
        return row.paymentDue === todayYMD;
    });
    renderReminderList('payments-list', todayPayments, 'Payment due today!', 'No payments due today', 'payment');

    var todayFollowups = allRows(data).filter(function (row) {
        return row.followUpDate === todayYMD;
    });
    renderReminderList('followups-list', todayFollowups, 'Deadline action item due', 'No deadlines or followups scheduled', 'followup');

    // Quick stats: activities logged today, by type.
    var approachesToday = (data.approach || []).filter(function (r) { return r.dateOfAction === todayYMD; }).length;
    var presentationsToday = (data.presentation || []).filter(function (r) { return r.dateOfAction === todayYMD; }).length;
    var closingsToday = (data.closing || []).filter(function (r) { return r.dateOfAction === todayYMD; }).length;

    setText('today-approaches', approachesToday);
    setText('today-presentations', presentationsToday);
    setText('today-closings', closingsToday);

    loadAndRenderAppointments();
}

// Appointments come from Google Calendar via a separate API action, not
// from the bulk dashboard fetch, so they load on their own -- same
// pattern as the Funds tab's live data. Failing quietly (leaving the
// placeholder or last-known list) matches how the rest of the Today tab
// behaves when the sheet-backed data is unavailable.
async function loadAndRenderAppointments() {
    var el = document.getElementById('appointments-list');
    if (!el || typeof API === 'undefined' || !API.getApiUrl()) return;
    try {
        var appointments = await API.fetchAppointments();
        renderAppointmentsList(Array.isArray(appointments) ? appointments : []);
    } catch (e) {
        console.error('loadAndRenderAppointments:', e);
    }
}

function renderAppointmentsList(appointments) {
    var el = document.getElementById('appointments-list');
    if (!el) return;
    if (!appointments.length) {
        el.innerHTML = '<p class="placeholder">No appointments in the next 7 days</p>';
        return;
    }
    el.innerHTML = appointments.map(function (a) {
        var start = new Date(a.start);
        var when = start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
            + ', ' + start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        var displayName = a.matchedClient || (a.title + ' (no client match)');
        var detail = a.matchedClient ? (when + ' &middot; ' + escapeHtml(a.title)) : when;
        return '<div class="reminder-item"><div class="reminder-item-info">' +
            '<span class="name">' + escapeHtml(displayName) + '</span>' +
            '<span class="detail">' + detail + '</span>' +
            '</div></div>';
    }).join('');
}

// --- "Sent today" tracking, so a reminder you've already messaged shows
// clearly instead of looking identical to one you haven't, and you don't
// accidentally message the same client twice. Scoped to today's date --
// resets naturally tomorrow (a birthday/payment due "today" again next
// cycle is a fresh reminder, not a duplicate).
function sentReminderStorageKey() {
    return 'pulse_sent_' + todayStr();
}

function getSentReminderIds() {
    try {
        return JSON.parse(localStorage.getItem(sentReminderStorageKey()) || '[]');
    } catch (e) {
        return [];
    }
}

function reminderIdFor(kind, row) {
    var stable = (row.rowNumber !== undefined && row.rowNumber !== null)
        ? row.rowNumber
        : String(row.name || '').replace(/[^a-z0-9]/gi, '');
    return kind + ':' + stable;
}

function markReminderSent(id) {
    var ids = getSentReminderIds();
    if (ids.indexOf(id) === -1) ids.push(id);
    localStorage.setItem(sentReminderStorageKey(), JSON.stringify(ids));
    // Clean up any previous days' keys so localStorage doesn't grow forever.
    for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (key && key.indexOf('pulse_sent_') === 0 && key !== sentReminderStorageKey()) {
            localStorage.removeItem(key);
        }
    }
    if (lastFetchedData) renderTodayTab(lastFetchedData);
}

function unmarkReminderSent(id) {
    var ids = getSentReminderIds().filter(function (existing) { return existing !== id; });
    localStorage.setItem(sentReminderStorageKey(), JSON.stringify(ids));
    if (lastFetchedData) renderTodayTab(lastFetchedData);
}

function renderReminderList(elId, rows, detailText, emptyText, kind) {
    var el = document.getElementById(elId);
    if (!el) return;
    if (rows.length === 0) {
        el.innerHTML = '<p class="placeholder">' + emptyText + '</p>';
        return;
    }
    var sentIds = getSentReminderIds();
    el.innerHTML = rows.map(function (row) {
        var reminderId = reminderIdFor(kind, row);
        var isSent = sentIds.indexOf(reminderId) !== -1;
        // Birthdays/payments prefer the wording already set up in the Sheet
        // (Code.gs's BIRTHDAY_MESSAGE_TEMPLATE / PREMIUM_REMINDER_MESSAGE_TEMPLATE)
        // over the agent's own custom Send-tab template, so these buttons are
        // ready to send immediately with no extra setup. Follow-ups have no
        // sheet-side equivalent, so those always use the custom template.
        var presetTemplate = kind === 'birthday' && sheetMessageTemplates ? sheetMessageTemplates.birthday
            : kind === 'payment' && sheetMessageTemplates ? sheetMessageTemplates.premiumReminder
            : null;
        var waLink = presetTemplate
            ? buildPresetWaLink(row.contact, presetTemplate, row)
            : ((typeof buildWaLink === 'function') ? buildWaLink(row.contact, row.name, row.policyNumber) : '');
        var mailtoLink = presetTemplate
            ? buildPresetMailtoLink(kind === 'birthday' ? 'Happy Birthday!' : 'Premium Payment Reminder', presetTemplate, row)
            : ((typeof buildMailtoLink === 'function') ? buildMailtoLink(row.name, row.policyNumber) : '');
        var waBtn = waLink
            ? '<a class="reminder-action-btn wa" href="' + waLink + '" target="_blank" rel="noopener" title="Send WhatsApp" aria-label="Send WhatsApp" onclick="markReminderSent(\'' + reminderId + '\')"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#389e0d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg></a>'
            : '';
        var mailBtn = mailtoLink
            ? '<a class="reminder-action-btn email" href="' + mailtoLink + '" title="Send Email" aria-label="Send Email" onclick="markReminderSent(\'' + reminderId + '\')"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0B2545" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 6l-10 7L2 6"></path><rect x="2" y="4" width="20" height="16" rx="2"></rect></svg></a>'
            : '';

        if (isSent) {
            return '<div class="reminder-item sent"><div class="reminder-item-info"><span class="name">' + escapeHtml(row.name || 'Unknown') + '</span><span class="detail">' + detailText + '</span></div>' +
                '<div class="reminder-actions"><span class="sent-badge">&#10003; Sent</span><button type="button" class="undo-sent-link" onclick="unmarkReminderSent(\'' + reminderId + '\')">Undo</button></div></div>';
        }

        var actions = (waBtn || mailBtn) ? '<div class="reminder-actions">' + waBtn + mailBtn + '</div>' : '';
        return '<div class="reminder-item"><div class="reminder-item-info"><span class="name">' + escapeHtml(row.name || 'Unknown') + '</span><span class="detail">' + detailText + '</span></div>' + actions + '</div>';
    }).join('');
}

function setText(elId, value) {
    var el = document.getElementById(elId);
    if (el) el.textContent = value;
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// --- TRACKER TAB ---
function renderTrackerTab(data) {
    if (!data) return;

    // Build a flat {date, type} activity list for tracker.js to chew on.
    var activities = allRows(data).map(function (row) {
        return { date: row.dateOfAction, type: row.status };
    }).filter(function (a) { return a.date; });

    var progress = (typeof Tracker !== 'undefined') ? Tracker.getWeeklyProgress(activities) : {
        approaches: 0, presentations: 0, closings: 0,
        approachPercent: 0, presentationPercent: 0,
        dayBreakdown: {}
    };

    setText('approach-count', progress.approaches + ' / 90');
    var approachBar = document.getElementById('approach-progress');
    if (approachBar) approachBar.style.width = Math.min(progress.approachPercent, 100) + '%';
    setText('approach-detail', progress.approaches + ' approach' + (progress.approaches === 1 ? '' : 'es') + ' this week');

    setText('presentation-count', progress.presentations + ' / 10');
    var presentationBar = document.getElementById('presentation-progress');
    if (presentationBar) presentationBar.style.width = Math.min(progress.presentationPercent, 100) + '%';
    setText('presentation-detail', progress.presentations + ' presentation' + (progress.presentations === 1 ? '' : 's') + ' this week');

    var days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    var weeklyBody = document.getElementById('weekly-body');
    if (weeklyBody) {
        weeklyBody.innerHTML = days.map(function (day) {
            var d = progress.dayBreakdown[day] || { approaches: 0, presentations: 0, closings: 0 };
            return '<tr><td>' + day + '</td><td>' + d.approaches + '</td><td>' + d.presentations + '</td><td>' + d.closings + '</td></tr>';
        }).join('');
    }

    // Month totals (client-side, same activities list).
    var now = new Date();
    var startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    var endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    var monthCounts = { approach: 0, presentation: 0, closing: 0 };
    allRows(data).forEach(function (row) {
        var d = parseYMD(row.dateOfAction);
        if (!d || d < startOfMonth || d > endOfMonth) return;
        var type = String(row.status).toLowerCase();
        if (monthCounts.hasOwnProperty(type)) monthCounts[type]++;
    });
    setText('month-approaches', monthCounts.approach);
    setText('month-presentations', monthCounts.presentation);
    setText('month-closings', monthCounts.closing);
}

// --- CLIENTS TAB ("Closed Clients") ---
var currentClientFilter = 'all';

function renderClientsTab(data) {
    if (!data) return;
    renderClientsList();
}

function getClientCards() {
    var data = lastFetchedData;
    if (!data) return [];
    return (data.closing || []).map(function (row) {
        return {
            name: row.name,
            contact: row.contact,
            policyNumber: row.policyNumber,
            birthday: row.birthday,
            paymentDue: row.paymentDue
        };
    });
}

function renderClientsList() {
    var container = document.getElementById('clients-list');
    if (!container) return;

    var clients = getClientCards();

    var searchInput = document.getElementById('client-search');
    var query = searchInput ? searchInput.value.trim().toLowerCase() : '';
    if (query) {
        clients = clients.filter(function (c) {
            return (c.name || '').toLowerCase().indexOf(query) !== -1 ||
                (c.policyNumber || '').toLowerCase().indexOf(query) !== -1;
        });
    }

    if (currentClientFilter === 'birthday') {
        var upcomingBirthdays = (typeof Reminders !== 'undefined') ? Reminders.getUpcomingBirthdays(clients, 30) : [];
        var birthdayNames = {};
        upcomingBirthdays.forEach(function (c) { birthdayNames[c.name] = true; });
        clients = clients.filter(function (c) { return birthdayNames[c.name]; });
    } else if (currentClientFilter === 'payment') {
        var upcomingPayments = (typeof Reminders !== 'undefined') ? Reminders.getUpcomingPayments(clients, 30) : [];
        var paymentNames = {};
        upcomingPayments.forEach(function (c) { paymentNames[c.name] = true; });
        clients = clients.filter(function (c) { return paymentNames[c.name]; });
    }

    if (clients.length === 0) {
        container.innerHTML = '<p class="placeholder">No clients found</p>';
        return;
    }

    container.innerHTML = clients.map(function (c) {
        var badge = c.policyNumber ? escapeHtml(c.policyNumber) : 'No policy #';
        var waLink = buildWaLink(c.contact, c.name, c.policyNumber);
        var waButton = waLink
            ? '<a class="wa-send-btn" href="' + waLink + '" target="_blank" rel="noopener" onclick="event.stopPropagation()">&#128241; Send via WhatsApp</a>'
            : '';
        var contactHtml = c.contact
            ? '<a href="tel:' + escapeHtml(c.contact) + '" onclick="event.stopPropagation()">' + escapeHtml(c.contact) + '</a>'
            : 'N/A';
        var clickable = !!c.policyNumber;
        var cardAttrs = clickable ? ' onclick="copyPolicyNumber(\'' + escapeHtml(c.policyNumber).replace(/'/g, "\\'") + '\')" title="Tap to copy policy number"' : '';
        return '<div class="client-card' + (clickable ? ' clickable' : '') + '"' + cardAttrs + '>' +
            '<div class="client-name">' + escapeHtml(c.name || 'Unnamed Client') + '</div>' +
            '<div class="client-badge">' + badge + '</div>' +
            '<div class="client-info">Contact: ' + contactHtml + '</div>' +
            '<div class="client-info">Birthday: ' + escapeHtml(formatNiceDate(c.birthday) || 'N/A') + '</div>' +
            '<div class="client-info">Payment Due: ' + escapeHtml(formatNiceDate(c.paymentDue) || 'N/A') + '</div>' +
            waButton +
            '</div>';
    }).join('');
}

function copyPolicyNumber(policyNumber) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(policyNumber).then(function () {
            showToast('Policy number copied');
        }).catch(function () {
            showToast('Policy #: ' + policyNumber);
        });
    } else {
        showToast('Policy #: ' + policyNumber);
    }
}

function filterClients() {
    renderClientsList();
}

function filterByType(type) {
    currentClientFilter = type;
    document.querySelectorAll('.filter-btn').forEach(function (btn) {
        btn.classList.toggle('active', btn.getAttribute('data-filter') === type);
    });
    renderClientsList();
}

// --- ADD ACTIVITY TAB ---
function toggleClientFields() {
    var typeSelect = document.getElementById('activity-type');
    var closingFields = document.getElementById('closing-fields');
    if (!typeSelect || !closingFields) return;
    closingFields.classList.toggle('hidden', typeSelect.value !== 'CLOSING');
}

async function submitActivity(event) {
    event.preventDefault();

    var activityType = document.getElementById('activity-type').value;
    var date = document.getElementById('activity-date').value;
    var name = document.getElementById('client-name').value.trim();
    var contact = document.getElementById('client-contact').value.trim();
    var nature = document.getElementById('client-nature').value;
    var followUpDate = document.getElementById('follow-up-date').value;
    var remarks = document.getElementById('follow-up-remarks').value.trim();

    var messageBox = document.getElementById('form-message');
    var submitBtn = document.querySelector('#activity-form .submit-btn');

    function setMessage(text, type) {
        if (!messageBox) return;
        messageBox.textContent = text;
        messageBox.classList.remove('success', 'error');
        if (type) messageBox.classList.add(type);
    }

    if (!activityType || !date || !name) {
        setMessage('Please fill in Activity Type, Date, and Client Name.', 'error');
        return;
    }

    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Saving...'; }

    try {
        await API.addActivity({
            activityType: activityType,
            date: date,
            name: name,
            contact: contact,
            nature: nature,
            followUpDate: followUpDate,
            remarks: remarks
        });

        if (activityType === 'CLOSING') {
            var policyNumber = document.getElementById('policy-number').value.trim();
            var productProposed = document.getElementById('product-proposed').value.trim();
            var apeProposed = document.getElementById('ape-proposed').value;
            var clientBirthday = document.getElementById('client-birthday').value;
            var paymentDue = document.getElementById('payment-due').value;

            await API.addClientDetails({
                name: name,
                contact: contact,
                productProposed: productProposed,
                apeProposed: apeProposed,
                policyNumber: policyNumber,
                birthday: clientBirthday,
                paymentDue: paymentDue
            });
        }

        setMessage('Activity added!', 'success');
        document.getElementById('activity-form').reset();
        document.getElementById('activity-date').value = todayStr();
        toggleClientFields();
        showToast('Activity saved');
        await refreshData();
    } catch (error) {
        console.error('Submit activity error:', error);
        setMessage('Failed to save: ' + error.message, 'error');
    } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Submit Activity'; }
    }
}

// --- SETTINGS ---
function showSettings() {
    var urlInput = document.getElementById('settings-api-url');
    var sheetInput = document.getElementById('settings-sheet-id');
    if (urlInput) urlInput.value = API.getApiUrl() || '';
    if (sheetInput) sheetInput.value = API.getSheetId() || '';
    var modal = document.getElementById('settings-modal');
    if (modal) modal.classList.remove('hidden');
}

function hideSettings() {
    var modal = document.getElementById('settings-modal');
    if (modal) modal.classList.add('hidden');
}

async function updateApiUrl() {
    var input = document.getElementById('settings-api-url');
    var url = input ? input.value.trim() : '';
    if (!url || url.length < 20) {
        showToast('Please enter a valid URL first');
        return;
    }
    API.saveApiUrl(url);
    hideSettings();
    showToast('API URL updated');
    await connectDashboard(url);
}

function updateSheetId() {
    var input = document.getElementById('settings-sheet-id');
    var id = input ? input.value.trim() : '';
    API.saveSheetId(id);
    showToast('Sheet ID updated');
}

async function refreshData() {
    API.clearCache();
    await loadAllData();
    showToast('Data refreshed');
}

function clearCache() {
    if (!confirm('Clear cached data? The dashboard will reload fresh data from your Google Sheet next time it needs it.')) return;
    API.clearCache();
    showToast('Cache cleared');
}
