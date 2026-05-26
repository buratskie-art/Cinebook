const ADMIN_SHOWTIME_SLOTS = ['10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];

const CineBook = (() => {

    // Placeholder poster (SVG) - blank image shown when no poster available
    const PLACEHOLDER_POSTER = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600">
        <rect width="100%" height="100%" fill="#1a1a1a"/>
        <text x="50%" y="50%" fill="#777" font-family="Arial" font-size="20" text-anchor="middle" dy=".3em">No poster available</text>
    </svg>`
);

const LS_PREFIX = 'cinebook:';
const LS_USER = LS_PREFIX + 'user';
const LS_PASS = LS_PREFIX + 'pass';
const LS_EMAIL = LS_PREFIX + 'email';
const LS_EMAIL_VERIFIED = LS_PREFIX + 'emailVerified';
const LS_LOGGED = LS_PREFIX + 'loggedIn';
const LS_SELECTED_SEATS = (movieKey) => `${LS_PREFIX}seats:${movieKey}`;
const LS_RESERVATIONS = LS_PREFIX + 'reservations';
const LS_PAYMENTS = LS_PREFIX + 'payments';
const SEAT_BLOCKS = ['A', 'B', 'C'];
const SEAT_ROWS_PER_BLOCK = 8;
const SEAT_COLUMNS_PER_BLOCK = 10;
const THEATER_LAYOUT_SEATS = SEAT_BLOCKS.length * SEAT_ROWS_PER_BLOCK * SEAT_COLUMNS_PER_BLOCK;
const BLOCKING_SEAT_STATUSES = new Set(['pending', 'payment_pending_review', 'confirmed']);
let lastEmailError = '';

    function getSeatLabel(block, row, column) {
        return `${block}${row}${column}`;
    }

    function normalizeSeatId(seat) {
        return String(seat);
    }

    function getSeatLockStatus(bookingStatus) {
        if (bookingStatus === 'confirmed') return 'confirmed';
        if (bookingStatus === 'pending' || bookingStatus === 'payment_pending_review') return 'pending';
        return '';
    }

    function getDefaultMovies() {
        if (typeof movies !== 'undefined' && Array.isArray(movies)) return movies;
        return (window.CineBookSeedData && Array.isArray(window.CineBookSeedData.movies))
            ? window.CineBookSeedData.movies
            : [];
    }

    function getDefaultAdminTheaters() {
        if (typeof defaultAdminTheaters !== 'undefined' && Array.isArray(defaultAdminTheaters)) return defaultAdminTheaters;
        return (window.CineBookSeedData && Array.isArray(window.CineBookSeedData.defaultAdminTheaters))
            ? window.CineBookSeedData.defaultAdminTheaters
            : [];
    }

    function getDefaultAdminShowtimes() {
        if (typeof defaultAdminShowtimes !== 'undefined' && Array.isArray(defaultAdminShowtimes)) return defaultAdminShowtimes;
        return (window.CineBookSeedData && Array.isArray(window.CineBookSeedData.defaultAdminShowtimes))
            ? window.CineBookSeedData.defaultAdminShowtimes
            : [];
    }

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function buildCineBookEmailHtml(emailLog) {
        const escapedBody = escapeHtml(emailLog.body || '')
            .replace(/\n/g, '<br>')
            .replace(/(^|<br>)([0-9]{6})(<br>|$)/g, '$1<span style="display:inline-block;margin:10px 0;padding:12px 18px;border:1px solid #d6a84f;border-radius:6px;background:#2a0709;color:#f7d77f;font-size:28px;font-weight:800;letter-spacing:6px;">$2</span>$3');

        return `
            <div style="margin:0;padding:0;background:#080505;">
                <div style="max-width:640px;margin:0 auto;padding:28px 16px;font-family:Arial,Helvetica,sans-serif;color:#f8ead0;">
                    <div style="overflow:hidden;border:1px solid rgba(214,168,79,0.45);border-radius:14px;background:#130808;box-shadow:0 18px 46px rgba(0,0,0,0.45);">
                        <div style="padding:26px 28px;background:linear-gradient(135deg,#7e1018 0%,#2b0608 56%,#080505 100%);border-bottom:1px solid rgba(214,168,79,0.38);">
                            <div style="font-family:Georgia,'Times New Roman',serif;font-size:30px;font-weight:700;letter-spacing:0.5px;color:#ffe0a3;">CineBook</div>
                            <div style="margin-top:6px;color:#d8b96b;font-size:13px;text-transform:uppercase;letter-spacing:2px;">Premium Theatre Ticketing</div>
                        </div>
                        <div style="padding:28px;background:linear-gradient(180deg,#1a0b0c 0%,#0d0707 100%);">
                            <h1 style="margin:0 0 18px;font-size:22px;line-height:1.3;color:#fff3d0;">${escapeHtml(emailLog.subject || 'CineBook Notification')}</h1>
                            <div style="padding:20px;border-left:4px solid #d6a84f;border-radius:8px;background:rgba(255,244,215,0.055);color:#f5e6cb;font-size:15px;line-height:1.65;">
                                ${escapedBody}
                            </div>
                            <div style="margin-top:22px;padding:14px 16px;border-radius:8px;background:rgba(126,16,24,0.32);color:#d7c3a1;font-size:12px;line-height:1.5;">
                                This message was sent automatically by CineBook. Please keep your booking and payment details for theatre verification.
                            </div>
                        </div>
                        <div style="padding:16px 28px;background:#070505;border-top:1px solid rgba(214,168,79,0.18);color:#9f8b6d;font-size:12px;text-align:center;">
                            CineBook | Classic cinema reservations and ticketing
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function getUserEmail(username) {
        const savedEmail = String(localStorage.getItem(LS_EMAIL) || '').trim();
        if (isValidEmail(savedEmail)) return savedEmail;
        const user = String(username || localStorage.getItem(LS_USER) || '').trim();
        if (!user) return '';
        return user.includes('@') ? user : `${user}@student.edu`;
    }

    function updateEmailLogStatus(emailId, updates) {
        const emails = JSON.parse(localStorage.getItem('cinebook:emailLog') || '[]');
        const email = emails.find(item => item.id === emailId);
        if (!email) return;
        Object.assign(email, updates);
        localStorage.setItem('cinebook:emailLog', JSON.stringify(emails));
    }

    function makeEmailError(response, payload, rawText) {
        if (payload && payload.error) return payload.hint ? `${payload.error} ${payload.hint}` : payload.error;
        if (rawText) return rawText.slice(0, 180);
        if (response.status === 404) return 'The deployed /api/email route was not found. Redeploy the Vercel project.';
        if (response.status === 500) return 'The deployed email service is missing or rejecting its Vercel environment variables.';
        return `Email service failed with HTTP ${response.status}`;
    }

    async function sendCineBookEmail(emailLog) {
        lastEmailError = '';
        const emails = JSON.parse(localStorage.getItem('cinebook:emailLog') || '[]');
        emails.push(emailLog);
        localStorage.setItem('cinebook:emailLog', JSON.stringify(emails));

        try {
            const response = await fetch('/api/email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: emailLog.to,
                    subject: emailLog.subject,
                    text: emailLog.body,
                    html: buildCineBookEmailHtml(emailLog),
                    type: emailLog.type
                })
            });
            const rawText = await response.text();
            let result = {};
            try {
                result = rawText ? JSON.parse(rawText) : {};
            } catch {
                result = {};
            }
            if (!response.ok || !result.ok) {
                throw new Error(makeEmailError(response, result, rawText));
            }
            updateEmailLogStatus(emailLog.id, {
                status: 'sent',
                sentAt: new Date().toLocaleString(),
                providerId: result.id || ''
            });
            return true;
        } catch (error) {
            lastEmailError = error.message || 'Email failed';
            updateEmailLogStatus(emailLog.id, {
                status: 'send_failed',
                error: lastEmailError,
                failedAt: new Date().toLocaleString()
            });
            return false;
        }
    }

    function getLastEmailError() {
        return lastEmailError;
    }

    function getMovieSource() {
        try {
            const adminMovies = getAdminMovies();
            if (adminMovies && adminMovies.length > 0) return adminMovies;
        } catch {
            // fall back to bundled movies
        }
        return getDefaultMovies();
    }

    function toFileName(title) {
        return (title || '').toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
    }

    // Debounce utility for search input
    function debounce(fn, wait) {
        let t = null;
        return function (...args) {
            clearTimeout(t);
            t = setTimeout(() => fn.apply(this, args), wait);
        };
    }

    // --- Seats ---
    function readSavedSeats(movieKey) {
        try {
            const raw = localStorage.getItem(LS_SELECTED_SEATS(movieKey));
            if (!raw) return null;
            const arr = JSON.parse(raw);
            if (!Array.isArray(arr)) return null;
            return new Set(arr.map(normalizeSeatId));
        } catch {
            return null;
        }
    }

    function saveSelectedSeats(movieKey, selectedSet) {
        try {
            const arr = Array.from(selectedSet);
            localStorage.setItem(LS_SELECTED_SEATS(movieKey), JSON.stringify(arr));
        } catch {
            // ignore storage errors
        }
    }

    function readSeatStatuses(movieKey) {
        try {
            const reservations = JSON.parse(localStorage.getItem(LS_RESERVATIONS) || '[]');
            const statuses = new Map();
            reservations.forEach(res => {
                const key = toFileName(res.movie || '');
                if (!movieKey || key !== movieKey) return;
                const lockStatus = getSeatLockStatus(res.status);
                if (lockStatus && Array.isArray(res.seats)) {
                    res.seats.forEach(num => statuses.set(normalizeSeatId(num), lockStatus));
                }
            });
            return statuses;
        } catch {
            return new Map();
        }
    }

    function createSeats(movieKey) {
        const container = document.getElementById("seatContainer");
        if (!container) return;
        container.innerHTML = "";
        const saved = movieKey ? readSavedSeats(movieKey) : null;
        const seatStatuses = movieKey ? readSeatStatuses(movieKey) : new Map();
        renderSeatMap(container, seatStatuses, saved, () => updateSeat(movieKey));
        updateSeat(movieKey);
    }

    function renderSeatMap(container, seatStatuses, savedSeats, onSeatChange) {
        const fragment = document.createDocumentFragment();
        const map = document.createElement('div');
        map.className = 'seat-map';

        SEAT_BLOCKS.forEach((blockName, blockIndex) => {
            if (blockIndex === 0) {
                const leftScreenSpace = document.createElement('div');
                leftScreenSpace.className = 'screen-spacer';
                map.appendChild(leftScreenSpace);
            } else if (blockIndex === 1) {
                const screen = document.createElement('div');
                screen.className = 'screen';
                screen.innerHTML = '<span>SCREEN</span><small>Front of Cinema</small>';
                map.appendChild(screen);
            } else {
                const rightScreenSpace = document.createElement('div');
                rightScreenSpace.className = 'screen-spacer';
                map.appendChild(rightScreenSpace);
            }

            if (blockIndex > 0) {
                const aisle = document.createElement('div');
                aisle.className = 'aisle';
                aisle.textContent = 'AISLE';
                map.appendChild(aisle);
            }

            const block = document.createElement('section');
            block.className = 'seat-block';
            block.setAttribute('aria-label', `Block ${blockName}`);

            const title = document.createElement('div');
            title.className = 'seat-block-title';
            title.textContent = `Block ${blockName}`;
            block.appendChild(title);

            const grid = document.createElement('div');
            grid.className = 'seat-grid';

            const spacer = document.createElement('div');
            spacer.className = 'seat-axis-spacer';
            grid.appendChild(spacer);

            for (let column = 1; column <= SEAT_COLUMNS_PER_BLOCK; column++) {
                const label = document.createElement('div');
                label.className = 'seat-axis-label';
                label.textContent = column;
                grid.appendChild(label);
            }

            for (let row = 1; row <= SEAT_ROWS_PER_BLOCK; row++) {
                const rowLabel = document.createElement('div');
                rowLabel.className = `seat-axis-label row-label row-${row}`;
                rowLabel.textContent = row;
                grid.appendChild(rowLabel);

                for (let column = 1; column <= SEAT_COLUMNS_PER_BLOCK; column++) {
                    const seatId = getSeatLabel(blockName, row, column);
                    const seat = document.createElement('div');
                    seat.className = `seat row-${row}`;
                    seat.dataset.index = seatId;
                    seat.textContent = seatId;
                    seat.setAttribute('role', 'button');
                    seat.setAttribute('tabindex', '0');
                    seat.setAttribute('aria-label', `Seat ${seatId}`);
                    seat.setAttribute('aria-pressed', 'false');

                    const lockStatus = seatStatuses.get(seatId);
                    if (lockStatus) {
                        seat.classList.add(lockStatus === 'confirmed' ? 'taken' : 'pending');
                        seat.setAttribute('aria-disabled', 'true');
                        seat.setAttribute('title', lockStatus === 'confirmed' ? 'Reserved' : 'Pending payment verification');
                    } else if (savedSeats && savedSeats.has(seatId)) {
                        seat.classList.add('selected');
                        seat.setAttribute('aria-pressed', 'true');
                    }

                    seat.addEventListener('click', function () {
                        if (this.classList.contains('taken') || this.classList.contains('pending')) return;
                        this.classList.toggle('selected');
                        this.setAttribute('aria-pressed', this.classList.contains('selected'));
                        onSeatChange();
                    });
                    seat.addEventListener('keydown', function (e) {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            this.click();
                        }
                    });

                    grid.appendChild(seat);
                }
            }

            block.appendChild(grid);
            map.appendChild(block);
        });

        fragment.appendChild(map);
        container.appendChild(fragment);
    }

    function updateSeat(movieKey) {
        const selectedEls = document.querySelectorAll(".seat.selected");
        const selectedCount = selectedEls.length;
        const countEl = document.getElementById("count");
        const totalEl = document.getElementById("total");
        
        // Use selected showtime price if available, otherwise default to 200
        const price = (window.selectedShowtime && window.selectedShowtime.price) ? window.selectedShowtime.price : 200;
        
        if (countEl) countEl.innerText = selectedCount;
        if (totalEl) totalEl.innerText = selectedCount * price;

        // persist selected seats per movie
        if (movieKey) {
            const set = new Set(Array.from(selectedEls).map(el => normalizeSeatId(el.dataset.index)));
            saveSelectedSeats(movieKey, set);
        }
    }

    // --- Movie details ---
    function renderMovieDetails() {
        const movieTitle = localStorage.getItem("movie");
        if (!movieTitle) return;

        const titleEl = document.getElementById("title");
        const yearEl = document.getElementById("year");
        const genreEl = document.getElementById("genre");
        const synopsisEl = document.getElementById("synopsis");
        const posterEl = document.getElementById("poster");

        // Use admin-managed movies if available
        let moviesToSearch = getMovieSource();

        if (typeof moviesToSearch !== "undefined" && Array.isArray(moviesToSearch)) {
            const selected = moviesToSearch.find(m => m.title === movieTitle) ||
                moviesToSearch.find(m => m.title && m.title.toLowerCase() === movieTitle.toLowerCase());

            if (selected) {
                // ensure poster and synopsis are shown
                if (titleEl) titleEl.textContent = selected.title || movieTitle;
                if (yearEl) yearEl.textContent = selected.year ? `Year: ${selected.year}` : '';
                if (genreEl) genreEl.textContent = selected.genre ? `Genre: ${selected.genre}` : '';
                if (synopsisEl) synopsisEl.textContent = selected.synopsis || '';

                if (posterEl) {
                    posterEl.src = selected.poster || PLACEHOLDER_POSTER;
                    posterEl.onerror = function () {
                        posterEl.onerror = null;
                        posterEl.src = PLACEHOLDER_POSTER;
                    };
                }

                const movieKey = toFileName(selected.title || movieTitle) || movieTitle;
                createSeats(movieKey);
                // Load showtimes for this movie
                loadShowtimesForMovie(selected.title || movieTitle);
                return;
            }
        }

        if (titleEl) titleEl.textContent = movieTitle;
        if (synopsisEl) synopsisEl.textContent = '';
        if (posterEl) posterEl.src = PLACEHOLDER_POSTER;
        createSeats(); // fallback
        loadShowtimesForMovie(movieTitle);
    }

    // --- Showtime & Theater Selection ---
    function getAvailableSeatsForShowtime(showtimeId) {
        const reservations = JSON.parse(localStorage.getItem(LS_RESERVATIONS) || '[]');
        const bookedSeats = new Set();
        const totalSeats = THEATER_LAYOUT_SEATS;

        reservations.forEach(booking => {
            if (booking.showtime && (booking.showtime.id == showtimeId || String(booking.showtime.id) === String(showtimeId)) &&
                BLOCKING_SEAT_STATUSES.has(booking.status)) {
                booking.seats.forEach(seat => bookedSeats.add(normalizeSeatId(seat)));
            }
        });

        return Math.max(totalSeats - bookedSeats.size, 0);
    }
    
    function loadShowtimesForMovie(movieTitle) {
        // Get all showtimes and theaters
        const showtimes = JSON.parse(localStorage.getItem('cinebook:admin:showtimes') || '[]');
        const theaters = JSON.parse(localStorage.getItem('cinebook:admin:theaters') || '[]');
        
        const movieShowtimes = showtimes.filter(s => ((s.movie || s.movieTitle || '').toLowerCase() === movieTitle.toLowerCase()));
        
        // Show theater section
        document.getElementById('theaterSection').style.display = 'block';
        document.getElementById('timeSection').style.display = 'none';
        document.getElementById('selectedShowtimeInfo').style.display = 'none';
        document.getElementById('seatSection').style.display = 'none';
        
        const theatersContainer = document.getElementById('theatersContainer');
        if (!theatersContainer) return;
        
        if (theaters.length === 0) {
            theatersContainer.innerHTML = '<p style="color: #999; grid-column: 1 / -1;">No theaters available.</p>';
            return;
        }
        
        // Display all theaters
        theatersContainer.innerHTML = theaters.map(theater => {
            // Find showtimes for this theater and movie
            const theaterShowtimes = movieShowtimes.filter(s => s.theaterId == theater.id || String(s.theaterId) === String(theater.id));
            const hasShowtime = theaterShowtimes.length > 0;
            
            if (!hasShowtime) {
                // Theater has no showtime for this movie - show disabled
                return `
                    <div style="padding: 20px; background: rgba(100, 100, 100, 0.15); border: 2px solid #555; border-radius: 8px; cursor: not-allowed; opacity: 0.5; text-align: center;">
                        <p style="margin: 0 0 8px 0; font-weight: 600; font-size: 18px; color: #999;">${theater.name}</p>
                        <p style="margin: 0 0 5px 0; font-size: 14px; color: #777;">No showtimes</p>
                        <p style="margin: 0; font-size: 12px; color: #999;">₱${theater.seatPrice || 200}/seat</p>
                    </div>
                `;
            }
            
            // Theater has showtimes - show as clickable
            return `
                <div class="theater-card" data-theater-id="${theater.id}" data-theater-name="${encodeURIComponent(theater.name)}" data-theater-price="${theater.seatPrice || 200}" style="padding: 20px; background: rgba(229, 9, 20, 0.1); border: 2px solid #e50914; border-radius: 8px; cursor: pointer; transition: all 200ms ease; text-align: center;" onmouseover="this.style.background='rgba(229, 9, 20, 0.2)'" onmouseout="this.style.background='rgba(229, 9, 20, 0.1)'">
                    <p style="margin: 0 0 8px 0; font-weight: 600; font-size: 18px; color: #e50914;">${theater.name}</p>
                    <p style="margin: 0 0 5px 0; font-size: 14px; color: #4caf50;">Available</p>
                    <p style="margin: 0; font-size: 12px; color: #999;">₱${theater.seatPrice || 200}/seat</p>
                </div>
            `;
        }).join('');

        // Add click handlers to theater cards
        document.querySelectorAll('.theater-card').forEach(card => {
            card.addEventListener('click', function () {
                const theaterId = this.dataset.theaterId;
                const theaterName = decodeURIComponent(this.dataset.theaterName);
                const theaterPrice = Number(this.dataset.theaterPrice);
                loadTimeSlotsForTheater(movieTitle, theaterId, theaterName, theaterPrice, movieShowtimes);
            });
        });
    }

    function loadTimeSlotsForTheater(movieTitle, theaterId, theaterName, theaterPrice, movieShowtimes) {
        // Filter showtimes for this theater
        const theaterShowtimes = movieShowtimes.filter(s => s.theaterId == theaterId || String(s.theaterId) === String(theaterId));
        
        // Show time section
        document.getElementById('timeSection').style.display = 'block';
        document.getElementById('selectedShowtimeInfo').style.display = 'none';
        document.getElementById('seatSection').style.display = 'none';
        document.getElementById('selectedTheaterDisplayText').textContent = theaterName;
        
        const timeSlotsContainer = document.getElementById('timeSlotsContainer');
        if (!timeSlotsContainer) return;
        
        if (theaterShowtimes.length === 0) {
            timeSlotsContainer.innerHTML = '<p style="color: #999; grid-column: 1 / -1;">No time slots available for this theater.</p>';
            return;
        }
        
        // Display time slots
        timeSlotsContainer.innerHTML = theaterShowtimes.map(showtime => {
            const availableSeats = getAvailableSeatsForShowtime(showtime.id);
            const isFull = availableSeats === 0;
            
            return `
                <div class="time-card" data-showtime-id="${showtime.id}" data-showtime-date="${showtime.date}" data-showtime-time="${showtime.time}" data-available-seats="${availableSeats}" style="padding: 20px; background: ${isFull ? 'rgba(100, 100, 100, 0.2)' : 'rgba(229, 9, 20, 0.1)'}; border: 2px solid ${isFull ? '#666' : '#e50914'}; border-radius: 8px; cursor: ${isFull ? 'not-allowed' : 'pointer'}; transition: all 200ms ease; opacity: ${isFull ? 0.6 : 1}; text-align: center;" onmouseover="this.style.background='${isFull ? 'rgba(100, 100, 100, 0.2)' : 'rgba(229, 9, 20, 0.2)'}'" onmouseout="this.style.background='${isFull ? 'rgba(100, 100, 100, 0.2)' : 'rgba(229, 9, 20, 0.1)'}'">
                    <p style="margin: 0 0 8px 0; font-weight: 600; font-size: 16px; color: ${isFull ? '#999' : '#e50914'};">${showtime.time}</p>
                    <p style="margin: 0 0 5px 0; font-size: 12px; color: #999;">${showtime.date}</p>
                    <p style="margin: 0; font-size: 12px; color: ${isFull ? '#ff6b6b' : '#4caf50'}; font-weight: 600;">${isFull ? 'FULLY BOOKED' : `${availableSeats} seats`}</p>
                </div>
            `;
        }).join('');

        // Add click handlers to time cards
        document.querySelectorAll('.time-card').forEach(card => {
            if (card.style.cursor !== 'not-allowed') {
                card.addEventListener('click', function () {
                    selectShowtime(
                        this.dataset.showtimeId,
                        movieTitle,
                        theaterName,
                        theaterPrice,
                        `${this.dataset.showtimeDate} ${this.dataset.showtimeTime}`,
                        Number(this.dataset.availableSeats),
                        theaterId
                    );
                });
            }
        });

        // Scroll to time section
        document.getElementById('timeSection').scrollIntoView({ behavior: 'smooth' });
    }

    function selectShowtime(showtimeId, movieTitle, theaterName, price, dateTime, availableSeats, theaterId) {
        window.selectedShowtime = {
            id: showtimeId,
            movie: movieTitle,
            theater: theaterName,
            theaterId: theaterId,
            price: price,
            dateTime: dateTime,
            availableSeats: availableSeats
        };
        
        // Show selected showtime info
        document.getElementById('selectedTheaterText').textContent = theaterName;
        document.getElementById('selectedShowtimeText').textContent = dateTime;
        document.getElementById('selectedPriceText').textContent = price;
        document.getElementById('selectedShowtimeInfo').style.display = 'block';
        
        // Show seat section
        document.getElementById('seatSection').style.display = 'block';
        createSeatsForShowtime(showtimeId);
        
        // Scroll to seats
        document.getElementById('seatSection').scrollIntoView({ behavior: 'smooth' });
    }
    
    function createSeatsForShowtime(showtimeId) {
        const container = document.getElementById('seatContainer');
        if (!container) return;
        container.innerHTML = '';

        const reservations = JSON.parse(localStorage.getItem(LS_RESERVATIONS) || '[]');
        const seatStatuses = new Map();

        reservations.forEach(booking => {
            if (booking.showtime && (booking.showtime.id == showtimeId || String(booking.showtime.id) === String(showtimeId)) &&
                BLOCKING_SEAT_STATUSES.has(booking.status)) {
                const lockStatus = getSeatLockStatus(booking.status);
                booking.seats.forEach(seat => seatStatuses.set(normalizeSeatId(seat), lockStatus));
            }
        });

        renderSeatMap(container, seatStatuses, null, () => updateSeatForShowtime(showtimeId));
        updateSeatForShowtime(showtimeId);
    }
    
    function updateSeatForShowtime(showtimeId) {
        const selectedEls = document.querySelectorAll('.seat.selected');
        const selectedCount = selectedEls.length;
        const countEl = document.getElementById('count');
        const totalEl = document.getElementById('total');
        
        // Use selected showtime price
        const price = (window.selectedShowtime && window.selectedShowtime.price) ? window.selectedShowtime.price : 200;
        
        if (countEl) countEl.innerText = selectedCount;
        if (totalEl) totalEl.innerText = selectedCount * price;
        
        // Check if exceeding available seats
        if (selectedCount > window.selectedShowtime.availableSeats) {
            alert(`Only ${window.selectedShowtime.availableSeats} seats available for this showtime!`);
            return;
        }
    }

    // --- Movie list rendering (safer, better perf) ---
    function displayMovies(list = getMovieSource()) {
        const container = document.getElementById("movieList");
        if (!container) return;
        container.innerHTML = '';

        // Use admin-managed movies if available, otherwise use provided list
        let moviesToDisplay = list;
        if (!moviesToDisplay || moviesToDisplay.length === 0) {
            try {
                const adminMovies = getAdminMovies();
                moviesToDisplay = adminMovies && adminMovies.length > 0 ? adminMovies : getDefaultMovies();
            } catch {
                moviesToDisplay = getDefaultMovies();
            }
        }

        // Use fragment + elements to avoid innerHTML XSS/perf issues
        const frag = document.createDocumentFragment();
        (moviesToDisplay || []).forEach(m => {
            const movieDiv = document.createElement('div');
            movieDiv.className = 'movie';
            movieDiv.dataset.title = m.title || '';

            const posterImg = document.createElement('img');
            posterImg.className = 'movie-image';
            posterImg.src = m.poster || PLACEHOLDER_POSTER;
            posterImg.alt = `${m.title} poster`;
            posterImg.onerror = function () {
                posterImg.onerror = null;
                posterImg.src = PLACEHOLDER_POSTER;
            };

            const titleP = document.createElement('p');
            titleP.className = 'movie-title';
            titleP.textContent = m.title || '';
            if (m.year) titleP.textContent += ` (${m.year})`;

            const genreP = document.createElement('p');
            genreP.className = 'movie-genre';
            genreP.textContent = m.genre || '';

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'view-btn';
            btn.dataset.title = m.title || '';
            btn.textContent = 'View';

            movieDiv.appendChild(posterImg);
            movieDiv.appendChild(titleP);
            movieDiv.appendChild(genreP);
            movieDiv.appendChild(btn);
            frag.appendChild(movieDiv);
        });

        container.appendChild(frag);

        // Event delegation for view buttons
        container.removeEventListener('click', handleMovieListClick);
        container.addEventListener('click', handleMovieListClick);
    }

    function handleMovieListClick(e) {
        const movieCard = e.target.closest && e.target.closest('.movie');
        if (!movieCard) return;
        const title = movieCard.dataset.title;
        if (title) openMovie(title);
    }

    function populateGenreFilter() {
        const select = document.getElementById('genreFilter');
        if (!select) return;
        
        const moviesToFilter = getMovieSource();
        
        const genreSet = new Set();
        (moviesToFilter || []).forEach(m => {
            if (!m.genre) return;
            m.genre.split(',').forEach(g => {
                const t = g.trim();
                if (t) genreSet.add(t);
            });
        });
        select.innerHTML = '';
        const allOpt = document.createElement('option');
        allOpt.value = 'All';
        allOpt.textContent = 'All Genres';
        select.appendChild(allOpt);
        Array.from(genreSet).sort((a, b) => a.localeCompare(b)).forEach(genre => {
            const opt = document.createElement('option');
            opt.value = genre;
            opt.textContent = genre;
            select.appendChild(opt);
        });
    }

    function filterGenre() {
        const select = document.getElementById('genreFilter');
        if (!select) return;
        const genre = select.value;
        
        const allMoviesList = getMovieSource();
        
        if (!genre || genre === "All") {
            displayMovies(allMoviesList);
            return;
        }
        const filtered = (allMoviesList || []).filter(m => {
            if (!m.genre) return false;
            const parts = m.genre.split(',').map(p => p.trim().toLowerCase());
            return parts.includes(genre.toLowerCase());
        });
        displayMovies(filtered);
    }

    // Debounced search handler
    function searchMovie() {
        const input = document.getElementById("search");
        if (!input) return;
        const value = input.value.trim().toLowerCase();
        
        const allMoviesList = getMovieSource();
        
        if (!value) {
            displayMovies(allMoviesList);
            return;
        }
        const filtered = (allMoviesList || []).filter(m => (m.title || '').toLowerCase().includes(value));
        displayMovies(filtered);
    }

    // --- Auth (kept simple, namespaced keys) ---
    function getPasswordStrength(password) {
        let score = 0;
        if (password.length >= 8) score++;
        if (/[a-z]/.test(password)) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;

        if (!password) return { score: 0, label: 'Password strength', className: '' };
        if (score <= 2) return { score, label: 'Weak password', className: 'weak' };
        if (score <= 4) return { score, label: 'Medium password', className: 'medium' };
        return { score, label: 'Strong password', className: 'strong' };
    }

    function updatePasswordStrength() {
        const passEl = document.getElementById("password");
        const meter = document.getElementById("passwordStrength");
        const hint = document.getElementById("passwordHint");
        if (!passEl || !meter || !hint) return;

        const result = getPasswordStrength(passEl.value);
        meter.className = `password-strength ${result.className}`.trim();
        hint.textContent = result.label === 'Strong password'
            ? 'Strong password. Good choice.'
            : 'Use at least 8 characters with uppercase, lowercase, number, and symbol.';
    }

    function togglePasswordVisibility(inputId, button) {
        const input = document.getElementById(inputId);
        if (!input) return;
        const isHidden = input.type === 'password';
        input.type = isHidden ? 'text' : 'password';
        if (button) button.textContent = isHidden ? 'Hide' : 'Show';
    }

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email || '').trim());
    }

    function createOtp() {
        return String(Math.floor(100000 + Math.random() * 900000));
    }

    function setMessage(elementId, message, type = '') {
        const messageEl = document.getElementById(elementId);
        if (!messageEl) return;
        messageEl.textContent = message;
        messageEl.className = `auth-message ${type}`.trim();
    }

    function setButtonBusy(buttonId, busy, label) {
        const button = document.getElementById(buttonId);
        if (!button) return;
        button.disabled = busy;
        if (label) button.textContent = label;
    }

    async function sendOtpEmail(email, otp, purpose) {
        const purposeText = purpose === 'password_reset' ? 'password reset' : 'account verification';
        return sendCineBookEmail({
            id: Date.now(),
            to: email,
            subject: `CineBook ${purposeText} code`,
            body: `
Dear CineBook user,

Your ${purposeText} code is:

${otp}

This code expires in 10 minutes. If you did not request this, you can ignore this email.

Thank you!
CineBook Admin
            `,
            sentAt: new Date().toLocaleString(),
            status: 'queued',
            type: purpose,
            email
        });
    }

    async function register() {
        const userEl = document.getElementById("username");
        const emailEl = document.getElementById("email");
        const passEl = document.getElementById("password");
        const otpEl = document.getElementById("emailOtp");
        const termsEl = document.getElementById("termsAgree");
        const messageEl = document.getElementById("registerMessage");
        if (!userEl || !passEl) return;
        const user = userEl.value.trim();
        const email = emailEl ? emailEl.value.trim().toLowerCase() : '';
        const pass = passEl.value;
        const otp = otpEl ? otpEl.value.trim() : '';

        if (messageEl) messageEl.textContent = '';
        if (!user) {
            setMessage('registerMessage', 'Please enter a username.', 'error');
            return;
        }

        if (!isValidEmail(email)) {
            setMessage('registerMessage', 'Please enter a valid email address so we can send booking details.', 'error');
            return;
        }

        if (termsEl && !termsEl.checked) {
            if (messageEl) messageEl.textContent = 'Please agree to the Terms of Use and Privacy Policy before registering.';
            else alert('Please agree to the Terms of Use and Privacy Policy before registering.');
            return;
        }

        if (getPasswordStrength(pass).score < 4) {
            if (messageEl) messageEl.textContent = 'Please create a stronger password before registering.';
            else alert('Please create a stronger password before registering.');
            updatePasswordStrength();
            return;
        }

        const pending = JSON.parse(sessionStorage.getItem('cinebook:pendingRegistration') || 'null');
        const now = Date.now();
        if (!pending || pending.email !== email || pending.username !== user || now > pending.expiresAt) {
            const nextOtp = createOtp();
            const nextPending = {
                username: user,
                email,
                otp: nextOtp,
                expiresAt: now + (10 * 60 * 1000)
            };

            setButtonBusy('registerSubmit', true, 'Sending code...');
            const sent = await sendOtpEmail(email, nextOtp, 'email_verification');
            setButtonBusy('registerSubmit', false, 'Verify & Register');

            if (!sent) {
                const reason = getLastEmailError();
                setMessage('registerMessage', `Could not send the OTP${reason ? `: ${reason}` : '. Check your Resend setup in Vercel, then try again.'}`, 'error');
                return;
            }

            sessionStorage.setItem('cinebook:pendingRegistration', JSON.stringify(nextPending));
            const otpGroup = document.getElementById('otpGroup');
            if (otpGroup) otpGroup.style.display = 'block';
            setMessage('registerMessage', 'We sent a 6-digit verification code to your email.', 'success');
            return;
        }

        if (otp !== pending.otp) {
            const otpGroup = document.getElementById('otpGroup');
            if (otpGroup) otpGroup.style.display = 'block';
            setMessage('registerMessage', 'Invalid verification code. Please check your email and try again.', 'error');
            return;
        }

        localStorage.setItem(LS_USER, user);
        localStorage.setItem(LS_PASS, pass);
        localStorage.setItem(LS_EMAIL, email);
        localStorage.setItem(LS_EMAIL_VERIFIED, 'true');
        localStorage.setItem(LS_PREFIX + 'memberSince', new Date().toLocaleDateString());
        sessionStorage.removeItem('cinebook:pendingRegistration');
        alert("Registered!");
        location.href = "login.html";
    }

    function login() {
        const userEl = document.getElementById("username");
        const passEl = document.getElementById("password");
        if (!userEl || !passEl) return;
        const user = userEl.value;
        const pass = passEl.value;

        if (isDefaultAdminCredential(user, pass)) {
            startAdminSession(user);
            alert("Admin login success!");
            location.href = "admin-dashboard.html";
        } else if (user === localStorage.getItem(LS_USER) &&
            pass === localStorage.getItem(LS_PASS) &&
            localStorage.getItem(LS_EMAIL_VERIFIED) === 'true') {
            localStorage.setItem(LS_LOGGED, "true");
            alert("Login Success!");
            location.href = "index.html";
        } else if (user === localStorage.getItem(LS_USER) && localStorage.getItem(LS_EMAIL_VERIFIED) !== 'true') {
            alert("Please verify your email before logging in.");
        } else {
            alert("Invalid login");
        }
    }

    function toggleForgotPassword() {
        const panel = document.getElementById('forgotPanel');
        if (!panel) return;
        panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
        setMessage('forgotMessage', '');
    }

    async function requestPasswordReset() {
        const emailEl = document.getElementById('resetEmail');
        const email = emailEl ? emailEl.value.trim().toLowerCase() : '';
        const savedEmail = (localStorage.getItem(LS_EMAIL) || '').toLowerCase();

        if (!isValidEmail(email)) {
            setMessage('forgotMessage', 'Enter the verified email for your account.', 'error');
            return;
        }

        if (!savedEmail || email !== savedEmail) {
            setMessage('forgotMessage', 'That email does not match an existing verified CineBook account on this browser.', 'error');
            return;
        }

        const otp = createOtp();
        sessionStorage.setItem('cinebook:passwordReset', JSON.stringify({
            email,
            otp,
            expiresAt: Date.now() + (10 * 60 * 1000)
        }));

        setButtonBusy('resetSendBtn', true, 'Sending...');
        const sent = await sendOtpEmail(email, otp, 'password_reset');
        setButtonBusy('resetSendBtn', false, 'Send Reset Code');

        if (!sent) {
            const reason = getLastEmailError();
            setMessage('forgotMessage', `Could not send reset code${reason ? `: ${reason}` : '. Check your Resend setup in Vercel, then try again.'}`, 'error');
            return;
        }

        const resetFields = document.getElementById('resetFields');
        if (resetFields) resetFields.style.display = 'block';
        setMessage('forgotMessage', 'Reset code sent. Enter it below with your new password.', 'success');
    }

    function resetPasswordWithOtp() {
        const otp = (document.getElementById('resetOtp')?.value || '').trim();
        const newPassword = document.getElementById('newPassword')?.value || '';
        const pending = JSON.parse(sessionStorage.getItem('cinebook:passwordReset') || 'null');

        if (!pending || Date.now() > pending.expiresAt) {
            setMessage('forgotMessage', 'Reset code expired. Please request a new one.', 'error');
            return;
        }

        if (otp !== pending.otp) {
            setMessage('forgotMessage', 'Invalid reset code.', 'error');
            return;
        }

        if (getPasswordStrength(newPassword).score < 4) {
            setMessage('forgotMessage', 'Please choose a stronger new password.', 'error');
            return;
        }

        localStorage.setItem(LS_PASS, newPassword);
        sessionStorage.removeItem('cinebook:passwordReset');
        setMessage('forgotMessage', 'Password updated. You can now log in.', 'success');
    }

    function updateUserMenu() {
        const isLogged = localStorage.getItem(LS_LOGGED) === "true";
        const loginBtn = document.getElementById("loginBtn");
        const registerBtn = document.getElementById("registerBtn");
        const dashboardBtn = document.getElementById("dashboardBtn");
        const logoutBtn = document.getElementById("logoutBtn");

        if (isLogged) {
            if (loginBtn) loginBtn.style.display = "none";
            if (registerBtn) registerBtn.style.display = "none";
            if (dashboardBtn) dashboardBtn.style.display = "inline-block";
            if (logoutBtn) logoutBtn.style.display = "inline-block";
        } else {
            if (loginBtn) loginBtn.style.display = "inline-block";
            if (registerBtn) registerBtn.style.display = "inline-block";
            if (dashboardBtn) dashboardBtn.style.display = "none";
            if (logoutBtn) logoutBtn.style.display = "none";
        }
    }

    function logoutUser() {
        if (confirm("Are you sure you want to logout?")) {
            localStorage.removeItem(LS_LOGGED);
            location.href = "index.html";
        }
    }

    function confirmBooking() {
        if (localStorage.getItem(LS_LOGGED) !== "true") {
            alert("Login first!");
            location.href = "login.html";
            return;
        }
        const selectedSeats = document.querySelectorAll('.seat.selected').length;
        if (selectedSeats === 0) {
            alert('Please select at least one seat.');
            return;
        }
        
        // Require showtime selection
        if (!window.selectedShowtime) {
            alert('Please select a showtime first.');
            return;
        }

        // Create PENDING booking (payment required)
        const movieTitle = localStorage.getItem("movie");
        const seatEls = Array.from(document.querySelectorAll('.seat.selected'));
        const seatNumbers = seatEls.map(el => normalizeSeatId(el.dataset.index));
        
        // Use selected showtime price
        const price = window.selectedShowtime.price;
        const totalPrice = seatNumbers.length * price;
        const bookingId = Date.now();
        
        const booking = {
            id: bookingId,
            movie: movieTitle,
            seats: seatNumbers,
            price: totalPrice,
            pricePerSeat: price,
            createdAt: new Date().toLocaleString(),
            paymentDeadline: Date.now() + (30 * 60 * 1000), // 30 minutes from now
            status: 'pending', // pending payment
            username: localStorage.getItem(LS_USER),
            // Showtime information (specific to theater + time combination)
            showtime: {
                id: window.selectedShowtime.id,
                theater: window.selectedShowtime.theater,
                theaterId: window.selectedShowtime.theaterId,
                date: window.selectedShowtime.dateTime.split(' ')[0],
                time: window.selectedShowtime.dateTime.split(' ')[1] || '',
                dateTime: window.selectedShowtime.dateTime
            }
        };

        // Save to reservations
        const reservations = JSON.parse(localStorage.getItem(LS_RESERVATIONS) || '[]');
        reservations.push(booking);
        localStorage.setItem(LS_RESERVATIONS, JSON.stringify(reservations));
        localStorage.setItem('cinebook:pendingBookingId', bookingId);

        alert(`Reservation Created! (Booking ID: #${bookingId})\n\nOpen your dashboard to view payment instructions and upload your receipt.\n\nYour seats are confirmed only after admin approval.`);
        location.href = "dashboard.html";
    }

    function sendEmailNotification(booking) {
        return false;
    }

    function sendPaymentSubmittedEmail(booking, submission) {
        return false;
    }

    // Show login popover (keeps signature expected by index.html). Simple redirect for now.
    function showLoginPopover(anchor) {
        // anchor parameter kept for compatibility with existing markup
        // Replace with a UI popover/modal if desired.
        location.href = "login.html";
    }

    // --- Slider ---
    const images = ["movie1.jpg", "movie2.jpg", "movie3.jpg"];
    let sliderIndex = 0;
    function showSlide(index) {
        sliderIndex = (index + images.length) % images.length;
        const slide = document.getElementById("slide");
        if (slide) slide.src = images[sliderIndex];
    }
    function changeSlide() {
        showSlide(sliderIndex + 1);
    }
    function nextSlide() {
        showSlide(sliderIndex + 1);
    }
    function previousSlide() {
        showSlide(sliderIndex - 1);
    }
    setInterval(changeSlide, 3000);

    // Public-facing openMovie kept to preserve inline calls in markup (backwards compatible)
    function openMovie(name) {
        localStorage.setItem("movie", name);
        location.href = "movie.html";
    }

    // --- Dashboard Functions ---
    function initDashboard() {
        const username = localStorage.getItem(LS_USER);
        const profileUsername = document.getElementById('profileUsername');
        if (profileUsername) profileUsername.textContent = username || 'Guest User';
        const profileEmail = document.getElementById('profileEmail');
        if (profileEmail) profileEmail.textContent = localStorage.getItem(LS_EMAIL) || 'No verified email';

        // Update stats
        const reservations = JSON.parse(localStorage.getItem(LS_PREFIX + 'reservations') || '[]');
        const payments = JSON.parse(localStorage.getItem(LS_PREFIX + 'payments') || '[]');
        
        if (document.getElementById('totalBookings')) {
            document.getElementById('totalBookings').textContent = reservations.length;
        }
        if (document.getElementById('upcomingMovies')) {
            document.getElementById('upcomingMovies').textContent = Math.max(0, reservations.length - 1);
        }
        if (document.getElementById('totalSpent')) {
            const total = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
            document.getElementById('totalSpent').textContent = total;
        }
        if (document.getElementById('watchedMovies')) {
            document.getElementById('watchedMovies').textContent = Math.max(0, reservations.length - Math.max(0, reservations.length - 1));
        }

        // Set member since date
        const memberSince = localStorage.getItem(LS_PREFIX + 'memberSince') || new Date().toLocaleDateString();
        if (!localStorage.getItem(LS_PREFIX + 'memberSince')) {
            localStorage.setItem(LS_PREFIX + 'memberSince', memberSince);
        }
        const profileMemberSince = document.getElementById('profileMemberSince');
        if (profileMemberSince) profileMemberSince.textContent = memberSince;

        // Load recent reservations
        loadTabContent('overview');
    }

    function getReservationStatusClass(status) {
        if (status === 'confirmed') return 'status-confirmed';
        if (status === 'payment_rejected' || status === 'payment_expired' || status === 'cancelled') return 'status-cancelled';
        return 'status-pending';
    }

    function getPaymentInstructions(res) {
        if (res.status !== 'pending' && res.status !== 'payment_rejected') return '';
        return `
            <div class="payment-note">
                <strong>Payment instructions:</strong><br>
                Send PHP ${res.price} to GCash +63 912 345 6789 under CineBook Demo. After sending, click Pay / Upload Receipt and submit your GCash reference number, sender name, and screenshot receipt. Seats are blocked while payment or admin verification is pending.
            </div>
        `;
    }

    function formatReservationSeats(res) {
        if (Array.isArray(res.seats)) return res.seats.length ? res.seats.map(normalizeSeatId).join(', ') : 'No seats recorded';
        if (typeof res.seats === 'string') {
            const raw = res.seats.trim();
            if (!raw) return 'No seats recorded';
            try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) return parsed.length ? parsed.map(normalizeSeatId).join(', ') : 'No seats recorded';
            } catch {
                // Keep plain strings such as "A11, A12".
            }
            return raw;
        }
        return 'No seats recorded';
    }

    function formatCurrency(value) {
        const amount = Number(value || 0);
        return `PHP ${amount.toLocaleString('en-PH')}`;
    }

    function getReservations() {
        try {
            const reservations = JSON.parse(localStorage.getItem(LS_PREFIX + 'reservations') || '[]');
            return Array.isArray(reservations) ? reservations : [];
        } catch {
            return [];
        }
    }

    function inlineReservationId(resId) {
        return escapeHtml(JSON.stringify(String(resId ?? '')));
    }

    function closeReservationDetails() {
        const modal = document.getElementById('reservationDetailsModal');
        if (modal) modal.remove();
    }

    function viewReservationDetails(resId) {
        const reservations = getReservations();
        const reservation = reservations.find(item => String(item.id) === String(resId));
        if (!reservation) {
            alert('Reservation details were not found.');
            return;
        }

        closeReservationDetails();

        const showtime = reservation.showtime || {};
        const details = [
            ['Reservation ID', reservation.id],
            ['Movie', reservation.movie],
            ['Seats Availed', formatReservationSeats(reservation)],
            ['Theater', showtime.theater || reservation.theater || 'Not recorded'],
            ['Showtime', showtime.dateTime || reservation.showtimeText || 'Not recorded'],
            ['Status', String(reservation.status || 'pending').replace(/_/g, ' ')],
            ['Total Amount', formatCurrency(reservation.price)],
            ['Price Per Seat', formatCurrency(reservation.pricePerSeat)],
            ['Booked On', reservation.createdAt || reservation.date || 'Not recorded'],
            ['Payment Deadline', reservation.paymentDeadline || 'Not recorded'],
            ['Paid On', reservation.paidAt || 'Not yet confirmed']
        ];

        if (reservation.referenceNumber) details.push(['Payment Reference', reservation.referenceNumber]);
        if (reservation.senderName) details.push(['Sender Name', reservation.senderName]);
        if (reservation.rejectionReason) details.push(['Admin Note', reservation.rejectionReason]);

        const modal = document.createElement('div');
        modal.id = 'reservationDetailsModal';
        modal.className = 'reservation-details-modal';
        modal.innerHTML = `
            <div class="reservation-details-dialog" role="dialog" aria-modal="true" aria-labelledby="reservationDetailsTitle">
                <button class="reservation-details-close" type="button" onclick="closeReservationDetails()" aria-label="Close reservation details">x</button>
                <div class="card-title">Reservation Details</div>
                <h2 id="reservationDetailsTitle">${escapeHtml(reservation.movie || 'CineBook Reservation')}</h2>
                <div class="reservation-detail-grid">
                    ${details.map(([label, value]) => `
                        <div class="reservation-detail-item">
                            <span>${escapeHtml(label)}</span>
                            <strong>${escapeHtml(value)}</strong>
                        </div>
                    `).join('')}
                </div>
                <div class="button-group reservation-details-actions">
                    <button class="btn-primary" type="button" onclick="closeReservationDetails()">Close</button>
                </div>
            </div>
        `;
        modal.addEventListener('click', event => {
            if (event.target === modal) closeReservationDetails();
        });
        document.body.appendChild(modal);
    }

    function getReservationAction(res) {
        const detailsButton = `<button class="btn-primary" onclick="viewReservationDetails(${inlineReservationId(res.id)})">View Details</button>`;
        if (res.status === 'pending' || res.status === 'payment_rejected') {
            return `${detailsButton}<button class="btn-primary" onclick="payReservation(${inlineReservationId(res.id)})">Pay / Upload Receipt</button>`;
        }
        if (res.status === 'payment_pending_review') {
            return `${detailsButton}<button class="btn-primary" disabled>Receipt Under Review</button>`;
        }
        return detailsButton;
    }

    function payReservation(resId) {
        localStorage.setItem('cinebook:pendingBookingId', resId);
        location.href = 'payment-submit.html';
    }

    function renderReservationCard(res, options = {}) {
        const status = String(res.status || 'pending');
        return `
            <div class="card">
                <div class="card-title">Reservation</div>
                <div class="movie-title">${escapeHtml(res.movie || 'Untitled movie')}</div>
                <div class="movie-details"><strong>Seats Availed:</strong> ${escapeHtml(formatReservationSeats(res))}</div>
                ${res.showtime ? `<div class="movie-details"><strong>Theater:</strong> ${escapeHtml(res.showtime.theater || 'Not recorded')}</div>` : ''}
                ${res.showtime ? `<div class="movie-details"><strong>Showtime:</strong> ${escapeHtml(res.showtime.dateTime || 'Not recorded')}</div>` : ''}
                <div class="price">PHP ${escapeHtml(Number(res.price || 0).toLocaleString('en-PH'))}</div>
                <span class="status-badge ${getReservationStatusClass(status)}">${escapeHtml(status.replace(/_/g, ' '))}</span>
                ${getPaymentInstructions(res)}
                <div class="button-group">
                    ${getReservationAction(res)}
                    ${options.allowCancel && status !== 'confirmed' ? `<button class="btn-danger" onclick="cancelReservation(${inlineReservationId(res.id)})">Cancel</button>` : ''}
                </div>
            </div>
        `;
    }

    function loadTabContent(tabName) {
        const reservations = getReservations();
        const payments = JSON.parse(localStorage.getItem(LS_PREFIX + 'payments') || '[]');

        if (tabName === 'overview') {
            const recentRes = document.getElementById('recentReservations');
            if (!recentRes) return;
            if (reservations.length === 0) {
                recentRes.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">No records</div>
                        <p>No reservations yet. Start booking movies!</p>
                    </div>
                `;
            } else {
                recentRes.innerHTML = reservations.slice(-3).reverse().map(res => renderReservationCard(res)).join('');
            }
            return;
        }

        if (tabName === 'reservations') {
            const resList = document.getElementById('reservationsList');
            if (!resList) return;
            if (reservations.length === 0) {
                resList.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">No records</div>
                        <p>No reservations found</p>
                    </div>
                `;
            } else {
                resList.innerHTML = reservations.map(res => renderReservationCard(res, { allowCancel: true })).join('');
            }
            return;
        }

        if (tabName === 'overview') {
            const recentRes = document.getElementById('recentReservations');
            if (recentRes) {
                if (reservations.length === 0) {
                    recentRes.innerHTML = `
                        <div class="empty-state">
                            <div class="empty-state-icon">No records</div>
                            <p>No reservations yet. Start booking movies!</p>
                        </div>
                    `;
                } else {
                    recentRes.innerHTML = reservations.slice(-3).reverse().map(res => `
                        <div class="card">
                            <div class="card-title">Reservation</div>
                            <div class="movie-title">${res.movie}</div>
                            <div class="movie-details">Seats: ${res.seats}</div>
                            ${res.showtime ? `<div class="movie-details">Theater: ${res.showtime.theater}</div>` : ''}
                            ${res.showtime ? `<div class="movie-details">Showtime: ${res.showtime.dateTime}</div>` : ''}
                            <div class="price">₱${res.price}</div>
                            <span class="status-badge ${getReservationStatusClass(res.status)}">${res.status}</span>
                            ${getPaymentInstructions(res)}
                        </div>
                    `).join('');
                }
            }
        } else if (tabName === 'reservations') {
            const resList = document.getElementById('reservationsList');
            if (resList) {
                if (reservations.length === 0) {
                    resList.innerHTML = `
                        <div class="empty-state">
                            <div class="empty-state-icon">No records</div>
                            <p>No reservations found</p>
                        </div>
                    `;
                } else {
                    resList.innerHTML = reservations.map(res => `
                        <div class="card">
                            <div class="card-title">Reservation</div>
                            <div class="movie-title">${res.movie}</div>
                            <div class="movie-details">Seats: ${res.seats}</div>
                            ${res.showtime ? `<div class="movie-details">Theater: ${res.showtime.theater}</div>` : ''}
                            ${res.showtime ? `<div class="movie-details">Showtime: ${res.showtime.dateTime}</div>` : ''}
                            <div class="price">₱${res.price}</div>
                            <span class="status-badge ${getReservationStatusClass(res.status)}">${res.status}</span>
                            ${getPaymentInstructions(res)}
                            <div class="button-group">
                                ${getReservationAction(res)}
                                ${res.status === 'confirmed' ? '' : `<button class="btn-danger" onclick="cancelReservation(${res.id})">Cancel</button>`}
                            </div>
                        </div>
                    `).join('');
                }
            }
        } else if (tabName === 'payments') {
            const payList = document.getElementById('paymentsList');
            if (payList) {
                if (payments.length === 0) {
                    payList.innerHTML = `
                        <div class="empty-state">
                            <div class="empty-state-icon">No records</div>
                            <p>No payment history</p>
                        </div>
                    `;
                } else {
                    payList.innerHTML = payments.map(pay => `
                        <div class="card">
                            <div class="card-title">Payment</div>
                            <div class="movie-title">${pay.movie}</div>
                            <div class="movie-details">Method: ${pay.method}</div>
                            <div class="movie-details">Date: ${pay.date}</div>
                            <div class="price">₱${pay.amount}</div>
                            <span class="status-badge status-confirmed">${pay.status}</span>
                        </div>
                    `).join('');
                }
            }
        }
    }

    function cancelReservation(resId) {
        if (confirm('Are you sure you want to cancel this reservation?')) {
            let reservations = getReservations();
            reservations = reservations.filter(r => String(r.id) !== String(resId));
            localStorage.setItem(LS_PREFIX + 'reservations', JSON.stringify(reservations));
            alert('Reservation cancelled!');
            loadTabContent('reservations');
        }
    }

    function seedDefaultAdminTheatersAndShowtimes() {
        const seedTheaters = getDefaultAdminTheaters();
        const seedShowtimes = getDefaultAdminShowtimes();
        if (seedTheaters.length > 0 && seedShowtimes.length > 0) {
            const currentTheaters = JSON.parse(localStorage.getItem('cinebook:admin:theaters') || '[]');
            const currentShowtimes = JSON.parse(localStorage.getItem('cinebook:admin:showtimes') || '[]');
            if (currentTheaters.length === 0) {
                localStorage.setItem('cinebook:admin:theaters', JSON.stringify(seedTheaters));
            }
            if (currentShowtimes.length === 0) {
                localStorage.setItem('cinebook:admin:showtimes', JSON.stringify(seedShowtimes));
            }
        }
    }

    // Initialization on DOM ready
    async function init() {
        if (window.CineBookDataSync) {
            await window.CineBookDataSync.ready;
        }

        // Ensures the booking flow has theater and showtime records on first run.
        seedDefaultAdminTheatersAndShowtimes();
        
        // Update user menu
        updateUserMenu();

        // populate genres if on index
        const genreFilterEl = document.getElementById('genreFilter');
        if (genreFilterEl) {
            populateGenreFilter();
            genreFilterEl.addEventListener('change', filterGenre);
        }

        const movieListEl = document.getElementById('movieList');
        if (movieListEl) {
            displayMovies(getMovieSource());
        }

        if (document.getElementById('title')) {
            renderMovieDetails();
        }

        // if seat container exists but not on movie page, still create seats
        if (document.getElementById("seatContainer") && !document.getElementById('title')) {
            createSeats();
        }

        // wire up search with debounce
        const searchEl = document.getElementById("search");
        if (searchEl) {
            searchEl.addEventListener('input', debounce(searchMovie, 250));
        }

        // Check for expired payments every 30 seconds
        checkExpiredPayments();
        setInterval(checkExpiredPayments, 30000);

        submitAuthOnEnter();
    }

    function submitAuthOnEnter() {
        const username = document.getElementById('username');
        const password = document.getElementById('password');
        const adminUsername = document.getElementById('adminUsername');
        const adminPassword = document.getElementById('adminPassword');

        const submitIfEnter = (handler) => (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                handler();
            }
        };

        if (username && password) {
            const handler = location.pathname.includes('register') ? register : login;
            username.addEventListener('keydown', submitIfEnter(handler));
            password.addEventListener('keydown', submitIfEnter(handler));
            const email = document.getElementById('email');
            const otp = document.getElementById('emailOtp');
            if (email) email.addEventListener('keydown', submitIfEnter(handler));
            if (otp) otp.addEventListener('keydown', submitIfEnter(handler));
        }

        const resetEmail = document.getElementById('resetEmail');
        const resetOtp = document.getElementById('resetOtp');
        const newPassword = document.getElementById('newPassword');
        if (resetEmail) resetEmail.addEventListener('keydown', submitIfEnter(requestPasswordReset));
        if (resetOtp) resetOtp.addEventListener('keydown', submitIfEnter(resetPasswordWithOtp));
        if (newPassword) newPassword.addEventListener('keydown', submitIfEnter(resetPasswordWithOtp));

        if (adminUsername && adminPassword && typeof adminLogin === 'function') {
            adminUsername.addEventListener('keydown', submitIfEnter(adminLogin));
            adminPassword.addEventListener('keydown', submitIfEnter(adminLogin));
        }

        const registerPassword = document.getElementById('password');
        if (registerPassword && document.getElementById('passwordStrength')) {
            registerPassword.addEventListener('input', updatePasswordStrength);
            updatePasswordStrength();
        }
    }

    // Check and expire pending bookings that exceeded deadline
    function checkExpiredPayments() {
        const reservations = JSON.parse(localStorage.getItem(LS_RESERVATIONS) || '[]');
        const now = Date.now();
        let updated = false;

        reservations.forEach(booking => {
            if (booking.status === 'pending' && booking.paymentDeadline) {
                if (now > booking.paymentDeadline) {
                    booking.status = 'payment_expired';
                    booking.expiredAt = new Date().toLocaleString();
                    updated = true;
                }
            }
        });

        if (updated) {
            localStorage.setItem(LS_RESERVATIONS, JSON.stringify(reservations));
        }
    }

    // Run initialization after DOM ready
    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', () => {
            init().catch(() => {});
        });
    } else {
        init().catch(() => {});
    }

    // Expose only the functions used by inline HTML event handlers.
    return {
        openMovie,
        register,
        login,
        confirmBooking,
        renderMovieDetails,
        displayMovies,
        createSeats,
        searchMovie,
        filterGenre,
        populateGenreFilter,
        showLoginPopover,
        initDashboard,
        loadTabContent,
        cancelReservation,
        updateUserMenu,
        logoutUser,
        loadShowtimesForMovie,
        selectShowtime,
        createSeatsForShowtime,
        updateSeatForShowtime,
        getAvailableSeatsForShowtime,
        sendEmailNotification,
        sendPaymentSubmittedEmail,
        sendCineBookEmail,
        viewReservationDetails,
        closeReservationDetails,
        requestPasswordReset,
        resetPasswordWithOtp,
        toggleForgotPassword,
        payReservation,
        checkExpiredPayments,
        togglePasswordVisibility,
        nextSlide,
        previousSlide
    };
})();

