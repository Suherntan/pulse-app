

/* P.U.L.S.E Dashboard - Main App Logic */

document.addEventListener('DOMContentLoaded', function() { initApp(); });
var API = {
    getApiUrl: function() {
        return localStorage.getItem('google_apps_script_url');
    },
    fetchAllData: async function() {
        var url = this.getApiUrl();
        if (!url) return null;
        var res = await fetch(url);
        var json = await res.json();
        return json.data || null;
    },
    fetchWeeklyStats: async function() {
        var data = await this.fetchAllData();
        return data ? data.weeklyStats || {} : {};
    },
    fetchMonthlyStats: async function() {
        var data = await this.fetchAllData();
        return data ? data.monthlyStats || {} : {};
    }
};
async function initApp() {
    showLoading(false);
    var savedUrl = API.getApiUrl ? API.getApiUrl() : null;
    if (savedUrl && savedUrl.length > 20) {
        await connectDashboard(savedUrl);
    } else {
        showScreen('setup');
    }
}
async function connectDashboard(url) {
    try {
        showLoading(true);
        var response = await fetch(url, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });
        if (response.ok) {
            var data = await response.json();
            if (data.error) {
                showScreen('setup');
                document.getElementById('setup-error').textContent = 'Backend error: ' + data.error;
            } else {
                showScreen('dashboard');
                updateDateDisplay();
                updateWeekRange();
                await loadAllData();
            }
        } else {
            showScreen('setup');
            document.getElementById('setup-error').textContent = 'Cannot connect. Check your URL and try again.';
        }
    } catch (error) {
        console.error('Connection failed:', error);
        showScreen('setup');
        document.getElementById('setup-error').textContent = 'Network error. Make sure you are online.';
    }
}
function showScreen(screenName) {
    var loadingScreen = document.getElementById('loading-screen');
    var setupScreen = document.getElementById('setup-screen');
    var dashboardScreen = document.getElementById('dashboard');
    
    if (loadingScreen) loadingScreen.classList.add('hidden');
    if (setupScreen) setupScreen.classList.add('hidden');
    if (dashboardScreen) dashboardScreen.classList.add('hidden');
    
    if (screenName === 'loading' && loadingScreen) loadingScreen.classList.remove('hidden');
    if (screenName === 'setup' && setupScreen) setupScreen.classList.remove('hidden');
    if (screenName === 'dashboard' && dashboardScreen) dashboardScreen.classList.remove('hidden');
}
function showLoading(show) {
    var el = document.getElementById('loading-screen');
    if (el) {
        if (show) el.classList.remove('hidden'); else el.classList.add('hidden');
    }
}
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(function(el) { el.classList.add('hidden'); el.classList.remove('active'); });
    document.querySelectorAll('.tab').forEach(function(el) { el.classList.remove('active'); });
    var tc = document.getElementById('tab-' + tabName);
    if (tc) { tc.classList.remove('hidden'); tc.classList.add('active'); }
    var tb = document.querySelector('.tab[data-tab=' + tabName + ']');
    if (tb) tb.classList.add('active');
    if (tabName === 'today') loadTodayData();
    else if (tabName === 'tracker') loadTrackerData();
    else if (tabName === 'clients') loadClientsData();
}
function updateDateDisplay() {
    var now = new Date();
    var options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    var el = document.getElementById('current-date');
    if (el) el.textContent = now.toLocaleDateString('en-US', options);
}

document.addEventListener('click', function(e) {
    if (e.target && e.target.id === 'setup-submit-btn') {
        handleSetupSubmit();
    }
});
function updateWeekRange() {
    var now = new Date();
    var weekNum = getWeekNumber(now);
    var el = document.getElementById('current-week-range');
    if (el) el.textContent = 'Week ' + weekNum + ' of ' + now.getFullYear();
}
function getWeekNumber(date) {
    var d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    var dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}
