# Film Dashboard V3 — Cinematic Design Spec

**Date:** 2026-07-28
**Status:** Design approved, pending implementation

## Overview

Complete visual refresh of film dash (~/docker/webs/film_dash/) transitioning from "data dashboard" aesthetic to "cinematic gallery" feel. Based on Hybrid Cinematic Dashboard approach — poster-first browsing with data-rich stats.

## Design Tokens

### Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| `--color-bg` | `#080c14` | Main background (darker, theater-like) |
| `--color-surface` | `#111827` | Cards, sidebar, modal |
| `--color-surface-2` | `#1f2937` | Hover states, input bg |
| `--color-primary` | `#e50914` | Buttons, active tabs, main accent (Netflix red) |
| `--color-primary-hover` | `#f40612` | Hover primary elements |
| `--color-accent` | `#f5c518` | Rating stars, badges (IMDb gold) |
| `--color-text` | `#f1f5f9` | Primary text (warm white) |
| `--color-text-light` | `#94a3b8` | Secondary text |

Existing genre-chip colors, chart colors, and semantic colors (success/warning/danger/info) remain unchanged. Only primary palette and accent updated.

### Typography

| Role | Font | Weights |
|------|------|---------|
| **Display** (film titles, hero, card titles) | DM Serif Display | 400 |
| **Body / UI** | Inter (existing) | 400, 500, 600 |
| **Data / Mono** | JetBrains Mono (existing) | 400, 500 |

Font loading: Google Fonts via `<link>` in index.html (DM Serif Display: 400).

### Type Scale

```
Hero title:       2rem  / DM Serif Display 400
Section heading:  1.25rem / Inter 600
Card title:       0.95rem / DM Serif Display 400
Body:             0.875rem / Inter 400
Small / caption:  0.75rem / Inter 500
Data value:       0.82rem / JetBrains Mono 500
```

## Feature: Random Featured Film Hero

A hero section below the header bar showing one random film from the library on each page load.

**Location:** Between `<header class="dashboard-header">` and `<nav class="tabs-nav">`.

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  ┌──────────────┐   [Title] (DM Serif Display)         │
│  │              │   ⭐ 8.4 · 2024 · 142 min            │
│  │   LARGE      │   🎭 Drama · Romance · Music         │
│  │   POSTER     │                                       │
│  │   (2/3)      │   "A story of dance and..."          │
│  │              │                                       │
│  │              │   [▶ Trailer] [📂 Details]            │
│  └──────────────┘                                       │
└─────────────────────────────────────────────────────────┘
```

- Poster: width ~40% of hero container, natural 2/3 aspect ratio
- Poster border-radius: `var(--radius-lg)` — no longer circular
- Info column: flex column, vertically centered
- Title: DM Serif Display, large, letter-spacing -0.02em
- Rating: gold `#f5c518` with glow effect when ≥ 8
- Plot: truncated to 200 chars, color `var(--color-text-light)`
- Buttons: Trailer (primary red) + Details (secondary)
- Fade-in scale animation on load (0.4s ease)

**Data flow:**
- On DOMContentLoaded (or load), pick random film via `FilmData.getFilms()[Math.floor(Math.random() * FilmData.getFilms().length)]`
- If no film data loaded yet, hide hero section
- Re-query on each `main()` call (initial load only; not on tab switch)

## Browse: Poster Gallery Layout

**Grid change:** `grid-template-columns: repeat(auto-fill, minmax(200px, 1fr))` (from 280px)
- Cards are narrower but poster fills more of the card

**Card structure:**
```
┌──────────────────────┐
│                      │
│     POSTER           │
│     (100% width,     │
│      2/3 aspect)     │
│                      │
│  ┌──────────────────┐│  ← gradient overlay
│  │ Title (Serif)    ││     (visible on hover only)
│  │ ⭐ 8.4 · 2024   ││
│  │ Drama  Romance   ││
│  │ 🎭 Actor A, B    ││
│  └──────────────────┘│
└──────────────────────┘
```

**Default state:** Only poster + small title underneath. Genre, rating, cast hidden.

**Hover state:**
- Poster: `transform: scale(1.03)`, `box-shadow: 0 0 24px rgba(229,9,20,0.35)` (red glow)
- Gradient overlay from bottom 60% → 100% dark reveals info
- Info text appears (rating, genres, cast) — already present in card, just transitioning opacity
- Border: `var(--color-primary)` on hover