// expose to global scope for inline handlers in existing markup
window.openMovie = CineBook.openMovie;
window.register = CineBook.register;
window.login = CineBook.login;
window.confirmBooking = CineBook.confirmBooking;
window.searchMovie = CineBook.searchMovie;          // needed for inline onkeyup in index.html
window.filterGenre = CineBook.filterGenre;          // needed for inline onchange in index.html
window.showLoginPopover = CineBook.showLoginPopover; // restores login button behavior
window.renderMovieDetails = CineBook.renderMovieDetails; // needed for movie.html
window.displayMovies = CineBook.displayMovies;      // for programmatic use
window.createSeats = CineBook.createSeats;          // for programmatic use
window.populateGenreFilter = CineBook.populateGenreFilter; // for programmatic use
window.initDashboard = CineBook.initDashboard;      // for dashboard.html
window.loadTabContent = CineBook.loadTabContent;    // for dashboard.html
window.cancelReservation = CineBook.cancelReservation; // for dashboard.html
window.updateUserMenu = CineBook.updateUserMenu;    // for user authentication
window.logoutUser = CineBook.logoutUser;            // for logout button
window.loadShowtimesForMovie = CineBook.loadShowtimesForMovie; // for showtime selection
window.selectShowtime = CineBook.selectShowtime;    // for showtime selection
window.createSeatsForShowtime = CineBook.createSeatsForShowtime; // for showtime-specific seats
window.updateSeatForShowtime = CineBook.updateSeatForShowtime;   // for showtime-specific seat updates
window.togglePasswordVisibility = CineBook.togglePasswordVisibility;
window.nextSlide = CineBook.nextSlide;
window.previousSlide = CineBook.previousSlide;
window.sendCineBookEmail = CineBook.sendCineBookEmail;
window.viewReservationDetails = CineBook.viewReservationDetails;
window.closeReservationDetails = CineBook.closeReservationDetails;
window.sendPaymentSubmittedEmail = CineBook.sendPaymentSubmittedEmail;
window.requestPasswordReset = CineBook.requestPasswordReset;
window.resetPasswordWithOtp = CineBook.resetPasswordWithOtp;
window.toggleForgotPassword = CineBook.toggleForgotPassword;
window.payReservation = CineBook.payReservation;

