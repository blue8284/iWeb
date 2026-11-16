# Top Cast UX Improvements — Design Spec

**Date:** 2026-07-29  
**Status:** Approved for implementation

## Overview

Surgical UX improvements to the Top Cast (Actors/Directors) tab in the Stats module, plus a global color theme adjustment.

---

## Changes

### 1. Search Focus Loss Fix (`stats.js`)

**Problem:** Each `oninput` → `render()` rebuilds the DOM entirely → the search `<input>` is destroyed and recreated → cursor focus is lost → user "văng ra ngoài".

**Solution:** In `render()`, before `container.innerHTML = ...`, save the input's focus state (`activeElement`, `selectionStart`, `selectionEnd`). After the DOM update, restore it:

```js
// Save focus
var savedFocus = null;
if (currentTab === 'people') {
    var inp = document.getElementById('topCastSearch');
    if (inp && document.activeElement === inp) {
        savedFocus = { start: inp.selectionStart, end: inp.selectionEnd };
    }
}
// ... render ...
// Restore focus
if (currentTab === 'people' && savedFocus) {
    var inp = document.getElementById('topCastSearch');
    if (inp) {
        inp.focus();
        inp.selectionStart = savedFocus.start;
        inp.selectionEnd = savedFocus.end;
    }
}
```

### 2. Sort by Rating Only (`data.js`)

**Problem:** `getAllActors()` and `getAllDirectors()` sort by `film_count DESC` first → persons with 0.0 avg rating (no rated films) can rank #1 if they appear in many unrated films.

**Solution:** Change sort criteria to `avg_rating DESC` only. Persons with 0.0 rating sink to bottom.

```
Before: b.film_count - a.film_count || b.avg_rating - a.avg_rating
After:  (b.avg_rating || 0) - (a.avg_rating || 0)
```

### 3. Expanded Film Info (`stats.js` — `renderPersonFilmsGrid`)

**Problem:** Expandable film list per person shows only `Title · Year ⭐Rating` — too sparse.

**Solution:** Add to each film card:
- IMDb **votes** count (formatted, e.g. "125K")
- **Genre chips** (max 2, compact inline chips)

Layout:
```
[poster] Title
         Year · ⭐7.5 · 125K votes
         [Action] [Drama]     ← max 2 chips
```

Minor CSS addition for compact genre chips inside person film cards.

### 4. Search Result Count (`stats.js` — `renderPeople`)

**Problem:** No explicit feedback on how many results matched the search query.

**Solution:** When `castSearch !== ''`, show a summary line below the search bar:
```
🎯 Found 15 actors
```

### 5. Clear Button Always Visible (`stats.js` — `renderPeople`)

**Problem:** Clear button only appears when `castSearch` is non-empty — if search yields 0 results, no way to clear.

**Solution:** Always render the `✕ Clear` button next to the search input, regardless of `castSearch` value.

### 6. Reduce Red Saturation (`style.css`)

**Problem:** The red primary color (`#e50914`) is overwhelming/too bright.

**Solution:** Adjust `--color-primary` and `--color-primary-hover` to a slightly subdued red. Reduce glow effects (`textGlow` animation, `box-shadow` on film-card hover) that amplify the red.

Proposed palette:
- `--color-primary: #c00a12` (was `#e50914` — slightly darker, less neon)
- `--color-primary-hover: #d60f1a` (was `#f40612`)
- Keep `--color-primary-bg: #c00a1215`
- Reduce hero title `textGlow` animation opacity
- Tone down film-card hover shadow from `rgba(229, 9, 20, 0.35)` to `rgba(192, 10, 18, 0.25)`

---

## Files Modified

| File | Change |
|------|--------|
| `js/stats.js` | Fix #1 (focus restore), #3 (enriched film info), #4 (result count), #5 (always-visible clear) |
| `js/data.js` | Fix #2 (sort by rating only) |
| `css/style.css` | Fix #6 (reduce red saturation) |

## Non-Goals

- No module extraction (keeping Top Cast inside `stats.js`)
- No API/data model changes
- No layout restructuring (table with expandable rows stays as-is)
- No affecting other Stats sub-tabs (New Arrivals, Top Downloads, Top Rated, Providers, Distribution)
