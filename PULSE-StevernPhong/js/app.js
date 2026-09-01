/* P.U.L.S.E Dashboard - Main App Logic */

document.addEventListener('DOMContentLoaded', function () { initApp(); });

var lastFetchedData = null; // cached fetchAll() result, reused across tabs/filters

async function initApp() {
    showLoading(true);

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
    renderReminderList('birthdays-list', todayBirthdays, 'Birthday today!', 'No birthdays today');

    var todayPayments = birthdaySource.filter(function (row) {
        return row.paymentDue === todayYMD;
    });
    renderReminderList('payments-list', todayPayments, 'Payment due today!', 'No payments due today');

    var todayFollowups = allRows(data).filter(function (row) {
        return row.followUpDate === todayYMD;
    });
    renderReminderList('followups-list', todayFollowups, 'Deadline action item due', 'No deadlines or followups scheduled');

    // Quick stats: activities logged today, by type.
    var approachesToday = (data.approach || []).filter(function (r) { return r.dateOfAction === todayYMD; }).length;
    var presentationsToday = (data.presentation || []).filter(function (r) { return r.dateOfAction === todayYMD; }).length;
    var closingsToday = (data.closing || []).filter(function (r) { return r.dateOfAction === todayYMD; }).length;

    setText('today-approaches', approachesToday);
    setText('today-presentations', presentationsToday);
    setText('today-closings', closingsToday);
}

function renderReminderList(elId, rows, detailText, emptyText) {
    var el = document.getElementById(elId);
    if (!el) return;
    if (rows.length === 0) {
        el.innerHTML = '<p class="placeholder">' + emptyText + '</p>';
        return;
    }
    el.innerHTML = rows.map(function (row) {
        return '<div class="reminder-item"><span class="name">' + escapeHtml(row.name || 'Unknown') + '</span><span class="detail">' + detailText + '</span></div>';
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
        return '<div class="client-card">' +
            '<div class="client-name">' + escapeHtml(c.name || 'Unnamed Client') + '</div>' +
            '<div class="client-badge">' + badge + '</div>' +
            '<div class="client-info">Contact: ' + escapeHtml(c.contact || 'N/A') + '</div>' +
            '<div class="client-info">Birthday: ' + escapeHtml(formatNiceDate(c.birthday) || 'N/A') + '</div>' +
            '<div class="client-info">Payment Due: ' + escapeHtml(formatNiceDate(c.paymentDue) || 'N/A') + '</div>' +
            '</div>';
    }).join('');
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

    if (!activityType || !date || !name) {
        if (messageBox) messageBox.textContent = 'Please fill in Activity Type, Date, and Client Name.';
        return;
    }

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

        if (messageBox) messageBox.textContent = 'Activity added!';
        document.getElementById('activity-form').reset();
        toggleClientFields();
        showToast('Activity saved');
        await refreshData();
    } catch (error) {
        console.error('Submit activity error:', error);
        if (messageBox) messageBox.textContent = 'Failed to save: ' + error.message;
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
    API.clearCache();
    showToast('Cache cleared');
}