// ========== ADMIN PANEL FUNCTIONS ==========

const ADMIN_LS_PREFIX = 'cinebook:admin:';
const ADMIN_LS_SESSION = ADMIN_LS_PREFIX + 'session';
const ADMIN_LS_LOGGED = ADMIN_LS_PREFIX + 'loggedIn';
const ADMIN_LS_MOVIES = ADMIN_LS_PREFIX + 'movies';
const ADMIN_LS_THEATERS = ADMIN_LS_PREFIX + 'theaters';
const ADMIN_LS_SHOWTIMES = ADMIN_LS_PREFIX + 'showtimes';

function getRecipientEmail(username) {
    const savedEmail = String(localStorage.getItem('cinebook:email') || '').trim();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(savedEmail)) return savedEmail;
    const user = String(username || '').trim();
    if (!user) return '';
    return user.includes('@') ? user : `${user}@student.edu`;
}

// Default admin credentials for classroom/local deployment.
const DEFAULT_ADMIN = {
    username: 'admin',
    password: 'admin123'
};

// Lightweight classroom-only hash used before storing admin passwords locally.
function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return 'hash_' + Math.abs(hash).toString(36);
}

function isDefaultAdminCredential(username, password) {
    return username === DEFAULT_ADMIN.username && password === DEFAULT_ADMIN.password;
}