function parseDate(dateStr) {
    if (!dateStr) return null;
    var parts = String(dateStr).split('/');
    if (parts.length === 3) {
        return new Date(parts[2], parts[1] - 1, parts[0]);
    }
    return new Date(dateStr);
}
function isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}
async function loadAllData() {
    try {
        await Promise.all([loadTodayData(), loadTrackerData(), loadClientsData()]);
    } catch (error) {
        console.error('Load all data error:', error);
    }
}
async function loadTodayData() {
    try {
        var data = await API.fetchAllData();
        if (data) {
            renderTodayReminders(data);
            renderTodayStats(data);
        }
    } catch (error) {
        console.error('Load today data error:', error);
    }
}
async function loadTrackerData() {
    try {
        var data = await API.fetchWeeklyStats();
        if (data) renderWeeklyTracker(data);
        var monthData = await API.fetchMonthlyStats();
        if (monthData) renderMonthlyStats(monthData);
    } catch (error) {
        console.error('Load tracker data error:', error);
    }
}
async function loadClientsData() {
    try {
        var data = await API.fetchAllData();
        if (data) renderClientsList(data);
    } catch (error) {
        console.error('Load clients data error:', error);
    }
}
function renderTodayReminders(data) {
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var closingData = data.CLOSING || data.closing || [];
    
    var todayBirthdays = closingData.filter(function(row) {
        if (!row || !row[12]) return false;
        var birthDate = parseDate(row[12]);
        if (!birthDate) return false;
        return birthDate.getMonth() === today.getMonth() && birthDate.getDate() === today.getDate();
    });

    var birthdayEl = document.getElementById('birthdays-list');
    if (birthdayEl) {
        if (todayBirthdays.length > 0) {
            birthdayEl.innerHTML = todayBirthdays.map(function(row) {
                return '<div class="reminder-item"><span class="name">' + (row[4] || 'Unknown') + '</span><span class="detail">Birthday today!</span></div>';
            }).join('');
        } else {
            birthdayEl.innerHTML = '<p class="placeholder">No birthdays today</p>';
        }
    }

    var todayPayments = closingData.filter(function(row) {
        if (!row || !row[13]) return false;
        var payDate = parseDate(row[13]);
        if (!payDate) return false;
        return isSameDay(payDate, today);
    });

    var paymentEl = document.getElementById('payments-list');
    if (paymentEl) {
        if (todayPayments.length > 0) {
            paymentEl.innerHTML = todayPayments.map(function(row) {
                return '<div class="reminder-item"><span class="name">' + (row[4] || 'Unknown') + '</span><span class="detail">Payment due today!</span></div>';
            }).join('');
        } else {
            paymentEl.innerHTML = '<p class="placeholder">No payments due today</p>';
        }
    }

    var allActivities = [].concat(data.APPROACH || data.approach || [], data.PRESENTATION || data.presentation || [], data.CLOSING || data.closing || [], data.SR || data.sr || []);
    var todayFollowups = allActivities.filter(function(row) {
        if (!row || !row[10]) return false;
        var followDate = parseDate(row[10]);
        if (!followDate) return false;
        return isSameDay(followDate, today);
    });

    var followupEl = document.getElementById('followups-list');
    if (followupEl) {
        if (todayFollowups.length > 0) {
            followupEl.innerHTML = todayFollowups.map(function(row) {
                return '<div class="reminder-item"><span class="name">' + (row[4] || 'Unknown') + '</span><span class="detail">Deadline Action Item Due</span></div>';
            }).join('');
        } else {
            followupEl.innerHTML = '<p class="placeholder">No deadlines scheduled</p>';
        }
    }
}
function renderTodayStats(data) {
    var totals = { approach: 0, presentation: 0, closing: 0, sr: 0 };
    if (data.APPROACH || data.approach) totals.approach = (data.APPROACH || data.approach).length;
    if (data.PRESENTATION || data.presentation) totals.presentation = (data.PRESENTATION || data.presentation).length;
    if (data.CLOSING || data.closing) totals.closing = (data.CLOSING || data.closing).length;
    if (data.SR || data.sr) totals.sr = (data.SR || data.sr).length;

    var totalPipeline = totals.approach + totals.presentation + totals.closing + totals.sr;
    
    var tPipe = document.getElementById('total-pipeline-count');
    var tApp = document.getElementById('approach-count');
    var tPres = document.getElementById('presentation-count');
    var tClos = document.getElementById('closing-count');
    var tSr = document.getElementById('sr-count');

    if (tPipe) tPipe.textContent = totalPipeline;
    if (tApp) tApp.textContent = totals.approach;
    if (tPres) tPres.textContent = totals.presentation;
    if (tClos) tClos.textContent = totals.closing;
    if (tSr) tSr.textContent = totals.sr;
}
function renderWeeklyTracker(stats) {
    var trackerBody = document.getElementById('weekly-tracker-body');
    if (!trackerBody) return;
    
    if (!stats || Object.keys(stats).length === 0) {

trackerBody.innerHTML = 'No performance records for this week';
return;
}
var html = '';
for (var targetWeek in stats) {
var weekData = stats[targetWeek] || { approach: 0, presentation: 0, closing: 0, sr: 0 };
html += '' +
'' + targetWeek + '' +
'' + (weekData.approach || 0) + '' +
'' + (weekData.presentation || 0) + '' +
'' + (weekData.closing || 0) + '' +
'' + (weekData.sr || 0) + '' +
'';
}
trackerBody.innerHTML = html;
}
function renderMonthlyStats(monthData) {
var appPercent = monthData.approachPercent || 0;
var approachBar = document.getElementById('approach-progress-bar');
var approachText = document.getElementById('approach-progress-text');
if (approachText) approachText.textContent = appPercent + '%';
if (approachBar) {
approachBar.style.width = appPercent + '%';
}
}
function renderClientsList(data) {
var container = document.getElementById('clients-grid-container');
if (!container) return;
var allClients = [];
var categories = ['approach', 'presentation', 'closing', 'sr'];
categories.forEach(function(cat) {
var key = cat.toUpperCase();
var rows = data[key] || data[cat] || [];
rows.forEach(function(row) {
if (row && row[4]) {
allClients.push({
stage: key,
name: row[4] || 'Unnamed Client',
contact: row[5] || 'N/A',
nature: row[8] || 'Cold',
deadline: row[10] || 'None'
});
}
});
});
if (allClients.length === 0) {
container.innerHTML = 'No clients found';
return;
}
container.innerHTML = allClients.map(function(client) {
var natureClass = 'nature-' + String(client.nature).toLowerCase();
return '' +
'' +
'' + client.name + '' +
'' + client.nature + '' +
'' +
'Stage: ' + client.stage + '' +
'Contact: ' + client.contact + '' +
'Deadline: ' + client.deadline + '' +
'';
}).join('');
}
function saveApiUrl(inputVal) {
if (inputVal && inputVal.length > 10) {
localStorage.setItem('google_apps_script_url', inputVal);
return true;
}
return false;
}
function handleSetupSubmit() {
var inputEl = document.getElementById('api-url-input') || document.getElementById('api-url');
var val = inputEl ? inputEl.value.trim() : '';
if (saveApiUrl(val)) {
connectDashboard(val);
} else {
var errorBox = document.getElementById('setup-error');
if (errorBox) errorBox.textContent = 'Please enter a valid deployment URL first.';
}
}




