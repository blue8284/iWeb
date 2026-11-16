// ═══════════════════════════════════════════════════
// Data Module — Fshare Film Dashboard
// Loads JSON from data/*.json, provides getter functions
// ═══════════════════════════════════════════════════

const FilmData = (() => {
    let films = [];
    let watchlist = null;
    let stats = null;
    let loaded = false;
    let loadPromise = null;

    const charts = {};
    let chartsInited = false;

    // ── Load all JSON files ────────────────────────
    async function load() {
        if (loadPromise) return loadPromise;
        loadPromise = (async () => {
            try {
                const [filmsResp, wlResp, statsResp] = await Promise.all([
                    fetch('data/films.json'),
                    fetch('data/watchlist.json'),
                    fetch('data/stats.json'),
                ]);
                films = await filmsResp.json();
                watchlist = await wlResp.json();
                stats = await statsResp.json();
                loaded = true;
                console.log(`📊 FilmData: ${films.length} films loaded`);
                return true;
            } catch (err) {
                console.error('❌ FilmData load error:', err);
                return false;
            }
        })();
        return loadPromise;
    }

    // ── Getters ────────────────────────────────────
    function getFilms() { return films; }
    function getWatchlist() { return watchlist; }
    function getStats() { return stats; }
    function isLoaded() { return loaded; }

    function getFilmByImdb(imdbId) {
        return films.find(f => f.imdb_id === imdbId);
    }

    // Extract all unique genres
    function getAllGenres() {
        const set = new Set();
        films.forEach(f => {
            if (f.genres) f.genres.forEach(g => set.add(g));
        });
        return Array.from(set).sort();
    }

    // Extract all unique years
    function getAllYears() {
        const set = new Set();
        films.forEach(f => {
            if (f.year) set.add(f.year);
        });
        return Array.from(set).sort((a, b) => b - a);
    }

    // ── Person lookup ──────────────────────────────
    function getFilmsByPerson(name) {
        if (!name) return [];
        var q = name.toLowerCase().trim();
        return films.filter(function(f) {
            var actorMatch = f.actors && f.actors.some(function(a) {
                return (a.name || '').toLowerCase() === q;
            });
            var dirMatch = f.directors && f.directors.some(function(d) {
                return (d.name || '').toLowerCase() === q;
            });
            return actorMatch || dirMatch;
        });
    }

    // ── All persons lookup ─────────────────────────
    function getAllActors() {
        var map = {};
        films.forEach(function(f) {
            if (!f.actors) return;
            f.actors.forEach(function(a) {
                var name = a.name;
                if (!name) return;
                if (!map[name]) {
                    map[name] = { name: name, imdb_id: a.imdb_id, photo_url: a.photo_url, film_count: 0, total_rating: 0 };
                }
                map[name].film_count++;
                if (f.rating) map[name].total_rating += f.rating;
            });
        });
        var result = Object.keys(map).map(function(k) {
            var p = map[k];
            p.avg_rating = p.total_rating / p.film_count;
            return p;
        });
        result.sort(function(a, b) { return (b.avg_rating || 0) - (a.avg_rating || 0); });
        return result;
    }

    function getAllDirectors() {
        var map = {};
        films.forEach(function(f) {
            if (!f.directors) return;
            f.directors.forEach(function(d) {
                var name = d.name;
                if (!name) return;
                if (!map[name]) {
                    map[name] = { name: name, imdb_id: d.imdb_id, photo_url: d.photo_url, film_count: 0, total_rating: 0 };
                }
                map[name].film_count++;
                if (f.rating) map[name].total_rating += f.rating;
            });
        });
        var result = Object.keys(map).map(function(k) {
            var p = map[k];
            p.avg_rating = p.total_rating / p.film_count;
            return p;
        });
        result.sort(function(a, b) { return (b.avg_rating || 0) - (a.avg_rating || 0); });
        return result;
    }

    // ── Genre Icons ───────────────────────────────
    const GENRE_ICONS = {
        'Action': '⚔️', 'Adventure': '🏔️', 'Animation': '🎨',
        'Comedy': '😂', 'Crime': '🔫', 'Drama': '🎭',
        'Fantasy': '🧙', 'Horror': '👻', 'Romance': '💕',
        'Sci-Fi': '🤖', 'Thriller': '🔪', 'Mystery': '🔍',
        'Documentary': '📽️', 'Family': '👨‍👩‍👧', 'War': '🪖',
        'Music': '🎵', 'History': '📜', 'Western': '🤠',
    };
    const GENRE_ICON_FALLBACK = '🎬';

    function getGenreIcon(genre) {
        return GENRE_ICONS[genre] || GENRE_ICON_FALLBACK;
    }

    function escHtml(s) {
        if (s == null) return '';
        return String(s).replace(/[&<>"']/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            if (m === '"') return '&quot;';
            if (m === "'") return '&#039;';
            return m;
        });
    }

    function getGenreChip(genre) {
        var icon = getGenreIcon(genre);
        var cls = 'genre-chip genre-chip-' + genre.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
        return '<span class="' + cls + '">' + icon + ' ' + escHtml(genre) + '</span>';
    }

    function calcBarPercent(value, max) {
        if (!max || !value) return 0;
        return Math.min(100, Math.round((value / max) * 100));
    }

    function enrichItemWithFilmData(item) {
        var film = getFilmByImdb(item.imdb_id);
        return {
            title: item.title || 'Unknown',
            year: item.year,
            imdb_id: item.imdb_id,
            poster_url: item.poster_url || (film ? film.poster_url : ''),
            genres: item.genres || (film ? (film.genres || []) : []),
            rating: item.rating,
            votes: item.votes,
            total_dl: item.total_dl,
        };
    }

    function getTopWatchProviders(limit) {
        limit = limit || 20;
        var counts = {};
        films.forEach(function(f) {
            if (!f.watch_providers || typeof f.watch_providers !== 'object') return;
            var seen = {};
            Object.keys(f.watch_providers).forEach(function(country) {
                var data = f.watch_providers[country];
                ['flatrate', 'rent', 'buy'].forEach(function(kind) {
                    if (!data[kind]) return;
                    data[kind].forEach(function(p) {
                        var name = p.provider_name;
                        if (!seen[name]) {
                            counts[name] = (counts[name] || 0) + 1;
                            seen[name] = true;
                        }
                    });
                });
            });
        });
        return Object.keys(counts)
            .sort(function(a, b) { return counts[b] - counts[a]; })
            .slice(0, limit)
            .map(function(name) { return { name: name, count: counts[name] }; });
    }

    var KNOWN_PROVIDERS = [
        'Netflix', 'Amazon Prime Video', 'Apple TV', 'Disney+', 'HBO Max',
        'Disney Plus', 'Hulu', 'Paramount Plus', 'Peacock Premium',
    ];

    function getWatchProvidersText(providers, max) {
        max = max || 6;
        if (!providers || typeof providers !== 'object') return null;
        var seen = {};
        Object.keys(providers).forEach(function(country) {
            var data = providers[country];
            ['flatrate', 'rent', 'buy'].forEach(function(kind) {
                if (!data[kind]) return;
                data[kind].forEach(function(p) {
                    seen[p.provider_name] = true;
                });
            });
        });
        var names = Object.keys(seen);
        if (!names.length) return null;
        var sorted = KNOWN_PROVIDERS.filter(function(k) { return seen[k]; });
        names.forEach(function(n) {
            if (sorted.indexOf(n) === -1) sorted.push(n);
        });
        var chips = sorted.slice(0, max).map(function(name) {
            return '<span class="provider-badge">' + escHtml(name) + '</span>';
        }).join('');
        if (sorted.length > max) {
            chips += ' <span class="provider-more">+' + (sorted.length - max) + ' more</span>';
        }
        return '<span class="watch-provider-label">Watch on:</span> ' + chips;
    }

    // Filter films
    function filterFilms({ search, genre, yearFrom, yearTo, ratingMin, resolution, person } = {}) {
        return films.filter(film => {
            // Search: title, actors, directors
            if (search) {
                const q = search.toLowerCase();
                const titleMatch = (film.title || '').toLowerCase().includes(q);
                const actorMatch = film.actors?.some(a =>
                    (a.name || '').toLowerCase().includes(q));
                const dirMatch = film.directors?.some(d =>
                    (d.name || '').toLowerCase().includes(q));
                if (!titleMatch && !actorMatch && !dirMatch) return false;
            }

            // Genre
            if (genre && (!film.genres || !film.genres.includes(genre))) return false;

            // Year range
            if (yearFrom && film.year < parseInt(yearFrom)) return false;
            if (yearTo && film.year > parseInt(yearTo)) return false;

            // Rating min
            if (ratingMin && (film.rating === null || film.rating < parseFloat(ratingMin))) return false;

            // Resolution: check if any version in any folder has matching resolution
            if (resolution) {
                const hasRes = film.folders?.some(folder =>
                    folder.versions?.some(v =>
                        (v.resolution || '').toLowerCase() === resolution.toLowerCase()
                    )
                );
                if (!hasRes) return false;
            }

            // Person (actor/director name)
            if (person) {
                const q = person.toLowerCase();
                const actorMatch = film.actors?.some(a =>
                    (a.name || '').toLowerCase().includes(q));
                const dirMatch = film.directors?.some(d =>
                    (d.name || '').toLowerCase().includes(q));
                if (!actorMatch && !dirMatch) return false;
            }

            return true;
        });
    }

    // ── Chart helpers (Chart.js) ───────────────────

    function defaultChartOptions(title, type = 'bar') {
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                title: {
                    display: !!title,
                    text: title || '',
                    color: '#94a3b8',
                    font: { family: 'Inter, sans-serif', size: 13, weight: '500' },
                    padding: { bottom: 12 },
                },
            },
            scales: type === 'bar' ? {
                x: {
                    grid: { color: '#222b45', drawBorder: false },
                    ticks: { color: '#64748b', font: { size: 10 } },
                },
                y: {
                    grid: { color: '#222b45', drawBorder: false },
                    ticks: { color: '#64748b', font: { size: 10 } },
                    beginAtZero: true,
                },
            } : {
                r: {
                    grid: { color: '#222b45' },
                    angleLines: { color: '#222b45' },
                    pointLabels: { color: '#94a3b8', font: { size: 10 } },
                    ticks: { display: false },
                },
            },
        };
    }

    function createChart(canvasId, config) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return null;
        // Destroy existing chart
        if (charts[canvasId]) {
            charts[canvasId].destroy();
        }
        try {
            charts[canvasId] = new Chart(canvas, config);
            chartsInited = true;
        } catch (e) {
            console.warn(`Chart ${canvasId}:`, e);
        }
        return charts[canvasId];
    }

    function destroyCharts() {
        Object.keys(charts).forEach(key => {
            if (charts[key]) { charts[key].destroy(); delete charts[key]; }
        });
        chartsInited = false;
    }

    return {
        load,
        isLoaded,
        getFilms,
        getWatchlist,
        getStats,
        getFilmByImdb,
        getAllGenres,
        getAllYears,
        getGenreIcon,
        getGenreChip,
        calcBarPercent,
        enrichItemWithFilmData,
        getTopWatchProviders,
        getWatchProvidersText,
        filterFilms,
        getFilmsByPerson: getFilmsByPerson,
        getAllActors: getAllActors,
        getAllDirectors: getAllDirectors,
        createChart,
        defaultChartOptions,
        destroyCharts,
    };
})();