function startAdminSession(username) {
    localStorage.setItem(ADMIN_LS_LOGGED, 'true');
    localStorage.setItem(ADMIN_LS_SESSION, JSON.stringify({
        username,
        loginTime: new Date().toISOString()
    }));
}

function adminLogin() {
    const username = document.getElementById('adminUsername').value.trim();
    const password = document.getElementById('adminPassword').value;
    const errorMsg = document.getElementById('adminErrorMsg');
    const successMsg = document.getElementById('adminSuccessMsg');
    
    if (!username || !password) {
        errorMsg.textContent = 'Please enter both username and password.';
        errorMsg.style.display = 'block';
        successMsg.style.display = 'none';
        return;
    }
    
    if (isDefaultAdminCredential(username, password)) {
        startAdminSession(username);
        successMsg.textContent = 'Login successful. Redirecting...';
        successMsg.style.display = 'block';
        errorMsg.style.display = 'none';
        setTimeout(() => {
            location.href = 'admin-dashboard.html';
        }, 500);
    } else {
        errorMsg.textContent = 'Invalid username or password.';
        errorMsg.style.display = 'block';
        successMsg.style.display = 'none';
    }
}

function checkAdminSession() {
    const isLogged = localStorage.getItem(ADMIN_LS_LOGGED) === 'true';
    if (!isLogged) {
        return false;
    }
    return true;
}

