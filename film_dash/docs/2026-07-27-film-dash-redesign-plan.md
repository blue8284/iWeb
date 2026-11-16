# Film Dashboard V2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign film_dash with CD thumbnails, genre icon chips, download bars, avatar rows, watch providers, and full English localization.

**Architecture:** Pure static vanilla JS — no build step, no framework. Single HTML loads 7 JS files + 1 CSS + Chart.js from CDN. Each JS module is an IIFE attached to `FilmData` (data layer) or global namespace (`StatsModule`, `BrowseModule`, `FilmDetail`, `TrailerPlayer`, `WatchlistModule`). Changes are additions/data-driven, not refactors — existing behavior preserved.

**Tech Stack:** Vanilla JS, CSS3, Chart.js (CDN from index.html). All data from 3 JSON files served statically.

## Global Constraints

- No build step, no npm, no framework changes.
- All new JS helpers added to `FilmData` namespace in `data.js`.
- CSS uses existing `--color-*` variable system — new variables for genre variant colors only.
- Genre→icon mapping: 19 entries stored as `FilmData.GENRE_ICONS` const object.
- Watch provider aggregation: iterates all 368 films' `watch_providers` dict each render.
- CD thumb reuse existing `.tl-film-thumb` CSS pattern — no new HTML structure, just new sizes/contexts.
- All existing functionality (filtering, detail modal, trailer PiP, theme toggle, watchlists) must continue working after changes.

---

### Task 1: Add Genre Icons + Utility Helpers to data.js

**Files:**
- Modify: `~/docker/webs/film_dash/js/data.js`

**Interfaces:**
- Consumes: existing `FilmData` IIFE structure
- Produces: `FilmData.GENRE_ICONS`, `FilmData.getGenreIcon(genre)`, `FilmData.getGenreChip(genre)`, `FilmData.calcBarPercent(value, max)`, `FilmData.enrichItemWithFilmData(item)`, `FilmData.getTopWatchProviders(limit)`, `FilmData.getWatchProvidersText(providers, max)` — all static methods on the `FilmData` return object

- [ ] **Step 1: Add GENRE_ICONS constant and getGenreIcon()**

Add to the `FilmData` IIFE, after `getAllYears()` at line ~66:

```js
// ── Genre Icons ───────────────────────────────
const GENRE_ICONS = {
  'Action': '⚔️', 'Adventure': '🏔️', 'Animation': '🎨',
  'Comedy': '😂', 'Crime': '🔫', 'Drama': '🎭',
  'Fantasy': '🧙', 'Horror': '👻', 'Romance': '💕',
  'Sci-Fi': '🤖', 'Thriller': '🔪', 'Mystery': '🔍',
  'Documentary': '📽️', 'Family': '👨‍👩‍👧', 'War': '🪖',
  'Music': '🎵', 'History': '📜', 'Western': '🤠',
};
// Catch-all
const GENRE_ICON_FALLBACK = '🎬';

function getGenreIcon(genre) {
  return GENRE_ICONS[genre] || GENRE_ICON_FALLBACK;
}
```

- [ ] **Step 2: Add getGenreChip(genre)**

```js
function getGenreChip(genre) {
  const icon = getGenreIcon(genre);
  const cls = 'genre-chip genre-chip-' + genre.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
  return '<span class="' + cls + '">' + icon + ' ' + esc(genre) + '</span>';
}
```

- [ ] **Step 3: Add calcBarPercent(value, max)**

```js
function calcBarPercent(value, max) {
  if (!max || !value) return 0;
  return Math.min(100, Math.round((value / max) * 100));
}
```

- [ ] **Step 4: Add enrichItemWithFilmData(item)**

Merges poster_url and genres from full films array into a stats item (top_downloads, top_rated):

```js
function enrichItemWithFilmData(item, fallbackTitle) {
  var film = getFilmByImdb(item.imdb_id);
  return {
    title: item.title || fallbackTitle || 'Unknown',
    year: item.year,
    imdb_id: item.imdb_id,
    poster_url: item.poster_url || (film ? film.poster_url : ''),
    genres: item.genres || (film ? (film.genres || []) : []),
    rating: item.rating,
    votes: item.votes,
    total_dl: item.total_dl,
  };
}
```

