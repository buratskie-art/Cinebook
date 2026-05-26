(function () {
    const API_URL = '/api/state';
    const CINEBOOK_KEYS = new Set([
        'cinebook:user',
        'cinebook:pass',
        'cinebook:email',
        'cinebook:emailVerified',
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
    const LAST_REMOTE_UPDATED_AT = 'cinebook:sync:lastRemoteUpdatedAt';

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

    function collectLocalStorageDump() {
        const dump = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (CINEBOOK_KEYS.has(key) || key === LAST_REMOTE_UPDATED_AT) continue;
            dump[key] = nativeGetItem.call(localStorage, key);
        }
        return dump;
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
                email: nativeGetItem.call(localStorage, 'cinebook:email') || '',
                emailVerified: nativeGetItem.call(localStorage, 'cinebook:emailVerified') || '',
                memberSince: nativeGetItem.call(localStorage, 'cinebook:memberSince') || ''
            },
            preferences: {
                emailNotif: nativeGetItem.call(localStorage, 'cinebook:emailNotif') || '',
                promoNotif: nativeGetItem.call(localStorage, 'cinebook:promoNotif') || ''
            },
            localStorage: collectLocalStorageDump()
        };
    }

    function hasMeaningfulLocalData() {
        return Object.keys(collectLocalStorageDump()).some((key) => {
            if (!key.startsWith('cinebook:') && key !== 'movie') return false;
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
                if (next.users.email) nativeSetItem.call(localStorage, 'cinebook:email', next.users.email);
                if (next.users.emailVerified) nativeSetItem.call(localStorage, 'cinebook:emailVerified', next.users.emailVerified);
                if (next.users.memberSince) nativeSetItem.call(localStorage, 'cinebook:memberSince', next.users.memberSince);
            }

            if (next.preferences) {
                if (next.preferences.emailNotif !== undefined) nativeSetItem.call(localStorage, 'cinebook:emailNotif', next.preferences.emailNotif);
                if (next.preferences.promoNotif !== undefined) nativeSetItem.call(localStorage, 'cinebook:promoNotif', next.preferences.promoNotif);
            }

            if (next.localStorage && typeof next.localStorage === 'object') {
                Object.entries(next.localStorage).forEach(([key, value]) => {
                    if (value !== undefined && value !== null) {
                        nativeSetItem.call(localStorage, key, String(value));
                    }
                });
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

        const payload = await response.json();
        if (payload.updatedAt) {
            nativeSetItem.call(localStorage, LAST_REMOTE_UPDATED_AT, payload.updatedAt);
        }
        return payload;
    }

    function scheduleSync(source) {
        if (applyingRemoteState) return;
        clearTimeout(syncTimer);
        syncTimer = setTimeout(() => {
            pushState(source).catch(() => {});
        }, 300);
    }

    Storage.prototype.setItem = function (key, value) {
        nativeSetItem.call(this, key, value);
        if (this === localStorage && (key.startsWith('cinebook:') || key === 'movie' || CINEBOOK_KEYS.has(key))) scheduleSync(`set:${key}`);
    };

    Storage.prototype.removeItem = function (key) {
        nativeRemoveItem.call(this, key);
        if (this === localStorage && (key.startsWith('cinebook:') || key === 'movie' || CINEBOOK_KEYS.has(key))) scheduleSync(`remove:${key}`);
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

            if (hasRemoteData) {
                applyState(state);
                if (payload.updatedAt) {
                    nativeSetItem.call(localStorage, LAST_REMOTE_UPDATED_AT, payload.updatedAt);
                }
            } else {
                return pushState(hasMeaningfulLocalData() ? 'initial-local-seed' : 'initial-seed');
            }
        })
        .catch(() => {});

    window.CineBookDataSync = {
        ready,
        pushState,
        collectLocalState,
        applyState,
        overwriteMongoFromLocal: () => pushState('manual-overwrite')
    };
})();