function adminLogout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem(ADMIN_LS_LOGGED);
        localStorage.removeItem(ADMIN_LS_SESSION);
        location.href = 'index.html';
    }
}

// ========== MOVIES MANAGEMENT ==========

function normalizeMoviesWithIds(movieList) {
    return (movieList || []).map((movie, index) => ({
        ...movie,
        id: movie.id ? movie.id.toString() : `movie_${index + 1}`
    }));
}

function getAdminMovies() {
    try {
        const custom = localStorage.getItem(ADMIN_LS_MOVIES);
        const parsed = custom ? JSON.parse(custom) : null;
        const fallbackMovies = (window.CineBookSeedData && Array.isArray(window.CineBookSeedData.movies))
            ? window.CineBookSeedData.movies
            : [];
        const resolved = Array.isArray(parsed) && parsed.length ? parsed : fallbackMovies;
        return normalizeMoviesWithIds(resolved);
    } catch {
        const fallbackMovies = (window.CineBookSeedData && Array.isArray(window.CineBookSeedData.movies))
            ? window.CineBookSeedData.movies
            : [];
        return normalizeMoviesWithIds(fallbackMovies);
    }
}

function saveAdminMovies(movieList) {
    try {
        localStorage.setItem(ADMIN_LS_MOVIES, JSON.stringify(movieList));
    } catch {
        alert('Unable to save movies in this browser.');
    }
}

async function syncAdminData(source) {
    if (!window.CineBookDataSync || typeof window.CineBookDataSync.pushState !== 'function') {
        return true;
    }

    try {
        await window.CineBookDataSync.pushState(source);
        return true;
    } catch {
        alert('Saved in this browser, but MongoDB sync failed. Check your internet connection and Vercel environment variables.');
        return false;
    }
}

function compressPosterFile(file) {
    return new Promise((resolve, reject) => {
        if (!file) {
            resolve('');
            return;
        }

        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Unable to read poster file.'));
        reader.onload = () => {
            const image = new Image();
            image.onerror = () => reject(new Error('Unable to process poster image.'));
            image.onload = () => {
                const maxWidth = 900;
                const maxHeight = 1350;
                const scale = Math.min(1, maxWidth / image.width, maxHeight / image.height);
                const canvas = document.createElement('canvas');
                canvas.width = Math.max(1, Math.round(image.width * scale));
                canvas.height = Math.max(1, Math.round(image.height * scale));
                const context = canvas.getContext('2d');
                context.drawImage(image, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.82));
            };
            image.src = reader.result;
        };
        reader.readAsDataURL(file);
    });
}

async function addMovie() {
    const title = document.getElementById('movieTitle').value.trim();
    const year = parseInt(document.getElementById('movieYear').value) || new Date().getFullYear();
    const genre = document.getElementById('movieGenre').value.trim();
    const duration = parseInt(document.getElementById('movieDuration').value) || 120;
    const synopsis = document.getElementById('movieSynopsis').value.trim();
    const posterUrl = document.getElementById('moviePoster').value.trim();
    const posterFile = document.getElementById('moviePosterFile')?.files?.[0] || null;
    
    if (!title || !genre) {
        alert('Please fill in Title and Genre fields.');
        return;
    }
    
    const allMovies = getAdminMovies();
    const defaultPoster = 'data:image/svg+xml;utf8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22600%22%3E%3Crect width=%22100%25%22 height=%22100%25%22 fill=%221a1a1a%22/%3E%3C/svg%3E';
    let uploadedPoster = '';
    try {
        uploadedPoster = await compressPosterFile(posterFile);
    } catch (error) {
        alert(error.message);
        return;
    }
    const poster = uploadedPoster || posterUrl;

    if (window.editingMovieId) {
        const movieIndex = allMovies.findIndex(m => m.id === window.editingMovieId);
        if (movieIndex > -1) {
            allMovies[movieIndex] = {
                ...allMovies[movieIndex],
                title,
                year,
                genre,
                duration,
                synopsis,
                poster: poster || allMovies[movieIndex].poster || defaultPoster
            };
            saveAdminMovies(allMovies);
            const synced = await syncAdminData('admin-movie-update');
            if (!synced) return;
            alert('Movie updated successfully!');
            clearMovieForm();
            loadMoviesList();
            populateShowtimeDropdowns();
            return;
        }
    }

    const newMovie = {
        id: Date.now().toString(),
        title,
        year,
        genre,
        duration,
        synopsis,
        poster: poster || defaultPoster
    };

    allMovies.push(newMovie);
    saveAdminMovies(allMovies);
    const synced = await syncAdminData('admin-movie-add');
    if (!synced) return;
    
    alert('Movie added successfully!');
    clearMovieForm();
    loadMoviesList();
    populateShowtimeDropdowns();
}

