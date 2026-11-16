// ═══════════════════════════════════════════════════
// Rivalries Module — Head-to-Head Records
// ═══════════════════════════════════════════════════

const rivalriesModule = {
    elements: {
        chartCanvas: null,
        chart: null,
        tableContainer: null
    },

    async init() {
        this.cacheElements();
        chartDefaults();
        await this.render();
        return this;
    },

    cacheElements() {
        this.elements.chartCanvas = document.getElementById('rivalriesChart');
        this.elements.tableContainer = document.getElementById('rivalriesTable');
    },

    async render() {
        const filters = filtersModule.getFilters();
        const data = dataModule.getFilteredData(filters);

        if (data.length === 0) {
            this.showNoData();
            return;
        }

        const allData = dataModule.getFilteredData({
            ...filters,
            players: []
        });

        const h2hData = this.calculateHeadToHead(data, allData);
        this.renderChart(h2hData);
        this.renderTable(h2hData);

        // Animate table after DOM paint
        requestAnimationFrame(() => {
            const table = document.querySelector('#rivalriesTable table');
            if (table) {
                table.classList.add('animate-fade-in-up');
            }
        });
    },

    calculateHeadToHead(data, allData) {
        const filteredPlayerMap = new Map();
        data.forEach(r => {
            if (!filteredPlayerMap.has(r.name)) {
                filteredPlayerMap.set(r.name, {
                    username: r.name,
                    display_name: r.display_name,
                    fav_color: r.fav_color
                });
            }
        });
        const filteredPlayers = Array.from(filteredPlayerMap.values()).sort((a, b) =>
            a.display_name.localeCompare(b.display_name)
        );

        const allPlayerMap = new Map();
        allData.forEach(r => {
            if (!allPlayerMap.has(r.name)) {
                allPlayerMap.set(r.name, {
                    username: r.name,
                    display_name: r.display_name,
                    fav_color: r.fav_color
                });
            }
        });
        const allPlayers = Array.from(allPlayerMap.values()).sort((a, b) =>
            a.display_name.localeCompare(b.display_name)
        );

        const h2h = {};
        filteredPlayers.forEach(p1 => {
            h2h[p1.username] = {};
            allPlayers.forEach(p2 => {
                if (p1.username !== p2.username) {
                    h2h[p1.username][p2.username] = { wins: 0, losses: 0, total: 0 };
                }
            });
        });

        const gamesById = {};
        allData.forEach(row => {
            const tableId = row['table id'];
            if (!gamesById[tableId]) gamesById[tableId] = [];
            gamesById[tableId].push(row);
        });

        Object.values(gamesById).forEach(gameRows => {
            // Compare every pair based on actual rank
            for (let i = 0; i < gameRows.length; i++) {
                for (let j = i + 1; j < gameRows.length; j++) {
                    const a = gameRows[i];
                    const b = gameRows[j];
                    const rankA = parseInt(a.rank);
                    const rankB = parseInt(b.rank);

                    // Lower rank = better (1 is best)
                    const better = rankA < rankB ? a : b;
                    const worse = rankA < rankB ? b : a;
                    const bName = better.name;
                    const wName = worse.name;

                    if (h2h[bName] && h2h[bName][wName]) {
                        h2h[bName][wName].wins++;
                        h2h[bName][wName].total++;
                    }
                    if (h2h[wName] && h2h[wName][bName]) {
                        h2h[wName][bName].losses++;
                        h2h[wName][bName].total++;
                    }
                }
            }
        });

        return { rowPlayers: filteredPlayers, colPlayers: allPlayers, h2h };
    },

    renderChart(h2hData) {
        if (!this.elements.chartCanvas) return;

        const { rowPlayers, colPlayers, h2h } = h2hData;

        const datasets = [];
        const labels = colPlayers.map(p => p.display_name);

        rowPlayers.forEach(player => {
            const winRates = colPlayers.map(opponent => {
                if (player.username === opponent.username) return null;
                const record = h2h[player.username][opponent.username];
                if (record.total === 0) return null;
                return (record.wins / record.total) * 100;
            });

            const color = player.fav_color;
            datasets.push({
                label: player.display_name,
                data: winRates,
                backgroundColor: function(ctx) {
                    const chart = ctx.chart;
                    const {ctx: c, chartArea} = chart;
                    if (!chartArea) return hexToRgba(color, 0.7);
                    return createBarGradient(c, chartArea, color, 0.8, 0.35);
                },
                borderColor: color,
                borderWidth: 1,
                borderRadius: 4,
                borderSkipped: false,
                // Make bars semi-transparent for overlapped visibility
                hoverBackgroundColor: hexToRgba(color, 0.9)
            });
        });

        if (this.elements.chart) this.elements.chart.destroy();

        this.elements.chart = new Chart(this.elements.chartCanvas, {
            type: 'bar',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: {
                    legend: {
                        position: 'right',
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
                            label: ctx => {
                                const v = ctx.parsed.x;
                                if (v === null) return `${ctx.dataset.label}: No games vs ${ctx.label}`;
                                return `${ctx.dataset.label}: ${v.toFixed(1)}% win rate vs ${ctx.label}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            callback: v => v + '%',
                            color: theme.colors.textLight,
                            font: { size: 10 }
                        },
                        grid: {
                            color: theme.colors.border,
                            drawBorder: false
                        },
                        title: {
                            display: true,
                            text: 'Win Rate (%)',
                            color: theme.colors.textLight,
                            font: { weight: '500', size: 11 }
                        }
                    },
                    y: {
                        ticks: {
                            color: theme.colors.text,
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

    renderTable(h2hData) {
        if (!this.elements.tableContainer) return;

        const { rowPlayers, colPlayers, h2h } = h2hData;

        this.elements.tableContainer.innerHTML = '';

        const table = document.createElement('table');

        // === THEAD ===
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');

        const emptyCell = document.createElement('th');
        emptyCell.textContent = '';
        headerRow.appendChild(emptyCell);

        colPlayers.forEach(player => {
            const th = document.createElement('th');
            th.textContent = player.display_name;
            th.style.color = player.fav_color;
            th.style.textAlign = 'center';
            th.style.cursor = 'pointer';
            th.classList.add('player-name-link');
            th.addEventListener('click', () => {
                if (window.playerProfileModule) window.playerProfileModule.open(player.username);
            });
            headerRow.appendChild(th);
        });

        thead.appendChild(headerRow);
        table.appendChild(thead);

        // === TBODY ===
        const tbody = document.createElement('tbody');

        rowPlayers.forEach(player => {
            const row = document.createElement('tr');

            const rowLabel = document.createElement('th');
            rowLabel.textContent = player.display_name;
            rowLabel.style.fontWeight = '500';
            rowLabel.style.color = player.fav_color;
            rowLabel.style.cursor = 'pointer';
            rowLabel.classList.add('player-name-link');
            rowLabel.addEventListener('click', () => {
                if (window.playerProfileModule) window.playerProfileModule.open(player.username);
            });
            row.appendChild(rowLabel);

            colPlayers.forEach(opponent => {
                const td = document.createElement('td');
                td.style.textAlign = 'center';
                td.style.padding = '0.5rem';

                if (player.username === opponent.username) {
                    td.textContent = '—';
                    td.style.color = 'var(--color-text-muted)';
                } else {
                    const record = h2h[player.username][opponent.username];
                    if (record.total === 0) {
                        td.innerHTML = '<span class="win-loss"><span class="sep">—</span></span>';
                        td.style.color = 'var(--color-text-muted)';
                    } else {
                        // Visual win rate bar
                        const pct = (record.wins / record.total) * 100;
                        const barColor = pct >= 50 ? 'var(--color-success)' : 'var(--color-danger)';

                        td.innerHTML = `
                            <span class="win-loss">
                                <span class="wins">${record.wins}</span>
                                <span class="sep">-</span>
                                <span class="losses">${record.losses}</span>
                            </span>
                            <div style="
                                margin-top: 2px;
                                height: 3px;
                                background: var(--color-border-light);
                                border-radius: 2px;
                                overflow: hidden;
                                max-width: 60px;
                                margin-left: auto;
                                margin-right: auto;
                            ">
                                <div style="
                                    height: 100%;
                                    width: ${pct}%;
                                    background: ${barColor};
                                    border-radius: 2px;
                                    transition: width 0.6s ease;
                                "></div>
                            </div>
                        `;
                    }
                }

                row.appendChild(td);
            });

            tbody.appendChild(row);
        });

        table.appendChild(tbody);

        this.elements.tableContainer.appendChild(table);

        // Caption
        const caption = document.createElement('div');
        caption.style.cssText = `
            padding: var(--spacing-sm) var(--spacing-md);
            font-size: var(--font-size-xs);
            color: var(--color-text-muted);
            text-align: center;
            border-top: 1px solid var(--color-border-light);
        `;
        caption.textContent = 'Wins - Losses · win-rate bar below each record';
        this.elements.tableContainer.appendChild(caption);
    },

    showNoData() {
        if (this.elements.chartCanvas) {
            const parent = this.elements.chartCanvas.parentElement;
            if (parent) {
                // Destroy chart
                if (this.elements.chart) {
                    this.elements.chart.destroy();
                    this.elements.chart = null;
                }
                if (!parent.querySelector('.empty-state')) {
                    parent.appendChild(createEmptyState('⚔️', 'No head-to-head data for current filters.'));
                }
            }
        }

        if (this.elements.tableContainer) {
            this.elements.tableContainer.innerHTML = '';
            this.elements.tableContainer.appendChild(
                createEmptyState('📋', 'Select different filters to see rivalries.')
            );
        }
    }
};

window.rivalriesModule = rivalriesModule;
