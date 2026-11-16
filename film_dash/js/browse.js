// ═══════════════════════════════════════════════════
// Browse Module — Film cards, filters, grid/list view
// ═══════════════════════════════════════════════════

const BrowseModule = (() => {
    let currentView = 'grid';
    let currentFilters = {};

    // ── HTML helpers ───────────────────────────────
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

    function fmtSize(gb) {
        if (gb == null) return '—';
        return gb.toFixed(1) + ' GB';
    }

    // ── Render film card (grid) ────────────────────
    function renderFilmCard(film) {
        const hasTrailer = !!film.trailer_url;
        const genres = film.genres?.slice(0, 3) || [];
        const topActors = film.actors?.slice(0, 3) || [];
        const topDirectors = film.directors?.slice(0, 2) || [];
        const versionCount = countVersions(film);

        return `<div class="film-card" data-imdb="${esc(film.imdb_id)}"
                onclick="FilmDetail.openModal(FilmData.getFilmByImdb('${esc(film.imdb_id)}'))">
            ${film.poster_url
                ? `<img class="film-card-poster" src="${esc(film.poster_url)}" alt="${esc(film.title)}" loading="lazy">`
                : `<div class="film-card-poster-placeholder">🎬</div>`
            }
            <div class="film-card-body">
                <div class="film-card-title">${esc(film.title)}</div>
                <div class="film-card-meta">
                    <span>${film.year || '?'}</span>
                    ${film.rating ? `<span class="film-card-rating">⭐ ${film.rating}</span>` : ''}
                </div>
            </div>
            <div class="film-card-overlay">
                ${genres.length ? `<div class="film-card-genres">
                    ${genres.map(function(g) { return FilmData.getGenreChip(g); }).join('')}
                </div>` : ''}
                ${topActors.length || topDirectors.length ? `<div class="film-card-cast">
                    ${topDirectors.length ? `<span>🎬 ${topDirectors.map(d => esc(d.name)).join(', ')}</span>` : ''}
                    ${topActors.length ? `<span>🎭 ${topActors.map(a => esc(a.name)).join(', ')}</span>` : ''}
                </div>` : ''}
                ${versionCount > 0 ? `<div class="film-card-files">📁 ${versionCount} file</div>` : ''}
            </div>
            <div class="film-card-actions">
                <button class="action-btn" onclick="event.stopPropagation();FilmDetail.openModal(FilmData.getFilmByImdb('${esc(film.imdb_id)}'))">
                    📂 Details
                </button>
                ${versionCount > 0
                    ? `<button class="action-btn" onclick="event.stopPropagation();FilmDetail.openModal(FilmData.getFilmByImdb('${esc(film.imdb_id)}'))">📥 Files</button>`
                    : ''}
                ${hasTrailer
                    ? `<button class="action-btn" onclick="event.stopPropagation();TrailerPlayer.play('${esc(film.trailer_url)}', '${esc(film.title)}')">▶ Trailer</button>`
                    : ''}
            </div>
        </div>`;
    }

    // ── Render film list item ──────────────────────
    function renderFilmListItem(film) {
        const genres = film.genres?.slice(0, 2) || [];
        return `<div class="film-list-item" data-imdb="${esc(film.imdb_id)}"
                onclick="FilmDetail.openModal(FilmData.getFilmByImdb('${esc(film.imdb_id)}'))">
            ${film.poster_url
                ? `<img class="list-poster" src="${esc(film.poster_url)}" alt="" loading="lazy">`
                : `<div class="list-poster" style="display:flex;align-items:center;justify-content:center;font-size:1.5rem;">🎬</div>`
            }
            <div class="list-info">
                <div class="list-title">${esc(film.title)} <span style="color:var(--color-text-muted);">(${film.year || '?'})</span></div>
                <div class="list-meta">
                    ${film.rating ? `⭐ ${film.rating} · ` : ''}
                    ${genres.map(function(g) { return FilmData.getGenreChip(g); }).join(' ')}
                    ${film.folders?.length ? ` · ${countVersions(film)} file` : ''}
                </div>
            </div>
            <span style="font-size:0.75rem;color:var(--color-text-muted);">→</span>
        </div>`;
    }

    function getBestResolution(film) {
        let best = '';
        film.folders?.forEach(f => {
            f.versions?.forEach(v => {
                if (v.resolution && (v.resolution > best || !best)) best = v.resolution;
            });
        });
        return best;
    }

    function countVersions(film) {
        let c = 0;
        film.folders?.forEach(f => { c += f.versions?.length || 0; });
        return c;
    }

    // ── Render filtered films ──────────────────────
    function renderFilms(films) {
        const grid = document.getElementById('filmGrid');
        const list = document.getElementById('filmList');
        const count = document.getElementById('browseCount');

        if (!grid || !list) return;

        if (currentView === 'grid') {
            grid.innerHTML = films.map(renderFilmCard).join('');
            grid.classList.remove('hidden');
            list.classList.add('hidden');
        } else {
            list.innerHTML = films.map(renderFilmListItem).join('');
            list.classList.remove('hidden');
            grid.classList.add('hidden');
        }

        if (count) {
            count.textContent = `${films.length} films`;
        }
    }

    // ── Apply filters and re-render ────────────────
    function applyFilters() {
        const filters = readFilters();
        currentFilters = filters;
        const filtered = FilmData.filterFilms(filters);
        renderFilms(filtered);
    }

    function readFilters() {
        return {
            search: document.getElementById('filterSearch')?.value || '',
            genre: document.getElementById('filterGenre')?.value || '',
            yearFrom: document.getElementById('filterYearFrom')?.value || '',
            yearTo: document.getElementById('filterYearTo')?.value || '',
            ratingMin: document.getElementById('filterRatingMin')?.value || '',
            resolution: document.getElementById('filterResolution')?.value || '',
            person: document.getElementById('filterPerson')?.value || '',
        };
    }

    // ── Populate filter dropdowns ──────────────────
    function populateFilters() {
        // Genres
        const genreSel = document.getElementById('filterGenre');
        if (genreSel) {
            const genres = FilmData.getAllGenres();
            genres.forEach(g => {
                const opt = document.createElement('option');
                opt.value = g;
                opt.textContent = g;
                genreSel.appendChild(opt);
            });
        }

        // Rating
        // Already static HTML

        // Resolution
        // Already static HTML

        // Person suggestions (actors/directors)
        const personInput = document.getElementById('filterPerson');
        const suggestionsBox = document.getElementById('personSuggestions');
        if (personInput && suggestionsBox) {
            // Build unique person list
            const persons = new Map();
            FilmData.getFilms().forEach(f => {
                f.actors?.forEach(a => persons.set(a.name, a.name));
                f.directors?.forEach(d => persons.set(d.name, d.name));
            });
            const personList = Array.from(persons.keys()).sort();

            personInput.addEventListener('input', () => {
                const q = personInput.value.toLowerCase().trim();
                if (!q) {
                    suggestionsBox.classList.remove('active');
                    return;
                }
                const matches = personList.filter(p =>
                    p.toLowerCase().includes(q)
                ).slice(0, 20);
                if (matches.length) {
                    suggestionsBox.innerHTML = matches.map(m =>
                        `<div class="suggestion-item" data-value="${esc(m)}">${esc(m)}</div>`
                    ).join('');
                    suggestionsBox.classList.add('active');

                    // Click to select
                    suggestionsBox.querySelectorAll('.suggestion-item').forEach(el => {
                        el.addEventListener('click', () => {
                            personInput.value = el.dataset.value;
                            suggestionsBox.classList.remove('active');
                            applyFilters();
                        });
                    });
                } else {
                    suggestionsBox.classList.remove('active');
                }
            });

            // Hide on blur (with delay for click)
            personInput.addEventListener('blur', () => {
                setTimeout(() => suggestionsBox.classList.remove('active'), 200);
            });
        }
    }

    // ── Init ───────────────────────────────────────
    function init() {
        // Filter events
        const filterIds = ['filterSearch', 'filterGenre', 'filterYearFrom', 'filterYearTo',
                           'filterRatingMin', 'filterResolution', 'filterPerson'];
        filterIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', applyFilters);
                el.addEventListener('change', applyFilters);
            }
        });

        // Debounce search
        const searchInput = document.getElementById('filterSearch');
        if (searchInput) {
            let timer;
            searchInput.addEventListener('input', () => {
                clearTimeout(timer);
                timer = setTimeout(applyFilters, 300);
            });
        }

        // Reset
        const resetBtn = document.getElementById('resetBrowseFilters');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                document.querySelectorAll('.browse-filters input, .browse-filters select').forEach(el => {
                    el.value = '';
                });
                applyFilters();
            });
        }

        // View toggle
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentView = btn.dataset.view;
                applyFilters();
            });
        });

        // Populate filters
        populateFilters();

        // Initial render
        applyFilters();
    }

    return { init, applyFilters, renderFilms };
})();
