/* ============================================
   P.U.L.S.E Dashboard - API Layer
   Handles communication with Google Apps Script
   ============================================ */

const API = {
    // Storage keys
    API_URL_KEY: 'pulse_api_url',
    SHEET_ID_KEY: 'pulse_sheet_id',
    CACHE_KEY: 'pulse_data_cache',
    CACHE_TIME_KEY: 'pulse_cache_time',

    // Cache duration: 5 minutes
    CACHE_DURATION: 5 * 60 * 1000,

    /**
     * Get the stored API URL
     */
    getApiUrl() {
        const stored = localStorage.getItem(this.API_URL_KEY);
        if (!stored) return stored;
        // Strip any query string the URL was saved with. Pasting the URL
        // with a trailing ?action=... makes callers that append their own
        // action produce two of them, and Apps Script honours the first —
        // so every request silently runs the wrong action.
        return stored.split('?')[0].split('#')[0];
    },

    /**
     * Save the API URL
     */
    saveApiUrl(url) {
        localStorage.setItem(this.API_URL_KEY, url);
    },

    /**
     * Get the stored Sheet ID
     */
    getSheetId() {
        return localStorage.getItem(this.SHEET_ID_KEY);
    },

    /**
     * Save the Sheet ID
     */
    saveSheetId(id) {
        localStorage.setItem(this.SHEET_ID_KEY, id);
    },

    /**
     * Check if cached data is still valid
     */
    isCacheValid() {
        const cacheTime = localStorage.getItem(this.CACHE_TIME_KEY);
        if (!cacheTime) return false;
        return (Date.now() - parseInt(cacheTime)) < this.CACHE_DURATION;
    },

    /**
     * Get cached data
     */
    getCachedData() {
        try {
            const data = localStorage.getItem(this.CACHE_KEY);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            return null;
        }
    },

    /**
     * Save data to cache
     */
    saveCache(data) {
        localStorage.setItem(this.CACHE_KEY, JSON.stringify(data));
        localStorage.setItem(this.CACHE_TIME_KEY, Date.now().toString());
    },

    /**
     * Clear all cache
     */
    clearCache() {
        localStorage.removeItem(this.CACHE_KEY);
        localStorage.removeItem(this.CACHE_TIME_KEY);
    },

    /**
     * Make a GET request to the Apps Script API
     * @param {string} action - The action to perform
     * @param {object} params - Additional query parameters
     * @returns {Promise<object>} Response data
     */
    async get(action, params = {}) {
        const apiUrl = this.getApiUrl();
        if (!apiUrl) {
            throw new Error('API URL not configured. Please set it in Settings.');
        }

        const url = new URL(apiUrl);
        url.searchParams.set('action', action);

        Object.keys(params).forEach(key => {
            url.searchParams.set(key, params[key]);
        });

        try {
            // Try cache first
            if (this.isCacheValid()) {
                const cached = this.getCachedData();
                if (cached && cached.action === action) {
                    return cached.data;
                }
            }

            // Cache-bust: the Apps Script response is served from
            // script.googleusercontent.com, which can carry headers the
            // browser's HTTP cache respects — without a unique URL per
            // call, a write followed by a re-fetch can silently come back
            // with the pre-write response instead of hitting the backend.
            url.searchParams.set('_ts', Date.now().toString());

            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                },
                cache: 'no-store'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ` + response.status);
            }

            const data = await response.json();

            // Check for error from backend
            if (data.error) {
                throw new Error(data.error);
            }

            // Cache the data
            this.saveCache({ action, data });

            return data;
        } catch (error) {
            console.error('API GET error:', error);
            // Return cached data if available as fallback
            if (this.isCacheValid()) {
                const cached = this.getCachedData();
                if (cached && cached.action === action) {
                    console.warn('Using cached data (API unavailable)');
                    return cached.data;
                }
            }
            throw error;
        }
    },

    /**
     * Make a POST request to the Apps Script API
     * @param {string} action - The action to perform
     * @param {object} data - Data to send
     * @returns {Promise<object>} Response data
     */
    async post(action, data = {}) {
        const apiUrl = this.getApiUrl();
        if (!apiUrl) {
            throw new Error('API URL not configured. Please set it in Settings.');
        }

        const url = new URL(apiUrl);
        url.searchParams.set('action', action);

        try {
            // Body is JSON, but it MUST be sent as text/plain. An
            // application/json content type is not CORS-"simple", so the
            // browser fires an OPTIONS preflight first — and Apps Script
            // answers every request with a 302 redirect, which is illegal
            // on a preflight response. The preflight fails and the POST is
            // never sent ("Failed to fetch"). text/plain skips preflight;
            // e.postData.contents on the Apps Script side is the same raw
            // JSON string either way.
            const response = await fetch(url.toString(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ` + response.status);
            }

            const result = await response.json();

            if (result.error) {
                throw new Error(result.error);
            }

            // Invalidate cache after write
            this.clearCache();

            return result;
        } catch (error) {
            console.error('API POST error:', error);
            throw error;
        }
    },

    // --- Specific API Methods ---

    /**
     * Fetch all data from all tabs
     * Backend (Code.gs) returns uppercase keys (APPROACH, PRESENTATION,
     * CLOSING, SR) for the Scriptable iOS widget; normalize to lowercase
     * here so the rest of the web app's lowercase reads keep working.
     */
    async fetchAllData() {
        const data = await this.get('fetchAll');
        if (data && !data.error) {
            ['APPROACH', 'PRESENTATION', 'CLOSING', 'SR'].forEach(key => {
                const lower = key.toLowerCase();
                if (data[key] !== undefined && data[lower] === undefined) {
                    data[lower] = data[key];
                }
            });
        }
        return data;
    },

    /**
     * Fetch data from a specific tab
     * @param {string} sheetName - Name of the sheet/tab
     */
    async fetchSheet(sheetName) {
        return this.get('fetchSheet', { sheet: sheetName });
    },

    /**
     * Fetch today's reminders (birthdays, payments, follow-ups)
     */
    async fetchReminders() {
        return this.get('reminders');
    },

    /**
     * Fetch weekly statistics
     */
    async fetchWeeklyStats() {
        return this.get('weeklyStats');
    },

    /**
     * Fetch monthly statistics
     */
    async fetchMonthlyStats() {
        return this.get('monthlyStats');
    },

    /**
     * Fetch the agent's own birthday/premium-reminder message wording
     * (same templates the sheet's WhatsApp blast-list menu uses)
     */
    async fetchMessageTemplates() {
        return this.get('messageTemplates');
    },

    /**
     * Add a new activity record
     * @param {object} record - The activity record
     */
    async addActivity(record) {
        return this.post('addActivity', record);
    },

    /**
     * Add or update client details (for CLOSING tab)
     * @param {object} clientData - Client details
     */
    async addClientDetails(clientData) {
        return this.post('addClientDetails', clientData);
    },

    /**
     * Search clients by name or policy number
     * @param {string} query - Search query
     */
    async searchClients(query) {
        return this.get('searchClients', { q: query });
    },

    /**
     * Fetch live Fund research + Client Pipeline data (Funds tab)
     */
    async fetchFundData() {
        return this.get('fetchFundData');
    },

    /**
     * Fetch upcoming appointments from the connected Google Calendar
     */
    async fetchAppointments() {
        return this.get('appointments');
    },

    /**
     * Add or update a fund research entry (upserted by fund name)
     * @param {object} fundData - Fund details
     */
    async addFund(fundData) {
        return this.post('addFund', fundData);
    },

    /**
     * Add or update a client pipeline entry (upserted by client name)
     * @param {object} clientData - Pipeline client details
     */
    async addPipelineClient(clientData) {
        return this.post('addPipelineClient', clientData);
    },

    /**
     * Trigger the Email Blast (EMAIL TEMPLATE sheet) right now
     */
    async sendEmailBlast() {
        return this.post('sendEmailBlast', {});
    },

    /**
     * Trigger today's birthday voucher emails right now
     */
    async sendBirthdayVouchers() {
        return this.post('sendBirthdayVouchers', {});
    }
};
