// ═══════════════════════════════════════════════════
// Stats Module — Timeline + Detail Panel + PiP + API subtabs
// ═══════════════════════════════════════════════════

const StatsModule = (() => {
    'use strict';

    let currentTab = 'new';
    let selectedFilm = null;
    let newVersionFilter = false;
    let viewMode = {};

    // New Arrivals (API) state
    let naDays = 30;            // active days window
    let naSelectedDay = null;   // date=YYYY-MM-DD filter (null = all days)
    let naChart = null;         // Chart.js instance for the waterfall

    // Top Rated (API) state
    let trFilms = [];           // full list from /api/top-rated
    let trGenres = [];          // active genre filters (multi-select)
    let trLoaded = false;       // have we fetched once?

    // ── Helpers ──────────────────────────────────────

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

    function fmtNum(n) {
        if (n == null) return '—';
        return Number(n).toLocaleString('en-US');
    }

    function fmtRating(r) {
        if (r == null) return '—';
        return Number(r).toFixed(1);
    }

    function emptyState(msg) {
        return '<div class="wl-empty">' + (msg || 'No data') + '</div>';
    }

    function countTotalVersions(film) {
        var count = 0;
        if (film.folders) {
            film.folders.forEach(function(f) {
                count += f.versions ? f.versions.length : 0;
            });
        }
        return count;
    }

    function extractVersionTags(film) {
        if (!film || !film.folders) return [];
        var seen = {};
        var tags = [];
        film.folders.forEach(function(folder) {
            if (!folder.versions) return;
            folder.versions.forEach(function(v) {
                var fmt = (v.video_format || '').split('.')[0];
                if (fmt && !seen[fmt]) {
                    seen[fmt] = true;
                    tags.push(fmt);
                }
            });
        });
        return tags;
    }

    // ── View Toggle Helpers ─────────────────────────

    function getViewKey(tab) {
        var map = { topdl: 'topdl', toprt: 'toprt', providers: 'providers' };
        return map[tab] || tab;
    }

    function getViewMode(tab) {
        var key = getViewKey(tab);
        if (viewMode[key] === undefined) {
            try {
                viewMode[key] = localStorage.getItem('statsView_' + key) || 'card';
            } catch(e) { viewMode[key] = 'card'; }
        }
        return viewMode[key];
    }

    function setViewMode(tab, mode) {
        var key = getViewKey(tab);
        viewMode[key] = mode;
        try { localStorage.setItem('statsView_' + key, mode); } catch(e) {}
    }

    function renderViewToggle(tab) {
        var current = getViewMode(tab);
        return '<div class="stats-view-toggle">' +
            '<button class="stats-view-btn' + (current === 'card' ? ' active' : '') +
            '" onclick="StatsModule.switchStatsView(\'' + tab + '\', \'card\')">▦ Cards</button>' +
            '<button class="stats-view-btn' + (current === 'table' ? ' active' : '') +
            '" onclick="StatsModule.switchStatsView(\'' + tab + '\', \'table\')">📊 Table</button>' +
            '</div>';
    }

    // ── Layout wrapper (left content + right detail) ──

    function wrapWithDetail(content) {
        return '<div class="stats-layout">' +
            '<div class="stats-main">' + content + '</div>' +
            '<aside class="stats-detail-panel">' + renderDetailPanel() + '</aside>' +
            '</div>';
    }

    // ── Detail Panel (shared across 3 sub-tabs) ──────

    function renderDetailPanel() {
        if (!selectedFilm) {
            return '<div class="detail-panel"><div class="detail-empty">👆 Chọn một phim<br>để xem chi tiết</div></div>';
        }

        var f = selectedFilm;
        var parts = [];

        parts.push('<div class="detail-panel"><div class="detail-content">');

        // Poster
        if (f.poster_url) {
            parts.push('<img class="detail-poster" src="' + esc(f.poster_url) +
                '" alt="' + esc(f.title) + '">');
        } else {
            parts.push('<div class="detail-poster-placeholder">🎬</div>');
        }

        // Title + Year
        parts.push('<h4 class="detail-title">' + esc(f.title) + '</h4>');
        parts.push('<div class="detail-year">' + (f.year || '?') + '</div>');

        // Rating
        if (f.rating) {
            parts.push('<div class="detail-rating">⭐ ' + fmtRating(f.rating));
            if (f.votes) {
                parts.push(' <span class="text-muted">(' + fmtNum(f.votes) + ' votes)</span>');
            }
            parts.push('</div>');
        }

        // Genres
        if (f.genres && f.genres.length) {
            parts.push('<div class="detail-genres">');
            f.genres.forEach(function(g) {
                parts.push('<span class="genre-tag">' + esc(g) + '</span>');
            });
            parts.push('</div>');
        }

        // Runtime
        if (f.runtime) {
            parts.push('<div class="detail-plot" style="margin-bottom:4px;">⏱ ' + f.runtime + ' min</div>');
        }

        // Watch Providers
        var wpText = FilmData.getWatchProvidersText(f.watch_providers);
        if (wpText) {
          parts.push('<div class="watch-provider-line">' + wpText + '</div>');
        }

        // Plot
        if (f.plot) {
            var plotText = f.plot.length > 200 ? f.plot.slice(0, 200) + '…' : f.plot;
            parts.push('<div class="detail-plot">' + esc(plotText) + '</div>');
        }

        // Cast
        if (f.actors && f.actors.length) {
            parts.push('<div class="film-detail-section"><h4>Cast</h4><div class="person-chips">');
            f.actors.forEach(function(a) {
                parts.push('<span class="person-chip actor-chip" onclick="StatsModule.selectPersonFilms(\'' + esc(a.name) + '\')" style="cursor:pointer;">🎭 ' + esc(a.name) + '</span>');
            });
            parts.push('</div></div>');
        }

        // Directors
        if (f.directors && f.directors.length) {
            parts.push('<div class="film-detail-section"><h4>Directors</h4><div class="person-chips">');
            f.directors.forEach(function(d) {
                parts.push('<span class="person-chip director-chip" onclick="StatsModule.selectPersonFilms(\'' + esc(d.name) + '\')" style="cursor:pointer;">🎬 ' + esc(d.name) + '</span>');
            });
            parts.push('</div></div>');
        }

        // Actions
        parts.push('<div class="detail-actions">');
        if (f.trailer_url) {
            parts.push('<button class="btn btn-primary btn-sm" onclick="TrailerPlayer.play(\'' +
                esc(f.trailer_url) + '\', \'' + esc(f.title) + '\')">▶ Trailer</button>');
        }
        parts.push('<button class="btn btn-sm" onclick="FilmDetail.openModal(FilmData.getFilmByImdb(\'' +
            esc(f.imdb_id) + '\'))">📂 Details</button>');
        parts.push('</div></div></div>');

        return parts.join('');
    }

    function selectPersonFilms(personName) {
        // Close any open modal first
        if (window.FilmDetail && typeof FilmDetail.closeModal === 'function') {
            FilmDetail.closeModal();
        }

        // Switch main module to Stats if not already there (sidebar layout)
        var statsModule = document.getElementById('statsModule');
        if (statsModule && !statsModule.classList.contains('active')) {
            var helpers = window.filmDashHelpers;
            if (helpers && typeof helpers.showStatsModule === 'function') {
                helpers.showStatsModule();
            } else {
                // Fallback: toggle panels directly
                document.querySelectorAll('.tab-panel').forEach(function(p) { p.classList.remove('active'); });
                statsModule.classList.add('active');
            }
        }

        // Activate the people sub-tab in stats (sidebar submenu + hidden st-tabs bar)
        currentTab = 'people';
        document.querySelectorAll('.sidebar-subitem').forEach(function(s) {
            s.classList.toggle('active', s.dataset.st === 'people');
        });
        document.querySelectorAll('.sidebar-item').forEach(function(i) {
            i.classList.toggle('active', i.dataset.view === 'stats');
        });
        document.querySelectorAll('.st-tab').forEach(function(t) {
            t.classList.toggle('active', t.dataset.st === 'people');
        });

        // Update breadcrumb
        var helpers = window.filmDashHelpers;
        if (helpers && typeof helpers.setBreadcrumb === 'function') {
            helpers.setBreadcrumb('Stats', 'Top Cast');
        }

        // Set search to find this person
        castSearch = personName.toLowerCase();
        castTab = 'actors';
        castPage = 0;
        expandedPerson = personName;

        // Also search directors tab - check if person is primarily a director
        var allDirs = FilmData.getAllDirectors();
        var isDirector = allDirs.some(function(d) { return d.name.toLowerCase() === personName.toLowerCase(); });
        if (isDirector) {
            var allActs = FilmData.getAllActors();
            var isActor = allActs.some(function(a) { return a.name.toLowerCase() === personName.toLowerCase(); });
            if (!isActor) castTab = 'directors';
        }

        render();
    }

    // ── Film Detail Zone (API) — shared by New Arrivals / Top Downloads / Top Rated / Cast ──
    // Reuse: any API-backed subtab renders .detail-zone and calls openDetailFromApi(imdbId).

    function renderApiFilmDetail(film) {
        var parts = [];

        parts.push('<div class="dz-media">');
        if (film.poster_url) {
            parts.push('<img class="dz-poster" src="' + esc(film.poster_url) +
                '" alt="' + esc(film.title) + '" loading="lazy">');
        } else {
            parts.push('<div class="dz-poster dz-poster-na">🎬</div>');
        }
        parts.push('</div>');

        parts.push('<div class="dz-title">' + esc(film.title) + '</div>');
        parts.push('<div class="dz-meta">' + (film.year || '?'));
        if (film.runtime) parts.push(' · ' + film.runtime + ' min');
        parts.push('</div>');

        if (film.rating) {
            parts.push('<div class="dz-rating">⭐ ' + fmtRating(film.rating));
            if (film.votes) parts.push(' <span class="dz-muted">(' + fmtNum(film.votes) + ' votes)</span>');
            parts.push('</div>');
        }

        if (film.genres && film.genres.length) {
            parts.push('<div class="dz-genres">');
            film.genres.forEach(function(g) {
                parts.push('<span class="genre-tag">' + esc(g) + '</span>');
            });
            parts.push('</div>');
        }

        var wpText = FilmData.getWatchProvidersText(film.watch_providers);
        if (wpText) parts.push('<div class="watch-provider-line">' + wpText + '</div>');

        if (film.plot) {
            parts.push('<div class="dz-plot">' + esc(film.plot) + '</div>');
        }

        if (film.actors && film.actors.length) {
            parts.push('<div class="dz-section"><div class="dz-section-title">Cast</div><div class="person-chips">');
            film.actors.slice(0, 8).forEach(function(a) {
                parts.push('<span class="person-chip actor-chip" style="cursor:pointer;" ' +
                    'onclick="StatsModule.selectPersonFilms(\'' + esc(a.name) + '\')">🎭 ' + esc(a.name) + '</span>');
            });
            parts.push('</div></div>');
        }

        if (film.directors && film.directors.length) {
            parts.push('<div class="dz-section"><div class="dz-section-title">Directors</div><div class="person-chips">');
            film.directors.slice(0, 4).forEach(function(d) {
                parts.push('<span class="person-chip director-chip" style="cursor:pointer;" ' +
                    'onclick="StatsModule.selectPersonFilms(\'' + esc(d.name) + '\')">🎬 ' + esc(d.name) + '</span>');
            });
            parts.push('</div></div>');
        }

        // Versions (active + dead)
        var versions = film.versions || [];
        var active = versions.filter(function(v) { return v.link_status === 'active'; });
        var dead = versions.filter(function(v) { return v.link_status !== 'active'; });
        if (versions.length) {
            parts.push('<div class="dz-section"><div class="dz-section-title">Versions (' + versions.length + ')</div>');
            active.forEach(function(v) {
                parts.push(renderApiVersion(v, false));
            });
            if (dead.length) {
                parts.push('<div class="dz-dead-count">⚠ ' + dead.length + ' dead version' +
                    (dead.length > 1 ? 's' : '') + '</div>');
                dead.forEach(function(v) {
                    parts.push(renderApiVersion(v, true));
                });
            }
            parts.push('</div>');
        } else {
            parts.push('<div class="dz-section"><div class="dz-section-title">Versions</div>' +
                '<div class="dz-empty">No versions</div></div>');
        }

        if (film.trailer_url) {
            parts.push('<div class="dz-actions">' +
                '<button class="btn btn-primary btn-sm" ' +
                'onclick="TrailerPlayer.play(\'' + esc(film.trailer_url) + '\', \'' + esc(film.title) + '\')">▶ Trailer</button>' +
                '</div>');
        }

        return parts.join('');
    }

    function renderApiVersion(v, isDead) {
        var res = esc(v.resolution || '?');
        var fmt = esc(v.video_format || '');
        var size = (v.size_gb != null) ? Number(v.size_gb).toFixed(1) + ' GB' : '';
        var dl = (v.download_count != null) ? fmtNum(v.download_count) + ' dl' : '';
        var extra = (v.name || v.folder_name || '');

        var badge = isDead
            ? '<span class="v-status-badge" title="' + esc(extra) + '">⚠ Dead</span>'
            : '<a class="dl-link" href="' + esc(fshareUrl(v.linkcode)) +
                '" target="_blank" rel="noopener" onclick="event.stopPropagation()">📥 Download</a>';

        return '<div class="dz-version' + (isDead ? ' dz-version-dead' : '') + '">' +
            '<span class="dz-v-res">' + res + '</span>' +
            '<span class="dz-v-fmt">' + fmt + '</span>' +
            '<span class="dz-v-size">' + size + '</span>' +
            '<span class="dz-v-dl">' + dl + '</span>' +
            '<span class="dz-v-link">' + badge + '</span>' +
            '</div>';
    }

    // Build an fshare.vn download URL from a linkcode (film_fshare rows expose linkcode).
    function fshareUrl(linkcode) {
        if (!linkcode) return '#';
        return 'https://www.fshare.vn/file/' + esc(linkcode);
    }

    // Open the shared detail zone for a film (fetch /api/film/{imdb_id}).
    function openDetailFromApi(imdbId) {
        var zone = document.getElementById('detailZone');
        var content = document.getElementById('detailZoneContent');
        if (!zone || !content) return;

        ensureDetailZoneOpen();
        content.innerHTML = '<div class="wl-empty">Loading…</div>';

        fetch('/api/film/' + encodeURIComponent(imdbId))
            .then(function(res) {
                if (!res.ok) throw new Error('HTTP ' + res.status);
                return res.json();
            })
            .then(function(film) {
                var c = document.getElementById('detailZoneContent');
                if (c) c.innerHTML = renderApiFilmDetail(film);
            })
            .catch(function() {
                var c = document.getElementById('detailZoneContent');
                if (c) c.innerHTML = '<div class="wl-empty">❌ Không tải được film</div>';
            });
    }

    // Collapse / expand the shared detail zone.
    // Desktop: .collapsed class toggles height. Mobile: .expanded class opens it (collapsed by default).
    function toggleDetailZone() {
        var zone = document.getElementById('detailZone');
        if (!zone) return;
        if (window.innerWidth < 768) {
            zone.classList.toggle('expanded');
            zone.classList.remove('collapsed');
        } else {
            zone.classList.toggle('collapsed');
            zone.classList.remove('expanded');
        }
    }

    // Ensure the detail zone is visible (call before rendering content into it).
    function ensureDetailZoneOpen() {
        var zone = document.getElementById('detailZone');
        if (!zone) return;
        zone.classList.remove('collapsed');
        if (window.innerWidth < 768) zone.classList.add('expanded');
    }

    //── Select film for detail panel ─────────────────

    function selectFilm(imdbId) {
        var film = FilmData.getFilmByImdb(imdbId);
        if (!film) return;
        selectedFilm = film;
        render();
    }

    function toggleNewVersionFilter() {
        newVersionFilter = !newVersionFilter;
        render();
    }

    function switchStatsView(tab, mode) {
        setViewMode(tab, mode);
        render();
    }

    // ── Timeline: New Arrivals ────────────────────────

    function fmtDate(dateStr) {
        if (!dateStr) return '?';
        var parts = dateStr.split('-');
        if (parts.length !== 3) return dateStr;
        var d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        var now = new Date();
        now.setHours(0, 0, 0, 0);
        d.setHours(0, 0, 0, 0);
        var diff = Math.round((now - d) / (1000 * 60 * 60 * 24));
        if (diff === 0) return 'Today';
        if (diff === 1) return 'Yesterday';
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    function renderFilmThumb(item, extraClass) {
        var poster = item.poster_url
            ? '<img class="tl-film-img" src="' + esc(item.poster_url) + '" alt="">'
            : '<div class="tl-film-img tl-film-img-na">🎬</div>';

        var badge = item.hasMultiVersions
            ? '<span class="tl-film-badge" title="Has new versions">🔄</span>'
            : '';

        // Version tags: 1-2 show tags, 3+ show count
        var tagsHtml = '';
        if (item.versionTags && item.versionTags.length > 0) {
            if (item.versionCount <= 2) {
                tagsHtml = '<div class="tl-film-tags">' +
                    item.versionTags.map(function(t) {
                        return '<span class="tl-film-tag">' + esc(t) + '</span>';
                    }).join('') + '</div>';
            } else {
                tagsHtml = '<div class="tl-film-tags">' +
                    '<span class="tl-film-tag tl-film-tag-count">+' + item.versionCount + '</span>' +
                    '</div>';
            }
        }

        var selectedClass = (selectedFilm && selectedFilm.imdb_id === item.imdb_id)
            ? ' tl-film-selected' : '';

        return '<div class="tl-film' + (extraClass || '') + selectedClass + '"' +
            ' data-imdb="' + esc(item.imdb_id) + '"' +
            ' onclick="StatsModule.selectFilm(\'' + esc(item.imdb_id) + '\')">' +
            '<div class="tl-film-thumb">' + poster + badge + '</div>' +
            '<span class="tl-film-title">' + esc(item.title) + '</span>' +
            tagsHtml +
            '</div>';
    }

    // ── New Arrivals (API waterfall + day list + detail zone) ──

    // Shell: layout with waterfall anchor, day-grouped list and shared detail zone.
    // Returns HTML; data is fetched async via loadNewArrivals().
    function renderNewArrivals() {
        var html = '<div class="subtab-layout">' +
            '<div class="subtab-body">' +
                '<div class="chart-anchor" id="newArrivalsChartAnchor">' +
                    '<div class="chart-container na-chart-box">' +
                        '<div class="chart-title">📅 Films by day (last ' + naDays + 'd)</div>' +
                        '<canvas id="chartNewArrivals"></canvas>' +
                    '</div>' +
                '</div>' +
                '<div class="na-controls">' +
                    '<div class="range-toggle" id="naRangeToggle">' +
                        '<button class="range-btn' + (naDays === 7 ? ' active' : '') + '" ' +
                            'onclick="StatsModule.selectNewArrivalRange(7)">7d</button>' +
                        '<button class="range-btn' + (naDays === 30 ? ' active' : '') + '" ' +
                            'onclick="StatsModule.selectNewArrivalRange(30)">30d</button>' +
                        '<button class="range-btn' + (naDays === 90 ? ' active' : '') + '" ' +
                            'onclick="StatsModule.selectNewArrivalRange(90)">90d</button>' +
                    '</div>' +
                    '<span class="na-filter-info" id="naFilterInfo"></span>' +
                '</div>' +
                '<div id="newArrivalsList" class="na-list"></div>' +
            '</div>' +
            '<aside class="detail-zone" id="detailZone">' +
                '<button class="detail-zone-toggle" id="detailZoneToggle" ' +
                    'onclick="StatsModule.toggleDetailZone()" title="Collapse / expand">📎</button>' +
                '<div class="detail-zone-content" id="detailZoneContent">' +
                    '<div class="wl-empty">👆 Chọn một phim<br>để xem chi tiết</div>' +
                '</div>' +
            '</aside>' +
        '</div>';
        return html;
    }

    // Fetch /api/new-arrivals and render waterfall + list.
    // days: window (7/30/90); selectedDate: YYYY-MM-DD filter or null for all days.
    function loadNewArrivals(days, selectedDate) {
        naDays = days;
        naSelectedDay = selectedDate || null;

        var listEl = document.getElementById('newArrivalsList');
        if (!listEl) return;
        listEl.innerHTML = '<div class="wl-empty">Loading…</div>';

        var url = '/api/new-arrivals?days=' + days;
        if (naSelectedDay) url += '&date=' + encodeURIComponent(naSelectedDay);

        fetch(url)
            .then(function(res) {
                if (!res.ok) throw new Error('HTTP ' + res.status);
                return res.json();
            })
            .then(function(data) {
                renderNewArrivalsData(data);
            })
            .catch(function() {
                var el = document.getElementById('newArrivalsList');
                if (el) {
                    el.innerHTML = '<div class="wl-empty">❌ Không thể tải dữ liệu' +
                        '<br><button class="btn" onclick="StatsModule.retryNewArrivals()">🔄 Retry</button></div>';
                }
            });
    }

    // Group API rows by first_seen and render waterfall chart + day list.
    function renderNewArrivalsData(data) {
        var films = (data && data.films) || [];

        // Group by day (descending)
        var byDay = {};
        films.forEach(function(f) {
            var d = f.first_seen || 'unknown';
            if (!byDay[d]) byDay[d] = [];
            byDay[d].push(f);
        });
        var days = Object.keys(byDay).sort(function(a, b) {
            if (a === 'unknown') return 1;
            if (b === 'unknown') return -1;
            return b.localeCompare(a);
        });

        // Waterfall chart: films per day + deleted per day
        var labels = days;
        var values = days.map(function(d) { return byDay[d].length; });
        var deleted = days.map(function(d) {
            return byDay[d].filter(function(f) { return f.deleted_at; }).length;
        });

        FilmData.destroyCharts();
        naChart = FilmData.createChart('chartNewArrivals', {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    { label: 'Films', data: values,
                      backgroundColor: 'rgba(229,9,20,0.7)',
                      borderColor: '#e50914', borderWidth: 1, borderRadius: 2 },
                    { label: 'Deleted', data: deleted,
                      backgroundColor: 'rgba(100,116,139,0.5)',
                      borderColor: '#64748b', borderWidth: 1, borderRadius: 2 },
                ],
            },
            options: Object.assign({}, FilmData.defaultChartOptions('', 'bar'), {
                animation: { duration: 600, easing: 'easeOutQuart' },
                plugins: { legend: { display: true, position: 'top',
                    labels: { color: '#94a3b8', font: { size: 10 }, boxWidth: 12 } } },
                onClick: function(e, els) {
                    if (els && els.length) {
                        var day = labels[els[0].index];
                        StatsModule.selectNewArrivalDay(day);
                    }
                },
            }),
        });

        // Update range toggle active state
        var rng = document.getElementById('naRangeToggle');
        if (rng) {
            rng.querySelectorAll('.range-btn').forEach(function(b) {
                b.classList.toggle('active', Number(b.textContent.replace(/[^0-9]/g, '')) === naDays);
            });
        }

        // Filter info: show when a day is selected
        var info = document.getElementById('naFilterInfo');
        if (info) {
            if (naSelectedDay) {
                var n = (byDay[naSelectedDay] || []).length;
                info.innerHTML = '📆 ' + naSelectedDay + (n ? ' — ' + n + ' film' + (n > 1 ? 's' : '') : '') +
                    ' <button class="btn btn-sm" onclick="StatsModule.retryNewArrivals()">✕ Clear</button>';
            } else {
                info.innerHTML = '';
            }
        }

        // Day-grouped list (staggered)
        var listEl = document.getElementById('newArrivalsList');
        if (!listEl) return;
        if (!days.length) {
            listEl.innerHTML = '<div class="wl-empty">📭 No new films</div>';
            return;
        }
        listEl.innerHTML = days.map(function(d, di) {
            return '<div class="na-day stagger-item" style="--i:' + di + '">' +
                '<div class="na-day-head" onclick="StatsModule.selectNewArrivalDay(\'' + esc(d) + '\')">' +
                    '<span class="na-day-date">' + esc(fmtDate(d)) +
                        (naSelectedDay === d ? ' <span class="na-day-active">●</span>' : '') + '</span>' +
                    '<span class="na-day-count">' + byDay[d].length + ' film' +
                        (byDay[d].length > 1 ? 's' : '') + '</span>' +
                '</div>' +
                '<div class="na-day-films">' +
                    byDay[d].map(function(f) { return renderNaFilm(f); }).join('') +
                '</div>' +
            '</div>';
        }).join('');
    }

    // One film row inside a day group.
    function renderNaFilm(f) {
        var deadBadge = f.deleted_at ? '<span class="v-status-badge">⚠ Deleted</span>' : '';
        return '<div class="na-film" data-imdb="' + esc(f.imdb_id) + '"' +
            ' onclick="StatsModule.openDetailFromApi(\'' + esc(f.imdb_id) + '\')">' +
            '<img class="na-film-poster" src="' + esc(f.poster_url || '') + '" alt="" loading="lazy"' +
                ' onerror="this.style.display=\'none\'">' +
            '<div class="na-film-info">' +
                '<span class="na-film-title">' + esc(f.title) + '</span>' +
                '<span class="na-film-meta">' + (f.year || '?') + ' ' + deadBadge + '</span>' +
            '</div>' +
        '</div>';
    }

    // Click a chart bar / day header → refetch with ?date= that day.
    function selectNewArrivalDay(day) {
        if (!day) return;
        if (naSelectedDay === day) {
            // Same day → clear filter (back to full window)
            retryNewArrivals();
            return;
        }
        loadNewArrivals(naDays, day);
    }

    // Range buttons (7/30/90 days) → clear day filter and refetch.
    function selectNewArrivalRange(days) {
        loadNewArrivals(days, null);
    }

    // Reload current window (clears the ?date= filter).
    function retryNewArrivals() {
        loadNewArrivals(naDays, null);
    }

    // ── Top Downloads (API-backed: 2 charts + filterable list) ──

    // Active filter state { year: <int|null>, genre: <string|null> }
    var dlFilter = { year: null, genre: null };

    // Shell: chart-grid-2 + list + shared detail zone. Data is fetched async.
    function renderTopDownloads() {
        var html = '<div class="subtab-layout">' +
            '<div class="subtab-body">' +
                '<div class="dl-filter-bar" id="dlFilterBar"></div>' +
                '<div class="chart-grid-2">' +
                    '<div class="chart-container dl-chart-box">' +
                        '<div class="chart-title"><svg class="icon-dl" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Downloads by Year</div>' +
                        '<canvas id="chartDlYear"></canvas>' +
                    '</div>' +
                    '<div class="chart-container dl-chart-box">' +
                        '<div class="chart-title"><svg class="icon-dl" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Downloads by Genre</div>' +
                        '<canvas id="chartDlGenre"></canvas>' +
                    '</div>' +
                '</div>' +
                '<div id="dlList" class="dl-list"></div>' +
            '</div>' +
            '<aside class="detail-zone" id="detailZone">' +
                '<button class="detail-zone-toggle" id="detailZoneToggle" ' +
                    'onclick="StatsModule.toggleDetailZone()" title="Collapse / expand">📎</button>' +
                '<div class="detail-zone-content" id="detailZoneContent">' +
                    '<div class="wl-empty">👆 Chọn một phim<br>để xem chi tiết</div>' +
                '</div>' +
            '</aside>' +
        '</div>';
        return html;
    }

    // Fetch /api/top-downloads (optionally filtered) and render charts + list.
    function loadTopDownloads() {
        var listEl = document.getElementById('dlList');
        if (!listEl) return;
        listEl.innerHTML = '<div class="wl-empty">Loading…</div>';

        var params = [];
        if (dlFilter.year) params.push('year=' + encodeURIComponent(dlFilter.year));
        if (dlFilter.genre) params.push('genre=' + encodeURIComponent(dlFilter.genre));
        var url = '/api/top-downloads' + (params.length ? '?' + params.join('&') : '');

        fetch(url)
            .then(function(res) {
                if (!res.ok) throw new Error('HTTP ' + res.status);
                return res.json();
            })
            .then(function(data) {
                renderTopDownloadsData(data);
            })
            .catch(function() {
                var el = document.getElementById('dlList');
                if (el) {
                    el.innerHTML = '<div class="wl-empty">❌ Không thể tải dữ liệu' +
                        '<br><button class="btn" onclick="StatsModule.retryTopDownloads()">🔄 Retry</button></div>';
                }
            });
    }

    // Palette for genre bars (red/gold theme from the design system).
    var DL_GENRE_COLORS = ['#e50914', '#f5c518', '#60a5fa', '#4ade80', '#a78bfa',
        '#f472b6', '#fb923c', '#06b6d4', '#f87171', '#fcd34d', '#22c55e', '#c084fc'];

    // Render the two charts + the film table from one API payload.
    function renderTopDownloadsData(data) {
        data = data || {};
        var films = data.films || [];
        var byYear = data.by_year || [];
        var byGenre = data.by_genre || [];

        // Reset chart instances; register both canvases.
        FilmData.destroyCharts();
        FilmData.createChart('chartDlYear', {
            type: 'bar',
            data: {
                labels: byYear.map(function(d) { return d.year; }),
                datasets: [{
                    label: 'Downloads',
                    data: byYear.map(function(d) { return d.dl; }),
                    backgroundColor: 'rgba(229,9,20,0.7)',
                    borderColor: '#e50914', borderWidth: 1, borderRadius: 2,
                }],
            },
            options: Object.assign({}, FilmData.defaultChartOptions('', 'bar'), {
                animation: { duration: 600, easing: 'easeOutQuart' },
                plugins: { legend: { display: false } },
                onClick: function(e, els) {
                    if (els && els.length) {
                        var year = byYear[els[0].index].year;
                        StatsModule.filterDlByYear(year);
                    }
                },
            }),
        });

        FilmData.createChart('chartDlGenre', {
            type: 'bar',
            data: {
                labels: byGenre.map(function(d) { return d.genre; }),
                datasets: [{
                    label: 'Downloads',
                    data: byGenre.map(function(d) { return d.dl; }),
                    backgroundColor: byGenre.map(function(_, i) { return DL_GENRE_COLORS[i % DL_GENRE_COLORS.length]; }),
                    borderWidth: 0, borderRadius: 2,
                }],
            },
            options: Object.assign({}, FilmData.defaultChartOptions('', 'bar'), {
                animation: { duration: 600, easing: 'easeOutQuart' },
                plugins: { legend: { display: false } },
                onClick: function(e, els) {
                    if (els && els.length) {
                        var genre = byGenre[els[0].index].genre;
                        StatsModule.filterDlByGenre(genre);
                    }
                },
            }),
        });

        // Filter badges (Year / Genre with ✕ clear).
        var bar = document.getElementById('dlFilterBar');
        if (bar) {
            var chips = [];
            if (dlFilter.year) {
                chips.push('<span class="dl-filter-chip">Year: ' + esc(dlFilter.year) +
                    ' <button class="dl-filter-clear" onclick="StatsModule.filterDlByYear(' + esc(dlFilter.year) + ')" title="Clear filter">✕</button></span>');
            }
            if (dlFilter.genre) {
                chips.push('<span class="dl-filter-chip">' + esc(dlFilter.genre) +
                    ' <button class="dl-filter-clear" onclick="StatsModule.filterDlByGenre(\'' + esc(dlFilter.genre) + '\')" title="Clear filter">✕</button></span>');
            }
            bar.innerHTML = chips.join('') +
                (chips.length ? '<button class="btn btn-sm" onclick="StatsModule.retryTopDownloads()">✕ Clear all</button>' : '');
        }

        var listEl = document.getElementById('dlList');
        if (!listEl) return;

        if (!films.length) {
            listEl.innerHTML = emptyState('No films match the current filter.');
            return;
        }

        listEl.innerHTML = renderDlTable(films);
    }

    // Table: rank | CD thumb | title | genres chips | download bar | year.
    function renderDlTable(films) {
        var maxDl = films[0].total_dl || 1;
        var html = '<table class="stats-table">' +
            '<thead><tr>' +
            '<th>#</th><th></th><th>Title</th><th>Genres</th><th>Downloads</th><th class="text-right">Year</th>' +
            '</tr></thead><tbody>';

        films.forEach(function(item, i) {
            var posterHtml = item.poster_url
                ? '<div class="cd-thumb"><img src="' + esc(item.poster_url) + '" alt=""></div>'
                : '<div class="cd-thumb cd-thumb-na">🎬</div>';

            var genresHtml = item.genres && item.genres.length
                ? item.genres.map(function(g) { return FilmData.getGenreChip(g); }).join('')
                : '<span class="text-muted">—</span>';

            var barW = FilmData.calcBarPercent(item.total_dl, maxDl);

            html += '<tr class="stats-row-clickable stagger-row" style="--i:' + i + '"' +
                ' data-imdb="' + esc(item.imdb_id) + '"' +
                ' onclick="StatsModule.openDetailFromApi(\'' + esc(item.imdb_id) + '\')">' +
                '<td>' + (i + 1) + '</td>' +
                '<td class="cd-col">' + posterHtml + '</td>' +
                '<td><strong>' + esc(item.title) + '</strong></td>' +
                '<td class="genres-col">' + genresHtml + '</td>' +
                '<td><div class="bar-cell"><div class="bar-track"><div class="bar-fill bar-fill-dl" style="width:' + barW + '%;"></div></div><span class="bar-value">' + fmtNum(item.total_dl) + '</span></div></td>' +
                '<td class="text-right">' + (item.year || '?') + '</td>' +
                '</tr>';
        });

        html += '</tbody></table>';
        return html;
    }

    // Toggle year filter: same year → clear; else refetch with ?year=.
    function filterDlByYear(year) {
        if (dlFilter.year === year) {
            dlFilter.year = null;
        } else {
            dlFilter.year = year;
        }
        loadTopDownloads();
    }

    // Toggle genre filter: same genre → clear; else refetch with ?genre=.
    function filterDlByGenre(genre) {
        if (!genre) return;
        if (dlFilter.genre === genre) {
            dlFilter.genre = null;
        } else {
            dlFilter.genre = genre;
        }
        loadTopDownloads();
    }

    // Reload without filters.
    function retryTopDownloads() {
        dlFilter.year = null;
        dlFilter.genre = null;
        loadTopDownloads();
    }

    // ── Top Rated ──────────────────────────────────────

    // ── Top Rated (API-backed: scatter + genre legend + list) ──

    function renderTopRated() {
        var html = '<div class="subtab-layout">' +
            '<div class="subtab-body">' +
                '<div class="chart-anchor tr-anchor">' +
                    '<div class="chart-container tr-chart-box">' +
                        '<div class="chart-title">⭐ Rating vs Year</div>' +
                        '<canvas id="chartTopRated"></canvas>' +
                    '</div>' +
                '</div>' +
                '<div class="tr-controls">' +
                    '<div class="tr-legend" id="trLegend"></div>' +
                    '<span class="na-filter-info" id="trFilterInfo"></span>' +
                '</div>' +
                '<div id="trList" class="dl-list"></div>' +
            '</div>' +
            '<aside class="detail-zone" id="detailZone">' +
                '<button class="detail-zone-toggle" id="detailZoneToggle" ' +
                    'onclick="StatsModule.toggleDetailZone()" title="Collapse / expand">📎</button>' +
                '<div class="detail-zone-content" id="detailZoneContent">' +
                    '<div class="wl-empty">👆 Chọn một phim<br>để xem chi tiết</div>' +
                '</div>' +
            '</aside>' +
        '</div>';
        return html;
    }

    // Load /api/top-rated once, cache, then render charts + list.
    function loadTopRated() {
        if (trLoaded) {
            renderTopRatedData();
            return;
        }
        var listEl = document.getElementById('trList');
        if (listEl) listEl.innerHTML = '<div class="wl-empty">Loading…</div>';

        fetch('/api/top-rated')
            .then(function(res) {
                if (!res.ok) throw new Error('HTTP ' + res.status);
                return res.json();
            })
            .then(function(data) {
                trFilms = (data && data.films) || [];
                trLoaded = true;
                trGenres = [];
                renderTopRatedData();
            })
            .catch(function() {
                var el = document.getElementById('trList');
                if (el) {
                    el.innerHTML = '<div class="wl-empty">❌ Không thể tải dữ liệu' +
                        '<br><button class="btn" onclick="StatsModule.retryTopRated()">🔄 Retry</button></div>';
                }
            });
    }

    // Palette for scatter genre colors (red/gold theme).
    var TR_GENRE_COLORS = ['#e50914', '#f5c518', '#60a5fa', '#4ade80', '#a78bfa',
        '#f472b6', '#fb923c', '#06b6d4', '#f87171', '#fcd34d', '#22c55e', '#c084fc',
        '#f9a8d4', '#93c5fd', '#6ee7b7', '#fde047'];

    // Deterministic jitter from imdb_id (0..1) — avoids dots stacking in a column.
    function trJitter(imdbId) {
        var h = 0;
        for (var i = 0; i < imdbId.length; i++) {
            h = (h * 31 + imdbId.charCodeAt(i)) % 997;
        }
        return (h % 100) / 100;
    }

    // Map a genre to a stable color index.
    function trGenreColor(genre) {
        var idx = 0;
        for (var i = 0; i < genre.length; i++) idx = (idx + genre.charCodeAt(i)) % TR_GENRE_COLORS.length;
        return TR_GENRE_COLORS[idx];
    }

    // All genre names present in the (filtered by legend) film set.
    function trAllGenres(films) {
        var seen = {};
        var out = [];
        films.forEach(function(f) {
            (f.genres || []).forEach(function(g) {
                if (!seen[g]) { seen[g] = true; out.push(g); }
            });
        });
        return out.sort();
    }

    // Render scatter + legend + list from cached /api/top-rated data.
    function renderTopRatedData() {
        var films = trFilms.filter(function(f) {
            if (f.year == null || f.rating == null) return false;
            if (!trGenres.length) return true;
            return (f.genres || []).some(function(g) { return trGenres.indexOf(g) >= 0; });
        });

        // Legend (all genres in the full set, always visible)
        var allGenres = trAllGenres(trFilms);
        var legendEl = document.getElementById('trLegend');
        if (legendEl) {
            legendEl.innerHTML = allGenres.map(function(g) {
                var active = trGenres.indexOf(g) >= 0;
                var c = trGenreColor(g);
                return '<button class="tr-genre-chip' + (active ? ' active' : '') + '"' +
                    ' style="--chip:' + c + '"' +
                    ' onclick="StatsModule.toggleTrGenre(\'' + esc(g) + '\')">' + esc(g) + '</button>';
            }).join('');
        }

        var infoEl = document.getElementById('trFilterInfo');
        if (infoEl) {
            infoEl.innerHTML = trGenres.length
                ? (films.length + ' films · ' + trGenres.join(', ') +
                    ' <button class="btn btn-sm" onclick="StatsModule.retryTopRated()">✕ Clear</button>')
                : (films.length + ' films');
        }

        // Scatter: one dataset per genre so color + legend-to-point mapping is clean.
        var byGenre = {};
        films.forEach(function(f) {
            var g = (f.genres && f.genres[0]) || 'Other';
            if (!byGenre[g]) byGenre[g] = [];
            byGenre[g].push(f);
        });
        var genreKeys = Object.keys(byGenre).sort();

        FilmData.destroyCharts();
        FilmData.createChart('chartTopRated', {
            type: 'scatter',
            data: {
                datasets: genreKeys.map(function(g) {
                    return {
                        label: g,
                        data: byGenre[g].map(function(f) {
                            return {
                                x: f.year + (trJitter(f.imdb_id) - 0.5) * 0.7,
                                y: f.rating,
                                imdb_id: f.imdb_id,
                                title: f.title,
                                poster: f.poster_url,
                                genres: f.genres,
                            };
                        }),
                        backgroundColor: trGenreColor(g),
                        pointRadius: 4,
                        pointHoverRadius: 7,
                        pointBorderColor: 'rgba(0,0,0,0.35)',
                        pointBorderWidth: 0.5,
                    };
                }),
            },
            options: Object.assign({}, FilmData.defaultChartOptions('', 'scatter'), {
                animation: { duration: 700, easing: 'easeOutQuart' },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(ctx) {
                                var p = ctx.raw;
                                return p.title + ' (' + p.x.toFixed(0) + ' · ⭐' + p.y + ')';
                            },
                        },
                    },
                },
                scales: {
                    x: {
                        grid: { color: '#222b45', drawBorder: false },
                        ticks: { color: '#64748b', font: { size: 10 } },
                        title: { display: true, text: 'Year', color: '#94a3b8', font: { size: 11 } },
                    },
                    y: {
                        grid: { color: '#222b45', drawBorder: false },
                        ticks: { color: '#64748b', font: { size: 10 } },
                        title: { display: true, text: 'IMDb Rating', color: '#94a3b8', font: { size: 11 } },
                        min: 0, max: 10,
                    },
                },
                onClick: function(e, els) {
                    var raw = els && els.length && els[0].element ? els[0].element.raw : null;
                    if (raw && raw.imdb_id) {
                        StatsModule.openDetailFromApi(raw.imdb_id);
                    }
                },
            }),
        });

        // Sorted list (by rating desc) with film rows + shared detail zone.
        var listEl = document.getElementById('trList');
        if (!listEl) return;
        if (!films.length) {
            listEl.innerHTML = emptyState('No films match the current genre filter.');
            return;
        }
        var sorted = films.slice().sort(function(a, b) { return (b.rating || 0) - (a.rating || 0); });

        // Horizontal portrait card rail (cuộn ngang, hover 3D nổi)
        listEl.innerHTML = '<div class="tr-rail-wrap">' +
            '<div class="tr-rail" id="trRail">' +
            sorted.map(function(f, i) {
                var posterHtml = f.poster_url
                    ? '<img class="tr-poster" src="' + esc(f.poster_url) + '" alt="" loading="lazy" ' +
                        'onerror="this.parentElement.classList.add(\'no-poster\');this.style.display=\'none\'">'
                    : '';
                var hasPosterClass = f.poster_url ? '' : ' no-poster';
                var rank = i < 3
                    ? '<span class="tr-rank tr-rank-' + (i + 1) + '">#' + (i + 1) + '</span>'
                    : '<span class="tr-rank">#' + (i + 1) + '</span>';
                var genresHtml = (f.genres || []).slice(0, 2).map(function(g) {
                    return '<span class="tr-genre">' + esc(g) + '</span>';
                }).join('');
                return '<div class="tr-card" style="--i:' + i + '" data-imdb="' + esc(f.imdb_id) + '"' +
                    ' onclick="StatsModule.openDetailFromApi(\'' + esc(f.imdb_id) + '\')">' +
                    '<div class="tr-poster-wrap' + hasPosterClass + '">' + posterHtml + rank +
                        '<div class="tr-poster-na">🎬</div>' +
                    '</div>' +
                    '<div class="tr-card-body">' +
                        '<div class="tr-card-title" title="' + esc(f.title) + '">' + esc(f.title) + '</div>' +
                        '<div class="tr-card-meta">' + (f.year || '?') + ' · <span class="tr-rating">⭐ ' + fmtRating(f.rating) + '</span></div>' +
                        (genresHtml ? '<div class="tr-card-genres">' + genresHtml + '</div>' : '') +
                    '</div>' +
                '</div>';
            }).join('') +
            '</div></div>';

        // 3D tilt: rotate card theo vị trí chuột trong từng card (desktop hover)
        setTimeout(function() {
            var rail = document.getElementById('trRail');
            if (!rail) return;
            rail.querySelectorAll('.tr-card').forEach(function(card) {
                card.addEventListener('mousemove', function(e) {
                    var r = card.getBoundingClientRect();
                    var px = (e.clientX - r.left) / r.width;
                    var py = (e.clientY - r.top) / r.height;
                    var rx = (0.5 - py) * 10;   // -5..5 deg
                    var ry = (px - 0.5) * 12;   // -6..6 deg
                    card.style.transform =
                        'perspective(900px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg) translateZ(18px) scale(1.06)';
                    card.style.zIndex = '2';
                });
                card.addEventListener('mouseleave', function() {
                    card.style.transform = '';
                    card.style.zIndex = '';
                });
            });
        }, 50);
    }

    // Toggle one genre chip in the multi-select legend.
    function toggleTrGenre(genre) {
        var i = trGenres.indexOf(genre);
        if (i >= 0) trGenres.splice(i, 1);
        else trGenres.push(genre);
        renderTopRatedData();
    }

    // Clear genre filters (keeps cached data).
    function retryTopRated() {
        trGenres = [];
        renderTopRatedData();
    }

    // ── Top Cast with expandable film lists ─────────

    var allActors = [];
    var allDirectors = [];
    var castTab = 'actors';
    var castSearch = '';
    var castPage = 0;
    var CAST_PAGE_SIZE = 10;
    var expandedPerson = null;  // name of currently expanded person
    var castLoaded = false;     // have we fetched /api/people once?

    // Fetch /api/people for both actors & directors, cache them.
    function getAllCastData() {
        if (castLoaded) return;
        fetch('/api/people?type=actor')
            .then(function(res) { return res.ok ? res.json() : Promise.reject(new Error('HTTP ' + res.status)); })
            .then(function(d) { allActors = (d && d.people) || []; return fetch('/api/people?type=director'); })
            .then(function(res) { return res.ok ? res.json() : Promise.reject(new Error('HTTP ' + res.status)); })
            .then(function(d) {
                allDirectors = (d && d.people) || [];
                castLoaded = true;
                render();
            })
            .catch(function() {
                var container = document.getElementById('statsContent');
                if (container) {
                    container.innerHTML = emptyState('❌ Không thể tải dữ liệu' +
                        '<br><button class="btn" onclick="StatsModule.retryPeople()">🔄 Retry</button>');
                }
            });
    }

    // Reload people data (drops cache so it refetches).
    function retryPeople() {
        castLoaded = false;
        allActors = [];
        allDirectors = [];
        getAllCastData();
    }

    function doCastSearch() {
        var input = document.getElementById('topCastSearch');
        castSearch = input ? input.value.toLowerCase().trim() : '';
        castPage = 0;
        expandedPerson = null;
        render();
    }

    function doClearCastSearch() {
        castSearch = '';
        castPage = 0;
        expandedPerson = null;
        // Also clear the input field so next render starts clean
        var input = document.getElementById('topCastSearch');
        if (input) input.value = '';
        render();
    }

    function doCastPage(dir) {
        castPage = Math.max(0, castPage + dir);
        expandedPerson = null;
        render();
    }

    function switchCastTab(tab) {
        castTab = tab;
        castPage = 0;
        expandedPerson = null;
        render();
    }

    function togglePersonExpand(personName) {
        if (expandedPerson === personName) {
            expandedPerson = null;
        } else {
            expandedPerson = personName;
        }
        render();
    }

    function renderPersonFilmsGrid(personName) {
        // Films come from /api/people payload (person.films) — no JSON lookup needed.
        var p = null;
        (castTab === 'actors' ? allActors : allDirectors).some(function(x) {
            if (x.name === personName) { p = x; return true; }
            return false;
        });
        var films = (p && p.films) || [];
        if (!films.length) return '<div class="person-films-loading">No films found</div>';

        // Mỗi film xuất hiện 1 lần (dedup imdb_id), sort rating desc
        var seen = {};
        var uniq = films.filter(function(f) {
            if (!f.imdb_id || seen[f.imdb_id]) return false;
            seen[f.imdb_id] = true;
            return true;
        });
        uniq.sort(function(a, b) { return (b.rating || 0) - (a.rating || 0); });

        var parts = [];
        parts.push('<div class="person-films-grid">');
        uniq.forEach(function(f) {
            var posterHtml = f.poster_url
                ? '<img class="pf-poster" src="' + esc(f.poster_url) + '" alt="" loading="lazy" ' +
                    'onerror="this.parentElement.classList.add(\'no-poster\');this.style.display=\'none\'">'
                : '';
            var noPoster = f.poster_url ? '' : ' no-poster';
            var genreChips = (f.genres || []).slice(0, 2).map(function(g) {
                return '<span class="genre-chip-sm">' + esc(g) + '</span>';
            }).join('');
            var votesText = f.votes ? ' · ' + fmtNum(f.votes) + ' votes' : '';
            parts.push('<div class="person-film-cd pf-card" onclick="event.stopPropagation();StatsModule.openDetailFromApi(\'' + esc(f.imdb_id) + '\')" title="' + esc(f.title) + '">' +
                '<div class="pf-poster-wrap' + noPoster + '">' + posterHtml +
                    '<div class="pf-poster-na">🎬</div>' +
                '</div>' +
                '<div class="cd-film-info">' +
                '<div class="cd-film-title">' + esc(f.title) + '</div>' +
                '<div class="cd-film-meta">' + (f.year || '?') + (f.rating ? ' ⭐' + f.rating : '') + votesText + '</div>' +
                (genreChips ? '<div class="cd-film-genres">' + genreChips + '</div>' : '') +
                '</div></div>');
        });
        parts.push('</div>');

        return parts.join('');
    }

    function renderPeople() {
        getAllCastData();

        if (!castLoaded) {
            return '<div class="people-container"><div class="wl-empty">Loading…</div></div>';
        }

        var list = castTab === 'actors' ? allActors : allDirectors;

        // Filter
        var filtered = list;
        if (castSearch) {
            filtered = list.filter(function(p) {
                return p.name.toLowerCase().indexOf(castSearch) >= 0;
            });
        }

        var totalPages = Math.ceil(filtered.length / CAST_PAGE_SIZE) || 1;
        var page = Math.min(castPage, totalPages - 1);
        var start = page * CAST_PAGE_SIZE;
        var pageItems = filtered.slice(start, start + CAST_PAGE_SIZE);

        var html = '<div class="people-container">';

        // Tabs
        html += '<div class="topcast-tabs" style="display:flex;gap:0;margin-bottom:16px;border:1px solid var(--color-border);border-radius:var(--radius-md);overflow:hidden;">';
        html += '<button class="btn" style="border:0;border-radius:0;flex:1;' + (castTab==='actors'?'background:var(--color-primary-bg);color:var(--color-primary);':'') +
            '" onclick="StatsModule.switchCastTab(\'actors\')">🎭 Actors (' + allActors.length + ')</button>';
        html += '<button class="btn" style="border:0;border-radius:0;flex:1;' + (castTab==='directors'?'background:var(--color-primary-bg);color:var(--color-primary);':'') +
            '" onclick="StatsModule.switchCastTab(\'directors\')">🎬 Directors (' + allDirectors.length + ')</button>';
        html += '</div>';

        // Search
        html += '<div class="topcast-search">' +
            '<input type="text" id="topCastSearch" placeholder="Search ' + (castTab==='actors'?'actor':'director') + '..." value="' + esc(castSearch) + '" oninput="StatsModule.doCastSearch()">' +
            '<button class="btn btn-sm" onclick="StatsModule.doClearCastSearch()">✕ Clear</button>' +
            '</div>' +
            (castSearch ? '<div class="topcast-result-count">🎯 Found ' + filtered.length + ' ' + (castTab==='actors'?'actors':'directors') + '</div>' : '');

        if (!pageItems.length) {
            html += '<div class="wl-empty">No ' + (castTab==='actors'?'actors':'directors') + ' found</div>';
            html += '</div>';
            return html;
        }

        // Table with expandable rows
        var icon = castTab === 'actors' ? '🎭' : '🎬';
        html += '<table class="stats-table people-table">' +
            '<thead><tr><th>#</th><th></th><th>' + (castTab==='actors'?'Actor':'Director') + '</th><th class="text-right">Avg ⭐</th><th class="text-right">Films</th><th></th></tr></thead><tbody>';

        pageItems.forEach(function(p, i) {
            var avatarHtml = p.photo_url
                ? '<img class="avatar-thumb avatar-portrait" src="' + esc(p.photo_url) + '" alt="' + esc(p.name) + '">'
                : '<div class="avatar-thumb-fallback avatar-portrait">' + icon + '</div>';
            var isExpanded = (expandedPerson === p.name);
            html += '<tr class="person-row' + (isExpanded ? ' person-expanded' : '') + '" onclick="StatsModule.togglePersonExpand(\'' + esc(p.name) + '\')">' +
                '<td>' + (start + i + 1) + '</td>' +
                '<td class="avatar-col">' + avatarHtml + '</td>' +
                '<td>' + esc(p.name) + '</td>' +
                '<td class="text-right" style="color:var(--color-star);">' + fmtRating(p.avg_rating) + '</td>' +
                '<td class="text-right">' + p.film_count + '</td>' +
                '<td style="text-align:center;width:30px;"><span class="expand-arrow">▶</span></td></tr>';

            // Expandable film grid row
            html += '<tr class="person-films-row' + (isExpanded ? ' person-films-visible' : '') + '">' +
                '<td colspan="6"><div class="person-films-inner">' +
                renderPersonFilmsGrid(p.name) +
                '</div></td></tr>';
        });

        html += '</tbody></table>';

        // Pagination (inside viewport)
        html += '<div class="topcast-pagination">' +
            '<button class="page-btn" onclick="StatsModule.doCastPage(-1)"' + (page <= 0 ? ' disabled' : '') + '>← Prev</button>' +
            '<span class="page-info">Page ' + (page + 1) + ' of ' + totalPages + ' (' + filtered.length + ' ' + (castTab==='actors'?'actors':'directors') + ')</span>' +
            '<button class="page-btn" onclick="StatsModule.doCastPage(1)"' + (page >= totalPages - 1 ? ' disabled' : '') + '>Next →</button>' +
            '</div>';

        html += '</div>';
        return html;
    }

    // ── Watch Providers ─────────────────────────────

    function renderWatchProviders() {
      var stats = FilmData.getStats();
      if (!stats) return emptyState();

      var providers = FilmData.getTopWatchProviders(20);
      if (!providers.length) return emptyState('No provider data');

      var maxCount = providers[0].count;

      var html = '<div style="margin-bottom:20px;">' +
        '<div class="chart-title">📺 Top Streaming Platforms (by film availability)</div>' +
        '<p class="text-muted" style="font-size:0.82rem;margin-bottom:16px;">' +
        'Based on ' + FilmData.getFilms().length + ' films in library.</p></div>';

      html += '<table class="stats-table">' +
        '<thead><tr>' +
        '<th>#</th><th>Platform</th><th>Films Available</th>' +
        '</tr></thead><tbody>';

      providers.forEach(function(p, i) {
        var barW = FilmData.calcBarPercent(p.count, maxCount);
        html += '<tr>' +
          '<td>' + (i + 1) + '</td>' +
          '<td><strong>' + esc(p.name) + '</strong></td>' +
          '<td><div class="bar-cell"><div class="bar-track"><div class="bar-fill bar-fill-dl" style="width:' + barW + '%;"></div></div><span class="bar-value">' + fmtNum(p.count) + ' films</span></div></td>' +
          '</tr>';
      });

      html += '</tbody></table>';
      return html;
    }

    // ── Top Downloads Cards ─────────────────────────

    function renderTopDownloadsCards() {
      var stats = FilmData.getStats();
      if (!stats || !stats.top_downloads || !stats.top_downloads.length) {
        return emptyState();
      }

      var items = stats.top_downloads.map(function(item) {
        return FilmData.enrichItemWithFilmData(item);
      });

      var maxDl = items[0].total_dl || 1;

      var html = renderViewToggle('topdl');
      html += '<div class="stats-card-scroll">';

      items.forEach(function(item, i) {
        var thumbHtml = item.poster_url
          ? '<img src="' + esc(item.poster_url) + '" alt="' + esc(item.title) + '">'
          : '<div class="stats-card-thumb-na">🎬</div>';

        var barW = FilmData.calcBarPercent(item.total_dl, maxDl);

        html += '<div class="stats-card-item" onclick="StatsModule.selectFilm(\'' + esc(item.imdb_id) + '\')">' +
          '<div class="stats-card-rank">#' + (i + 1) + '</div>' +
          '<div class="stats-card-thumb">' + thumbHtml + '</div>' +
          '<div class="stats-card-item-title">' + esc(item.title) + '</div>' +
          '<div class="stats-card-bar"><div class="stats-card-bar-fill stats-card-bar-fill-dl" style="width:' + barW + '%;"></div></div>' +
          '<span class="stats-card-value">' + fmtNum(item.total_dl) + ' downloads</span>' +
          '</div>';
      });

      html += '</div>';
      return wrapWithDetail(html);
    }

    // ── Top Rated Cards ────────────────────────────

    function renderTopRatedCards() {
      var stats = FilmData.getStats();
      if (!stats || !stats.top_rated || !stats.top_rated.length) {
        return emptyState('No data (needs ≥1000 votes)');
      }

      var items = stats.top_rated.slice(0, 50).map(function(item) {
        return FilmData.enrichItemWithFilmData(item);
      });

      var maxRating = items.length ? Math.max(10, items[0].rating || 10) : 10;

      var html = renderViewToggle('toprt');
      html += '<div class="stats-card-scroll">';

      items.forEach(function(item, i) {
        var thumbHtml = item.poster_url
          ? '<img src="' + esc(item.poster_url) + '" alt="' + esc(item.title) + '">'
          : '<div class="stats-card-thumb-na">🎬</div>';

        var barW = FilmData.calcBarPercent(item.rating, maxRating);

        html += '<div class="stats-card-item" onclick="StatsModule.selectFilm(\'' + esc(item.imdb_id) + '\')">' +
          '<div class="stats-card-rank">#' + (i + 1) + '</div>' +
          '<div class="stats-card-thumb">' + thumbHtml + '</div>' +
          '<div class="stats-card-item-title">' + esc(item.title) + '</div>' +
          '<div class="stats-card-bar"><div class="stats-card-bar-fill stats-card-bar-fill-rating" style="width:' + barW + '%;"></div></div>' +
          '<span class="stats-card-value">⭐ ' + fmtRating(item.rating) + '</span>' +
          '</div>';
      });

      html += '</div>';
      return wrapWithDetail(html);
    }

    // ── Watch Providers Cards ──────────────────────

    function renderWatchProvidersCards() {
      var stats = FilmData.getStats();
      if (!stats) return emptyState();

      var providers = FilmData.getTopWatchProviders(20);
      if (!providers.length) return emptyState('No provider data');

      var maxCount = providers[0].count;

      var html = renderViewToggle('providers');
      html += '<div style="margin-bottom:20px;">' +
        '<div class="chart-title">📺 Top Streaming Platforms (by film availability)</div>' +
        '<p class="text-muted" style="font-size:0.82rem;margin-bottom:16px;">' +
        'Based on ' + FilmData.getFilms().length + ' films in library.</p></div>';

      html += '<div class="stats-card-scroll">';

      providers.forEach(function(p, i) {
        var barW = FilmData.calcBarPercent(p.count, maxCount);
        html += '<div class="stats-card-item">' +
          '<div class="stats-card-rank">#' + (i + 1) + '</div>' +
          '<div class="stats-card-thumb">' +
          '<div class="stats-card-thumb-na" style="font-size:1rem;">📺</div></div>' +
          '<div class="stats-card-item-title">' + esc(p.name) + '</div>' +
          '<div class="stats-card-bar"><div class="stats-card-bar-fill stats-card-bar-fill-dl" style="width:' + barW + '%;"></div></div>' +
          '<span class="stats-card-value">' + fmtNum(p.count) + ' films</span>' +
          '</div>';
      });

      html += '</div>';
      return html;
    }

    // ── Distributions (Charts) — unchanged ───────────

    function renderDistributions() {
        var stats = FilmData.getStats();
        if (!stats) return emptyState();

        var html = '' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">' +
            '<div class="chart-container">' +
            '<div class="chart-title">📅 Phân bố theo năm</div>' +
            '<canvas id="chartYearDist"></canvas>' +
            '</div>' +
            '<div class="chart-container">' +
            '<div class="chart-title">⭐ Phân bố rating</div>' +
            '<canvas id="chartRatingDist"></canvas>' +
            '</div>' +
            '<div class="chart-container" style="grid-column:1/-1;">' +
            '<div class="chart-title">🧩 Thể loại phổ biến</div>' +
            '<canvas id="chartGenreDist"></canvas>' +
            '</div>' +
            '</div>';

        setTimeout(function() {
            renderDistCharts(stats);
        }, 50);

        return html;
    }

    function renderDistCharts(stats) {
        FilmData.destroyCharts();

        var colors = {
            primary: '#e50914',
            reds: ['#e50914', '#f40612', '#f87171', '#fca5a5'],
            golds: ['#f5c518', '#fbbf24', '#fcd34d', '#fde68a'],
        };

        // Year distribution
        var yearData = stats.year_distribution || [];
        if (yearData.length && document.getElementById('chartYearDist')) {
            FilmData.createChart('chartYearDist', {
                type: 'bar',
                data: {
                    labels: yearData.map(function(d) { return d.year; }),
                    datasets: [{
                        label: 'Films',
                        data: yearData.map(function(d) { return d.count; }),
                        backgroundColor: colors.reds[0] + '80',
                        borderColor: colors.reds[0],
                        borderWidth: 1,
                        borderRadius: 2,
                    }],
                },
                options: FilmData.defaultChartOptions('', 'bar'),
            });
        }

        // Rating distribution
        var ratingData = stats.rating_distribution || [];
        if (ratingData.length && document.getElementById('chartRatingDist')) {
            var bgColors = ['#ef444480', '#f59e0b80', '#f5c51880', '#4ade8080', '#22c55e80', '#06b6d480'];
            var borderColors = ['#ef4444', '#f59e0b', '#f5c518', '#4ade80', '#22c55e', '#06b6d4'];
            FilmData.createChart('chartRatingDist', {
                type: 'bar',
                data: {
                    labels: ratingData.map(function(d) { return d.bucket; }),
                    datasets: [{
                        label: 'Films',
                        data: ratingData.map(function(d) { return d.count; }),
                        backgroundColor: ratingData.map(function(_, i) { return bgColors[i % bgColors.length]; }),
                        borderColor: ratingData.map(function(_, i) { return borderColors[i % borderColors.length]; }),
                        borderWidth: 1,
                        borderRadius: 2,
                    }],
                },
                options: FilmData.defaultChartOptions('', 'bar'),
            });
        }

        // Genre distribution
        var genreData = (stats.genre_distribution || []).slice(0, 15);
        if (genreData.length && document.getElementById('chartGenreDist')) {
            var bgColor = genreData.map(function(_, i) {
                var pal = [colors.reds, colors.golds];
                return pal[i % 2][Math.floor(i / 2) % 4] + '80';
            });
            FilmData.createChart('chartGenreDist', {
                type: 'bar',
                data: {
                    labels: genreData.map(function(d) { return d.genre; }),
                    datasets: [{
                        label: 'Films',
                        data: genreData.map(function(d) { return d.count; }),
                        backgroundColor: bgColor,
                        borderColor: bgColor.map(function(c) { return c.replace('80', ''); }),
                        borderWidth: 1,
                        borderRadius: 2,
                    }],
                },
                options: Object.assign({}, FilmData.defaultChartOptions('', 'bar'), {
                    indexAxis: 'y',
                }),
            });
        }
    }

    // ── Render active tab ──────────────────────────

    function render() {
        var container = document.getElementById('statsContent');
        if (!container) return;

        // Save focus state for people search
        var savedFocus = null;
        if (currentTab === 'people') {
            var inp = document.getElementById('topCastSearch');
            if (inp && document.activeElement === inp) {
                savedFocus = { start: inp.selectionStart, end: inp.selectionEnd };
            }
        }

        switch (currentTab) {
            case 'new':
                // API-based: render shell first, then fetch data async.
                // Preserve the user's last window (naDays) / day filter (naSelectedDay).
                container.innerHTML = renderNewArrivals();
                loadNewArrivals(naDays, naSelectedDay);
                break;
            case 'topdl':
                // API-based: render shell first, then fetch data async.
                container.innerHTML = renderTopDownloads();
                loadTopDownloads();
                break;
            case 'toprt':
                // API-based: render shell first, then fetch data async.
                container.innerHTML = renderTopRated();
                loadTopRated();
                break;
            case 'people':
                container.innerHTML = wrapWithDetail(renderPeople());
                break;
            case 'providers':
                container.innerHTML = renderWatchProviders();
                break;
            case 'dist':
                container.innerHTML = renderDistributions();
                break;
            default:
                container.innerHTML = '';
        }

        // Restore focus for people search
        if (currentTab === 'people' && savedFocus) {
            var inp = document.getElementById('topCastSearch');
            if (inp) {
                inp.focus();
                inp.selectionStart = savedFocus.start;
                inp.selectionEnd = savedFocus.end;
            }
        }
    }

    // ── Init ───────────────────────────────────────

    function init() {
        document.querySelectorAll('.st-tab').forEach(function(tab) {
            tab.addEventListener('click', function() {
                document.querySelectorAll('.st-tab').forEach(function(t) {
                    t.classList.remove('active');
                });
                tab.classList.add('active');
                currentTab = tab.dataset.st;
                // Reset selection when switching tab groups
                if (currentTab !== 'new' && currentTab !== 'topdl' && currentTab !== 'toprt' && currentTab !== 'providers' && currentTab !== 'people') {
                    selectedFilm = null;
                }
                newVersionFilter = false;
                render();
            });
        });

        render();
    }

    // Switch subtab from the sidebar submenu (mirrors the st-tab handler above)
    function renderSubtab(st) {
        currentTab = st;
        // Reset selection when switching tab groups
        if (currentTab !== 'new' && currentTab !== 'topdl' && currentTab !== 'toprt' && currentTab !== 'providers' && currentTab !== 'people') {
            selectedFilm = null;
        }
        newVersionFilter = false;
        render();
    }

    return {
        init: init,
        render: render,
        renderSubtab: renderSubtab,
        selectFilm: selectFilm,
        selectPersonFilms: selectPersonFilms,
        renderPeople: renderPeople,
        doCastSearch: doCastSearch,
        doClearCastSearch: doClearCastSearch,
        doCastPage: doCastPage,
        switchCastTab: switchCastTab,
        togglePersonExpand: togglePersonExpand,
        retryPeople: retryPeople,
        toggleNewVersionFilter: toggleNewVersionFilter,
        switchStatsView: switchStatsView,
        // V4 API subtabs
        loadNewArrivals: loadNewArrivals,
        renderNewArrivals: renderNewArrivals,
        renderNewArrivalsData: renderNewArrivalsData,
        selectNewArrivalDay: selectNewArrivalDay,
        selectNewArrivalRange: selectNewArrivalRange,
        retryNewArrivals: retryNewArrivals,
        openDetailFromApi: openDetailFromApi,
        toggleDetailZone: toggleDetailZone,
        // V4 Top Downloads
        loadTopDownloads: loadTopDownloads,
        renderTopDownloads: renderTopDownloads,
        renderTopDownloadsData: renderTopDownloadsData,
        filterDlByYear: filterDlByYear,
        filterDlByGenre: filterDlByGenre,
        retryTopDownloads: retryTopDownloads,
        // V4 Top Rated (scatter + legend)
        loadTopRated: loadTopRated,
        renderTopRated: renderTopRated,
        renderTopRatedData: renderTopRatedData,
        toggleTrGenre: toggleTrGenre,
        retryTopRated: retryTopRated,
    };
})();
