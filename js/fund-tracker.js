// --- Fund & Client Tracker tab ---

var FT_RANK_ICON = ['&#129351;', '&#129352;', '&#129353;'];
var FT_STATUS_CLASS = {
    'new lead': 'ft-status-new',
    'discussed': 'ft-status-discussed',
    'considering': 'ft-status-considering',
    'proposal sent': 'ft-status-proposal',
    'closed': 'ft-status-closed',
    'declined': 'ft-status-declined'
};
var ft_activeStatusFilter = 'all';

// Falls back to the sample data in fund-tracker-data.js until (and unless)
// a live Google Sheet connection successfully returns real rows.
var ft_funds = FUND_DATA;
var ft_clients = CLIENT_DATA;

async function renderFundsTab() {
    await ftLoadLiveData();
    if (ft_liveDataError && typeof showToast === 'function') {
        showToast('Could not load live Funds data (' + ft_liveDataError + ') — showing sample data');
    }
    renderFtInsight();
    renderFtSplit();
    renderFtTopPicks();
    renderFtStatusFilters();
    renderFtClients();
}

var ft_liveDataError = null;

async function ftLoadLiveData() {
    ft_liveDataError = null;
    var apiUrl = (typeof API !== 'undefined') ? API.getApiUrl() : null;
    if (!apiUrl) return;
    try {
        var url = apiUrl + (apiUrl.indexOf('?') === -1 ? '?' : '&') + 'action=fetchFundData&_ts=' + Date.now();
        var response = await fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' }, cache: 'no-store' });
        if (!response.ok) {
            ft_liveDataError = 'HTTP ' + response.status;
            console.error('ftLoadLiveData: request failed —', ft_liveDataError);
            return;
        }
        var data = await response.json();
        if (data.error) {
            ft_liveDataError = data.error;
            console.error('ftLoadLiveData: backend returned an error —', data.error);
            return;
        }
        // A live sheet that's simply empty so far is still "connected" --
        // show it as empty (via the .length checks in each render
        // function below) rather than silently keeping the sample data,
        // which would make it look like nothing was ever added.
        ft_funds = data.funds || [];
        ft_clients = data.clients || [];
    } catch (e) {
        // Sheet unreachable — keep showing the sample data instead of breaking the tab.
        ft_liveDataError = e.message;
        console.error('ftLoadLiveData: network/parse error —', e);
    }
}

// Top 3 by 3-year return, ranked live from whatever data is loaded (sample
// or real) rather than a stored rank -- so adding/updating a fund from the
// app re-ranks automatically without needing a "rank" field on the form.
function ftRankedFunds() {
    return ft_funds.slice().sort(function (a, b) { return b.ret3y - a.ret3y; });
}

function renderFtInsight() {
    var el = document.getElementById('ft-insight');
    if (!el) return;
    if (!ft_funds.length) {
        el.innerHTML = '<span class="ft-insight-label">Top 3-Year Performer</span><span class="ft-insight-value">Add a fund to see it here</span>';
        return;
    }
    var top = ftRankedFunds()[0];
    el.innerHTML =
        '<span class="ft-insight-label">Top 3-Year Performer</span>' +
        '<span class="ft-insight-value">' + escapeHtml(top.name) + ', +' + top.ret3y.toFixed(2) + '%</span>';
}

function renderFtSplit() {
    var el = document.getElementById('ft-split');
    if (!el) return;
    if (!ft_funds.length) {
        el.innerHTML =
            '<div class="ft-split-header"><span>Shariah</span><span>Conventional</span></div>' +
            '<div class="ft-split-bar"><div class="ft-split-fill" style="width:0%"></div></div>' +
            '<div class="ft-split-counts"><span>0 funds (0%)</span><span>0 funds (0%)</span></div>';
        return;
    }
    var shariah = ft_funds.filter(function (f) { return f.type === 'Shariah'; }).length;
    var total = ft_funds.length;
    var pct = Math.round((shariah / total) * 100);
    el.innerHTML =
        '<div class="ft-split-header"><span>Shariah</span><span>Conventional</span></div>' +
        '<div class="ft-split-bar"><div class="ft-split-fill" style="width:' + pct + '%"></div></div>' +
        '<div class="ft-split-counts"><span>' + shariah + ' funds (' + pct + '%)</span><span>' + (total - shariah) + ' funds (' + (100 - pct) + '%)</span></div>';
}

