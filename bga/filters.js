// ============================================================================
// Filters module — Tag-based picker + Drawer + Date Presets + Active Badges
// ============================================================================

const filtersModule = {
    // DOM elements
    elements: {
        gameFilter: null,       // hidden <select> (kept for compat)
        gameTagsContainer: null,
        playerFilter: null,
        dateFrom: null,
        dateTo: null,
        winsOnly: null,
        resetBtn: null,
        showRetiredGames: null,
        gameSearch: null,
        // Drawer
        filterToggle: null,
        filterClose: null,
        filterBackdrop: null,
        filtersPanel: null,
        filterBadge: null,
        activeFiltersBar: null,
        // Date presets
        presetButtons: []
    },

    state: {
        games: [],
        players: [],
        dateFrom: '',
        dateTo: '',
        winsOnly: false,
        showRetiredGames: false,
        datePreset: '30'
    },

    async init() {
        this.cacheElements();
        this.setMaxDate();
        this.bindEvents();
        await this.populateOptions();
        return this;
    },

    setMaxDate() {
        const today = toLocalISODate(new Date());
        if (this.elements.dateTo) this.elements.dateTo.setAttribute('max', today);
        if (this.elements.dateFrom) this.elements.dateFrom.setAttribute('max', today);
    },

    cacheElements() {
        this.elements.gameFilter = document.getElementById('gameFilter');
        this.elements.gameTagsContainer = document.getElementById('gameTagsContainer');
        this.elements.playerFilter = document.getElementById('playerFilter');
        this.elements.dateFrom = document.getElementById('dateFrom');
        this.elements.dateTo = document.getElementById('dateTo');
        this.elements.winsOnly = document.getElementById('winsOnly');
        this.elements.resetBtn = document.getElementById('resetFilters');
        this.elements.showRetiredGames = document.getElementById('showRetiredGames');
        this.elements.gameSearch = document.getElementById('gameSearch');
        // Drawer elements
        this.elements.filterToggle = document.getElementById('filterToggle');
        this.elements.filterClose = document.getElementById('filterClose');
        this.elements.filterBackdrop = document.getElementById('filterBackdrop');
        this.elements.filtersPanel = document.getElementById('filtersPanel');
        this.elements.filterBadge = document.getElementById('filterBadge');
        this.elements.activeFiltersBar = document.getElementById('activeFilters');
        // Date presets
        this.elements.presetButtons = Array.from(document.querySelectorAll('.preset-btn'));
    },

    bindEvents() {
        // ── Drawer toggle ──
        if (this.elements.filterToggle) {
            this.elements.filterToggle.addEventListener('click', () => this.toggleDrawer());
        }
        if (this.elements.filterClose) {
            this.elements.filterClose.addEventListener('click', () => this.closeDrawer());
        }
        if (this.elements.filterBackdrop) {
            this.elements.filterBackdrop.addEventListener('click', () => this.closeDrawer());
        }
        // ESC to close
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') this.closeDrawer();
        });

        // ── Date presets ──
        this.elements.presetButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const range = btn.dataset.range;
                this.elements.presetButtons.forEach(b => b.classList.toggle('active', b === btn));
                this.state.datePreset = range;
                this.applyDatePreset(range);
                this.onFiltersChanged();
            });
        });

        // ── Date inputs ──
        if (this.elements.dateFrom) {
            this.elements.dateFrom.addEventListener('change', () => {
                this.state.dateFrom = this.elements.dateFrom.value;
                // Deactivate preset buttons when manually editing
                this.elements.presetButtons.forEach(b => b.classList.remove('active'));
                this.state.datePreset = 'custom';
                this.onFiltersChanged();
            });
        }
        if (this.elements.dateTo) {
            this.elements.dateTo.addEventListener('change', () => {
                this.state.dateTo = this.elements.dateTo.value;
                this.elements.presetButtons.forEach(b => b.classList.remove('active'));
                this.state.datePreset = 'custom';
                this.onFiltersChanged();
            });
        }

        // ── Wins only ──
        if (this.elements.winsOnly) {
            this.elements.winsOnly.addEventListener('change', () => {
                this.state.winsOnly = this.elements.winsOnly.checked;
                this.onFiltersChanged();
            });
        }

        // ── Reset ──
        if (this.elements.resetBtn) {
            this.elements.resetBtn.addEventListener('click', () => this.reset());
        }

        // ── Retired games toggle ──
        if (this.elements.showRetiredGames) {
            this.elements.showRetiredGames.addEventListener('change', () => {
                this.state.showRetiredGames = this.elements.showRetiredGames.checked;
                this.state.games = [];
                this.populateGameTags();
                this.onFiltersChanged();
            });
        }

        // ── Game search ──
        if (this.elements.gameSearch) {
            this.elements.gameSearch.addEventListener('input', () => {
                this.filterGameTags();
            });
        }
    },

    // ── Date Presets ──────────────────────────────

    applyDatePreset(range) {
        const today = new Date();
        let from;

        if (range === 'all') {
            from = null;
        } else {
            const days = parseInt(range);
            from = new Date(today);
            from.setDate(today.getDate() - days);
        }

        if (this.elements.dateFrom) {
            this.elements.dateFrom.value = from ? toLocalISODate(from) : '';
            this.state.dateFrom = from ? toLocalISODate(from) : '';
        }
        if (this.elements.dateTo) {
            this.elements.dateTo.value = toLocalISODate(today);
            this.state.dateTo = toLocalISODate(today);
        }
    },

    // ── Drawer ────────────────────────────────────

    toggleDrawer() {
        const isOpen = this.elements.filtersPanel?.classList.contains('open');
        if (isOpen) this.closeDrawer();
        else this.openDrawer();
    },

    openDrawer() {
        this.elements.filtersPanel?.classList.add('open');
        this.elements.filterBackdrop?.classList.add('open');
        this.elements.filterToggle?.classList.add('active');
    },

    closeDrawer() {
        this.elements.filtersPanel?.classList.remove('open');
        this.elements.filterBackdrop?.classList.remove('open');
        this.elements.filterToggle?.classList.remove('active');
    },

    // ── Populate Options ──────────────────────────

    async populateOptions() {
        this.populateGameTags();
        this.populatePlayerOptions();

        // Apply default date preset (30 days)
        this.applyDatePreset('30');
    },

    // ── Game Tag Picker (replaces multi-select) ──

    populateGameTags() {
        const container = this.elements.gameTagsContainer;
        if (!container) return;

        container.innerHTML = '';
        const games = dataModule.getGamesWithActivity();

        games.forEach(game => {
            if (!game.is_active_15 && !this.state.showRetiredGames) return;

            const tag = document.createElement('button');
            tag.type = 'button';
            tag.className = 'game-tag';
            tag.dataset.game = game.name;
            tag.dataset.aliases = game.aliases.join('|');

            const dot = document.createElement('span');
            dot.className = 'tag-dot' + (game.is_active_15 ? '' : ' retired');
            tag.appendChild(dot);

            const label = document.createTextNode(game.name);
            tag.appendChild(label);

            if (this.state.games.includes(game.name)) {
                tag.classList.add('active');
            }

            tag.addEventListener('click', () => {
                tag.classList.toggle('active');
                this.syncGameStateFromTags();
                this.onFiltersChanged();
            });

            container.appendChild(tag);
        });

        // Also sync to the hidden <select> for compat
        this.syncHiddenSelect(games);
    },

    syncHiddenSelect(games) {
        if (!this.elements.gameFilter) return;
        this.elements.gameFilter.innerHTML = '<option value="">All Games</option>';
        games.forEach(game => {
            if (!game.is_active_15 && !this.state.showRetiredGames) return;
            const option = document.createElement('option');
            option.value = game.name;
            option.textContent = game.name;
            option.dataset.aliases = game.aliases.join('|');
            option.dataset.isActive = game.is_active_15;
            this.elements.gameFilter.appendChild(option);
        });
    },

    syncGameStateFromTags() {
        const container = this.elements.gameTagsContainer;
        if (!container) return;
        const tags = Array.from(container.querySelectorAll('.game-tag'));
        this.state.games = tags
            .filter(t => t.classList.contains('active'))
            .map(t => t.dataset.game);
    },

    filterGameTags() {
        const container = this.elements.gameTagsContainer;
        if (!container || !this.elements.gameSearch) return;

        const term = this.elements.gameSearch.value.toLowerCase();
        const tags = Array.from(container.querySelectorAll('.game-tag'));

        tags.forEach(tag => {
            const name = tag.dataset.game.toLowerCase();
            const aliases = (tag.dataset.aliases || '').toLowerCase();
            const matches = name.includes(term) || aliases.includes(term);
            tag.style.display = matches ? '' : 'none';
        });
    },

    // Also keep legacy filter method for compat
    populateGameOptions() {
        this.populateGameTags();
    },

    filterGameOptions() {
        this.filterGameTags();
    },

    // ── Player Chips ──────────────────────────────

    populatePlayerOptions() {
        const container = this.elements.playerFilter;
        if (!container) return;

        container.innerHTML = '';
        const players = dataModule.getUniquePlayers();

        players.forEach(player => {
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.className = 'player-chip';
            chip.dataset.username = player.username;

            const dot = document.createElement('span');
            dot.className = 'chip-dot';
            dot.style.background = player.fav_color;

            const label = document.createElement('span');
            label.textContent = player.display_name;

            chip.appendChild(dot);
            chip.appendChild(label);

            chip.addEventListener('click', (e) => {
                e.stopPropagation();
                chip.classList.toggle('active');
                this.syncPlayerStateFromChips();
                this.onFiltersChanged();
            });

            container.appendChild(chip);
        });
    },

    syncPlayerStateFromChips() {
        const chips = Array.from(this.elements.playerFilter.querySelectorAll('.player-chip'));
        this.state.players = chips
            .filter(chip => chip.classList.contains('active'))
            .map(chip => chip.dataset.username);
    },

    // ── Reset ──────────────────────────────────────

    reset() {
        // Games
        if (this.elements.gameTagsContainer) {
            Array.from(this.elements.gameTagsContainer.querySelectorAll('.game-tag')).forEach(t => t.classList.remove('active'));
            this.state.games = [];
        }
        if (this.elements.gameFilter) {
            Array.from(this.elements.gameFilter.options).forEach(opt => opt.selected = false);
        }

        // Players
        if (this.elements.playerFilter) {
            const chips = Array.from(this.elements.playerFilter.querySelectorAll('.player-chip'));
            chips.forEach(chip => chip.classList.remove('active'));
            this.state.players = [];
        }

        // Date — back to 30D preset
        this.state.datePreset = '30';
        this.elements.presetButtons.forEach(b => b.classList.toggle('active', b.dataset.range === '30'));
        this.applyDatePreset('30');

        // Wins only
        if (this.elements.winsOnly) {
            this.elements.winsOnly.checked = false;
            this.state.winsOnly = false;
        }

        // Retired
        if (this.elements.showRetiredGames) {
            this.elements.showRetiredGames.checked = false;
            this.state.showRetiredGames = false;
            this.populateGameTags();
        }

        // Search
        if (this.elements.gameSearch) {
            this.elements.gameSearch.value = '';
            this.filterGameTags();
        }

        this.onFiltersChanged();
    },

    // ── Date Range Enabled/Disabled ──────────────

    setDateRangeEnabled(enabled) {
        const group = document.getElementById('dateRangeGroup');
        if (!group) return;
        group.classList.toggle('filter-dimmed', !enabled);
        if (this.elements.dateFrom) this.elements.dateFrom.disabled = !enabled;
        if (this.elements.dateTo) this.elements.dateTo.disabled = !enabled;
    },

    // ── Active Filters Badge + Header Tags ───────

    updateFilterIndicators() {
        let count = 0;
        const tags = [];

        if (this.state.games.length > 0) {
            count += this.state.games.length;
            this.state.games.forEach(g => {
                tags.push({ type: 'game', label: `🎲 ${g}`, value: g });
            });
        }
        if (this.state.players.length > 0) {
            count += this.state.players.length;
            const allPlayers = dataModule.getUniquePlayers();
            this.state.players.forEach(username => {
                const p = allPlayers.find(pl => pl.username === username);
                tags.push({ type: 'player', label: `👤 ${p?.display_name || username}`, value: username });
            });
        }
        if (this.state.winsOnly) {
            count++;
            tags.push({ type: 'wins', label: '🏆 Wins Only', value: 'winsOnly' });
        }

        // Badge
        if (this.elements.filterBadge) {
            if (count > 0) {
                this.elements.filterBadge.textContent = count;
                this.elements.filterBadge.style.display = 'flex';
            } else {
                this.elements.filterBadge.style.display = 'none';
            }
        }

        // Active filter tags in header
        if (this.elements.activeFiltersBar) {
            this.elements.activeFiltersBar.innerHTML = '';
            tags.slice(0, 6).forEach(tag => {
                const el = document.createElement('span');
                el.className = 'active-filter-tag';
                el.innerHTML = `${tag.label} <span class="tag-remove" title="Remove">✕</span>`;
                el.querySelector('.tag-remove').addEventListener('click', () => {
                    this.removeFilter(tag);
                });
                this.elements.activeFiltersBar.appendChild(el);
            });
            if (tags.length > 6) {
                const more = document.createElement('span');
                more.className = 'active-filter-tag';
                more.textContent = `+${tags.length - 6} more`;
                this.elements.activeFiltersBar.appendChild(more);
            }
        }
    },

    removeFilter(tag) {
        if (tag.type === 'game') {
            this.state.games = this.state.games.filter(g => g !== tag.value);
            // Update tag UI
            const tags = this.elements.gameTagsContainer?.querySelectorAll('.game-tag');
            tags?.forEach(t => {
                if (t.dataset.game === tag.value) t.classList.remove('active');
            });
        } else if (tag.type === 'player') {
            this.state.players = this.state.players.filter(p => p !== tag.value);
            const chips = this.elements.playerFilter?.querySelectorAll('.player-chip');
            chips?.forEach(c => {
                if (c.dataset.username === tag.value) c.classList.remove('active');
            });
        } else if (tag.type === 'wins') {
            this.state.winsOnly = false;
            if (this.elements.winsOnly) this.elements.winsOnly.checked = false;
        }
        this.onFiltersChanged();
    },

    // ── Getters ───────────────────────────────────

    getFilters() {
        return { ...this.state };
    },

    // ── Change callback ──────────────────────────

    onFiltersChanged() {
        this.updateFilterIndicators();
        console.log('Filters changed:', this.state);
    }
};

window.filtersModule = filtersModule;
