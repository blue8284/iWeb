# Film Dashboard V2 — Visual Redesign Spec

**Date:** 2026-07-27
**Status:** Approved for implementation

## Overview

Complete visual refresh of the film dashboard (~/docker/webs/film_dash/) with CD disk concept, full English localization, genre icon chips, inline download bars, avatar thumbnails for cast, and a new "Where to Watch" stats tab.

## Changes per File

### index.html
- `lang="vi"` → `lang="en"`
- Subtitle "Kho phim cá nhân" → "Personal Film Library"
- All tab labels translated to English
- Stats sub-tab labels: Mới cập bến → New Arrivals, Top Download → Top Downloads, Top Rating → Top Rated, Top Actor/Director → Top Cast, Phân bố → Distribution
- Added new stats tab: "📺 Where to Watch"
- Added CSS class for avatar thumbnails container styles
- Watchlist tabs labels translated
- Label updates in Browse filters
- Button text, placeholder text translated

### css/style.css
**Additions:**
- `.avatar-thumb` — circular 48px image with fallback styling
- `.avatar-thumb-fallback` — centered emoji + initials
- `.bar-cell` — container for inline proportional bars
- `.bar-fill` — the actual bar (width as percentage)
- `.bar-fill-dl` — download bar variant (primary gradient)
- `.bar-fill-rating` — rating bar variant (star gradient)
- `.genre-chip` — pill with icon + text, per-genre color variants
- `.genre-chip-{action|drama|comedy|horror|...}` — 19 genre color classes
- `.watch-provider-list` — inline list of provider badges in detail panel
- `.provider-badge` — individual platform badge with optional logo
- `.watch-providers-badge` — "Available on X platforms" mini card

**Modified:**
- `.stats-table td` — increase min row height for CD thumbs
- Responsive breakpoints for new elements

### js/data.js
**Additions:**
- `FilmData.GENRE_ICONS` — `const` object mapping genre → emoji (19 entries)
- `FilmData.WATCH_PROVIDER_PRIORITY` — top 15+ known providers to show first
- `FilmData.getGenreIcon(genre)` — returns icon for a genre
- `FilmData.getGenreChip(genre)` — returns full `<span class="genre-chip">` HTML
- `FilmData.getWatchProvidersText(providers)` — returns "Watch on: Netflix, Prime Video, Apple TV" string
- `FilmData.getTopWatchProviders(limit)` — aggregates provider counts from all films
- `FilmData.calcBarPercent(value, maxValue)` — returns percentage for bar width
- `FilmData.getFilmByImdb(id)` — already exists, reused
- `FilmData.enrichTopDownloads()` — merges poster/genres from full films into top_downloads entries

### js/stats.js (major changes)

**renderTopDownloads():**
- Changed from plain text row table to:
  - Column 0: Rank number
  - Column 1: CD thumb (56px circular, poster as image)
  - Column 2: Title (clickable → detail panel)
  - Column 3: Genre chips (icon + text, color-coded)
  - Column 4: Download bar (proportional fill) + numeric count
  - Column 5: Year
- Enrich each top_downloads item with poster_url and genres from main films array

**renderTopRated():**
- Similar CD thumb + genre chips
- Column layout: # | CD | Title | Genres | Rating bar (star color) | Votes | Year
- Bar width proportional to rating/10

**renderPeople():**
- Now includes avatar thumbnail column
- Layout: # | Avatar (48px circular) | Name | Avg Rating | Film Count
- Directors side: same pattern
- Avatar: photo_url if available, else emoji + initials fallback

**renderWatchProviders():**
- New handler for "providers" stats tab
- Bar chart (using Chart.js) showing top providers by film count
- Secondary: table of providers ranked
- Data aggregated from films[].watch_providers

**Other changes in stats.js:**
- All strings English (including formatDate returning "Today"/"Yesterday")
- `emptyState` messages in English

### js/film-detail.js
- Film detail modal: add "Watch on" line showing provider names
- Limit to ~5 most relevant or VN providers if available

### js/browse.js
- Film card genre tags: update to use `FilmData.getGenreChip()` for icon+color

## Data Flow

1. `data.js` GROWs genre mapping + provider helpers
2. `stats.js` enriches top_downloads items by cross-referencing `FilmData.getFilmByImdb()`
3. CD thumb renders: if poster_url → `<img>` in circular CSS, else placeholder icon
4. Genre chips rendered via shared `getGenreChip()` so all modules consistent
5. Watch provider data aggregated by iterating all films' `watch_providers` dict

## Visual Specs

### CD Thumb
- Width/height: 56px (top lists), 72px (new arrivals)
- Border-radius: 50%
- Border: 2px solid `var(--color-border)`
- Background cover, centered

### Avatar Thumb (Cast)
- Width/height: 40px (table), 48px (emphasis)
- Border-radius: 50%
- Fallback: centered emoji (🎭) + first letter initial overlay

### Download Bar
- Height: 6px
- Border-radius: 3px
- Background: `var(--color-surface-2)`
- Fill: `var(--color-primary)` → lighter gradient
- Width: proportional to `total_dl / max_total_dl * 100%`

### Genre Chip
- Inline-flex, padding: 2px 10px
- Border-radius: 20px
- Font-size: 0.7rem
- Background: `var(--color-{genre}-bg)` at 15% opacity
- Color: `var(--color-{genre})`
- Text: emoji + space + genre name

### Watch Provider Badge (detail)
- Inline "Watch on:" label
- Provider names as small chips/badges
- Max 5-6 shown, "+N more" if exceeded
- Platforms known to VN users prioritized: Netflix, Apple TV, Prime Video, Disney+, HBO Max

## Responsiveness
- Tables collapse to stacked view on mobile (< 640px)
- CD thumbs reduce to 40px on small screens
- Genre chips wrap naturally in flex containers

## Genre-Color Map

| Genre | CSS Var | Hex |
|-------|---------|-----|
| Action | --color-genre-action | #f472b6 |
| Adventure | --color-genre-adventure | #fb923c |
| Animation | --color-genre-animation | #22c55e |
| Comedy | --color-genre-comedy | #fbbf24 |
| Crime | --color-genre-crime | #ef4444 |
| Drama | --color-genre-drama | #a78bfa |
| Fantasy | --color-genre-fantasy | #818cf8 |
| Horror | --color-genre-horror | #64748b |
| Romance | --color-genre-romance | #f472b6 |
| Sci-Fi | --color-genre-scifi | #06b6d4 |
| Thriller | --color-genre-thriller | #f59e0b |
| Mystery | --color-genre-mystery | #94a3b8 |
| Documentary | --color-genre-documentary | #4ade80 |
| Family | --color-genre-family | #34d399 |
| War | --color-genre-war | #f87171 |
| Music | --color-genre-music | #c084fc |
| History | --color-genre-history | #d4d4d8 |
| Western | --color-genre-western | #d97706 |
| Others | --color-genre-others | #64748b |
