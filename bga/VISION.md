# Board Game Dashboard — VISION & PHASES

## Design Philosophy
Snowflake-lite: dim/fact structure in Google Sheets, joined in JS at load time.
No backend, no build step, no frameworks. Complexity lives in the data model, not the code.

---

## Phase 1 — Dimensional Foundation (CURRENT)
**Goal:** Get the data model right. Every future feature builds on this.

### Deliverables
- [ ] dim_user sheet created + wired in data.js
- [ ] dim_game sheet created + wired in data.js
- [ ] agg_player_game (sub_handle) wired in data.js
- [ ] data.js refactored: parallel fetch all sheets, build joined model
- [ ] display_name replaces raw username everywhere in UI
- [ ] fav_color used for player identity in charts
- [ ] dim_game.is_active_15 computed in data.js
- [ ] game_alias parsed (pipe-delimited) + hidden search in filter
- [ ] Active game filter (default: active only, toggle to show retired)
- [ ] Position awareness: 1st / last / not-win distinction in fact_play
  (either new sheet column or derive from score rank per session)
- [ ] Daily 1st count metric added to arena module

### Data model after Phase 1
```
dim_user      ←── fact_play ──→ dim_game
                      ↓
               agg_player_game (pre-aggregated)
```

---

## Phase 2 — Player Views
**Goal:** Individual player perspective. Who am I vs the group?

### Ideas
- Player profile page / panel (triggered by clicking player name)
- Stats: win rate, best game, worst game, current streaks, rival (most played against)
- login_spell displayed on profile
- fav_color used as accent throughout their view
- Head-to-head record vs each opponent
- "My games" filter (auto-filter to current user)

### Open questions
- Is there a user selection mechanism (dropdown? URL param? cookie?)
- Phase 2 does NOT need auth — just a selection state

---

## Phase 3 — Intelligence Layer
**Goal:** Surface patterns and insights automatically.

### Ideas
- Game recommendation (based on who's available + game history)
- "Hot streak" alerts
- AI window for natural language queries about the data
- Telegram bot integration (nanobot) for session logging or digest
- Scheduled job to update dim_game metadata from BGG API

---

## Metrics That Matter (across all phases)

### Per player
- Win rate (overall + per game)
- 1st place count (daily + total)
- Last place count
- Current streaks: win / loss / not-win
- Best streak (historical)
- Score: avg / max / min per game

### Per game
- Play count + trend (is it dying?)
- Player win rates (who dominates this game?)
- Avg score + score range
- is_active_15 (played in last 15 days)

### Group
- Most played game
- Most dominant player (overall + per game)
- Rivalry intensity (closest head-to-head records)

---

## dim_game Fields & Intent
```
game_display   — canonical name, join key to fact_play
game_alias     — pipe-delimited alt names (e.g. "7W|Seven Wonders")
avg_duration   — minutes, from BGA
complexity     — 1-5, from BGA
strategy       — 1-5, from BGA  
luck           — 1-5, from BGA
interaction    — 1-5, from BGA
objective      — short text (e.g. "area control", "engine building")
is_active_15   — COMPUTED in data.js, not stored
```

Future (Phase 3 job): bgg_id, weight, description, image_url

---

## What "Done" Looks Like for Phase 1
- Open bga.xuandai.space
- See display names (not raw usernames) everywhere
- Player cards use fav_color as accent
- Game filter shows active games by default, toggle reveals retired
- Typing a game alias in search finds the canonical game
- Arena shows 1st place count alongside win rate
- All data joins work: fact → dim_user, fact → dim_game, fact → agg