function deleteMovie(movieId) {
    if (confirm('Are you sure you want to delete this movie?')) {
        let allMovies = getAdminMovies();
        allMovies = allMovies.filter(m => m.id !== movieId);
        saveAdminMovies(allMovies);
        let allShowtimes = getAdminShowtimes();
        allShowtimes = allShowtimes.filter(s => s.movieId !== movieId);
        saveAdminShowtimes(allShowtimes);
        alert('Movie deleted successfully. Related showtimes were removed.');
        loadMoviesList();
        populateShowtimeDropdowns();
    }
}

function editMovie(movieId) {
    const allMovies = getAdminMovies();
    const movie = allMovies.find(m => m.id === movieId);
    if (movie) {
        document.getElementById('movieTitle').value = movie.title;
        document.getElementById('movieYear').value = movie.year;
        document.getElementById('movieGenre').value = movie.genre;
        document.getElementById('movieDuration').value = movie.duration || 120;
        document.getElementById('movieSynopsis').value = movie.synopsis || '';
        document.getElementById('moviePoster').value = movie.poster || '';
        
        // Store the movie ID being edited
        window.editingMovieId = movieId;
        // Change button text to indicate update mode
        document.querySelector('button[onclick="addMovie()"]').textContent = 'Update Movie';
        // Scroll to form
        document.getElementById('movieTitle').scrollIntoView({ behavior: 'smooth' });
    }
}

function clearMovieForm() {
    document.getElementById('movieTitle').value = '';
    document.getElementById('movieYear').value = '';
    document.getElementById('movieGenre').value = '';
    document.getElementById('movieDuration').value = '';
    document.getElementById('movieSynopsis').value = '';
    document.getElementById('moviePoster').value = '';
    const posterFile = document.getElementById('moviePosterFile');
    if (posterFile) posterFile.value = '';
    window.editingMovieId = null;
    // Reset button text
    const addBtn = document.querySelector('button[onclick="addMovie()"]');
    if (addBtn) addBtn.textContent = 'Add Movie';
}

function loadMoviesList() {
    const allMovies = getAdminMovies();
    const tbody = document.getElementById('moviesTableBody');
    
    if (allMovies.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px; color: #666;">No movies yet. Add one to get started!</td></tr>';
        if (document.getElementById('showtimes')?.classList.contains('active')) {
            populateShowtimeDropdowns();
        }
        return;
    }
    
    tbody.innerHTML = allMovies.map(movie => `
        <tr>
            <td>${movie.title}</td>
            <td>${movie.year}</td>
            <td>${movie.genre}</td>
            <td>${movie.duration || 120} min</td>
            <td>
                <button class="admin-btn" onclick="editMovie('${movie.id}')">Edit</button>
                <button class="admin-btn admin-btn-danger" onclick="deleteMovie('${movie.id}')">Delete</button>
            </td>
        </tr>
    `).join('');
}

// ========== THEATERS MANAGEMENT ==========

function normalizeTheatersWithIds(theaterList) {
    return (theaterList || []).map((theater, index) => ({
        ...theater,
        id: theater.id ? theater.id.toString() : `theater_${index + 1}`,
        totalSeats: 240,
        availableSeats: 240
    }));
}

function getAdminTheaters() {
    try {
        const custom = localStorage.getItem(ADMIN_LS_THEATERS);
        if (custom) {
            return normalizeTheatersWithIds(JSON.parse(custom));
        }
        return [];
    } catch {
        return [];
    }
}

function saveAdminTheaters(theaterList) {
    try {
        localStorage.setItem(ADMIN_LS_THEATERS, JSON.stringify(theaterList));
    } catch {
        alert('Unable to save theaters in this browser.');
    }
}

function addTheater() {
    const name = document.getElementById('theaterName').value.trim();
    const seats = parseInt(document.getElementById('theaterSeats').value) || 240;
    const price = parseInt(document.getElementById('theaterPrice').value) || 200;
    
    if (!name) {
        alert('Please enter a theater name.');
        return;
    }
    
    const newTheater = {
        id: Date.now().toString(),
        name,
        totalSeats: seats,
        seatPrice: price,
        availableSeats: seats
    };
    
    const allTheaters = getAdminTheaters();
    allTheaters.push(newTheater);
    saveAdminTheaters(allTheaters);
    
    alert('Theater added successfully!');
    clearTheaterForm();
    loadTheatersList();
    populateShowtimeDropdowns();
}

function deleteTheater(theaterId) {
    if (confirm('Are you sure you want to delete this theater?')) {
        let allTheaters = getAdminTheaters();
        allTheaters = allTheaters.filter(t => t.id !== theaterId);
        saveAdminTheaters(allTheaters);
        let allShowtimes = getAdminShowtimes();
        allShowtimes = allShowtimes.filter(s => s.theaterId !== theaterId);
        saveAdminShowtimes(allShowtimes);
        alert('Theater deleted successfully. Related showtimes were removed.');
        loadTheatersList();
        populateShowtimeDropdowns();
    }
}

function clearTheaterForm() {
    document.getElementById('theaterName').value = '';
    document.getElementById('theaterSeats').value = '240';
    document.getElementById('theaterPrice').value = '200';
}

function loadTheatersList() {
    const allTheaters = getAdminTheaters();
    const tbody = document.getElementById('theatersTableBody');
    
    if (allTheaters.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px; color: #666;">No theaters yet. Create one to manage showtimes!</td></tr>';
        if (document.getElementById('showtimes')?.classList.contains('active')) {
            populateShowtimeDropdowns();
        }
        return;
    }
    
    tbody.innerHTML = allTheaters.map(theater => `
        <tr>
            <td>${theater.name}</td>
            <td>${theater.totalSeats}</td>
            <td>₱${theater.seatPrice}</td>
            <td>${theater.availableSeats}</td>
            <td>
                <button class="admin-btn admin-btn-danger" onclick="deleteTheater('${theater.id}')">Delete</button>
            </td>
        </tr>
    `).join('');
}

// ========== SHOWTIMES MANAGEMENT ==========

function getAdminShowtimes() {
    try {
        const custom = localStorage.getItem(ADMIN_LS_SHOWTIMES);
        if (custom) {
            return JSON.parse(custom);
        }
        return [];
    } catch {
        return [];
    }
}

function saveAdminShowtimes(showtimeList) {
    try {
        localStorage.setItem(ADMIN_LS_SHOWTIMES, JSON.stringify(showtimeList));
    } catch {
        alert('Unable to save showtimes in this browser.');
    }
}

function populateShowtimeDropdowns() {
    const movieSelect = document.getElementById('showtimeMovie');
    const theaterSelect = document.getElementById('showtimeTheater');
    const timeSelect = document.getElementById('showtimeTime');
    if (!movieSelect || !theaterSelect) {
        return;
    }

    const allMovies = getAdminMovies();
    const allTheaters = getAdminTheaters();
    const selectedMovieId = movieSelect.value;
    const selectedTheaterId = theaterSelect.value;
    const selectedTime = timeSelect ? timeSelect.value : '';

    movieSelect.innerHTML = '<option value="">Select a movie</option>' +
        allMovies.map(m => `<option value="${m.id}">${m.title}</option>`).join('');
    if (selectedMovieId && allMovies.some(m => String(m.id) === String(selectedMovieId))) {
        movieSelect.value = selectedMovieId;
    }

    theaterSelect.innerHTML = '<option value="">Select a theater</option>' +
        allTheaters.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
    if (selectedTheaterId && allTheaters.some(t => String(t.id) === String(selectedTheaterId))) {
        theaterSelect.value = selectedTheaterId;
    }

    if (timeSelect) {
        const timeOptions = ADMIN_SHOWTIME_SLOTS.length > 0
            ? ADMIN_SHOWTIME_SLOTS.map(slot => `<option value="${slot}">${slot}</option>`).join('')
            : '<option value="">No time slots available</option>';
        timeSelect.innerHTML = '<option value="">Select a time slot</option>' + timeOptions;
        if (selectedTime && ADMIN_SHOWTIME_SLOTS.includes(selectedTime)) {
            timeSelect.value = selectedTime;
        }
    }

    [movieSelect, theaterSelect, document.getElementById('showtimeDate')].forEach((field) => {
        if (!field || field.dataset.showtimePreviewBound === 'true') return;
        field.dataset.showtimePreviewBound = 'true';
        field.addEventListener('change', renderExistingShowtimesPreview);
        field.addEventListener('input', renderExistingShowtimesPreview);
    });
    renderExistingShowtimesPreview();
}

typeof window !== 'undefined' && (window.ADMIN_SHOWTIME_SLOTS = ADMIN_SHOWTIME_SLOTS);

function renderExistingShowtimesPreview() {
    const preview = document.getElementById('existingShowtimesPreview');
    const movieSelect = document.getElementById('showtimeMovie');
    const theaterSelect = document.getElementById('showtimeTheater');
    const timeSelect = document.getElementById('showtimeTime');
    const movieId = movieSelect?.value || '';
    const theaterId = theaterSelect?.value || '';
    const date = document.getElementById('showtimeDate')?.value || '';
    if (!preview) return;

    if (!movieId || !theaterId) {
        preview.innerHTML = 'Select a movie and theater to view existing showtimes.';
        refreshShowtimeTimeOptions([]);
        return;
    }

    const movieTitle = movieSelect.options[movieSelect.selectedIndex]?.text || '';
    const theaterName = theaterSelect.options[theaterSelect.selectedIndex]?.text || '';

    const existing = getAdminShowtimes()
        .filter(showtime => {
            const sameMovie = String(showtime.movieId) === String(movieId) ||
                String(showtime.movieTitle || showtime.movie || '').toLowerCase() === movieTitle.toLowerCase();
            const sameTheater = String(showtime.theaterId) === String(theaterId) ||
                String(showtime.theaterName || showtime.theater || '').toLowerCase() === theaterName.toLowerCase();
            return sameMovie && sameTheater && (!date || showtime.date === date);
        })
        .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));

    refreshShowtimeTimeOptions(existing);

    if (existing.length === 0) {
        preview.innerHTML = date
            ? 'No existing showtimes for this movie, theater, and date.'
            : 'No existing showtimes for this movie and theater.';
        return;
    }

    preview.innerHTML = existing.map(showtime => `
        <span class="existing-showtime-chip">${showtime.date} ${showtime.time}</span>
    `).join('');
}

function refreshShowtimeTimeOptions(existingShowtimes) {
    const timeSelect = document.getElementById('showtimeTime');
    const date = document.getElementById('showtimeDate')?.value || '';
    if (!timeSelect) return;

    const selectedTime = timeSelect.value;
    const usedTimes = new Set(
        (existingShowtimes || [])
            .filter(showtime => !date || showtime.date === date)
            .map(showtime => showtime.time)
    );

    Array.from(timeSelect.options).forEach(option => {
        if (!option.value) return;
        const baseLabel = option.value;
        const isUsed = usedTimes.has(option.value);
        option.disabled = isUsed;
        option.textContent = isUsed ? `${baseLabel} - already scheduled` : baseLabel;
    });

    if (selectedTime && !usedTimes.has(selectedTime)) {
        timeSelect.value = selectedTime;
    } else if (selectedTime && usedTimes.has(selectedTime)) {
        timeSelect.value = '';
    }
}

function addShowtime() {
    const movieSelect = document.getElementById('showtimeMovie');
    const theaterSelect = document.getElementById('showtimeTheater');
    const timeSelect = document.getElementById('showtimeTime');

    if (!movieSelect || !theaterSelect || !timeSelect) {
        alert('Showtime form is not ready. Please refresh the page.');
        return;
    }

    if (movieSelect.options.length <= 1 || theaterSelect.options.length <= 1 || timeSelect.options.length <= 1) {
        populateShowtimeDropdowns();
    }

    const movieId = movieSelect.value;
    const theaterId = theaterSelect.value;
    const date = document.getElementById('showtimeDate').value;
    const time = timeSelect.value;

    if (!movieId || !theaterId || !date || !time) {
        alert('Please fill in all showtime fields.');
        return;
    }
    if (!ADMIN_SHOWTIME_SLOTS.includes(time)) {
        alert('Please choose one of the available 2-hour time slots.');
        return;
    }

    const allMovies = getAdminMovies();
    const allTheaters = getAdminTheaters();

    const movie = allMovies.find(m => m.id === movieId || String(m.id) === String(movieId));
    const theater = allTheaters.find(t => String(t.id) === String(theaterId));

    if (!movie || !theater) {
        alert('Selected movie or theater not found.');
        return;
    }

    const newShowtime = {
        id: Date.now().toString(),
        movieId,
        movieTitle: movie.title,
        theaterId,
        theaterName: theater.name,
        date,
        time
    };

    const allShowtimes = getAdminShowtimes();
    allShowtimes.push(newShowtime);
    saveAdminShowtimes(allShowtimes);

    alert('Showtime created successfully!');
    clearShowtimeForm();
    loadShowtimesList();
    renderExistingShowtimesPreview();
}

function deleteShowtime(showtimeId) {
    if (confirm('Are you sure you want to delete this showtime?')) {
        let allShowtimes = getAdminShowtimes();
        allShowtimes = allShowtimes.filter(s => s.id !== showtimeId);
        saveAdminShowtimes(allShowtimes);
        alert('Showtime deleted successfully!');
        loadShowtimesList();
    }
}

function clearShowtimeForm() {
    document.getElementById('showtimeMovie').value = '';
    document.getElementById('showtimeTheater').value = '';
    document.getElementById('showtimeDate').value = '';
    document.getElementById('showtimeTime').value = '';
    renderExistingShowtimesPreview();
}