- [ ] **Step 5: Add getTopWatchProviders(limit)**

```js
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
```

- [ ] **Step 6: Add getWatchProvidersText(providers)**

Takes the raw `film.watch_providers` object and returns a short "Watch on: Netflix, Prime Video, Apple TV..." string:

```js
var KNOWN_PROVIDERS = [
  'Netflix', 'Amazon Prime Video', 'Apple TV', 'Disney+', 'HBO Max',
  'Disney Plus', 'Hulu', 'Paramount Plus', 'Peacock Premium',
];

function getWatchProvidersText(providers) {
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
  // Prioritize known providers
  var sorted = KNOWN_PROVIDERS.filter(function(k) { return seen[k]; });
  names.forEach(function(n) {
    if (sorted.indexOf(n) === -1) sorted.push(n);
  });
  if (sorted.length <= 6) return '📺 ' + sorted.join(', ');
  return '📺 ' + sorted.slice(0, 5).join(', ') + ', +' + (sorted.length - 5) + ' more';
}
```

- [ ] **Step 7: Export all new functions in the return statement**

Add to the `FilmData` return object (ending at ~line 189):
```js
getGenreIcon: getGenreIcon,
getGenreChip: getGenreChip,
calcBarPercent: calcBarPercent,
enrichItemWithFilmData: enrichItemWithFilmData,
getTopWatchProviders: getTopWatchProviders,
getWatchProvidersText: getWatchProvidersText,
```

---

### Task 2: Add CSS for Genre Chips, Bars, Avatars, Providers

**Files:**
- Modify: `~/docker/webs/film_dash/css/style.css`

- [ ] **Step 1: Add genre chip CSS**

Add after the existing `.genre-tag` block (around line 524):

```css
/* ── Genre Chips (icon + text, color-coded) ─── */

.genre-chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 10px;
  border-radius: 20px;
  font-size: 0.7rem;
  font-weight: 500;
  white-space: nowrap;
  border: 1px solid transparent;
}

/* 19 genre color variants */
.genre-chip-action     { background: #f472b622; color: #f472b6; border-color: #f472b633; }
.genre-chip-adventure  { background: #fb923c22; color: #fb923c; border-color: #fb923c33; }
.genre-chip-animation  { background: #22c55e22; color: #22c55e; border-color: #22c55e33; }
.genre-chip-comedy     { background: #fbbf2422; color: #fbbf24; border-color: #fbbf2433; }
.genre-chip-crime      { background: #ef444422; color: #ef4444; border-color: #ef444433; }
.genre-chip-drama      { background: #a78bfa22; color: #a78bfa; border-color: #a78bfa33; }
.genre-chip-fantasy    { background: #818cf822; color: #818cf8; border-color: #818cf833; }
.genre-chip-horror     { background: #64748b22; color: #94a3b8; border-color: #64748b33; }
.genre-chip-romance    { background: #f472b622; color: #f472b6; border-color: #f472b633; }
.genre-chip-sci-fi     { background: #06b6d422; color: #06b6d4; border-color: #06b6d433; }
.genre-chip-thriller   { background: #f59e0b22; color: #f59e0b; border-color: #f59e0b33; }
.genre-chip-mystery    { background: #94a3b822; color: #94a3b8; border-color: #94a3b833; }
.genre-chip-documentary{ background: #4ade8022; color: #4ade80; border-color: #4ade8033; }
.genre-chip-family     { background: #34d39922; color: #34d399; border-color: #34d39933; }
.genre-chip-war        { background: #f8717122; color: #f87171; border-color: #f8717133; }
.genre-chip-music      { background: #c084fc22; color: #c084fc; border-color: #c084fc33; }
.genre-chip-history    { background: #d4d4d822; color: #d4d4d8; border-color: #d4d4d833; }
.genre-chip-western    { background: #d9770622; color: #d97706; border-color: #d9770633; }
.genre-chip-others     { background: #64748b22; color: #94a3b8; border-color: #64748b33; }
```

- [ ] **Step 2: Add avatar thumb CSS**

Add after the `.genre-chip-*` block:

```css
/* ── Avatar Thumbnail (circular table cell) ─── */

.avatar-thumb {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  background: var(--color-surface-2);
  flex-shrink: 0;
  display: block;
}

.avatar-thumb-fallback {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  flex-shrink: 0;
  color: var(--color-text-muted);
}
```