**No-poster fallback:** Gradient placeholder using `--color-surface-2` → `--color-border` diagonal, with centered emoji 🎬.

**Card body (non-hover):** Padding 10px 12px, only title (DM Serif Display) + year + rating star visible.

**Existing details/files/trailer buttons** remain in a `.film-card-actions` row at bottom (always visible, not just on hover).

**List view:** Keep existing list view, update genre chips to use `FilmData.getGenreChip()` (already done in V2).

## Stats: Card Carousel Toggle

Each stats sub-tab (Top Downloads, Top Rated, Watch Providers) gains a view toggle:

```
[Card view] [Table view]
```

**Default:** Card view (horizontal scroll)
- Each item is a compact card ~160px wide
- CD thumb 48px circular + title + bar (download/rating) + value
- `display: flex; overflow-x: auto; gap: 12px;`
- Card bg `var(--color-surface)` + border, border-radius `var(--radius-lg)`
- Hover: border `var(--color-primary)`

**Table view:** Existing stats-table layout (V2 implementation, preserved)

**State:** View preference stored in `localStorage` per tab.

**Top Cast (People):** Keep existing expandable table — it already works well with avatars. Add toggle for card view if straightforward, otherwise skip.

## Distribution Charts

Update Chart.js colors to match new palette:

- **Year distribution:** Gradient red (#e50914 → #f40612) bar fill
- **Rating distribution:** Gold (#f5c518 → #fbbf24) bar fill  
- **Genre distribution:** Each bar uses its genre-chip color (already exists in CSS classes)

Chart container and Chart.js config structure unchanged — only dataset backgroundColor/borderColor values updated.

## Micro-interactions

All CSS-only, no extra JavaScript libraries.

| Element | Effect | CSS |
|---------|--------|-----|
| Header subtitle | FadeInUp on load | `animation: fadeInUp 0.4s ease` |
| Featured hero | FadeIn + scale(0.98→1) | `animation: heroIn 0.5s ease` |
| Film card hover | scale(1.03) + red shadow | `transition: transform 0.2s, box-shadow 0.2s` |
| Stats bar fill | Width 0 → N% on appear | `transition: width 0.4s ease` (existing) |
| CD thumb hover | border glow gold | `transition: border-color 0.2s` |
| Tab switch | FadeIn (existing) | Keep as-is |
| Theme toggle | Smooth bg/color transition | Keep existing `--transition` |

**Responsive reduction:** On `prefers-reduced-motion: reduce`, disable all animations.

## Responsiveness

- **≤ 1024px:** Hero stacks (poster full width above info). Browse grid: `minmax(160px, 1fr)`.
- **≤ 640px:** Stats cards scroll full-width. Hide detailed table columns on small screens.
- Hero hidden entirely on mobile if poster fails to load.

## Files Modified

| File | Changes |
|------|---------|
| `index.html` | Add DM Serif Display font link. Add hero HTML section. Update CSS link. |
| `css/style.css` | Update CSS vars (colors). Add hero styles. Add card overlay CSS. Update card grid. Add micro-interaction keyframes. Add view toggle CSS. Update Chart.js colors inline? (actually in stats.js) |
| `js/data.js` | Add `FilmData.getRandomFilm()` method. Add `FilmData.GENRE_CHART_COLORS` if needed. |
| `js/browse.js` | Update `renderFilmCard()` for new card structure (overlay, hover state). No structural HTML change — just CSS class changes + minor content reorder. |
| `js/stats.js` | Add card/table view toggle logic. Add card view render functions. Update chart colors in `renderDistCharts()`. |
| `js/main.js` | Add hero render logic after data loads. |

## Non-Goals

- No build step, no npm, no framework
- No structural HTML changes to existing tabs/modules
- No data format changes (films.json, stats.json, watchlist.json unchanged)
- No breaking existing functionality (filter, detail modal, PiP trailer, watchlists, theme toggle)
- No new external dependencies beyond DM Serif Display Google Font

## Implementation Order

1. Update CSS variables in style.css (red palette, DM Serif Display font)
2. Add hero section HTML + CSS + JS
3. Redesign browse cards CSS (overlay, hover effects, smaller grid)
4. Add stats card/table toggle in stats.js
5. Update Chart.js colors
6. Add micro-interactions CSS
7. Review + polish responsive breakpoints