function loadShowtimesList() {
    const allShowtimes = getAdminShowtimes();
    const tbody = document.getElementById('showtimesTableBody');
    if (!tbody) return;
    
    if (allShowtimes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: #666;">No showtimes scheduled yet.</td></tr>';
        return;
    }
    
    tbody.innerHTML = allShowtimes.map(showtime => {
        const availableSeats = getAvailableSeatsForShowtime(showtime.id);
        return `
            <tr>
                <td>${showtime.movieTitle}</td>
                <td>${showtime.theaterName}</td>
                <td>${showtime.date}</td>
                <td>${showtime.time}</td>
                <td>${availableSeats}</td>
                <td>
                    <button class="admin-btn admin-btn-danger" onclick="deleteShowtime('${showtime.id}')">Delete</button>
                </td>
            </tr>
        `;
    }).join('');
}

// ========== BOOKINGS MONITORING ==========

function loadBookingsList() {
    const reservations = JSON.parse(localStorage.getItem('cinebook:reservations') || '[]');
    const tbody = document.getElementById('bookingsTableBody');
    
    if (reservations.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: #666;">No bookings yet.</td></tr>';
        return;
    }
    
    tbody.innerHTML = reservations.map((res, idx) => `
        <tr>
            <td>#${res.id}</td>
            <td>${localStorage.getItem('cinebook:user') || 'Guest'}</td>
            <td>${res.movie}</td>
            <td>${Array.isArray(res.seats) ? res.seats.join(', ') : res.seats}</td>
            <td>${res.date}</td>
            <td><span style="background: rgba(76, 175, 80, 0.2); padding: 4px 10px; border-radius: 4px; color: #90ee90;">${res.status}</span></td>
            <td>
                <button class="admin-btn admin-btn-danger" onclick="cancelBookingAdmin(${res.id})">Cancel</button>
            </td>
        </tr>
    `).join('');
}

function cancelBookingAdmin(bookingId) {
    if (confirm('Are you sure you want to cancel this booking?')) {
        let reservations = JSON.parse(localStorage.getItem('cinebook:reservations') || '[]');
        reservations = reservations.filter(r => r.id !== bookingId);
        localStorage.setItem('cinebook:reservations', JSON.stringify(reservations));
        alert('Booking cancelled successfully!');
        loadBookingsList();
    }
}

// ========== PAYMENTS MONITORING ==========

function loadPaymentsList() {
    const payments = JSON.parse(localStorage.getItem('cinebook:payments') || '[]');
    const submissions = JSON.parse(localStorage.getItem('cinebook:paymentSubmissions') || '[]');
    const tbody = document.getElementById('paymentsTableBody');
    
    // Show both verified payments and pending submissions
    let allPayments = [];
    
    // Add verified payments
    payments.forEach(p => {
        allPayments.push({
            ...p,
            type: 'verified',
            statusBadge: `<span style="background: rgba(76, 175, 80, 0.2); padding: 4px 10px; border-radius: 4px; color: #90ee90;">${p.status}</span>`
        });
    });
    
    // Add pending submissions
    submissions.forEach(sub => {
        allPayments.push({
            id: sub.id,
            movie: 'Pending Review',
            amount: 'N/A',
            method: 'Manual Submission',
            date: sub.submittedAt,
            type: 'submission',
            statusBadge: `<span style="background: rgba(255, 152, 0, 0.2); padding: 4px 10px; border-radius: 4px; color: #ffb74d;">Pending Review</span>`,
            submission: sub
        });
    });
    
    if (allPayments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: #666;">No payment activity yet.</td></tr>';
        return;
    }
    
    tbody.innerHTML = allPayments.map((pay, idx) => {
        if (pay.type === 'verified') {
            return `
                <tr>
                    <td>#${pay.id}</td>
                    <td>${pay.movie}</td>
                    <td>₱${pay.amount}</td>
                    <td>${pay.method}</td>
                    <td>${pay.date}</td>
                    <td>${pay.statusBadge}</td>
                </tr>
            `;
        } else {
            return `
                <tr style="background: rgba(255, 152, 0, 0.05);">
                    <td>#${pay.id}</td>
                    <td><strong>${pay.submission.senderName}</strong><br><small style="color: #999;">Ref: ${pay.submission.referenceNumber}</small></td>
                    <td>Booking #${pay.submission.bookingId}</td>
                    <td>${pay.submission.fileName}</td>
                    <td>${pay.date}</td>
                    <td>
                        <button class="admin-btn" onclick="reviewPaymentSubmission(${pay.id}, ${pay.submission.bookingId})">Review</button>
                    </td>
                </tr>
            `;
        }
    }).join('');
}

function reviewPaymentSubmission(submissionId, bookingId) {
    const submissions = JSON.parse(localStorage.getItem('cinebook:paymentSubmissions') || '[]');
    const submission = submissions.find(s => s.id === submissionId);
    
    if (!submission) {
        alert('Submission not found.');
        return;
    }
    
    const reservations = JSON.parse(localStorage.getItem('cinebook:reservations') || '[]');
    const booking = reservations.find(b => b.id === bookingId);
    
    if (!booking) {
        alert('Booking not found.');
        return;
    }
    
    // Open modal for review
    const modal = `
        <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; align-items: center; justify-content: center;" id="reviewModal">
            <div style="background: #1a1a1a; border: 1px solid #e50914; border-radius: 10px; padding: 30px; max-width: 700px; max-height: 90vh; overflow-y: auto; width: 90%;">
                <h2 style="color: #e50914; margin-top: 0;">📋 Review Payment Submission</h2>
                
                <h3 style="color: #fff; margin-top: 20px;">Booking Information</h3>
                <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 5px; margin-bottom: 15px;">
                    <p><strong>Booking ID:</strong> #${booking.id}</p>
                    <p><strong>Movie:</strong> ${booking.movie}</p>
                    <p><strong>Seats:</strong> ${booking.seats.join(', ')}</p>
                    <p><strong>Amount:</strong> ₱${booking.price}</p>
                </div>
                
                <h3 style="color: #fff;">Payment Submission Details</h3>
                <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 5px; margin-bottom: 15px;">
                    <p><strong>Sender Name:</strong> ${submission.senderName}</p>
                    <p><strong>Reference Number:</strong> ${submission.referenceNumber}</p>
                    <p><strong>File:</strong> ${submission.fileName}</p>
                    <p><strong>Submitted:</strong> ${submission.submittedAt}</p>
                    ${submission.notes ? `<p><strong>Notes:</strong> ${submission.notes}</p>` : ''}
                </div>
                
                <h3 style="color: #fff;">Proof of Payment</h3>
                <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                    ${submission.proofFile.endsWith('.pdf') ? 
                        `<p><em>PDF file: ${submission.fileName}</em></p>` : 
                        `<img src="${submission.proofFile}" style="max-width: 100%; max-height: 400px; border-radius: 5px;">`
                    }
                </div>
                
                <div style="display: flex; gap: 12px;">
                    <button onclick="approvePaymentSubmission(${submissionId}, ${bookingId})" style="flex: 1; padding: 12px; background: #4caf50; color: white; border: none; border-radius: 5px; font-weight: 600; cursor: pointer;">Approve Payment</button>
                    <button onclick="rejectPaymentSubmission(${submissionId}, ${bookingId})" style="flex: 1; padding: 12px; background: #f44336; color: white; border: none; border-radius: 5px; font-weight: 600; cursor: pointer;">✗ Reject Payment</button>
                    <button onclick="closeReviewModal()" style="flex: 1; padding: 12px; background: #666; color: white; border: none; border-radius: 5px; font-weight: 600; cursor: pointer;">Close</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modal);
}

function approvePaymentSubmission(submissionId, bookingId) {
    if (!confirm('Approve this payment? The booking will be confirmed and seats locked.')) return;
    
    let submissions = JSON.parse(localStorage.getItem('cinebook:paymentSubmissions') || '[]');
    const submission = submissions.find(s => s.id === submissionId);
    if (!submission) {
        alert('Payment submission not found.');
        return;
    }
    
    // Update booking status to confirmed
    let reservations = JSON.parse(localStorage.getItem('cinebook:reservations') || '[]');
    const booking = reservations.find(b => b.id === bookingId);
    if (!booking) {
        alert('Booking not found.');
        return;
    }

    const conflictingBooking = reservations.find(existing =>
        existing.id !== booking.id &&
        BLOCKING_SEAT_STATUSES.has(existing.status) &&
        existing.showtime &&
        booking.showtime &&
        String(existing.showtime.id) === String(booking.showtime.id) &&
        Array.isArray(existing.seats) &&
        Array.isArray(booking.seats) &&
        existing.seats.some(seat => booking.seats.map(String).includes(String(seat)))
    );

    if (conflictingBooking) {
        alert(`Cannot approve this payment because one or more seats are already blocked in booking #${conflictingBooking.id}. Reject this submission or ask the user to choose another seat.`);
        return;
    }

    submission.status = 'approved';
    submission.approvedAt = new Date().toLocaleString();
    localStorage.setItem('cinebook:paymentSubmissions', JSON.stringify(submissions));

    booking.status = 'confirmed';
    booking.paidAt = new Date().toLocaleString();
    localStorage.setItem('cinebook:reservations', JSON.stringify(reservations));
    
    // Record payment
    const payment = {
        id: Date.now(),
        movie: booking.movie,
        amount: booking.price,
        method: 'Manual GCash (Verified)',
        date: new Date().toLocaleString(),
        status: 'completed',
        bookingId: bookingId,
        submissionId: submissionId
    };
    const payments = JSON.parse(localStorage.getItem('cinebook:payments') || '[]');
    payments.push(payment);
    localStorage.setItem('cinebook:payments', JSON.stringify(payments));

    if (typeof window.sendCineBookEmail === 'function') {
        window.sendCineBookEmail({
            id: Date.now() + 1,
            to: getRecipientEmail(booking.username),
            subject: `CineBook Receipt - Booking #${booking.id}`,
            body: `
Dear ${booking.username || 'CineBook customer'},

This is your official CineBook receipt. Your payment has been approved and your seats are now confirmed.

=== RECEIPT DETAILS ===
Booking ID: #${booking.id}
Movie: ${booking.movie}
${booking.showtime ? `Theater: ${booking.showtime.theater}
Showtime: ${booking.showtime.dateTime}` : ''}
Seats: ${Array.isArray(booking.seats) ? booking.seats.join(', ') : ''}
Total Amount: PHP ${booking.price}
Payment Method: Manual GCash
Paid At: ${booking.paidAt}

Please show your booking details at the theatre.

Thank you!
CineBook Admin
            `,
            sentAt: new Date().toLocaleString(),
            status: 'queued',
            type: 'receipt',
            bookingId: booking.id,
            submissionId
        });
    }
    
    alert('Payment approved. Booking confirmed.');
    closeReviewModal();
    loadPaymentsList();
}

function rejectPaymentSubmission(submissionId, bookingId) {
    const reason = prompt('Enter reason for rejection:');
    if (!reason) return;
    
    // Update submission status
    let submissions = JSON.parse(localStorage.getItem('cinebook:paymentSubmissions') || '[]');
    const submission = submissions.find(s => s.id === submissionId);
    submission.status = 'rejected';
    submission.rejectedAt = new Date().toLocaleString();
    submission.rejectionReason = reason;
    localStorage.setItem('cinebook:paymentSubmissions', JSON.stringify(submissions));
    
    // Reset booking to pending
    let reservations = JSON.parse(localStorage.getItem('cinebook:reservations') || '[]');
    const booking = reservations.find(b => b.id === bookingId);
    booking.status = 'payment_rejected';
    booking.rejectionReason = reason;
    localStorage.setItem('cinebook:reservations', JSON.stringify(reservations));

    alert('Payment rejected. The user can resubmit a receipt from the dashboard.');
    closeReviewModal();
    loadPaymentsList();
}

function loadPaymentReviewList() {
    const submissions = JSON.parse(localStorage.getItem('cinebook:paymentSubmissions') || '[]');
    const tbody = document.getElementById('paymentReviewTableBody');
    
    // Group by status
    const pending = submissions.filter(s => s.status === 'pending_review');
    const approved = submissions.filter(s => s.status === 'approved');
    const rejected = submissions.filter(s => s.status === 'rejected');
    
    if (submissions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: #666;">No payment submissions yet.</td></tr>';
        return;
    }
    
    let rows = [];
    
    // Show pending first
    pending.forEach(sub => {
        rows.push(`
            <tr style="background: rgba(255, 152, 0, 0.05);">
                <td>#${sub.id}</td>
                <td><strong>${sub.senderName}</strong><br><small style="color: #999;">Ref: ${sub.referenceNumber}</small></td>
                <td>Booking #${sub.bookingId}</td>
                <td>${sub.fileName}</td>
                <td>${sub.submittedAt}</td>
                <td><span style="background: rgba(255, 152, 0, 0.2); padding: 4px 10px; border-radius: 4px; color: #ffb74d;">⏳ Pending</span></td>
                <td><button class="admin-btn" onclick="reviewPaymentSubmission(${sub.id}, ${sub.bookingId})">Review</button></td>
            </tr>
        `);
    });
    
    // Show approved
    approved.forEach(sub => {
        rows.push(`
            <tr style="background: rgba(76, 175, 80, 0.05);">
                <td>#${sub.id}</td>
                <td><strong>${sub.senderName}</strong><br><small style="color: #999;">Ref: ${sub.referenceNumber}</small></td>
                <td>Booking #${sub.bookingId}</td>
                <td>${sub.fileName}</td>
                <td>${sub.approvedAt}</td>
                <td><span style="background: rgba(76, 175, 80, 0.2); padding: 4px 10px; border-radius: 4px; color: #81c784;">Approved</span></td>
                <td><button class="admin-btn" onclick="viewPaymentProof(${sub.id})">View</button></td>
            </tr>
        `);
    });
    
    // Show rejected
    rejected.forEach(sub => {
        rows.push(`
            <tr style="background: rgba(244, 67, 54, 0.05);">
                <td>#${sub.id}</td>
                <td><strong>${sub.senderName}</strong><br><small style="color: #999;">Ref: ${sub.referenceNumber}</small></td>
                <td>Booking #${sub.bookingId}</td>
                <td>${sub.fileName}</td>
                <td>${sub.rejectedAt}</td>
                <td><span style="background: rgba(244, 67, 54, 0.2); padding: 4px 10px; border-radius: 4px; color: #ff9999;">✗ Rejected</span></td>
                <td><button class="admin-btn" onclick="viewRejectionReason(${sub.id})">Details</button></td>
            </tr>
        `);
    });
    
    tbody.innerHTML = rows.join('');
}

