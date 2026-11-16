// Rivalries Module - Shows head-to-head records between players
const rivalriesModule = {
    // DOM elements
    elements: {
        chartCanvas: null,
        chart: null,
        tableContainer: null
    },
    
    // Initialize the module
    async init() {
        this.cacheElements();
        await this.render();
        return this;
    },
    
    // Cache DOM elements
    cacheElements() {
        this.elements.chartCanvas = document.getElementById('rivalriesChart');
        this.elements.tableContainer = document.getElementById('rivalriesTable');
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
        
        // Calculate head-to-head records
        const h2hData = this.calculateHeadToHead(data);
        
        // Render chart
        this.renderChart(h2hData);
        
        // Render table
        this.renderTable(h2hData);
    },
    
    // Calculate head-to-head win/loss records
    calculateHeadToHead(data) {
        const players = [...new Set(data.map(r => r.name))].sort();
        const h2h = {};
        
        // Initialize matrix
        players.forEach(p1 => {
            h2h[p1] = {};
            players.forEach(p2 => {
                if (p1 !== p2) {
                    h2h[p1][p2] = { wins: 0, losses: 0, total: 0 };
                }
            });
        });
        
        // Group data by game (table id)
        const gamesById = {};
        data.forEach(row => {
            const tableId = row['table id'];
            if (!gamesById[tableId]) {
                gamesById[tableId] = [];
            }
            gamesById[tableId].push(row);
        });
        
        // Process each game
        Object.values(gamesById).forEach(gameRows => {
            // Sort by rank to determine winner
            const sorted = [...gameRows].sort((a, b) => 
                parseInt(a.rank) - parseInt(b.rank)
            );
            
            const winner = sorted[0]; // Rank 1
            
            // Winner gets a win against everyone else
            sorted.slice(1).forEach(loser => {
                const wName = winner.name;
                const lName = loser.name;
                h2h[wName][lName].wins++;
                h2h[lName][wName].losses++;
                h2h[wName][lName].total++;
                h2h[lName][wName].total++;
            });
        });
        
        return { players, h2h };
    },
    
    // Render chart showing win rates between players
    renderChart(h2hData) {
        if (!this.elements.chartCanvas) return;
        
        const { players, h2h } = h2hData;
        
        // Prepare data for heatmap-style bar chart
        const datasets = [];
        const labels = players;
        
        players.forEach((player, index) => {
            const winRates = players.map(opponent => {
                if (player === opponent) return 0;
                const record = h2h[player][opponent];
                if (record.total === 0) return 0;
                return (record.wins / record.total) * 100;
            });
            
            datasets.push({
                label: player,
                data: winRates,
                backgroundColor: window.themeUtils.getChartColor(index),
                borderColor: window.themeUtils.getChartColor(index),
                borderWidth: 1
            });
        });
        
        // Destroy existing chart if any
        if (this.elements.chart) {
            this.elements.chart.destroy();
        }
        
        // Create new chart
        this.elements.chart = new Chart(this.elements.chartCanvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y', // Horizontal bars
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            usePointStyle: true,
                            padding: 15
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.parsed.x;
                                return `${value.toFixed(1)}% win rate`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            callback: value => value + '%',
                            color: theme.colors.text
                        },
                        grid: {
                            color: theme.colors.border
                        }
                    },
                    y: {
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
    
    // Render detailed table of head-to-head records
    renderTable(h2hData) {
        if (!this.elements.tableContainer) return;
        
        const { players, h2h } = h2hData;
        
        // Create table
        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        
        // Create header
        thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        
        // First cell empty (for player labels)
        const emptyCell = document.createElement('th');
        emptyCell.textContent = '';
        headerRow.appendChild(emptyCell);
        
        // Player headers
        players.forEach(player => {
            const th = document.createElement('th');
            th.textContent = player;
            th.style.textAlign = 'center';
            headerRow.appendChild(th);
        });
        
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // Create body
        tbody = document.createElement('tbody');
        
        players.forEach((player, rowIndex) => {
            const row = document.createElement('tr');
            
            // Row label (player name)
            const rowLabel = document.createElement('th');
            rowLabel.textContent = player;
            rowLabel.style.fontWeight = theme.fontWeight.medium;
            row.appendChild(rowLabel);
            
            // Data cells
            players.forEach((opponent, colIndex) => {
                const td = document.createElement('td');
                td.style.textAlign = 'center';
                td.style.padding = theme.spacing.sm;
                
                if (player === opponent) {
                    td.textContent = '-';
                    td.style.color = theme.colors.textLight;
                    td.style.fontStyle = 'italic';
                } else {
                    const record = h2h[player][opponent];
                    if (record.total === 0) {
                        td.textContent = '0 - 0';
                    } else {
                        td.textContent = `${record.wins} - ${record.losses}`;
                        
                        // Color code based on win rate
                        const winRate = record.wins / record.total;
                        if (winRate > 0.6) {
                            td.style.color = theme.colors.success;
                            td.style.fontWeight = theme.fontWeight.semibold;
                        } else if (winRate < 0.4) {
                            td.style.color = theme.colors.danger;
                            td.style.fontWeight = theme.fontWeight.semibold;
                        }
                    }
                }
                
                // Add borders
                td.style.border = `1px solid ${theme.colors.border}`;
                row.appendChild(td);
            });
            
            tbody.appendChild(row);
        });
        
        table.appendChild(tbody);
        
        // Clear container and add table
        this.elements.tableContainer.innerHTML = '';
        this.elements.tableContainer.appendChild(table);
        
        // Add caption
        const caption = document.createElement('div');
        caption.style.padding = theme.spacing.sm;
        caption.style.fontSize = theme.fontSize.sm;
        caption.style.color = theme.colors.textLight;
        caption.style.textAlign = 'center';
        caption.textContent = 'Format: Wins - Losses';
        this.elements.tableContainer.appendChild(caption);
    },
    
    // Show message when no data matches filters
    showNoData() {
        if (this.elements.chartCanvas) {
            this.elements.chartCanvas.innerHTML = `
                <div style="text-align: center; padding: ${theme.spacing.lg}; color: ${theme.colors.textLight};">
                    No data matches current filters
                </div>
            `;
        }
        
        if (this.elements.tableContainer) {
            this.elements.tableContainer.innerHTML = `
                <div style="text-align: center; padding: ${theme.spacing.lg}; color: ${theme.colors.textLight};">
                    No data matches current filters
                </div>
            `;
        }
    }
};

// Export for use in other modules
window.rivalriesModule = rivalriesModule;
