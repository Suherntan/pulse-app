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
        return localStorage.getItem(this.API_URL_KEY);
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

            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
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
            const response = await fetch(url.toString(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
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
     */
    async fetchAllData() {
        return this.get('fetchAll');
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
    }
};
