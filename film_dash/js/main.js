// ═══════════════════════════════════════════════════
// App Controller — Fshare Film Dashboard
// ═══════════════════════════════════════════════════

(function() {
    'use strict';

    // ── Theme toggle ───────────────────────────────
    function initTheme() {
        const toggle = document.getElementById('themeToggle');
        const html = document.documentElement;
        const saved = localStorage.getItem('filmDashTheme');
        if (saved) html.dataset.theme = saved;

        toggle?.addEventListener('click', () => {
            const next = html.dataset.theme === 'dark' ? 'light' : 'dark';
            html.dataset.theme = next;
            localStorage.setItem('filmDashTheme', next);
            toggle.textContent = next === 'dark' ? '☀️' : '🌙';
        });
    }

    // ── Sidebar navigation ─────────────────────────
    const SUBTAB_NAMES = {
        new: 'New Arrivals',
        topdl: 'Top Downloads',
        toprt: 'Top Rated',
        people: 'Top Cast',
        providers: 'Where to Watch',
        dist: 'Distribution',
    };

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

    function setActiveModule(moduleId) {
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        const target = document.getElementById(moduleId);
        if (target) target.classList.add('active');
    }

    // Switch to the Stats module (e.g. from a subtab click)
    function showStatsModule() {
        document.querySelectorAll('.sidebar-item').forEach(i => {
            i.classList.toggle('active', i.dataset.view === 'stats');
        });
        setActiveModule('statsModule');
        if (typeof StatsModule !== 'undefined') StatsModule.render();
    }

    function initSidebar() {
        const hamburger = document.getElementById('hamburgerBtn');
        const sidebar = document.getElementById('sidebar');
        if (hamburger && sidebar) {
            hamburger.addEventListener('click', () => {
                sidebar.classList.toggle('open');
            });
        }

        // Module switching: Stats / Browse / Watchlist
        document.querySelectorAll('.sidebar-item').forEach(item => {
            item.addEventListener('click', () => {
                document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');

                const view = item.dataset.view;
                if (view === 'stats') {
                    setActiveModule('statsModule');
                    if (typeof StatsModule !== 'undefined') StatsModule.render();
                    // Restore breadcrumb from the currently active subtab
                    const activeSub = document.querySelector('.sidebar-subitem.active');
                    const st = activeSub ? activeSub.dataset.st : 'new';
                    setBreadcrumb('Stats', SUBTAB_NAMES[st] || 'Stats');
                } else if (view === 'browse') {
                    setActiveModule('browseModule');
                    setBreadcrumb('Browse');
                } else if (view === 'watchlist') {
                    setActiveModule('watchlistModule');
                    setBreadcrumb('Watchlist');
                }

                // Close sidebar on mobile after selection
                if (window.innerWidth < 768) sidebar.classList.remove('open');
            });
        });

        // Stats submenu subtabs — mirror the existing st-tab mechanism
        document.querySelectorAll('.sidebar-subitem').forEach(sub => {
            sub.addEventListener('click', () => {
                const st = sub.dataset.st;
                const name = SUBTAB_NAMES[st] || 'Stats';

                // Sidebar active states
                document.querySelectorAll('.sidebar-subitem').forEach(s => s.classList.remove('active'));
                sub.classList.add('active');
                document.querySelectorAll('.sidebar-item').forEach(i => {
                    i.classList.toggle('active', i.dataset.view === 'stats');
                });

                // Stats module is now visible
                setActiveModule('statsModule');

                // Mirror the st-tab active state in the (hidden) stats-tabs bar
                document.querySelectorAll('.st-tab').forEach(t => {
                    t.classList.toggle('active', t.dataset.st === st);
                });

                setBreadcrumb('Stats', name);

                if (typeof StatsModule !== 'undefined' && StatsModule.render) {
                    StatsModule.renderSubtab(st);
                }

                // Close sidebar on mobile after selection
                if (window.innerWidth < 768) sidebar.classList.remove('open');
            });
        });
    }

    // Breadcrumb update — gọi khi đổi subtab
    function setBreadcrumb(main, sub) {
        const bc = document.getElementById('breadcrumb');
        if (!bc) return;
        bc.innerHTML = `<span class="bc-current">${esc(main)}</span>` +
            (sub ? `<span class="bc-sep">/</span><span class="bc-sub">${esc(sub)}</span>` : '');
    }

    // Update subtitle động
    function updateSubtitle() {
        const el = document.getElementById('headerSubtitle');
        if (el && FilmData.isLoaded()) {
            el.textContent = `downloadable films based on ${FilmData.getFilms().length} films`;
        }
    }

    // ── Update film count ──────────────────────────
    function updateFilmCount() {
        const el = document.getElementById('filmCount');
        if (el && FilmData.isLoaded()) {
            el.textContent = `🎬 ${FilmData.getFilms().length} films`;
        }
    }

    // ── Global helpers (used by stats.js cross-module jumps) ──
    window.filmDashHelpers = {
        setBreadcrumb: setBreadcrumb,
        showStatsModule: showStatsModule,
    };

    // ── Keyboard shortcuts ─────────────────────────
    function initKeyboard() {
        document.addEventListener('keydown', (e) => {
            // Escape closes modal and trailer
            if (e.key === 'Escape') {
                FilmDetail.closeModal();
                TrailerPlayer.hide();
            }
        });
    }

    // ── Bootstrap ──────────────────────────────────
    async function main() {
        initTheme();
        initSidebar();
        initKeyboard();
        TrailerPlayer.init();
        FilmDetail.init();

        // Load data
        const ok = await FilmData.load();
        if (!ok) {
            document.body.innerHTML = `
                <div style="display:flex;align-items:center;justify-content:center;height:100vh;
                     flex-direction:column;gap:16px;color:var(--color-text-muted);">
                    <div style="font-size:3rem;">❌</div>
                    <h2>Không thể tải dữ liệu</h2>
                    <p>Vui lòng chạy generate_data.py trước hoặc kiểm tra data/ folder.</p>
                </div>`;
            return;
        }

        updateFilmCount();
        updateSubtitle();

        // Init sub-modules with error isolation
        try { BrowseModule.init(); } catch (e) { console.error('BrowseModule.init:', e); }
        try { WatchlistModule.init(); } catch (e) { console.error('WatchlistModule.init:', e); }
        try { StatsModule.init(); } catch (e) { console.error('StatsModule.init:', e); }

        console.log('✅ Film Dashboard ready');
    }

    // ── Run ────────────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', main);
    } else {
        main();
    }
})();
