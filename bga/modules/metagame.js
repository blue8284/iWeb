// Metagame Module - Shows trends, patterns, and overall statistics
const metagameModule = {
    elements: {
        statsContainer: null,
        chartCanvas: null,
        chart: null
    },
    
    async init() {
        this.cacheElements();
        await this.render();
        return this;
    },
    
    cacheElements() {
        this.elements.statsContainer = document.getElementById('metagameStats');
        this.elements.chartCanvas = document.getElementById('metagameChart');
    },
    
    async render() {
        const filters = filtersModule.getFilters();
        const data = dataModule.getFilteredData(filters);
        
        if (data.length === 0) {
            this.showNoData();
            return;
        }
        
        const stats = this.calculateMetagameStats(data);
        this.renderStats(stats);
        this.renderChart(data);
    },
    
    calculateMetagameStats(data) {
        // Game popularity
        const gameCounts = {};
        data.forEach(row => {
            const game = row['game name'];
            gameCounts[game] = (gameCounts[game] || 0) + 1;
        });
        
        const popularGames = Object.entries(gameCounts)
            .map(([game, count]) => ({ game, count }))
            .sort((a, b) => b.count - a.count);
        
        // Player statistics
        const playerStats = {};
        data.forEach(row => {
            const player = row.name;
            if (!playerStats[player]) {
                playerStats[player] = { games: 0, wins: 0, totalScore: 0 };
            }
            playerStats[player].games++;
            if (row['is win'] === '1') playerStats[player].wins++;
            playerStats[player].totalScore += parseInt(row.score) || 0;
        });
        
        const playerAverages = Object.entries(playerStats).map(([name, stats]) => ({
            name,
            games: stats.games,
            wins: stats.wins,
            winRate: stats.wins / stats.games * 100,
            avgScore: stats.totalScore / stats.games
        }));
        
        // Game-specific stats (who's best at what)
        const gameMastery = {};
        data.forEach(row => {
            const game = row['game name'];
            const player = row.name;
            if (!gameMastery[game]) gameMastery[game] = {};
            if (!gameMastery[game][player]) gameMastery[game][player] = { games: 0, wins: 0 };
            gameMastery[game][player].games++;
            if (row['is win'] === '1') gameMastery[game][player].wins++;
        });
        
        // Find each player's best game
        const playerBestGame = {};
        Object.keys(playerStats).forEach(player => {
            let bestGame = null;
            let bestWinRate = 0;
            Object.keys(gameMastery).forEach(game => {
                const record = gameMastery[game][player];
                if (record && record.games >= 3) {
                    const winRate = record.wins / record.games;
                    if (winRate > bestWinRate) {
                        bestWinRate = winRate;
                        bestGame = game;
                    }
                }
            });
            playerBestGame[player] = bestGame || 'Insufficient data';
        });
        
        // Time-based trends (daily wins over time)
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
            const player = row.name;
            if (row['is win'] === '1') {
                byDate[date].wins[player] = (byDate[date].wins[player] || 0) + 1;
            }
        });
        
        const dates = Object.keys(byDate).sort();
        const players = [...new Set(data.map(r => r.name))].sort();
        
        const datasets = players.map((player, index) => {
            const data = dates.map(date => byDate[date].wins[player] || 0);
            return {
                label: player,
                data: data,
                borderColor: window.themeUtils.getChartColor(index),
                backgroundColor: window.themeUtils.getChartColor(index).replace(')', ', 0.1)').replace('rgb', 'rgba'),
                tension: 0.2,
                fill: true,
                pointRadius: 3,
                pointHoverRadius: 5
            };
        });
        
        return { labels: dates, datasets: datasets };
    },
    
    renderStats(stats) {
        if (!this.elements.statsContainer) return;
        this.elements.statsContainer.innerHTML = '';
        
        const grid = document.createElement('div');
        grid.className = 'stats-grid';
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(200px, 1fr))';
        grid.style.gap = theme.spacing.md;
        
        // Overall stats
        const overall = [
            { label: 'Total Games Played', value: stats.totalGames.toString() },
            { label: 'Unique Games', value: stats.uniqueGames.toString() },
            { label: 'Unique Players', value: stats.uniquePlayers.toString() }
        ];
        
        overall.forEach(stat => {
            grid.appendChild(this.createStatCard(stat.label, stat.value, '', stat.label.toLowerCase()));
        });
        
        // Top game
        if (stats.popularGames.length > 0) {
            const topGame = stats.popularGames[0];
            grid.appendChild(this.createStatCard(
                'Most Played',
                topGame.game,
                `${topGame.count} plays`,
                'popularity'
            ));
        }
        
        // Player best games
        const bestGamesTitle = document.createElement('div');
        bestGamesTitle.style.fontSize = theme.fontSize.sm;
        bestGamesTitle.style.color = theme.colors.textLight;
        bestGamesTitle.style.fontWeight = theme.fontWeight.medium;
        bestGamesTitle.textContent = 'Best Games';
        bestGamesTitle.style.marginBottom = theme.spacing.xs;
        grid.appendChild(bestGamesTitle);
        
        Object.entries(stats.playerBestGame).forEach(([player, bestGame]) => {
            const card = document.createElement('div');
            card.style.background = theme.colors.neutral;
            card.style.borderRadius = theme.radius.md;
            card.style.padding = theme.spacing.sm;
            card.style.border = `1px solid ${theme.colors.border}`;
            card.style.textAlign = 'left';
            
            const playerName = document.createElement('div');
            playerName.style.fontSize = theme.fontSize.sm;
            playerName.style.fontWeight = theme.fontWeight.medium;
            playerName.textContent = player;
            card.appendChild(playerName);
            
            const gameName = document.createElement('div');
            gameName.style.fontSize = theme.fontSize.xs;
            gameName.style.color = theme.colors.text;
            gameName.textContent = bestGame;
            card.appendChild(gameName);
            
            grid.appendChild(card);
        });
        
        this.elements.statsContainer.appendChild(grid);
    },
    
    createStatCard(title, value, subtitle = '', label = '') {
        const card = document.createElement('div');
        card.style.background = theme.colors.neutral;
        card.style.borderRadius = theme.radius.md;
        card.style.padding = theme.spacing.md;
        card.style.textAlign = 'center';
        card.style.border = `1px solid ${theme.colors.border}`;
        
        if (title) {
            const titleEl = document.createElement('div');
            titleEl.style.fontSize = theme.fontSize.sm;
            titleEl.style.color = theme.colors.textLight;
            titleEl.style.fontWeight = theme.fontWeight.medium;
            titleEl.textContent = title;
            card.appendChild(titleEl);
        }
        
        if (value) {
            const valueEl = document.createElement('div');
            valueEl.style.fontSize = theme.fontSize.xl;
            valueEl.style.fontWeight = theme.fontWeight.bold;
            valueEl.style.color = theme.colors.primary;
            valueEl.style.margin = `${theme.spacing.xs} 0`;
            valueEl.textContent = value;
            card.appendChild(valueEl);
        }
        
        if (subtitle) {
            const subtitleEl = document.createElement('div');
            subtitleEl.style.fontSize = theme.fontSize.sm;
            subtitleEl.style.color = theme.colors.text;
            subtitleEl.style.marginBottom = theme.spacing.xs;
            subtitleEl.textContent = subtitle;
            card.appendChild(subtitleEl);
        }
        
        if (label) {
            const labelEl = document.createElement('div');
            labelEl.style.fontSize = theme.fontSize.xs;
            labelEl.style.color = theme.colors.textLight;
            labelEl.textContent = label;
            card.appendChild(labelEl);
        }
        
        return card;
    },
    
    renderChart(data) {
        if (!this.elements.chartCanvas) return;
        const trends = this.calculateDailyTrends(data);
        
        if (this.elements.chart) this.elements.chart.destroy();
        
        this.elements.chart = new Chart(this.elements.chartCanvas, {
            type: 'line',
            data: {
                labels: trends.labels,
                datasets: trends.datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { position: 'top', labels: { usePointStyle: true, padding: 20 } },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        padding: 10
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        precision: 0,
                        title: { display: true, text: 'Wins per Day', color: theme.colors.text },
                        ticks: { color: theme.colors.text },
                        grid: { color: theme.colors.border }
                    },
                    x: {
                        ticks: {
                            color: theme.colors.text,
                            callback: value => {
                                const date = new Date(value);
                                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                            }
                        },
                        grid: { display: false }
                    }
                }
            }
        });
    },
    
    showNoData() {
        if (this.elements.statsContainer) {
            this.elements.statsContainer.innerHTML = `
                <div style="text-align: center; padding: ${theme.spacing.lg}; color: ${theme.colors.textLight};">
                    No data matches current filters
                </div>
            `;
        }
        if (this.elements.chartCanvas) this.elements.chartCanvas.innerHTML = '';
    }
};

// Export for use in other modules
window.metagameModule = metagameModule;