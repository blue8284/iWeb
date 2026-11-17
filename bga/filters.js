// Filters module - handles UI for filtering and applying filters to data
const filtersModule = {
    // DOM elements
    elements: {
        gameFilter: null,
        playerFilter: null,
        dateFrom: null,
        dateTo: null,
        winsOnly: null,
        resetBtn: null,
        showRetiredGames: null,
        gameSearch: null
    },

    // Current filter state
    state: {
        games: [],
        players: [],
        dateFrom: '',
        dateTo: '',
        winsOnly: false,
        showRetiredGames: false
    },

    // Initialize filters UI
    async init() {
        this.cacheElements();
        this.setMaxDate();
        this.bindEvents();
        await this.populateOptions();
        return this;
    },

    // Set max date to today
    setMaxDate() {
        if (this.elements.dateTo) {
            const today = toLocalISODate(new Date());
            this.elements.dateTo.setAttribute('max', today);
        }
        if (this.elements.dateFrom) {
            const today = toLocalISODate(new Date());
            this.elements.dateFrom.setAttribute('max', today);
        }
    },

    // Cache DOM elements
    cacheElements() {
        this.elements.gameFilter = document.getElementById('gameFilter');
        this.elements.playerFilter = document.getElementById('playerFilter');
        this.elements.dateFrom = document.getElementById('dateFrom');
        this.elements.dateTo = document.getElementById('dateTo');
        this.elements.winsOnly = document.getElementById('winsOnly');
        this.elements.resetBtn = document.getElementById('resetFilters');
        this.elements.showRetiredGames = document.getElementById('showRetiredGames');
        this.elements.gameSearch = document.getElementById('gameSearch');
    },

    // Bind event listeners
    bindEvents() {
        // Game filter
        if (this.elements.gameFilter) {
            this.elements.gameFilter.addEventListener('change', () => {
                this.state.games = Array.from(this.elements.gameFilter.selectedOptions)
                    .map(opt => opt.value)
                    .filter(val => val !== ''); // Remove empty "All Games" option
                this.onFiltersChanged();
            });
        }

        // Player filter - handled by chip click events, already bound in populatePlayerOptions

        // Date filters
        if (this.elements.dateFrom) {
            this.elements.dateFrom.addEventListener('change', () => {
                this.state.dateFrom = this.elements.dateFrom.value;
                this.onFiltersChanged();
            });
        }

        if (this.elements.dateTo) {
            this.elements.dateTo.addEventListener('change', () => {
                this.state.dateTo = this.elements.dateTo.value;
                this.onFiltersChanged();
            });
        }

        // Wins only filter
        if (this.elements.winsOnly) {
            this.elements.winsOnly.addEventListener('change', () => {
                this.state.winsOnly = this.elements.winsOnly.checked;
                this.onFiltersChanged();
            });
        }

        // Reset button
        if (this.elements.resetBtn) {
            this.elements.resetBtn.addEventListener('click', () => {
                this.reset();
            });
        }

        // Show retired games toggle
        if (this.elements.showRetiredGames) {
            this.elements.showRetiredGames.addEventListener('change', () => {
                this.state.showRetiredGames = this.elements.showRetiredGames.checked;
                // Clear game selection when toggling - retired games are removed from dropdown
                this.state.games = [];
                this.populateGameOptions();
                this.onFiltersChanged();
            });
        }

        // Game search (hidden field for alias search)
        if (this.elements.gameSearch) {
            this.elements.gameSearch.addEventListener('input', () => {
                this.filterGameOptions();
            });
        }
    },

    // Populate filter options from data
    async populateOptions() {
        this.populateGameOptions();
        this.populatePlayerOptions();

        // Set default date range to MTD (Month-To-Date)
        const today = new Date();
        const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        if (this.elements.dateFrom) {
            this.elements.dateFrom.value = toLocalISODate(firstOfMonth);
            this.state.dateFrom = toLocalISODate(firstOfMonth);
        }
        if (this.elements.dateTo) {
            this.elements.dateTo.value = toLocalISODate(today);
            this.state.dateTo = toLocalISODate(today);
        }
    },

    // Populate game options (active only by default)
    populateGameOptions() {
        if (!this.elements.gameFilter) return;

        this.elements.gameFilter.innerHTML = '<option value="">All Games</option>';
        const games = dataModule.getGamesWithActivity();

        games.forEach(game => {
            // Skip retired games unless toggle is on
            if (!game.is_active_15 && !this.state.showRetiredGames) return;

            const option = document.createElement('option');
            option.value = game.name;
            option.textContent = game.name;
            option.dataset.aliases = game.aliases.join('|');
            option.dataset.isActive = game.is_active_15;
            this.elements.gameFilter.appendChild(option);
        });
    },

    // Filter game options by search term (searches aliases)
    filterGameOptions() {
        if (!this.elements.gameSearch || !this.elements.gameFilter) return;

        const searchTerm = this.elements.gameSearch.value.toLowerCase();
        const options = Array.from(this.elements.gameFilter.options);

        options.forEach(option => {
            if (option.value === '') {
                option.style.display = ''; // Always show "All Games"
                return;
            }

            const gameName = option.textContent.toLowerCase();
            const aliases = (option.dataset.aliases || '').toLowerCase();
            const matches = gameName.includes(searchTerm) || aliases.includes(searchTerm);

            option.style.display = matches ? '' : 'none';
        });
    },

    // -- Player Chips -------------------------------------------------

    // Populate player chips
    populatePlayerOptions() {
        const container = this.elements.playerFilter;
        if (!container) return;

        container.innerHTML = '';
        const players = dataModule.getUniquePlayers();

        // When no chips are selected, state.players = [] = "All Players"
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

    // Sync this.state.players from chip active states
    syncPlayerStateFromChips() {
        const chips = Array.from(this.elements.playerFilter.querySelectorAll('.player-chip'));
        this.state.players = chips
            .filter(chip => chip.classList.contains('active'))
            .map(chip => chip.dataset.username);
    },

    // -- /Player Chips ------------------------------------------------

    // Reset all filters to default state (all players selected + MTD dates)
    reset() {
        if (this.elements.gameFilter) {
            this.elements.gameFilter.value = '';
            this.state.games = [];
        }

        // Reset player chips to all players (no active chips = all players)
        if (this.elements.playerFilter) {
            const chips = Array.from(this.elements.playerFilter.querySelectorAll('.player-chip'));
            chips.forEach(chip => chip.classList.remove('active'));
            this.state.players = [];
        }

        if (this.elements.dateFrom) {
            const firstOfMonth = new Date();
            firstOfMonth.setDate(1);
            firstOfMonth.setHours(0, 0, 0, 0);
            this.elements.dateFrom.value = toLocalISODate(firstOfMonth);
            this.state.dateFrom = toLocalISODate(firstOfMonth);
        }
        if (this.elements.dateTo) {
            const today = new Date();
            this.elements.dateTo.value = toLocalISODate(today);
            this.state.dateTo = toLocalISODate(today);
        }
        if (this.elements.winsOnly) {
            this.elements.winsOnly.checked = false;
            this.state.winsOnly = false;
        }
        if (this.elements.showRetiredGames) {
            this.elements.showRetiredGames.checked = false;
            this.state.showRetiredGames = false;
            this.populateGameOptions(); // Refresh game list
        }
        if (this.elements.gameSearch) {
            this.elements.gameSearch.value = '';
            this.filterGameOptions(); // Clear search filter
        }

        this.onFiltersChanged();
    },

    // Enable/disable date range filter UI (dimmed for tabs that ignore it)
    setDateRangeEnabled(enabled) {
        const group = document.getElementById('dateRangeGroup');
        if (!group) return;
        group.classList.toggle('filter-dimmed', !enabled);
        if (this.elements.dateFrom) this.elements.dateFrom.disabled = !enabled;
        if (this.elements.dateTo) this.elements.dateTo.disabled = !enabled;
    },

    // Get current filter state
    getFilters() {
        return { ...this.state };
    },

    // Callback for when filters change - to be implemented by main.js
    onFiltersChanged() {
        // This will be overridden by main.js
        console.log('Filters changed:', this.state);
    }
};

// Export for use in other modules
window.filtersModule = filtersModule;
