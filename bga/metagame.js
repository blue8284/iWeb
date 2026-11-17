// ============================================================================
// Metagame Module - Trends, Patterns, Player Edges
// ============================================================================

const metagameModule = {
    elements: {
        statsContainer: null,
        chartCanvas: null,
        metricButtons: [],
        chart: null
    },

    async init() {
        this.cacheElements();
        chartDefaults();
        this.bindEvents();
        await this.render();
        return this;
    },

    cacheElements() {
        this.elements.statsContainer = document.getElementById('metagameStats');
        this.elements.chartCanvas = document.getElementById('metagameChart');
        this.elements.metricButtons = Array.from(document.querySelectorAll('.metric-btn'));
    },

    bindEvents() {
        this.elements.metricButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.elements.metricButtons.forEach(btn => btn.classList.toggle('active', btn === button));
                this.render();
            });
        });
    },

    async render() {
        const filters = filtersModule.getFilters();
        // Ignore date range - show all-time data
        const allTimeFilters = { ...filters, dateFrom: '', dateTo: '' };
        const data = dataModule.getFilteredData(allTimeFilters);

        if (data.length === 0) {
            this.showNoData();
            return;
        }

        if (this.elements.statsContainer) {
            this.elements.statsContainer.innerHTML = '';
        }

        this.renderSubHandleInsight(filters);
        this.renderInsightCards(filters);

        // Animate cards after paint
        requestAnimationFrame(() => {
            animateStaggered('#metagameStats .stat-card', 'animate-fade-in-up', 0.08);
        });
    },

    // -- Sub-Handle Metric Chart ------------------------------

    renderSubHandleInsight(filters) {
        if (!this.elements.chartCanvas) return;

        const rows = this.getFilteredAggRows(filters);
        const metric = this.getSelectedMetric();
        const metricConfig = this.getMetricConfig(metric);
        const players = dataModule.getUniquePlayers();
        const games = [...new Set(rows.map(row => row.game))].sort();
        const selectedPlayers = filters.players.length > 0
            ? players.filter(p => filters.players.includes(p.username))
            : players;

        const datasets = selectedPlayers.map(player => {
            const color = player.fav_color;
            return {
                label: player.display_name,
                data: games.map(game => {
                    const row = rows.find(item => item.game === game && item.username === player.username);
                    return row ? metricConfig.parse(row[metric]) : null;
                }),
                backgroundColor: function(ctx) {
                    const chart = ctx.chart;
                    const {ctx: c, chartArea} = chart;
                    if (!chartArea) return hexToRgba(color, 0.7);
                    return createBarGradient(c, chartArea, color, 0.85, 0.35);
                },
                borderColor: color,
                borderWidth: 1,
                borderRadius: 3,
                borderSkipped: false
            };
        });

        if (this.elements.chart) this.elements.chart.destroy();

        this.elements.chart = new Chart(this.elements.chartCanvas, {
            type: 'bar',
            data: { labels: games, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: selectedPlayers.length > 1,
                        labels: {
                            usePointStyle: true,
                            padding: 14,
                            font: { weight: '500', size: 11 }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.92)',
                        titleColor: '#f8fafc',
                        bodyColor: '#e2e8f0',
                        borderColor: 'rgba(59, 130, 246, 0.2)',
                        borderWidth: 1,
                        padding: 10,
                        cornerRadius: 6,
                        callbacks: {
                            label: ctx => `${ctx.dataset.label}: ${this.formatMetric(metricConfig, ctx.parsed.y)}`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: metricConfig.label,
                            color: theme.colors.textLight,
                            font: { weight: '500', size: 11 }
                        },
                        ticks: {
                            color: theme.colors.textLight,
                            font: { size: 10 },
                            callback: v => this.formatMetric(metricConfig, v)
                        },
                        grid: {
                            color: theme.colors.border,
                            drawBorder: false
                        }
                    },
                    x: {
                        ticks: {
                            color: theme.colors.text,
                            font: { size: 10 },
                            maxRotation: 35,
                            minRotation: 35
                        },
                        grid: { display: false }
                    }
                },
                animation: {
                    duration: 800,
                    easing: 'easeOutQuart'
                }
            }
        });
    },

    // -- Insight Cards ----------------------------------------

    renderInsightCards(filters) {
        if (!this.elements.statsContainer) return;

        const rows = this.getFilteredAggRows(filters);
        if (rows.length === 0) return;

        const metric = this.getSelectedMetric();
        const metricConfig = this.getMetricConfig(metric);
        const players = dataModule.getUniquePlayers();
        const playerMap = Object.fromEntries(players.map(p => [p.username, p]));

        const sorted = [...rows].sort((a, b) => metricConfig.parse(b[metric]) - metricConfig.parse(a[metric]));
        const top = sorted[0];

        const selectedUsername = filters.players.length === 1 ? filters.players[0] : null;
        const currentUserRows = selectedUsername ? rows.filter(row => row.username === selectedUsername) : [];
        const bestForYou = currentUserRows.sort((a, b) => metricConfig.parse(b[metric]) - metricConfig.parse(a[metric]))[0];

        const mostWins = [...rows].sort((a, b) => this.parseNumber(b.wins) - this.parseNumber(a.wins))[0];
        const danger = [...rows].sort((a, b) => this.parseNumber(b.lasts) - this.parseNumber(a.lasts))[0];

        const cardData = [
            {
                label: `Top ${metricConfig.label}`,
                row: top,
                value: metricConfig.format(metricConfig.parse(top[metric]))
            },
            bestForYou ? {
                label: 'Your Best Match',
                row: bestForYou,
                value: metricConfig.format(metricConfig.parse(bestForYou[metric]))
            } : null,
            {
                label: 'Most Wins',
                row: mostWins,
                value: this.parseNumber(mostWins.wins)
            },
            {
                label: 'Most Last Places',
                row: danger,
                value: this.parseNumber(danger.lasts)
            }
        ].filter(Boolean);

        const grid = document.createElement('div');
        grid.className = 'stats-grid';

        cardData.forEach((card, index) => {
            const player = playerMap[card.row.username] || {
                display_name: card.row.username,
                fav_color: theme.colors.primary
            };

            const el = createStatCard({
                title: card.label,
                value: String(card.value),
                subtitle: player.display_name,
                label: card.row.game,
                accentColor: player.fav_color,
                animateDelay: index * 0.08
            });

            grid.appendChild(el);
        });

        this.elements.statsContainer.appendChild(grid);
    },

    // -- Helpers ----------------------------------------------

    getSelectedPlayerColor() {
        const selectedPlayers = (typeof filtersModule !== 'undefined' && filtersModule.state && Array.isArray(filtersModule.state.players))
            ? filtersModule.state.players
            : [];
        if (selectedPlayers.length === 1) {
            const player = dataModule.getUniquePlayers().find(p => p.username === selectedPlayers[0]);
            if (player && player.fav_color) return player.fav_color;
        }
        return theme.colors.primary;
    },

    getActiveGameNames() {
        return dataModule.getGamesWithActivity()
            .filter(g => g.is_active_15)
            .map(g => g.name);
    },

    getSelectedMetric() {
        const activeButton = this.elements.metricButtons.find(btn => btn.classList.contains('active'));
        return activeButton ? activeButton.dataset.metric : 'win_rate';
    },

    getFilteredAggRows(filters) {
        const rows = dataModule.aggPlayerGame || [];
        const activeGames = this.getActiveGameNames();
        return rows.filter(row => {
            const gameMatch = filters.games.length === 0 || filters.games.includes(row.game);
            const playerMatch = filters.players.length === 0 || filters.players.includes(row.username);
            // Respect show retired games toggle
            const retiredMatch = filters.showRetiredGames || activeGames.includes(row.game);
            return gameMatch && playerMatch && retiredMatch;
        });
    },

    getMetricConfig(metric) {
        const configs = {
            win_rate:        { label: 'Win Rate',          parse: v => this.parsePercent(v), format: v => `${v.toFixed(1)}%` },
            wins:            { label: 'Wins',              parse: v => this.parseNumber(v),  format: v => String(v) },
            lasts:           { label: 'Last Places',       parse: v => this.parseNumber(v),  format: v => String(v) },
            score_max:       { label: 'High Score',        parse: v => this.parseNumber(v),  format: v => String(v) },
            score_min:       { label: 'Low Score',         parse: v => this.parseNumber(v),  format: v => String(v) },
            streak_win_best: { label: 'Best Win Streak',   parse: v => this.parseNumber(v),  format: v => String(v) },
            streak_loss_best:{ label: 'Worst Loss Streak',parse: v => this.parseNumber(v),  format: v => String(v) }
        };
        return configs[metric] || configs.win_rate;
    },

    formatMetric(config, value) {
        if (value === null || value === undefined || Number.isNaN(value)) return '-';
        return config.format(value);
    },

    parseNumber(value) {
        return Number.parseFloat(value) || 0;
    },

    parsePercent(value) {
        return Number.parseFloat(String(value).replace('%', '')) || 0;
    },

    // -- Treemap (Game Popularity) ----------------------------

    renderTreemap(data, filters) {
        if (!this.elements.statsContainer) return;
        this.elements.statsContainer.innerHTML = '';

        const gameCounts = {};
        data.forEach(row => {
            const game = row['game name'];
            gameCounts[game] = (gameCounts[game] || 0) + 1;
        });

        const games = Object.entries(gameCounts)
            .map(([game, count]) => ({ game, count }))
            .sort((a, b) => b.count - a.count);

        const totalPlays = games.reduce((sum, g) => sum + g.count, 0);

        const boxColor = this.getSelectedPlayerColor();

        const container = document.createElement('div');
        container.style.marginBottom = theme.spacing.lg;
        container.style.animation = 'fadeInUp 0.5s ease-out';

        const title = document.createElement('h3');
        title.textContent = 'Game Popularity';
        title.style.cssText = `
            font-size: var(--font-size-base);
            font-weight: var(--font-weight-semibold);
            margin-bottom: var(--spacing-md);
            color: var(--color-text);
        `;
        container.appendChild(title);

        const treemap = document.createElement('div');
        treemap.style.cssText = `
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
            gap: var(--spacing-xs);
            padding: var(--spacing-md);
            background: var(--color-background);
            border: 1px solid var(--color-border);
            border-radius: var(--radius-lg);
        `;

        games.forEach(game => {
            const percentage = (game.count / totalPlays * 100).toFixed(1);
            const size = Math.max(80, Math.sqrt(game.count) * 30);

            const box = document.createElement('div');
            box.style.cssText = `
                min-height: ${size}px;
                background: ${boxColor};
                opacity: ${0.6 + (game.count / games[0].count * 0.4)};
                border-radius: var(--radius-md);
                padding: var(--spacing-sm);
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                text-align: center;
                cursor: pointer;
                transition: transform 0.2s ease, opacity 0.2s ease, box-shadow 0.2s ease;
            `;

            box.innerHTML = `
                <div style="font-size: var(--font-size-xs); font-weight: var(--font-weight-semibold); color: white; margin-bottom: 2px;">
                    ${game.game}
                </div>
                <div style="font-size: var(--font-size-lg); font-weight: var(--font-weight-bold); color: white; line-height: 1.2;">
                    ${game.count}
                </div>
                <div style="font-size: 10px; color: rgba(255,255,255,0.8);">
                    ${percentage}%
                </div>
            `;

            box.addEventListener('mouseenter', () => {
                box.style.transform = 'scale(1.05)';
                box.style.opacity = '1';
                box.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
            });
            box.addEventListener('mouseleave', () => {
                box.style.transform = 'scale(1)';
                box.style.opacity = 0.6 + (game.count / games[0].count * 0.4);
                box.style.boxShadow = 'none';
            });

            treemap.appendChild(box);
        });

        container.appendChild(treemap);
        this.elements.statsContainer.appendChild(container);
    },

    // -- Frequency Chart (Games per Week) ---------------------

    renderFrequencyChart(data) {
        if (!this.elements.chartCanvas) return;

        const weeklyData = {};
        data.forEach(row => {
            const date = new Date(row['end date']);
            const tableId = row['table id'];
            const day = date.getDay();
            const diff = date.getDate() - day + (day === 0 ? -6 : 1);
            const monday = new Date(date);
            monday.setDate(diff);
            const weekKey = monday.toISOString().split('T')[0];
            if (!weeklyData[weekKey]) weeklyData[weekKey] = new Set();
            weeklyData[weekKey].add(tableId);
        });

        const weeks = Object.keys(weeklyData).sort();
        const counts = weeks.map(week => weeklyData[week].size);
        const labels = weeks.map(week => {
            const date = new Date(week);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        });

        if (this.elements.chart) this.elements.chart.destroy();

        const chartColor = this.getSelectedPlayerColor();

        this.elements.chart = new Chart(this.elements.chartCanvas, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Games per Week',
                    data: counts,
                    backgroundColor: function(ctx) {
                        const chart = ctx.chart;
                        const {ctx: c, chartArea} = chart;
                        if (!chartArea) return hexToRgba(chartColor, 0.7);
                        return createBarGradient(c, chartArea, chartColor, 0.8, 0.3);
                    },
                    borderColor: chartColor,
                    borderWidth: 1,
                    borderRadius: 4,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.92)',
                        titleColor: '#f8fafc',
                        bodyColor: '#e2e8f0',
                        borderColor: 'rgba(59, 130, 246, 0.2)',
                        borderWidth: 1,
                        padding: 10,
                        cornerRadius: 6,
                        callbacks: {
                            title: items => {
                                const ws = weeks[items[0].dataIndex];
                                const we = new Date(ws);
                                we.setDate(we.getDate() + 6);
                                return `Week of ${items[0].label} - ${we.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: theme.colors.textLight,
                            stepSize: 1,
                            font: { size: 10 }
                        },
                        title: {
                            display: true,
                            text: 'Games Played',
                            color: theme.colors.textLight,
                            font: { weight: '500', size: 11 }
                        },
                        grid: {
                            color: theme.colors.border,
                            drawBorder: false
                        }
                    },
                    x: {
                        ticks: {
                            color: theme.colors.textLight,
                            maxRotation: 35,
                            minRotation: 35,
                            font: { size: 10 }
                        },
                        grid: { display: false }
                    }
                },
                animation: {
                    duration: 800,
                    easing: 'easeOutQuart'
                }
            }
        });
    },

    // -- Legacy Stats (kept for backward compat) -----------

    calculateMetagameStats(data) {
        const gameCounts = {};
        data.forEach(row => {
            const game = row['game name'];
            gameCounts[game] = (gameCounts[game] || 0) + 1;
        });

        const popularGames = Object.entries(gameCounts)
            .map(([game, count]) => ({ game, count }))
            .sort((a, b) => b.count - a.count);

        const playerStats = {};
        data.forEach(row => {
            const username = row.name;
            if (!playerStats[username]) {
                playerStats[username] = {
                    games: 0, wins: 0, totalScore: 0,
                    display_name: row.display_name,
                    fav_color: row.fav_color
                };
            }
            playerStats[username].games++;
            if (row['is win'] === '1') playerStats[username].wins++;
            playerStats[username].totalScore += parseInt(row.score) || 0;
        });

        const playerAverages = Object.entries(playerStats).map(([username, s]) => ({
            username,
            display_name: s.display_name,
            fav_color: s.fav_color,
            games: s.games,
            wins: s.wins,
            winRate: s.wins / s.games * 100,
            avgScore: s.totalScore / s.games
        }));

        const gameMastery = {};
        data.forEach(row => {
            const game = row['game name'];
            const username = row.name;
            if (!gameMastery[game]) gameMastery[game] = {};
            if (!gameMastery[game][username]) gameMastery[game][username] = { games: 0, wins: 0 };
            gameMastery[game][username].games++;
            if (row['is win'] === '1') gameMastery[game][username].wins++;
        });

        const playerBestGame = {};
        Object.keys(playerStats).forEach(username => {
            let bestGame = null;
            let bestWinRate = 0;
            Object.keys(gameMastery).forEach(game => {
                const record = gameMastery[game][username];
                if (record && record.games >= 3) {
                    const winRate = record.wins / record.games;
                    if (winRate > bestWinRate) {
                        bestWinRate = winRate;
                        bestGame = game;
                    }
                }
            });
            playerBestGame[username] = {
                game: bestGame || 'Insufficient data',
                display_name: playerStats[username].display_name,
                fav_color: playerStats[username].fav_color
            };
        });

        const dailyTrends = this.calculateDailyTrends(data);

        return {
            popularGames: popularGames.slice(0, 5),
            playerAverages,
            playerBestGame,
            dailyTrends,
            totalGames: data.length,
            uniqueGames: Object.keys(gameCounts).length,
            uniquePlayers: Object.keys(playerStats).length
        };
    },

    calculateDailyTrends(data) {
        const byDate = {};
        data.forEach(row => {
            const date = row['end date'];
            if (!byDate[date]) byDate[date] = { total: 0, wins: {} };
            byDate[date].total++;
            const username = row.name;
            if (row['is win'] === '1') {
                if (!byDate[date].wins[username]) {
                    byDate[date].wins[username] = {
                        count: 0,
                        display_name: row.display_name,
                        fav_color: row.fav_color
                    };
                }
                byDate[date].wins[username].count++;
            }
        });

        const dates = Object.keys(byDate).sort();

        const playerMap = new Map();
        data.forEach(r => {
            if (!playerMap.has(r.name)) {
                playerMap.set(r.name, {
                    username: r.name,
                    display_name: r.display_name,
                    fav_color: r.fav_color
                });
            }
        });

        const players = Array.from(playerMap.values()).sort((a, b) =>
            a.display_name.localeCompare(b.display_name)
        );

        const datasets = players.map(player => ({
            label: player.display_name,
            data: dates.map(date => byDate[date].wins[player.username]?.count || 0),
            borderColor: player.fav_color,
            backgroundColor: hexToRgba(player.fav_color, 0.08),
            fill: true,
            tension: 0.3,
            pointRadius: 3,
            pointHoverRadius: 5,
            borderWidth: 2
        }));

        return { dates, datasets };
    },

    showNoData() {
        if (this.elements.statsContainer) {
            this.elements.statsContainer.innerHTML = '<div class="empty-state">No metagame data matches current filters</div>';
        }
        if (this.elements.chart) {
            this.elements.chart.destroy();
            this.elements.chart = null;
        }
    }
};

window.metagameModule = metagameModule;
