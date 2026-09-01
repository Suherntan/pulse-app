export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Route 1: Deliver the JavaScript logic file to the client browser
    if (url.pathname === '/app.js') {
      try {
        const response = await env.ASSETS.fetch(request);
        return new Response(response.body, {
          headers: { 'content-type': 'application/javascript;charset=UTF-8' }
        });
      } catch (e) {
        return new Response('console.error("Asset engine error");', {
          headers: { 'content-type': 'application/javascript' }
        });
      }
    }

    // Route 2: Render the complete dashboard UI HTML grid layout
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>P.U.L.S.E Sales Dashboard</title>
    <style>
        body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, sans-serif; background-color: #f3f4f6; color: #1f2937; }
        .hidden { display: none !important; }
        .flex { display: flex; }
        .min-h-screen { min-height: 100vh; }
        .setup-screen-bg { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 1rem; box-sizing: border-box; }
        .setup-container { max-width: 450px; width: 100%; background: #ffffff; padding: 2.5rem; border-radius: 1rem; box-shadow: 0 10px 25px rgba(0,0,0,0.15); border: 1px solid #e5e7eb; text-align: center; box-sizing: border-box; }
        .setup-title { font-size: 1.6rem; font-weight: 800; color: #1e3a8a; margin: 0 0 0.75rem 0; text-transform: uppercase; }
        .setup-text { font-size: 0.9rem; color: #4b5563; line-height: 1.5; margin: 0 0 1.5rem 0; }
        .setup-input { width: 100%; box-sizing: border-box; padding: 0.8rem 1rem; border: 2px solid #e5e7eb; border-radius: 0.5rem; font-size: 0.9rem; margin-bottom: 1.25rem; outline: none; }
        .setup-btn { width: 100%; box-sizing: border-box; background-color: #2563eb; color: #ffffff; font-weight: 700; padding: 0.8rem; border: none; border-radius: 0.5rem; cursor: pointer; font-size: 0.95rem; text-transform: uppercase; }
        .dashboard-layout { display: flex; flex-direction: column; min-height: 100vh; }
        aside { width: 100%; background-color: #111827; color: #ffffff; padding: 1rem; box-sizing: border-box; display: flex; flex-direction: column; border-bottom: 1px solid #1f2937; }
        .panel-title { font-size: 1.2rem; font-weight: 900; color: #60a5fa; text-align: center; margin: 0 0 0.75rem 0; text-transform: uppercase; }
        nav { display: flex; flex-direction: row; gap: 0.25rem; justify-content: space-around; width: 100%; }
        .tab { background: none; border: none; text-align: center; padding: 0.6rem 0.5rem; color: #9ca3af; font-size: 0.8rem; font-weight: 600; border-radius: 0.5rem; cursor: pointer; flex: 1; transition: all 0.2s; white-space: nowrap; }
        .tab:hover, .tab.active { background-color: #1f2937; color: #ffffff; }
        main { flex: 1; padding: 1.25rem; box-sizing: border-box; background-color: #f9fafb; width: 100%; max-width: 100vw; overflow-x: hidden; }
        .grid-3 { display: grid; grid-template-columns: 1fr; gap: 1rem; margin-bottom: 1.5rem; }
        .card { background: #ffffff; padding: 1.25rem; border-radius: 0.75rem; border: 1px solid #e5e7eb; box-shadow: 0 1px 3px rgba(0,0,0,0.05); box-sizing: border-box; }
        .card h3 { margin: 0 0 0.75rem 0; font-size: 1rem; color: #374151; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.5rem; font-weight: 700; }
        .metrics-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem; }
        .metric-item { padding: 1rem 0.5rem; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 0.5rem; text-align: center; }
        .metric-item.pipeline-total { grid-column: span 2; background: #eff6ff; border-color: #bfdbfe; color: #1e3a8a; }
        .metric-title { font-size: 0.7rem; text-transform: uppercase; font-weight: 700; margin: 0; color: #6b7280; }
        .metric-val { font-size: 1.5rem; font-weight: 900; margin: 0.25rem 0 0 0; }
        .progress-container { background: #e5e7eb; height: 14px; border-radius: 7px; overflow: hidden; margin-top: 0.75rem; }
        .progress-bar { background: #2563eb; height: 100%; width: 0%; }
        .client-card { background: #ffffff; border: 1px solid #e5e7eb; padding: 1rem; border-radius: 0.5rem; box-sizing: border-box; margin-bottom: 0.75rem; }
        .badge { display: inline-block; padding: 0.15rem 0.4rem; font-size: 0.7rem; font-weight: 700; border-radius: 0.25rem; text-transform: uppercase; }
        .table-responsive { width: 100%; overflow-x: auto; border: 1px solid #e5e7eb; border-radius: 0.5rem; }
        table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.8rem; min-width: 450px; }
        th, td { padding: 0.75rem 0.85rem; border-bottom: 1px solid #e5e7eb; }
        thead th { background: #f3f4f6; font-size: 0.7rem; text-transform: uppercase; color: #6b7280; }
        .placeholder { color: #9ca3af; font-size: 0.85rem; margin: 0; }
        .reminder-item { display: flex; justify-content: space-between; gap: 0.5rem; padding: 0.4rem 0; font-size: 0.85rem; border-bottom: 1px solid #f3f4f6; }
        .reminder-item .name { font-weight: 600; }
        .reminder-item .detail { color: #6b7280; font-size: 0.75rem; }
        @media (min-width: 768px) {
            .dashboard-layout { flex-direction: row; }
            aside { width: 260px; height: 100vh; border-bottom: none; border-right: 1px solid #1f2937; padding: 1.5rem; position: sticky; top: 0; }
            .panel-title { font-size: 1.3rem; margin-bottom: 1.5rem; text-align: center; }
            nav { flex-direction: column; gap: 0.5rem; justify-content: flex-start; }
            .tab { text-align: left; padding: 0.8rem 1.2rem; font-size: 0.9rem; }
            main { padding: 2rem; }
            .grid-3 { grid-template-columns: repeat(3, 1fr); gap: 1.5rem; }
            .metrics-grid { grid-template-columns: repeat(5, 1fr); gap: 1rem; }
            .metric-item.pipeline-total { grid-column: span 1; }
            .metric-val { font-size: 1.75rem; }
            #clients-grid-container { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.5rem; }
        }
    </style>
</head>
<body>
    <div id="loading-screen" class="flex min-h-screen items-center justify-center bg-white" style="position: fixed; inset: 0; z-index: 9999;">
        <div style="font-size: 1.1rem; font-weight: 700; color: #374151;">Loading Mobile Dashboard Grid...</div>
    </div>
    <div id="setup-screen" class="hidden setup-screen-bg">
        <div class="setup-container">
            <h2 class="setup-title">⚙️ P.U.L.S.E Setup</h2>
            <p class="setup-text">Paste your deployed Google Apps Script URL link down below to unlock your pipeline dashboard.</p>
            <input type="text" id="api-url" placeholder="https://script.google.com/macros/s/XXXX/exec" class="setup-input">
            <button id="setup-submit-btn" class="setup-btn">Connect Framework</button>
            <p id="setup-error" style="color: #dc2626; font-size: 0.85rem; margin-top: 1rem; font-weight: 600;"></p>
        </div>
    </div>
    <div id="dashboard" class="hidden dashboard-layout">
        <aside>
            <h1 class="panel-title">P.U.L.S.E Hub</h1>
            <nav>
                <button onclick="switchTab('today')" class="tab active" data-tab="today">📅 Focus</button>
                <button onclick="switchTab('tracker')" class="tab" data-tab="tracker">📊 Metrics</button>
                <button onclick="switchTab('clients')" class="tab" data-tab="clients">👥 Leads</button>
            </nav>
        </aside>
        <main>
            <header style="border-bottom: 2px solid #e5e7eb; padding-bottom: 1rem; margin-bottom: 1.5rem;">
                <h2 id="current-date" style="margin:0; font-size:1.3rem; font-weight: 800; color:#111827;">Sales Operational Grid</h2>
                <p id="current-week-range" style="margin:0.25rem 0 0 0; font-size:0.8rem; color:#6b7280; font-weight: 500;">Calculating calendar timelines...</p>
            </header>

            <section id="tab-today" class="tab-content active">
                <div class="grid-3">
                    <div class="card"><h3>🎂 Today's Birthdays</h3><div id="birthdays-list"></div></div>
                    <div class="card"><h3>💰 Installment Fees Due</h3><div id="payments-list"></div></div>
                    <div class="card"><h3>🚨 Immediate Follow-Ups</h3><div id="followups-list"></div></div>
                </div>
                <div class="card">
                    <h3>📈 Active Conversion Pipeline Totals</h3>
                    <div class="metrics-grid">
                        <div class="metric-item pipeline-total"><p class="metric-title">Pipeline Net</p><p id="total-pipeline-count" class="metric-val">0</p></div>
                        <div class="metric-item"><p class="metric-title">Approach</p><p id="approach-count" class="metric-val">0</p></div>
                        <div class="metric-item"><p class="metric-title">Presentation</p><p id="presentation-count" class="metric-val">0</p></div>
                        <div class="metric-item"><p class="metric-title">Closing</p><p id="closing-count" class="metric-val">0</p></div>
                        <div class="metric-item"><p class="metric-title">Settled (SR)</p><p id="sr-count" class="metric-val">0</p></div>
                    </div>
                </div>
            </section>

            <section id="tab-tracker" class="tab-content hidden">
                <div class="card">
                    <h3>📈 Monthly Approach Progress</h3>
                    <p id="approach-progress-text" style="margin:0; font-weight:700; color:#1e3a8a;">0%</p>
                    <div class="progress-container"><div id="approach-progress-bar" class="progress-bar"></div></div>
                </div>
                <div class="card">
                    <h3>📊 Weekly Performance Tracker</h3>
                    <div class="table-responsive">
                        <table>
                            <thead>
                                <tr><th>Week</th><th>Approach</th><th>Presentation</th><th>Closing</th><th>SR</th></tr>
                            </thead>
                            <tbody id="weekly-tracker-body">
                                <tr><td colspan="5" class="placeholder">Loading weekly stats...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            <section id="tab-clients" class="tab-content hidden">
                <div class="card">
                    <h3>👥 All Leads &amp; Clients</h3>
                    <div id="clients-grid-container">
                        <p class="placeholder">Loading clients...</p>
                    </div>
                </div>
            </section>
        </main>
    </div>
    <script src="/app.js"></script>
</body>
</html>`;

    return new Response(html, {
      headers: { 'content-type': 'text/html;charset=UTF-8' }
    });
  }
};