function renderFtTopPicks() {
    var el = document.getElementById('ft-top-picks');
    if (!el) return;
    if (!ft_funds.length) {
        el.innerHTML = '<p class="ft-placeholder">No funds added yet. Tap "+ Add Fund" above to start tracking one.</p>';
        return;
    }
    var top = ftRankedFunds().slice(0, 3);
    el.innerHTML = top.map(function (f, i) {
        return '<div class="ft-card">' +
            '<div class="ft-card-icon">' + (FT_RANK_ICON[i] || '&#11088;') + '</div>' +
            '<div class="ft-card-body">' +
            '<div class="ft-card-top"><h4>' + escapeHtml(f.name) + '</h4><span class="ft-tag ft-tag-' + f.type.toLowerCase() + '">' + escapeHtml(f.type) + '</span></div>' +
            '<p class="ft-card-category">' + escapeHtml(f.category) + '</p>' +
            '<div class="ft-card-returns">' +
            '<div><span class="ft-ret-val">+' + f.ret1y.toFixed(2) + '%</span><span class="ft-ret-label">1Y</span></div>' +
            '<div><span class="ft-ret-val ft-ret-highlight">+' + f.ret3y.toFixed(2) + '%</span><span class="ft-ret-label">3Y</span></div>' +
            '<div><span class="ft-ret-val">+' + f.ret5y.toFixed(2) + '%</span><span class="ft-ret-label">5Y</span></div>' +
            '</div>' +
            '<span class="ft-recommend ft-recommend-yes">Top Pick</span>' +
            '</div></div>';
    }).join('');
}