- [ ] **Step 3: Add bar chart inline CSS**

```css
/* ── Inline Bar Chart (downloads, ratings) ─── */

.bar-cell {
  min-width: 140px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.bar-track {
  flex: 1;
  height: 6px;
  background: var(--color-surface-2);
  border-radius: 3px;
  overflow: hidden;
  min-width: 60px;
}

.bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.bar-fill-dl {
  background: linear-gradient(90deg, var(--color-primary), var(--color-primary-hover));
}

.bar-fill-rating {
  background: linear-gradient(90deg, var(--color-star), #f59e0b);
}

.bar-value {
  font-size: 0.82rem;
  font-weight: 600;
  font-family: var(--font-mono);
  color: var(--color-text-light);
  white-space: nowrap;
  min-width: 42px;
  text-align: right;
}
```

- [ ] **Step 4: Add CD thumb small variant for tables**

Add after `.bar-value`:

```css
/* ── CD Thumb (table variant - 56px) ──── */

.cd-thumb {
  position: relative;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--color-surface-2);
  border: 2px solid var(--color-border);
  flex-shrink: 0;
  display: block;
}

.cd-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.cd-thumb-na {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.3rem;
  color: var(--color-text-muted);
}

.stats-table .cd-thumb {
  margin: 0 auto;
}
```

- [ ] **Step 5: Add watch provider badges for detail panel**

```css
/* ── Watch Provider Badges ──────────────── */

.watch-provider-line {
  font-size: 0.78rem;
  color: var(--color-text-light);
  margin-bottom: 10px;
  line-height: 1.5;
}

.watch-provider-line .provider-badge {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 4px;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  font-size: 0.72rem;
  font-weight: 500;
  margin: 1px 2px;
  white-space: nowrap;
}

.watch-provider-line .provider-more {
  color: var(--color-text-muted);
  font-size: 0.7rem;
}
```

- [ ] **Step 6: Adjust stats-table td height for CD thumbs**

Add after existing `.stats-table td` (line ~1005):

```css
.stats-table td {
  vertical-align: middle;
  padding: 8px 12px;
  border-bottom: 1px solid var(--color-border);
}

/* CD thumb column: centered, no wrap */
.stats-table td.cd-col {
  text-align: center;
  width: 64px;
}

/* Genre chips column: allow wrap */
.stats-table td.genres-col {
  max-width: 200px;
}

/* Avatar column */
.stats-table td.avatar-col {
  width: 52px;
  text-align: center;
}
```

---

### Task 3: Rewrite stats.js — CD Thumbs, Bars, Genre Chips, Avatars, Watch Providers Tab

**Files:**
- Modify: `~/docker/webs/film_dash/js/stats.js`

This is the biggest change. The file gets:

1. `renderTopDownloads()` → full rewrite with CD thumb + genre chips + download bar
2. `renderTopRated()` → full rewrite with CD thumb + genre chips + rating bar
3. `renderPeople()` → rewrite with avatar thumbnails
4. `renderWatchProviders()` → new handler for "📺 Where to Watch" tab
5. English localization throughout (formatDate, empty states, labels)

- [ ] **Step 1: Localize formatDate()**

Change `fmtDate` function (line ~158-169):

```js
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
```

- [ ] **Step 2: Localize emptyState + other strings**

Change `emptyState` default message (line 38): `'No data'`

In `renderNewArrivals` (line ~276): `'New versions only'`
In `renderNewArrivals` (line ~277): `'No new films'`
In `renderNewArrivals` (line ~299): `'films'` instead of `'phim'`
In `renderNewArrivals` empty before `"unknown"`: `'No new films'`

In `renderTopRated` line ~355: `'No data (needs ≥1000 votes)'`

- [ ] **Step 3: Rewrite renderTopDownloads()**

Full replacement of the existing `renderTopDownloads()` function (~line 323-347):

