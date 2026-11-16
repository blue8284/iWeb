# Board Game Dashboard — CONTEXT
> Single source of truth. Read this first. Last updated: 2026-06-04

## What This Is
A static frontend dashboard for a 4-player board game group.
Live data from Google Sheets. Deployed at bga.xuandai.space via nginx + Cloudflare Zero Trust.
No backend. No build step. Edit file → refresh browser = live.

---

## Infrastructure
- VPS: Oracle Cloud Free Tier
- Path: ~/docker/board-game-dashboard/
- Served by: nginx:alpine (docker), port 8765 → Cloudflare → bga.xuandai.space
- docker-compose.yml mounts ./ as read-only to nginx html root
- Restart container not needed for file edits (volume mount, live)

---

## File Map
```
board-game-dashboard/
├── index.html          — layout only, loads scripts in order
├── style.css           — all styling
├── utils.js            — theme object + utility functions, sets window.theme + window.themeUtils
├── data.js             — fetches all Google Sheets, builds data model, sets window.dataModule
├── filters.js          — filter UI + state, sets window.filtersModule
├── main.js             — init controller, wires modules together
└── modules/
    ├── arena.js        — player performance + daily trend chart
    ├── rivalries.js    — head-to-head win/loss matrix
    └── metagame.js     — game popularity + player specialization
```

Script load order in index.html (must maintain):
`utils.js → data.js → filters.js → arena.js → rivalries.js → metagame.js → main.js`

---

## Google Sheets Data Sources
Single file, published to web (whole file). Each sheet fetched by gid.

```js
const SHEET_ID = "2PACX-1vQR473_3wvzUJNDAtu6S7jZGf-L8dbCxNB4xSoCOJlQMOQSf2feN2Zh91rH7tU06fcgdz0GHDpPUlWX";
const BASE_URL = `https://docs.google.com/spreadsheets/d/e/${SHEET_ID}/pub?output=csv`;

fetchSheet(gid) → `${BASE_URL}&gid=${gid}&single=true`
```

### Sheets & GIDs (fill in gids when known)
| Sheet | GID | Description |
|---|---|---|
| fact_play | (main sheet gid) | One row per player per game session |
| dim_user | (gid) | User identity + display info |
| dim_game | (gid) | Game metadata from BGA |
| agg_player_game | (gid) | Pre-computed per (game × player) stats |

---

## Data Schema

### fact_play columns (current Google Sheets headers)
```
end date | game name | name | score | is win | [other cols]
```
- `name` = raw username, FK to dim_user.username
- `game name` = raw game name, FK to dim_game.game_display
- `is win` = "1" or "0" (string)
- No explicit rank/position column yet

### dim_user columns
```
username | display_name | fav_color | login_spell
```
- `username` = matches fact_play.name exactly (join key)
- `fav_color` = hex color string for player visual identity
- `login_spell` = vanity string, display only

### dim_game columns
```
game_display | game_alias | avg_duration | complexity | strategy | luck | interaction | objective | is_active_15
```
- `game_display` = matches fact_play.game name exactly (join key)
- `game_alias` = pipe-delimited `|` string of alt names, parsed in data.js
- `is_active_15` = COMPUTED in data.js (not stored), true if game played in last 15 days
- complexity/strategy/luck/interaction = numeric ratings from BGA (1-5 scale)
- objective = text description

### agg_player_game columns (sheet: sub_handle)
```
game | username | key | wins | lasts | score_max | score_min |
streak_win | streak_loss | streak_not_win |
streak_win_best | streak_loss_best | win_rate
```
- `key` = `game|username` composite
- `lasts` = last place finishes (3rd in 3p game, 4th in 4p game)
- `win_rate` = string like "25.0%", parse as float

---

## Current Players (4)
```
tuanhuytruong13 | hoaiphan0109 | blue8284 | vannguyen123
```

## Current Games (active)
```
Harmonies | My Shelfie: The Dice Game
```
(more in historical data: 7 Wonders, Aquatica, others)

---

## Known Issues / Tech Debt
- theme.spacing / theme.radius / theme.fontSize / theme.fontWeight were missing from utils.js
  → Fixed by appending Object.assign(theme, {...}) at bottom of utils.js
- No position/rank field in fact_play (only is_win). 1st/last distinction needs either:
  a) new column in Google Sheets, or b) derive from score rank per session in data.js
- Raw usernames shown in UI (display_name not yet wired)

---

## Notes for LLM Working on This
- Always check script load order before adding new .js files (update index.html too)
- `window.X` is how modules expose themselves — no import/export, plain globals
- Data flow: sheets → data.js builds model → modules read via dataModule.getFilteredData()
- Static files, no transpile, no npm. Keep it that way.
- Files are served live — edit on VPS, refresh browser to test
