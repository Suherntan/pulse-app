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

function renderFundsTab() {
    renderFtInsight();
    renderFtSplit();
    renderFtTopPicks();
    renderFtStatusFilters();
    renderFtClients();
}

function renderFtInsight() {
    var el = document.getElementById('ft-insight');
    if (!el || !FUND_DATA.length) return;
    var top = FUND_DATA.slice().sort(function (a, b) { return b.ret3y - a.ret3y; })[0];
    el.innerHTML =
        '<span class="ft-insight-label">Top 3-Year Performer</span>' +
        '<span class="ft-insight-value">' + top.name + ', +' + top.ret3y.toFixed(2) + '%</span>';
}

function renderFtSplit() {
    var el = document.getElementById('ft-split');
    if (!el) return;
    var shariah = FUND_DATA.filter(function (f) { return f.type === 'Shariah'; }).length;
    var total = FUND_DATA.length || 1;
    var pct = Math.round((shariah / total) * 100);
    el.innerHTML =
        '<div class="ft-split-header"><span>Shariah</span><span>Conventional</span></div>' +
        '<div class="ft-split-bar"><div class="ft-split-fill" style="width:' + pct + '%"></div></div>' +
        '<div class="ft-split-counts"><span>' + shariah + ' funds (' + pct + '%)</span><span>' + (total - shariah) + ' funds (' + (100 - pct) + '%)</span></div>';
}

function renderFtTopPicks() {
    var el = document.getElementById('ft-top-picks');
    if (!el) return;
    var top = FUND_DATA.slice().sort(function (a, b) { return a.rank3y - b.rank3y; }).slice(0, 3);
    el.innerHTML = top.map(function (f, i) {
        return '<div class="ft-card">' +
            '<div class="ft-card-icon">' + (FT_RANK_ICON[i] || '&#11088;') + '</div>' +
            '<div class="ft-card-body">' +
            '<div class="ft-card-top"><h4>' + f.name + '</h4><span class="ft-tag ft-tag-' + f.type.toLowerCase() + '">' + f.type + '</span></div>' +
            '<p class="ft-card-category">' + f.category + '</p>' +
            '<div class="ft-card-returns">' +
            '<div><span class="ft-ret-val">+' + f.ret1y.toFixed(2) + '%</span><span class="ft-ret-label">1Y</span></div>' +
            '<div><span class="ft-ret-val ft-ret-highlight">+' + f.ret3y.toFixed(2) + '%</span><span class="ft-ret-label">3Y</span></div>' +
            '<div><span class="ft-ret-val">+' + f.ret5y.toFixed(2) + '%</span><span class="ft-ret-label">5Y</span></div>' +
            '</div>' +
            '<span class="ft-recommend ft-recommend-' + f.recommended.toLowerCase() + '">' + f.recommended + '</span>' +
            '</div></div>';
    }).join('');
}

function renderFtStatusFilters() {
    var el = document.getElementById('ft-status-filters');
    if (!el) return;
    var statuses = ['all'].concat(CLIENT_DATA.map(function (c) { return c.status; })
        .filter(function (s, i, arr) { return arr.indexOf(s) === i; }));
    el.innerHTML = statuses.map(function (s) {
        var active = s === ft_activeStatusFilter ? ' active' : '';
        var label = s === 'all' ? 'All' : s;
        return '<button class="ft-filter-btn' + active + '" onclick="ftFilterStatus(\'' + s.replace(/'/g, "\\'") + '\')">' + label + '</button>';
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
    var list = CLIENT_DATA.filter(function (c) {
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
            '<h4>' + c.name + '</h4>' +
            '<span class="ft-status-badge ' + statusClass + '">' + c.status + '</span>' +
            '</div>' +
            '<div class="ft-client-meta">' +
            '<span>' + c.riskProfile + ' risk</span>' +
            '<span>&middot;</span>' +
            '<span>' + c.horizon + ' horizon</span>' +
            '</div>' +
            '<p class="ft-client-fund">Interested in: <strong>' + c.fundOfInterest + '</strong></p>' +
            '<p class="ft-client-notes">' + c.notes + '</p>' +
            '<div class="ft-client-footer">' +
            '<span>Discussed ' + c.dateDiscussed + '</span>' +
            '<span>' + c.contact + '</span>' +
            '</div>' +
            '</div>';
    }).join('');
}
