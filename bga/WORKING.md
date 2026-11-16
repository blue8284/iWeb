# Board Game Dashboard — WORKING GUIDE
> How to work on this project efficiently with an LLM (Hermes / Claude)

---

## Onboarding Hermes to This Project

When starting a new session, paste in this order:
1. `CONTEXT.md` — always, every session
2. `VISION.md` — if working on new features or phase planning
3. The specific file(s) you're editing — only those, nothing else

Do NOT paste the whole codebase. Paste only what's relevant to the task.

### Minimal onboarding prompt template
```
Here is the project context:
[paste CONTEXT.md]

I want to work on: [specific task]
Here is the current file:
[paste single file]

Task: [what to change and why]
```

---

## Token-Efficient Patterns

### For small edits (< 20 lines changed)
Describe the change + paste only the relevant function/block.
Ask for a diff or just the replacement block — not the whole file.

### For new files
Paste CONTEXT.md + schema. Ask for the full file. Review before writing to disk.

### For refactors (e.g. data.js rewrite)
Break into steps:
1. First: agree on the new function signatures / data shape
2. Second: write the new file
3. Third: update any callers (identify them from CONTEXT.md file map)

### For debugging
Paste: the error + the specific function that throws + relevant data sample.
Not the whole file.

---

## How to Apply Changes on VPS

### Edit a file directly
```bash
nano ~/docker/board-game-dashboard/utils.js
# or
cat > ~/docker/board-game-dashboard/utils.js << 'EOF'
[paste new content]
EOF
```

### Append a block to a file
```bash
cat >> ~/docker/board-game-dashboard/utils.js << 'EOF'
[paste block]
EOF
```

### Verify change is live
Refresh bga.xuandai.space — no restart needed (volume mount, static files).
Check browser console (F12) for errors.

### Add a new JS file
1. Create the file in ~/docker/board-game-dashboard/
2. Add `<script src="./newfile.js"></script>` to index.html
3. Maintain load order: utils → data → filters → modules → main

---

## File Edit Checklist
Before asking Hermes to write a file:
- [ ] Is this the minimal change? Could it be a smaller patch?
- [ ] Which other files are affected? (check CONTEXT.md file map)
- [ ] Does load order in index.html need updating?
- [ ] Does any module that uses window.dataModule need to handle new fields?

---

## Data Model Change Checklist
When adding/changing a Google Sheets column:
- [ ] Update schema in CONTEXT.md
- [ ] Update fetchSheet() call in data.js (add gid if new sheet)
- [ ] Update the join/transform logic in data.js
- [ ] Update any module that reads the affected field
- [ ] Test: console.log(dataModule.getModel()) after page load

---

## Current Task Queue (Phase 1)
Work these in order — each unblocks the next:

1. **Wire new sheets in data.js**
   - Add GIDs for dim_user, dim_game, agg_player_game
   - Parallel fetch all 4 sheets
   - Build joined model: fact rows get display_name, fav_color, game_aliases
   - Compute is_active_15 per game

2. **Update filters.js**
   - Player filter: show display_name, filter by username
   - Game filter: active-only default, retired toggle
   - Game alias search (hidden, splits pipe-delimited aliases)

3. **Update arena.js**
   - Replace raw username with display_name
   - Use fav_color for player card accent
   - Add 1st place count metric

4. **Update rivalries.js + metagame.js**
   - Replace raw username with display_name
   - Use fav_color in charts (replace indexed colors with dim_user.fav_color)

5. **Update CONTEXT.md**
   - Fill in actual GIDs once sheets are created
   - Mark completed items in VISION.md

---

## Naming Conventions
- Sheet names: snake_case (fact_play, dim_user, dim_game, agg_player_game)
- JS variables: camelCase (dimUsers, dimGames, factData)
- Window globals: window.dataModule, window.filtersModule, window.arenaModule, etc.
- CSS classes: kebab-case
- Do not add new global variables — attach to existing module objects

---

## What NOT to Do
- Do not refactor working code unless it blocks the current task
- Do not add npm/node/build steps — keep it static
- Do not add new libraries without discussion (Chart.js is the only one)
- Do not touch .md files in a code session — update docs separately
- Do not paste the full codebase to Hermes — it wastes context
