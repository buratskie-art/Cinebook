(function () {
    const API_URL = '/api/state';
    const CINEBOOK_KEYS = new Set([
        'cinebook:user',
        'cinebook:pass',
        'cinebook:memberSince',
        'cinebook:emailNotif',
        'cinebook:promoNotif',
        'cinebook:admin:movies',
        'cinebook:admin:theaters',
        'cinebook:admin:showtimes',
        'cinebook:reservations',
        'cinebook:payments',
        'cinebook:paymentSubmissions',
        'cinebook:emailLog'
    ]);

    const nativeSetItem = Storage.prototype.setItem;
    const nativeRemoveItem = Storage.prototype.removeItem;
    const nativeGetItem = Storage.prototype.getItem;

    let applyingRemoteState = false;
    let syncTimer = null;

    function parseJson(key, fallback) {
        try {
            const raw = nativeGetItem.call(localStorage, key);
            return raw ? JSON.parse(raw) : fallback;
        } catch {
            return fallback;
        }
    }

    function collectLocalState() {
        return {
            movies: parseJson('cinebook:admin:movies', window.CineBookSeedData?.movies || []),
            theaters: parseJson('cinebook:admin:theaters', window.CineBookSeedData?.defaultAdminTheaters || []),
            showtimes: parseJson('cinebook:admin:showtimes', window.CineBookSeedData?.defaultAdminShowtimes || []),
            reservations: parseJson('cinebook:reservations', []),
            payments: parseJson('cinebook:payments', []),
            paymentSubmissions: parseJson('cinebook:paymentSubmissions', []),
            emailLog: parseJson('cinebook:emailLog', []),
            users: {
                username: nativeGetItem.call(localStorage, 'cinebook:user') || '',
                password: nativeGetItem.call(localStorage, 'cinebook:pass') || '',
                memberSince: nativeGetItem.call(localStorage, 'cinebook:memberSince') || ''
            },
            preferences: {
                emailNotif: nativeGetItem.call(localStorage, 'cinebook:emailNotif') || '',
                promoNotif: nativeGetItem.call(localStorage, 'cinebook:promoNotif') || ''
            }
        };
    }

    function hasMeaningfulLocalData() {
        return Array.from(CINEBOOK_KEYS).some((key) => {
            const raw = nativeGetItem.call(localStorage, key);
            if (!raw) return false;

            try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) return parsed.length > 0;
                if (parsed && typeof parsed === 'object') return Object.keys(parsed).length > 0;
            } catch {
                return raw.trim().length > 0;
            }

            return false;
        });
    }

    function applyState(state) {
        applyingRemoteState = true;
        try {
            const next = state || {};
            nativeSetItem.call(localStorage, 'cinebook:admin:movies', JSON.stringify(next.movies || []));
            nativeSetItem.call(localStorage, 'cinebook:admin:theaters', JSON.stringify(next.theaters || []));
            nativeSetItem.call(localStorage, 'cinebook:admin:showtimes', JSON.stringify(next.showtimes || []));
            nativeSetItem.call(localStorage, 'cinebook:reservations', JSON.stringify(next.reservations || []));
            nativeSetItem.call(localStorage, 'cinebook:payments', JSON.stringify(next.payments || []));
            nativeSetItem.call(localStorage, 'cinebook:paymentSubmissions', JSON.stringify(next.paymentSubmissions || []));
            nativeSetItem.call(localStorage, 'cinebook:emailLog', JSON.stringify(next.emailLog || []));

            if (next.users) {
                if (next.users.username) nativeSetItem.call(localStorage, 'cinebook:user', next.users.username);
                if (next.users.password) nativeSetItem.call(localStorage, 'cinebook:pass', next.users.password);
                if (next.users.memberSince) nativeSetItem.call(localStorage, 'cinebook:memberSince', next.users.memberSince);
            }

            if (next.preferences) {
                if (next.preferences.emailNotif !== undefined) nativeSetItem.call(localStorage, 'cinebook:emailNotif', next.preferences.emailNotif);
                if (next.preferences.promoNotif !== undefined) nativeSetItem.call(localStorage, 'cinebook:promoNotif', next.preferences.promoNotif);
            }
        } finally {
            applyingRemoteState = false;
        }
    }

    async function pushState(source) {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ source, state: collectLocalState() })
        });

        if (!response.ok) {
            const detail = await response.text();
            throw new Error(detail || 'MongoDB sync failed.');
        }

        return response.json();
    }

    function scheduleSync(source) {
        if (applyingRemoteState) return;
        clearTimeout(syncTimer);
        syncTimer = setTimeout(() => {
            pushState(source).catch((error) => {
                console.warn('CineBook MongoDB sync failed:', error.message);
            });
        }, 300);
    }

    Storage.prototype.setItem = function (key, value) {
        nativeSetItem.call(this, key, value);
        if (this === localStorage && CINEBOOK_KEYS.has(key)) scheduleSync(`set:${key}`);
    };

    Storage.prototype.removeItem = function (key) {
        nativeRemoveItem.call(this, key);
        if (this === localStorage && CINEBOOK_KEYS.has(key)) scheduleSync(`remove:${key}`);
    };

    const ready = fetch(API_URL)
        .then((response) => {
            if (!response.ok) throw new Error('MongoDB state is not available yet.');
            return response.json();
        })
        .then((payload) => {
            const state = payload.state || {};
            const hasRemoteData = Object.values(state).some((value) => {
                if (Array.isArray(value)) return value.length > 0;
                return value && typeof value === 'object' && Object.keys(value).length > 0;
            });

            if (hasMeaningfulLocalData()) {
                return pushState(hasRemoteData ? 'local-overrides-remote' : 'initial-local-seed');
            }

            if (hasRemoteData) {
                applyState(state);
            } else {
                return pushState('initial-seed');
            }
        })
        .catch((error) => {
            console.warn('CineBook is using browser storage until MongoDB is reachable:', error.message);
        });

    window.CineBookDataSync = {
        ready,
        pushState,
        collectLocalState,
        applyState,
        overwriteMongoFromLocal: () => pushState('manual-overwrite')
    };
})();
