// Simple in-page password lock. This isn't server-side security — anyone
// who views the page source can see how it works — but it keeps casual
// visitors and search engines from landing on real client data, which is
// the actual goal here. initApp() (in app.js) is only called after the
// correct password is entered, so the Google Sheet is never fetched while
// the site is locked.
//
// Each device sets its own password on first use (no shared/central
// password to distribute) — so multiple agents can each open this same
// published site, create their own password, and connect their own
// Google Sheet, fully independently of one another.
(function () {
    var PASSWORD_HASH_KEY = 'pulse_password_hash';
    var STORAGE_KEY = 'pulse_unlocked';

    async function sha256Hex(text) {
        var buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
        return Array.from(new Uint8Array(buffer)).map(function (b) {
            return b.toString(16).padStart(2, '0');
        }).join('');
    }

    function unlock() {
        document.getElementById('lock-screen').classList.add('hidden');
        if (typeof initApp === 'function') initApp();
    }

    document.addEventListener('DOMContentLoaded', function () {
        if (localStorage.getItem(STORAGE_KEY) === 'true') {
            unlock();
            return;
        }

        var form = document.getElementById('lock-form');
        var input = document.getElementById('lock-password');
        var confirmInput = document.getElementById('lock-password-confirm');
        var apiUrlInput = document.getElementById('lock-api-url');
        var setupFields = document.getElementById('lock-setup-fields');
        var subtitle = document.getElementById('lock-subtitle');
        var submitBtn = document.getElementById('lock-submit-btn');
        var errorBox = document.getElementById('lock-error');

        var storedHash = localStorage.getItem(PASSWORD_HASH_KEY);
        var isFirstRun = !storedHash;

        if (isFirstRun) {
            setupFields.classList.remove('hidden');
            confirmInput.setAttribute('required', 'required');
            subtitle.textContent = 'Create a password to set up your dashboard';
            submitBtn.textContent = 'Create Password & Continue';
            input.placeholder = 'Choose a password';
        }

        form.addEventListener('submit', async function (e) {
            e.preventDefault();
            errorBox.textContent = '';

            if (isFirstRun) {
                if (input.value.length < 4) {
                    errorBox.textContent = 'Password must be at least 4 characters.';
                    return;
                }
                if (input.value !== confirmInput.value) {
                    errorBox.textContent = 'Passwords do not match.';
                    confirmInput.value = '';
                    confirmInput.focus();
                    return;
                }
                localStorage.setItem(PASSWORD_HASH_KEY, await sha256Hex(input.value));
                var url = apiUrlInput.value.trim();
                if (url && typeof API !== 'undefined') API.saveApiUrl(url);
                localStorage.setItem(STORAGE_KEY, 'true');
                unlock();
                return;
            }

            var hash = await sha256Hex(input.value);
            if (hash === storedHash) {
                localStorage.setItem(STORAGE_KEY, 'true');
                unlock();
            } else {
                errorBox.textContent = 'Wrong password. Try again.';
                input.value = '';
                input.focus();
            }
        });
    });
})();