function renderFtStatusFilters() {
    var el = document.getElementById('ft-status-filters');
    if (!el) return;
    var statuses = ['all'].concat(ft_clients.map(function (c) { return c.status; })
        .filter(function (s, i, arr) { return arr.indexOf(s) === i; }));
    el.innerHTML = statuses.map(function (s) {
        var active = s === ft_activeStatusFilter ? ' active' : '';
        var label = s === 'all' ? 'All' : s;
        return '<button class="ft-filter-btn' + active + '" onclick="ftFilterStatus(\'' + s.replace(/'/g, "\\'") + '\')">' + escapeHtml(label) + '</button>';
    }).join('');
}

function ftFilterStatus(status) {
    ft_activeStatusFilter = status;
    renderFtStatusFilters();
    renderFtClients();
}

function renderFtClients() {
    var el = document.getElementById('ft-clients');
    if (!el) return;
    var list = ft_clients.filter(function (c) {
        return ft_activeStatusFilter === 'all' || c.status === ft_activeStatusFilter;
    });
    if (!list.length) {
        el.innerHTML = '<p class="ft-placeholder">No clients at this stage yet.</p>';
        return;
    }
    el.innerHTML = list.map(function (c) {
        var statusClass = FT_STATUS_CLASS[c.status.toLowerCase()] || 'ft-status-default';
        return '<div class="ft-client-card">' +
            '<div class="ft-client-top">' +
            '<h4>' + escapeHtml(c.name) + '</h4>' +
            '<span class="ft-status-badge ' + statusClass + '">' + escapeHtml(c.status) + '</span>' +
            '</div>' +
            '<div class="ft-client-meta">' +
            '<span>' + escapeHtml(c.riskProfile) + ' risk</span>' +
            '<span>&middot;</span>' +
            '<span>' + escapeHtml(c.horizon) + ' horizon</span>' +
            '</div>' +
            '<p class="ft-client-fund">Interested in: <strong>' + escapeHtml(c.fundOfInterest) + '</strong></p>' +
            '<p class="ft-client-notes">' + escapeHtml(c.notes) + '</p>' +
            '<div class="ft-client-footer">' +
            '<span>Discussed ' + escapeHtml(c.dateDiscussed) + '</span>' +
            '<span>' + escapeHtml(c.contact) + '</span>' +
            '</div>' +
            '</div>';
    }).join('');
}

// --- Add Fund / Add Pipeline Client modals ---

function showAddFundModal() {
    var form = document.getElementById('add-fund-form');
    if (form) form.reset();
    var asOf = document.getElementById('fund-as-of');
    if (asOf) asOf.value = todayStr();
    var msg = document.getElementById('add-fund-message');
    if (msg) { msg.textContent = ''; msg.className = 'form-message'; }
    var modal = document.getElementById('add-fund-modal');
    if (modal) modal.classList.remove('hidden');
}

function hideAddFundModal() {
    var modal = document.getElementById('add-fund-modal');
    if (modal) modal.classList.add('hidden');
}

async function submitAddFund(event) {
    event.preventDefault();
    var msg = document.getElementById('add-fund-message');
    var btn = document.querySelector('#add-fund-form .submit-btn');

    var record = {
        name: document.getElementById('fund-name').value.trim(),
        type: document.getElementById('fund-type').value,
        category: document.getElementById('fund-category').value.trim(),
        ret1y: document.getElementById('fund-ret1y').value,
        ret3y: document.getElementById('fund-ret3y').value,
        ret5y: document.getElementById('fund-ret5y').value,
        ret10y: document.getElementById('fund-ret10y').value,
        asOf: document.getElementById('fund-as-of').value
    };

    if (!record.name) {
        msg.textContent = 'Fund name is required.';
        msg.className = 'form-message error';
        return;
    }

    if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }
    try {
        await API.addFund(record);
        hideAddFundModal();
        showToast('Fund saved');
        API.clearCache();
        await renderFundsTab();
    } catch (err) {
        msg.textContent = 'Failed to save: ' + err.message;
        msg.className = 'form-message error';
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Save Fund'; }
    }
}

function showAddPipelineModal() {
    var form = document.getElementById('add-pipeline-form');
    if (form) form.reset();
    var dateDiscussed = document.getElementById('pipeline-date-discussed');
    if (dateDiscussed) dateDiscussed.value = todayStr();
    var msg = document.getElementById('add-pipeline-message');
    if (msg) { msg.textContent = ''; msg.className = 'form-message'; }
    var modal = document.getElementById('add-pipeline-modal');
    if (modal) modal.classList.remove('hidden');
}

function hideAddPipelineModal() {
    var modal = document.getElementById('add-pipeline-modal');
    if (modal) modal.classList.add('hidden');
}

async function submitAddPipelineClient(event) {
    event.preventDefault();
    var msg = document.getElementById('add-pipeline-message');
    var btn = document.querySelector('#add-pipeline-form .submit-btn');

    var record = {
        name: document.getElementById('pipeline-name').value.trim(),
        contact: document.getElementById('pipeline-contact').value.trim(),
        riskProfile: document.getElementById('pipeline-risk').value,
        fundOfInterest: document.getElementById('pipeline-fund').value.trim(),
        horizon: document.getElementById('pipeline-horizon').value.trim(),
        status: document.getElementById('pipeline-status').value,
        dateDiscussed: document.getElementById('pipeline-date-discussed').value,
        notes: document.getElementById('pipeline-notes').value.trim()
    };

    if (!record.name) {
        msg.textContent = 'Client name is required.';
        msg.className = 'form-message error';
        return;
    }

    if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }
    try {
        await API.addPipelineClient(record);
        hideAddPipelineModal();
        showToast('Pipeline client saved');
        API.clearCache();
        await renderFundsTab();
    } catch (err) {
        msg.textContent = 'Failed to save: ' + err.message;
        msg.className = 'form-message error';
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Save Client'; }
    }
}