```js
function renderTopDownloads() {
  var stats = FilmData.getStats();
  if (!stats || !stats.top_downloads || !stats.top_downloads.length) {
    return emptyState();
  }

  // Enrich with poster + genres from films
  var items = stats.top_downloads.map(function(item) {
    return FilmData.enrichItemWithFilmData(item);
  });

  var maxDl = items[0].total_dl || 1;

  var html = '<table class="stats-table">' +
    '<thead><tr>' +
    '<th>#</th><th></th><th>Title</th><th>Genres</th><th>Downloads</th><th class="text-right">Year</th>' +
    '</tr></thead><tbody>';

  items.forEach(function(item, i) {
    var posterHtml = item.poster_url
      ? '<div class="cd-thumb"><img src="' + esc(item.poster_url) + '" alt=""></div>'
      : '<div class="cd-thumb cd-thumb-na">🎬</div>';

    var genresHtml = item.genres && item.genres.length
      ? item.genres.map(function(g) { return FilmData.getGenreChip(g); }).join('')
      : '<span class="text-muted">—</span>';

    var barW = FilmData.calcBarPercent(item.total_dl, maxDl);

    html += '<tr class="stats-row-clickable"' +
      ' data-imdb="' + esc(item.imdb_id) + '"' +
      ' onclick="StatsModule.selectFilm(\'' + esc(item.imdb_id) + '\')">' +
      '<td>' + (i + 1) + '</td>' +
      '<td class="cd-col">' + posterHtml + '</td>' +
      '<td><strong>' + esc(item.title) + '</strong></td>' +
      '<td class="genres-col">' + genresHtml + '</td>' +
      '<td><div class="bar-cell"><div class="bar-track"><div class="bar-fill bar-fill-dl" style="width:' + barW + '%;"></div></div><span class="bar-value">' + fmtNum(item.total_dl) + '</span></div></td>' +
      '<td class="text-right">' + (item.year || '?') + '</td>' +
      '</tr>';
  });

  html += '</tbody></table>';
  return wrapWithDetail(html);
}
```

- [ ] **Step 4: Rewrite renderTopRated()**

Full replacement (~line 351-379):

```js
function renderTopRated() {
  var stats = FilmData.getStats();
  if (!stats || !stats.top_rated || !stats.top_rated.length) {
    return emptyState('No data (needs ≥1000 votes)');
  }

  var items = stats.top_rated.slice(0, 50).map(function(item) {
    return FilmData.enrichItemWithFilmData(item);
  });

  var maxRating = items.length ? Math.max(10, items[0].rating || 10) : 10;

  var html = '<table class="stats-table">' +
    '<thead><tr>' +
    '<th>#</th><th></th><th>Title</th><th>Genres</th><th>Rating</th><th class="text-right">Votes</th><th class="text-right">Year</th>' +
    '</tr></thead><tbody>';

  items.forEach(function(item, i) {
    var posterHtml = item.poster_url
      ? '<div class="cd-thumb"><img src="' + esc(item.poster_url) + '" alt=""></div>'
      : '<div class="cd-thumb cd-thumb-na">🎬</div>';

    var genresHtml = item.genres && item.genres.length
      ? item.genres.map(function(g) { return FilmData.getGenreChip(g); }).join('')
      : '<span class="text-muted">—</span>';

    var barW = FilmData.calcBarPercent(item.rating, maxRating);

    html += '<tr class="stats-row-clickable"' +
      ' data-imdb="' + esc(item.imdb_id) + '"' +
      ' onclick="StatsModule.selectFilm(\'' + esc(item.imdb_id) + '\')">' +
      '<td>' + (i + 1) + '</td>' +
      '<td class="cd-col">' + posterHtml + '</td>' +
      '<td><strong>' + esc(item.title) + '</strong></td>' +
      '<td class="genres-col">' + genresHtml + '</td>' +
      '<td><div class="bar-cell"><div class="bar-track"><div class="bar-fill bar-fill-rating" style="width:' + barW + '%;"></div></div><span class="bar-value">' + fmtRating(item.rating) + '</span></div></td>' +
      '<td class="text-right">' + fmtNum(item.votes) + '</td>' +
      '<td class="text-right">' + (item.year || '?') + '</td>' +
      '</tr>';
  });

  html += '</tbody></table>';
  return wrapWithDetail(html);
}
```

- [ ] **Step 5: Rewrite renderPeople() with avatar thumbnails**

Full replacement (~line 381-427):

