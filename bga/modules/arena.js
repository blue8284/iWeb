// Arena Module - Shows recent performance metrics and charts
const arenaModule = {
    // DOM elements
    elements: {
        statsContainer: null,
        chartCanvas: null,
        chart: null
    },
    
    // Initialize the module
    async init() {
        this.cacheElements();
        await this.render();
        return this;
    },
    
    // Cache DOM elements
    cacheElements() {
        this.elements.statsContainer = document.getElementById('arenaStats');
        this.elements.chartCanvas = document.getElementById('arenaChart');
    },
    
    // Render the module
    async render() {
        // Get filtered data
        const filters = filtersModule.getFilters();
        const data = dataModule.getFilteredData(filters);
        
        if (data.length === 0) {
            this.showNoData();
            return;
        }
        
        // Calculate stats
        const stats = this.calculateStats(data);
        
        // Render stats
        this.renderStats(stats);
        
        // Render chart
        this.renderChart(data);
    },
    
    // Calculate statistics for arena view
    calculateStats(data) {
        // Group by player
        const byPlayer = {};
        data.forEach(row => {
            const player = row.name;
            if (!byPlayer[player]) {
                byPlayer[player] = { games: 0, wins: 0, totalScore: 0 };
            }
            byPlayer[player].games++;
            if (row['is win'] === '1') byPlayer[player].wins++;
            byPlayer[player].totalScore += parseInt(row.score) || 0;
        });
        
        // Convert to array and calculate rates
        const playerStats = Object.entries(byPlayer).map(([name, stats]) => ({
            name,
            games: stats.games,
            wins: stats.wins,
            winRate: stats.wins / stats.games * 100,
            avgScore: stats.totalScore / stats.games
        }));
        
        // Sort by win rate descending
        playerStats.sort((a, b) => b.winRate - a.winRate);
        
        // Recent performance (last 7 days)
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const recentData = data.filter(row => 
            new Date(row['end date']) >= weekAgo
        );
        
        const recentWinsByPlayer = {};
        recentData.forEach(row => {
            if (row['is win'] === '1') {
                const player = row.name;
                recentWinsByPlayer[player] = (recentWinsByPlayer[player] || 0) + 1;
            }
        });
        
        return {
            playerStats,
            recentWins: recentWinsByPlayer,
            totalGames: data.length,
            totalPlayers: Object.keys(byPlayer).length
        };
    },
    
    // Render statistics cards
    renderStats(stats) {
        if (!this.elements.statsContainer) return;
        
        // Clear container
        this.elements.statsContainer.innerHTML = '';
        
        // Add title
        const title = document.createElement('h3');
        title.textContent = 'Player Performance';
        title.style.marginBottom = theme.spacing.md;
        this.elements.statsContainer.appendChild(title);
        
        // Create stats grid
        const grid = document.createElement('div');
        grid.className = 'stats-grid';
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(180px, 1fr))';
        grid.style.gap = theme.spacing.md;
        
        // Add stat cards for each player (top 4)
        const topPlayers = stats.playerStats.slice(0, 4);
        topPlayers.forEach(player => {
            const card = this.createStatCard(
                player.name,
                `${player.wins}/${player.games}`,
                `${player.winRate.toFixed(1)}%`,
                `Win Rate`
            );
            
            // Add recent wins badge if applicable
            const recentWins = stats.recentWins[player.name] || 0;
            if (recentWins > 0) {
                const badge = document.createElement('div');
                badge.style.position = 'absolute';
                badge.style.top = theme.spacing.xs;
                badge.style.right = theme.spacing.xs;
                badge.style.background = theme.colors.success;
                badge.style.color = 'white';
                badge.style.borderRadius = theme.radius.sm;
                badge.style.padding = `${theme.spacing.xs} ${theme.spacing.sm}`;
                badge.style.fontSize = theme.fontSize.xs;
                badge.textContent = `${recentWins}W`;
                card.style.position = 'relative';
                card.appendChild(badge);
            }
            
            grid.appendChild(card);
        });
        
        this.elements.statsContainer.appendChild(grid);
    },
    
    // Create a stat card element
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
    
    // Render chart showing performance over time
    renderChart(data) {
        if (!this.elements.chartCanvas) return;
        
        // Prepare data for chart: daily win counts per player
        const dailyData = this.prepareChartData(data);
        
        // Destroy existing chart if any
        if (this.elements.chart) {
            this.elements.chart.destroy();
        }
        
        // Create new chart
        this.elements.chart = new Chart(this.elements.chartCanvas, {
            type: 'line',
            data: {
                labels: dailyData.labels,
                datasets: dailyData.datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 20
                        }
                    },
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
                        title: {
                            display: true,
                            text: 'Wins per Day',
                            color: theme.colors.text
                        },
                        ticks: {
                            color: theme.colors.text
                        },
                        grid: {
                            color: theme.colors.border
                        }
                    },
                    x: {
                        ticks: {
                            color: theme.colors.text
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    },
    
    // Prepare data for the arena chart
    prepareChartData(data) {
        // Group by date and player
        const byDate = {};
        data.forEach(row => {
            const date = row['end date'];
            if (!byDate[date]) {
                byDate[date] = {};
            }
            const player = row.name;
            if (!byDate[date][player]) {
                byDate[date][player] = 0;
            }
            if (row['is win'] === '1') {
                byDate[date][player]++;
            }
        });
        
        // Get sorted dates
        const dates = Object.keys(byDate).sort();
        
        // Get unique players
        const players = [...new Set(data.map(r => r.name))].sort();
        
        // Create datasets
        const datasets = players.map((player, index) => {
            const data = dates.map(date => byDate[date][player] || 0);
            return {
                label: player,
                data: data,
                borderColor: window.themeUtils.getChartColor(index),
                backgroundColor: window.themeUtils.getChartColor(index).replace(')', ', 0.1)').replace('rgb', 'rgba'),
                tension: 0.3,
                fill: false,
                pointRadius: 4,
                pointHoverRadius: 6
            };
        });
        
        return {
            labels: dates,
            datasets: datasets
        };
    },
    
    // Show message when no data matches filters
    showNoData() {
        if (this.elements.statsContainer) {
            this.elements.statsContainer.innerHTML = `
                <div style="text-align: center; padding: ${theme.spacing.lg}; color: ${theme.colors.textLight};">
                    No data matches current filters
                </div>
            `;
        }
        
        if (this.elements.chartCanvas) {
            this.elements.chartCanvas.innerHTML = '';
        }
    }
};

// Export for use in other modules
window.arenaModule = arenaModule;