function loadEmailLog() {
    const emailLog = JSON.parse(localStorage.getItem('cinebook:emailLog') || '[]');
    const tbody = document.getElementById('emailLogTableBody');
    
    if (emailLog.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: #666;">No emails sent yet.</td></tr>';
        return;
    }
    
    // Sort by most recent first
    const sorted = [...emailLog].reverse();
    
    tbody.innerHTML = sorted.map((email, idx) => `
        <tr>
            <td>#${email.id}</td>
            <td>${email.to}</td>
            <td>${email.subject}</td>
            <td>${email.sentAt}</td>
            <td><span style="background: rgba(76, 175, 80, 0.2); padding: 4px 10px; border-radius: 4px; color: #81c784;">${email.status}</span></td>
            <td><button class="admin-btn" onclick="viewEmailContent(${email.id})">View</button></td>
        </tr>
    `).join('');
}

function reviewPaymentSubmission(submissionId, bookingId) {
    const submissions = JSON.parse(localStorage.getItem('cinebook:paymentSubmissions') || '[]');
    const submission = submissions.find(s => s.id === submissionId);
    
    if (!submission) {
        alert('Submission not found.');
        return;
    }
    
    // Get booking details for context
    const reservations = JSON.parse(localStorage.getItem('cinebook:reservations') || '[]');
    const booking = reservations.find(b => b.id === bookingId);
    
    const modal = `
        <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; align-items: center; justify-content: center;" id="reviewModal">
            <div style="background: #1a1a1a; border: 2px solid #e50914; border-radius: 10px; padding: 30px; max-width: 700px; max-height: 90vh; overflow-y: auto; width: 90%;">
                <h2 style="color: #e50914; margin-top: 0;">🔍 Review Payment Submission</h2>
                
                <div style="background: rgba(229, 9, 20, 0.1); padding: 15px; border-radius: 5px; margin-bottom: 20px; border-left: 3px solid #e50914;">
                    <h4 style="color: #e50914; margin-top: 0;">Booking Details</h4>
                    <p style="margin: 8px 0;"><strong>Booking ID:</strong> #${bookingId}</p>
                    <p style="margin: 8px 0;"><strong>Movie:</strong> ${booking?.movie || 'Unknown'}</p>
                    <p style="margin: 8px 0;"><strong>Amount:</strong> ₱${booking?.price || 0}</p>
                </div>
                
                <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                    <h4 style="color: #e50914; margin-top: 0;">Payment Proof</h4>
                    <p style="margin: 8px 0;"><strong>GCash Ref:</strong> ${submission.referenceNumber}</p>
                    <p style="margin: 8px 0;"><strong>Sender Name:</strong> ${submission.senderName}</p>
                    <p style="margin: 8px 0;"><strong>Submitted:</strong> ${submission.submittedAt}</p>
                </div>
                
                <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 5px; margin-bottom: 20px; text-align: center;">
                    ${submission.proofFile.endsWith('.pdf') ? 
                        `<p><em>📄 PDF file: ${submission.fileName}</em></p>` : 
                        `<img src="${submission.proofFile}" style="max-width: 100%; max-height: 300px; border-radius: 5px; border: 1px solid #444;">`
                    }
                </div>
                
                <div style="display: flex; gap: 10px;">
                    <button onclick="approvePaymentSubmission(${submissionId}, ${bookingId})" style="flex: 1; padding: 12px; background: #4caf50; color: white; border: none; border-radius: 5px; font-weight: 600; cursor: pointer; transition: all 200ms ease;" onmouseover="this.style.background='#45a049'" onmouseout="this.style.background='#4caf50'">Approve Payment</button>
                    <button onclick="rejectPaymentSubmission(${submissionId}, ${bookingId})" style="flex: 1; padding: 12px; background: #f44336; color: white; border: none; border-radius: 5px; font-weight: 600; cursor: pointer; transition: all 200ms ease;" onmouseover="this.style.background='#d32f2f'" onmouseout="this.style.background='#f44336'">✗ Reject Payment</button>
                    <button onclick="closeReviewModal()" style="flex: 1; padding: 12px; background: #666; color: white; border: none; border-radius: 5px; font-weight: 600; cursor: pointer; transition: all 200ms ease;" onmouseover="this.style.background='#777'" onmouseout="this.style.background='#666'">Close</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modal);
}

function viewPaymentProof(submissionId) {
    const submissions = JSON.parse(localStorage.getItem('cinebook:paymentSubmissions') || '[]');
    const submission = submissions.find(s => s.id === submissionId);
    
    if (!submission) {
        alert('Submission not found.');
        return;
    }
    
    const modal = `
        <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; align-items: center; justify-content: center;" id="proofModal">
            <div style="background: #1a1a1a; border: 1px solid #e50914; border-radius: 10px; padding: 30px; max-width: 700px; max-height: 90vh; overflow-y: auto; width: 90%;">
                <h2 style="color: #e50914; margin-top: 0;">📸 Payment Proof</h2>
                <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 5px; margin-bottom: 15px;">
                    <p><strong>Reference:</strong> ${submission.referenceNumber}</p>
                    <p><strong>Sender:</strong> ${submission.senderName}</p>
                    <p><strong>Status:</strong> ${submission.status}</p>
                    <p><strong>Submitted:</strong> ${submission.submittedAt}</p>
                </div>
                <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                    ${submission.proofFile.endsWith('.pdf') ? 
                        `<p><em>PDF file: ${submission.fileName}</em></p>` : 
                        `<img src="${submission.proofFile}" style="max-width: 100%; max-height: 400px; border-radius: 5px;">`
                    }
                </div>
                <button onclick="closeProofModal()" style="width: 100%; padding: 12px; background: #666; color: white; border: none; border-radius: 5px; font-weight: 600; cursor: pointer;">Close</button>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modal);
}

function closeProofModal() {
    const modal = document.getElementById('proofModal');
    if (modal) modal.remove();
}

function viewRejectionReason(submissionId) {
    const submissions = JSON.parse(localStorage.getItem('cinebook:paymentSubmissions') || '[]');
    const submission = submissions.find(s => s.id === submissionId);
    
    if (!submission) {
        alert('Submission not found.');
        return;
    }
    
    alert(`Rejection Reason:\n\n${submission.rejectionReason}\n\nUser can resubmit payment proof from the payment page.`);
}

function viewEmailContent(emailId) {
    const emailLog = JSON.parse(localStorage.getItem('cinebook:emailLog') || '[]');
    const email = emailLog.find(e => e.id === emailId);
    
    if (!email) {
        alert('Email not found.');
        return;
    }
    
    const modal = `
        <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; align-items: center; justify-content: center;" id="emailModal">
            <div style="background: #1a1a1a; border: 1px solid #e50914; border-radius: 10px; padding: 30px; max-width: 700px; max-height: 90vh; overflow-y: auto; width: 90%;">
                <h2 style="color: #e50914; margin-top: 0;">Email Content</h2>
                <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 5px; margin-bottom: 15px;">
                    <p><strong>To:</strong> ${email.to}</p>
                    <p><strong>Subject:</strong> ${email.subject}</p>
                    <p><strong>Sent:</strong> ${email.sentAt}</p>
                </div>
                <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 5px; margin-bottom: 20px; white-space: pre-wrap; font-size: 12px; max-height: 300px; overflow-y: auto; color: #aaa;">
${email.body}
                </div>
                <button onclick="closeEmailModal()" style="width: 100%; padding: 12px; background: #666; color: white; border: none; border-radius: 5px; font-weight: 600; cursor: pointer;">Close</button>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modal);
}

function closeEmailModal() {
    const modal = document.getElementById('emailModal');
    if (modal) modal.remove();
}


// ========== DASHBOARD STATISTICS ==========

function loadAdminDashboardStats() {
    const allMovies = getAdminMovies();
    const allTheaters = getAdminTheaters();
    const reservations = JSON.parse(localStorage.getItem('cinebook:reservations') || '[]');
    const payments = JSON.parse(localStorage.getItem('cinebook:payments') || '[]');
    
    const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    
    document.getElementById('statTotalMovies').textContent = allMovies.length;
    document.getElementById('statTotalTheaters').textContent = allTheaters.length;
    document.getElementById('statTotalBookings').textContent = reservations.length;
    document.getElementById('statTotalRevenue').textContent = '₱' + totalRevenue.toLocaleString();
}

function initAdminDashboard() {
    seedDefaultAdminTheatersAndShowtimes();
    populateShowtimeDropdowns();
    loadAdminDashboardStats();
    loadMoviesList();
    loadTheatersList();
    loadShowtimesList(); // Also load showtimes list initially
}

function getAvailableSeatsForShowtime(showtimeId) {
    const reservations = JSON.parse(localStorage.getItem('cinebook:reservations') || '[]');
    const bookedSeats = new Set();
    const totalSeats = 240;

    reservations.forEach(booking => {
        if (booking.showtime && String(booking.showtime.id) === String(showtimeId) &&
            BLOCKING_SEAT_STATUSES.has(booking.status)) {
            booking.seats.forEach(seat => bookedSeats.add(String(seat)));
        }
    });

    return Math.max(totalSeats - bookedSeats.size, 0);
}

function closeReviewModal() {
    const modal = document.getElementById('reviewModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Ensure showtime dropdowns are available even before switching tabs
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(() => {
        populateShowtimeDropdowns();
    }, 0);
} else {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(populateShowtimeDropdowns, 0);
    });
}

// Also populate showtime dropdowns when the showtimes tab becomes visible
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            const target = mutation.target;
            if (target.id === 'showtimes' && target.classList.contains('active')) {
                setTimeout(populateShowtimeDropdowns, 50);
            }
        }
    });
});

document.addEventListener('DOMContentLoaded', () => {
    const showtimesTab = document.getElementById('showtimes');
    if (showtimesTab) {
        observer.observe(showtimesTab, { attributes: true });
    }
});

function saveSettings() {
    const platformName = document.getElementById('settingsPlatformName').value;
    alert('Settings saved successfully. (Demo mode - settings not persisted)');
}

function exportData() {
    const data = {
        movies: getAdminMovies(),
        theaters: getAdminTheaters(),
        showtimes: getAdminShowtimes(),
        reservations: JSON.parse(localStorage.getItem('cinebook:reservations') || '[]'),
        payments: JSON.parse(localStorage.getItem('cinebook:payments') || '[]'),
        paymentSubmissions: JSON.parse(localStorage.getItem('cinebook:paymentSubmissions') || '[]'),
        emailLog: JSON.parse(localStorage.getItem('cinebook:emailLog') || '[]'),
        exportDate: new Date().toISOString()
    };
    
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cinebook-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    alert('Data exported successfully!');
}

function resetData() {
    if (confirm('WARNING: This will delete ALL system data (movies, theaters, bookings, payments). This cannot be undone. Are you sure?')) {
        if (confirm('Are you REALLY sure? Type "yes" to confirm.')) {
            localStorage.removeItem(ADMIN_LS_MOVIES);
            localStorage.removeItem(ADMIN_LS_THEATERS);
            localStorage.removeItem(ADMIN_LS_SHOWTIMES);
            localStorage.removeItem('cinebook:reservations');
            localStorage.removeItem('cinebook:payments');
            localStorage.removeItem('cinebook:paymentSubmissions');
            localStorage.removeItem('cinebook:emailLog');
            localStorage.removeItem('cinebook:pendingBookingId');
            alert('All data has been reset. The system will reload.');
            location.reload();
        }
    }
}

// Expose admin functions to global scope
window.adminLogin = adminLogin;
window.checkAdminSession = checkAdminSession;
window.adminLogout = adminLogout;
window.addMovie = addMovie;
window.deleteMovie = deleteMovie;
window.editMovie = editMovie;
window.clearMovieForm = clearMovieForm;
window.loadMoviesList = loadMoviesList;
window.addTheater = addTheater;
window.deleteTheater = deleteTheater;
window.clearTheaterForm = clearTheaterForm;
window.loadTheatersList = loadTheatersList;
window.addShowtime = addShowtime;
window.deleteShowtime = deleteShowtime;
window.clearShowtimeForm = clearShowtimeForm;
window.loadShowtimesList = loadShowtimesList;
window.populateShowtimeDropdowns = populateShowtimeDropdowns;
window.loadBookingsList = loadBookingsList;
window.cancelBookingAdmin = cancelBookingAdmin;
window.loadPaymentsList = loadPaymentsList;
window.loadAdminDashboardStats = loadAdminDashboardStats;
window.initAdminDashboard = initAdminDashboard;
window.switchAdminTab = switchAdminTab;
window.saveSettings = saveSettings;
window.exportData = exportData;
window.resetData = resetData;
window.reviewPaymentSubmission = reviewPaymentSubmission;
window.approvePaymentSubmission = approvePaymentSubmission;
window.rejectPaymentSubmission = rejectPaymentSubmission;
window.closeReviewModal = closeReviewModal;
window.sendEmailNotification = CineBook.sendEmailNotification;
window.checkExpiredPayments = CineBook.checkExpiredPayments;
window.loadPaymentReviewList = loadPaymentReviewList;
window.loadEmailLog = loadEmailLog;
window.viewPaymentProof = viewPaymentProof;
window.closeProofModal = closeProofModal;
window.viewRejectionReason = viewRejectionReason;
window.viewEmailContent = viewEmailContent;
window.closeEmailModal = closeEmailModal;

// Initialize admin dashboard stats on page load if on admin dashboard
function switchAdminTab(tabName) {
    // This is defined in admin-dashboard.html
}