```js
function renderPeople() {
  var stats = FilmData.getStats();
  if (!stats) return emptyState();

  var actors = stats.top_actors || [];
  var directors = stats.top_directors || [];

  var html = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">';

  // Actors
  html += '<div>' +
    '<h3 style="font-size:1rem;font-weight:600;margin-bottom:12px;">🎭 Top Actors (≥3 films)</h3>';
  if (actors.length) {
    html += '<table class="stats-table">' +
      '<thead><tr><th>#</th><th></th><th>Actor</th><th class="text-right">Avg ⭐</th><th class="text-right">Films</th></tr></thead><tbody>';
    actors.forEach(function(a, i) {
      var avatarHtml = a.photo_url
        ? '<img class="avatar-thumb" src="' + esc(a.photo_url) + '" alt="' + esc(a.name) + '">'
        : '<div class="avatar-thumb-fallback">🎭</div>';
      html += '<tr><td>' + (i + 1) + '</td>' +
        '<td class="avatar-col">' + avatarHtml + '</td>' +
        '<td>' + esc(a.name) + '</td>' +
        '<td class="text-right" style="color:var(--color-star);">' + fmtRating(a.avg_rating) + '</td>' +
        '<td class="text-right">' + a.film_count + '</td></tr>';
    });
    html += '</tbody></table>';
  } else {
    html += '<div class="text-muted">No data</div>';
  }
  html += '</div>';

  // Directors
  html += '<div>' +
    '<h3 style="font-size:1rem;font-weight:600;margin-bottom:12px;">🎬 Top Directors (≥3 films)</h3>';
  if (directors.length) {
    html += '<table class="stats-table">' +
      '<thead><tr><th>#</th><th></th><th>Director</th><th class="text-right">Avg ⭐</th><th class="text-right">Films</th></tr></thead><tbody>';
    directors.forEach(function(d, i) {
      var avatarHtml = d.photo_url
        ? '<img class="avatar-thumb" src="' + esc(d.photo_url) + '" alt="' + esc(d.name) + '">'
        : '<div class="avatar-thumb-fallback">🎬</div>';
      html += '<tr><td>' + (i + 1) + '</td>' +
        '<td class="avatar-col">' + avatarHtml + '</td>' +
        '<td>' + esc(d.name) + '</td>' +
        '<td class="text-right" style="color:var(--color-star);">' + fmtRating(d.avg_rating) + '</td>' +
        '<td class="text-right">' + d.film_count + '</td></tr>';
    });
    html += '</tbody></table>';
  } else {
    html += '<div class="text-muted">No data</div>';
  }
  html += '</div>';

  html += '</div>';
  return html;
}
```

- [ ] **Step 6: Add renderWatchProviders()**

Add after `renderPeople()` (~line 428 area):

```js
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
```

- [ ] **Step 7: Add "providers" case to render() switch**

In the `render()` function (~line 544-563), add a new case:

```js
case 'providers':
  container.innerHTML = renderWatchProviders();
  break;
```

Also in the `init()` event handler (~line 577), update the guard condition to NOT reset `selectedFilm` for `providers`:

```js
if (currentTab !== 'new' && currentTab !== 'topdl' && currentTab !== 'toprt' && currentTab !== 'providers') {
  selectedFilm = null;
}
```

- [ ] **Step 8: Localize English strings in other places**

In `renderNewArrivals()`, update toggle label:
```js
'<span>🔄 New versions only</span>' +
```

Update ".length films" to ".length films":
```js
'<span class="tl-date-count">' + items.length + ' films</span>' +
```

Update empty state messages: `'📭 No new films'`

Update `renderFilmThumb` badge title: `'Has new versions'`

---

### Task 4: Add Watch Provider Line to Film Detail Modal

**Files:**
- Modify: `~/docker/webs/film_dash/js/film-detail.js`

- [ ] **Step 1: Add "Watch on" line to renderFilmDetail()**

After the infoItems section (around line 50), add:

```js
// Watch Providers
var watchProvidersText = FilmData.getWatchProvidersText(film.watch_providers);
if (watchProvidersText) {
  parts.push('<div class="watch-provider-line">' + watchProvidersText + '</div>');
}
```

- [ ] **Step 2: Add "Watch on" line to renderModalContent()**

After the genres section (around line 153), add:

```js
// Watch Providers
var watchProvidersText = FilmData.getWatchProvidersText(film.watch_providers);
if (watchProvidersText) {
  html.push('<div class="watch-provider-line">' + watchProvidersText + '</div>');
}
```

