// ═══════════════════════════════════════════════════
// Arena Module — Recent Performance
// ═══════════════════════════════════════════════════

const arenaModule = {
    elements: {
        statsContainer: null,
        chartCanvas: null,
        chart: null
    },

    async init() {
        this.cacheElements();
        chartDefaults();
        await this.render();
        return this;
    },

    cacheElements() {
        this.elements.statsContainer = document.getElementById('arenaStats');
        this.elements.chartCanvas = document.getElementById('arenaChart');
    },

    async render() {
        const filters = filtersModule.getFilters();
        const data = dataModule.getFilteredData(filters);

        // Clear container for fresh render
        if (this.elements.statsContainer) {
            this.elements.statsContainer.innerHTML = '';
        }

        if (data.length === 0) {
            this.showNoData();
            return;
        }

        const stats = this.calculateStats(data);
        this.renderStats(stats);
        this.renderChart(data);

        // Animate the stat cards after DOM is painted
        requestAnimationFrame(() => {
            animateStaggered('#arenaStats .stat-card', 'animate-fade-in-up', 0.07);
        });
    },

    calculateStats(data) {
        // Group by player
        const byPlayer = {};
        data.forEach(row => {
            const username = row.name;
            if (!byPlayer[username]) {
                byPlayer[username] = {
                    games: 0,
                    wins: 0,
                    firstPlaces: 0,
                    totalScore: 0,
                    display_name: row.display_name,
                    fav_color: row.fav_color
                };
            }
            byPlayer[username].games++;
            if (row['is win'] === '1') byPlayer[username].wins++;
            byPlayer[username].totalScore += parseInt(row.score) || 0;
        });

        // Derive 1st place by highest score per table (not `is win` boolean)
        const tables = {};
        data.forEach(row => {
            const tableId = row['table id'];
            if (!tableId) return;
            if (!tables[tableId]) tables[tableId] = [];
            tables[tableId].push(row);
        });

        Object.values(tables).forEach(rows => {
            if (rows.length < 2) return;
            let best = rows[0];
            rows.forEach(row => {
                const score = parseInt(row.score) || 0;
                const bestScore = parseInt(best.score) || 0;
                if (score > bestScore) best = row;
            });
            if (best && byPlayer[best.name]) {
                byPlayer[best.name].firstPlaces++;
            }
        });

        // Convert to array with computed stats
        const playerStats = Object.entries(byPlayer).map(([username, s]) => ({
            username,
            display_name: s.display_name,
            fav_color: s.fav_color,
            games: s.games,
            wins: s.wins,
            firstPlaces: s.firstPlaces,
            winRate: s.wins / s.games * 100,
            avgScore: s.totalScore / s.games
        }));

        playerStats.sort((a, b) => b.winRate - a.winRate);

        // Recent wins (last 7 days)
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const recentData = data.filter(row => new Date(row['end date']) >= weekAgo);

        const recentWinsByPlayer = {};
        recentData.forEach(row => {
            if (row['is win'] === '1') {
                const username = row.name;
                recentWinsByPlayer[username] = (recentWinsByPlayer[username] || 0) + 1;
            }
        });

        return {
            playerStats,
            recentWins: recentWinsByPlayer,
            totalGames: data.length,
            totalPlayers: Object.keys(byPlayer).length
        };
    },

    renderStats(stats) {
        if (!this.elements.statsContainer) return;

        const title = document.createElement('h3');
        title.textContent = 'Player Performance';
        title.style.cssText = `
            font-size: var(--font-size-base);
            font-weight: var(--font-weight-semibold);
            margin-bottom: var(--spacing-md);
            color: var(--color-text);
        `;
        this.elements.statsContainer.appendChild(title);

        const grid = document.createElement('div');
        grid.className = 'stats-grid';

        const topPlayers = stats.playerStats.slice(0, 6);

        topPlayers.forEach((player, index) => {
            const recentWins = stats.recentWins[player.username] || 0;
            const badge = recentWins > 0 ? `🔥 ${recentWins}W this week` : null;

            const card = createStatCard({
                title: player.display_name,
                value: `${player.winRate.toFixed(1)}%`,
                subtitle: `${player.wins}W / ${player.games}G`,
                label: 'Win Rate',
                accentColor: player.fav_color,
                username: player.username,
                badge: badge,
                animateDelay: index * 0.07
            });

            // Add first place info
            const footer = document.createElement('div');
            footer.style.cssText = `
                font-size: var(--font-size-xs);
                color: var(--color-text-muted);
                margin-top: var(--spacing-xs);
            `;
            footer.textContent = `🥇 ${player.firstPlaces} first place${player.firstPlaces !== 1 ? 's' : ''}`;
            card.appendChild(footer);

            grid.appendChild(card);
        });

        this.elements.statsContainer.appendChild(grid);
    },

    renderChart(data) {
        if (!this.elements.chartCanvas) return;

        const chartData = this.prepareChartData(data);

        if (this.elements.chart) {
            this.elements.chart.destroy();
        }

        this.elements.chart = new Chart(this.elements.chartCanvas, {
            type: 'line',
            data: {
                labels: chartData.labels,
                datasets: chartData.datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 16,
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
                            label: context => `${context.dataset.label}: ${context.parsed.y} win(s)`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        precision: 0,
                        title: {
                            display: true,
                            text: 'Wins per Day',
                            color: theme.colors.text,
                            font: { weight: '500', size: 11 }
                        },
                        ticks: {
                            color: theme.colors.textLight,
                            stepSize: 1,
                            font: { size: 10 }
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
                elements: {
                    line: { tension: 0.35, borderWidth: 2.5 },
                    point: {
                        radius: 3,
                        hoverRadius: 6,
                        hitRadius: 10,
                        borderWidth: 2,
                        hoverBorderWidth: 2
                    }
                },
                animation: {
                    duration: 1000,
                    easing: 'easeOutQuart'
                }
            }
        });
    },

    prepareChartData(data) {
        const byDate = {};
        data.forEach(row => {
            const date = row['end date'];
            if (!byDate[date]) byDate[date] = {};
            const username = row.name;
            if (!byDate[date][username]) {
                byDate[date][username] = {
                    count: 0,
                    display_name: row.display_name,
                    fav_color: row.fav_color
                };
            }
            if (row['is win'] === '1') {
                byDate[date][username].count++;
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

        const datasets = players.map(player => {
            const vals = dates.map(d => byDate[d][player.username]?.count || 0);
            const color = player.fav_color;
            return {
                label: player.display_name,
                data: vals,
                borderColor: color,
                backgroundColor: function(ctx) {
                    const chart = ctx.chart;
                    const {ctx: c, chartArea} = chart;
                    if (!chartArea) return hexToRgba(color, 0.15);
                    return createLineGradient(c, chartArea, color, 0.2, 0.01);
                },
                fill: true,
                tension: 0.35,
                borderWidth: 2.5,
                pointBackgroundColor: color,
                pointBorderColor: color,
                pointHoverBackgroundColor: color,
                pointHoverBorderColor: '#fff',
                pointRadius: 3,
                pointHoverRadius: 6,
                pointHitRadius: 10,
                pointBorderWidth: 2
            };
        });

        return { labels: dates, datasets };
    },

    showNoData() {
        if (this.elements.statsContainer) {
            this.elements.statsContainer.appendChild(
                createEmptyState('🎲', 'No games match your current filter selection.')
            );
        }

        // Destroy chart if exists
        if (this.elements.chart) {
            this.elements.chart.destroy();
            this.elements.chart = null;
        }

        // Show empty state in chart container
        const chartParent = this.elements.chartCanvas?.parentElement;
        if (chartParent) {
            // Check if there's already an empty state
            if (!chartParent.querySelector('.empty-state')) {
                chartParent.appendChild(createEmptyState('📊', 'Adjust filters to see performance data.'));
            }
        }
    }
};

window.arenaModule = arenaModule;
