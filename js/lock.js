// Simple in-page password lock. This isn't server-side security — anyone
// who views the page source can find the hash below — but it keeps casual
// visitors and search engines from landing on real client data, which is
// the actual goal here. initApp() (in app.js) is only called after the
// correct password is entered, so the Google Sheet is never fetched while
// the site is locked.
(function () {
    var PASSWORD_HASH = '5afcbbf1154e76e3bc533f7493756241504dc995e8b43ac92502e3b648c13b25';
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
        var errorBox = document.getElementById('lock-error');

        form.addEventListener('submit', async function (e) {
            e.preventDefault();
            var hash = await sha256Hex(input.value);
            if (hash === PASSWORD_HASH) {
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