- [ ] **Step 3: Add "Watch on" line to stats detail panel**

In `stats.js` `renderDetailPanel()` (~line 102-127), after the runtime section and before plot:

```js
// Watch Providers
var wpText = FilmData.getWatchProvidersText(f.watch_providers);
if (wpText) {
  parts.push('<div class="watch-provider-line">' + wpText + '</div>');
}
```

- [ ] **Step 4: Localize English strings in film-detail.js**

Change "Diễn viên" → "Cast" (line 56)
Change "Đạo diễn" → "Directors" (line 67)
Change "📁 Files ..." label stays (it's already partly English)
Change "📥 Tải" → "📥 Download" (line 121)

Also change modal button text:
- `"▶ Xem Trailer"` → `"▶ Trailer"` (line 161)
- `"ℹ Chi tiết"` → `"📂 Details"` in browse.js (line 64)

---

### Task 5: Update Genre Tags in Browse

**Files:**
- Modify: `~/docker/webs/film_dash/js/browse.js`

- [ ] **Step 1: Update renderFilmCard() genre tags**

Replace the genre rendering in `renderFilmCard` (~line 53-55):

```js
${genres.length ? `<div class="film-card-genres">
  ${genres.map(g => FilmData.getGenreChip(g)).join('')}
</div>` : ''}
```

- [ ] **Step 2: Update renderFilmListItem() genre display**

Update line 89 to use genre chips:
```js
${genres.map(g => FilmData.getGenreChip(g)).join(' ')}
```

- [ ] **Step 3: Localize English strings in browse.js**

Change button text: `"ℹ Chi tiết"` → `"📂 Details"` (line 64)
Change film count: `"${films.length} phim"` → `"${films.length} films"` (line 132)
Change list item spacing — no change needed, the chip CSS handles it.

---

### Task 6: Update index.html — English + New Stats Tab + Watchlist Localization

**Files:**
- Modify: `~/docker/webs/film_dash/index.html`

- [ ] **Step 1: Change lang attribute and subtitle**

```html
<html lang="en" data-theme="dark">
```
```html
<span class="header-subtitle">Personal Film Library</span>
```

- [ ] **Step 2: Translate tab buttons**

```html
<button class="tab-btn active" data-tab="statsModule">📊 Stats</button>
<button class="tab-btn" data-tab="watchlistModule">📋 Watchlist</button>
<button class="tab-btn" data-tab="browseModule">📂 Browse</button>
```

- [ ] **Step 3: Add new stats tab "Where to Watch"**

Update the stats-tabs section (~line 52-57):

```html
<div class="stats-tabs">
  <button class="st-tab active" data-st="new">🆕 New Arrivals</button>
  <button class="st-tab" data-st="topdl">⬇ Top Downloads</button>
  <button class="st-tab" data-st="toprt">⭐ Top Rated</button>
  <button class="st-tab" data-st="people">🎭 Top Cast</button>
  <button class="st-tab" data-st="providers">📺 Where to Watch</button>
  <button class="st-tab" data-st="dist">📊 Distribution</button>
</div>
```

- [ ] **Step 4: Translate watchlist tabs**

```html
<button class="wl-tab active" data-wl="film">🎬 Film Watchlists</button>
<button class="wl-tab" data-wl="person">👤 Person Watchlists</button>
```

- [ ] **Step 5: Translate browse filter labels**

```html
<label for="filterSearch">🔍 Search</label>
<input type="text" id="filterSearch" placeholder="Film, actor..." class="filter-input">

...

<label for="filterPerson">Actors / Directors</label>
<input type="text" id="filterPerson" placeholder="Actor or director name..." class="filter-input">
```

- [ ] **Step 6: Translate modal title default**

```html
<h3 id="modalFilmTitle">🎬 Film Details</h3>
```

- [ ] **Step 7: Localize watchlist.js strings**

In `js/watchlist.js`:
- Line 35: `'📭 No film watchlists yet'`
- Line 55: `'⏳ Waiting for match...'`
- Line 71: `'👤 No person watchlists yet'`
- Line 83: `'Actor'` / `'Director'` (dynamic based on person_type)
- Line 96: `'⏳ Waiting for match...'`
