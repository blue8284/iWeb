// ═══════════════════════════════════════════════════
// Watchlist Module — Film & Person watchlists
// ═══════════════════════════════════════════════════

const WatchlistModule = (() => {

    function esc(s) {
        if (s == null) return '';
        return String(s).replace(/[&<>"']/g, m => {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            if (m === '"') return '&quot;';
            if (m === "'") return '&#039;';
            return m;
        });
    }

    function fmtDate(d) {
        if (!d) return '—';
        try {
            return new Date(d).toLocaleDateString('vi-VN', {
                year: 'numeric', month: '2-digit', day: '2-digit',
            });
        } catch { return d; }
    }

    // ── Render film watchlists ─────────────────────
    function renderFilmWatchlists() {
        const container = document.getElementById('filmWatchlists');
        if (!container) return;

        const data = FilmData.getWatchlist();
        if (!data || !data.film_watchlists || !data.film_watchlists.length) {
            container.innerHTML = '<div class="wl-empty">📭 No film watchlists yet</div>';
            return;
        }

        container.innerHTML = data.film_watchlists.map(wl => {
            const notifs = wl.notifications || [];
            return `<div class="wl-card">
                <div class="wl-card-header">
                    <div>
                        <div class="wl-card-title">🎬 ${esc(wl.film_name)}${wl.year ? ` (${wl.year})` : ''}</div>
                        <div class="wl-card-meta">
                            ${wl.min_rating ? `⭐ ≥ ${wl.min_rating}` : ''}
                            ${wl.genre_preference ? `· ${esc(wl.genre_preference)}` : ''}
                            · ${notifs.length} phim đã match
                        </div>
                    </div>
                </div>
                ${notifs.length ? `<div style="margin-top:8px;">
                    ${notifs.map(n => `
                        <div class="wl-match">
                            <span class="wl-match-title">🎬 ${esc(n.title || `Film #${n.film_imdb_id}`)}${n.year ? ` (${n.year})` : ''}</span>
                            <span class="wl-match-date">📅 ${fmtDate(n.notified_at)}</span>
                        </div>
                    `).join('')}
                </div>` : `<div class="wl-empty" style="padding:12px 0;">⏳ Waiting for match...</div>`}
            </div>`;
        }).join('');
    }

    // ── Render person watchlists ───────────────────
    function renderPersonWatchlists() {
        const container = document.getElementById('personWatchlists');
        if (!container) return;

        const data = FilmData.getWatchlist();
        if (!data || !data.person_watchlists || !data.person_watchlists.length) {
            container.innerHTML = '<div class="wl-empty">👤 No person watchlists yet</div>';
            return;
        }

        container.innerHTML = data.person_watchlists.map(wl => {
            const notifs = wl.notifications || [];
            const personIcon = wl.person_type === 'actor' ? '🎭' : '🎬';
            return `<div class="wl-card">
                <div class="wl-card-header">
                    <div>
                        <div class="wl-card-title">${personIcon} ${esc(wl.person_name)}</div>
                        <div class="wl-card-meta">
                            ${wl.person_type === 'actor' ? 'Actor' : 'Director'}
                            · ${notifs.length} phim đã match
                        </div>
                    </div>
                </div>
                ${notifs.length ? `<div style="margin-top:8px;">
                    ${notifs.map(n => `
                        <div class="wl-match">
                            <span class="wl-match-title">🎬 ${esc(n.title || `Film #${n.film_imdb_id}`)}${n.year ? ` (${n.year})` : ''}</span>
                            <span class="wl-match-date">📅 ${fmtDate(n.notified_at)}</span>
                        </div>
                    `).join('')}
                </div>` : `<div class="wl-empty" style="padding:12px 0;">⏳ Waiting for match...</div>`}
            </div>`;
        }).join('');
    }

    // ── Init ───────────────────────────────────────
    function init() {
        // Tab switching
        document.querySelectorAll('.wl-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.wl-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const target = tab.dataset.wl;
                document.getElementById('filmWatchlists').classList.toggle('hidden', target !== 'film');
                document.getElementById('personWatchlists').classList.toggle('hidden', target !== 'person');
            });
        });

        renderFilmWatchlists();
        renderPersonWatchlists();
    }

    return { init, renderFilmWatchlists, renderPersonWatchlists };
})();
