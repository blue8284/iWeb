// ═══════════════════════════════════════════════════
// Attributes Module — Player Performance by Game Attribute
// ═══════════════════════════════════════════════════

const attributesModule = {
    elements: {
        radarContainer: null,
        statsContainer: null,
        radarCharts: []
    },

    async init() {
        this.cacheElements();
        chartDefaults();
        await this.render();
        return this;
    },

    cacheElements() {
        this.elements.radarContainer = document.getElementById('attributesRadars');
        this.elements.statsContainer = document.getElementById('attributesStats');
    },

    async render() {
        const filters = filtersModule.getFilters();
        // Ignore date range — show all-time data for analysis
        const allTimeFilters = { ...filters, dateFrom: '', dateTo: '' };
        const data = dataModule.getFilteredData(allTimeFilters);

        if (data.length === 0) {
            this.showNoData();
            return;
        }

        // Determine which players to show
        const allPlayers = dataModule.getUniquePlayers();
        const selectedPlayers = filters.players.length > 0
            ? allPlayers.filter(p => filters.players.includes(p.username))
            : allPlayers;

        // Calculate attribute performance for each player
        const attrData = this.calculateAttributePerformance(data, selectedPlayers);

        // Render radar grid
        this.renderRadars(attrData);

        // Render game stats table
        this.renderGameStats(data, selectedPlayers);

        // Animate
        requestAnimationFrame(() => {
            animateStaggered('.attr-radar-cell', 'animate-fade-in-up', 0.08);
        });
    },

    // ── Attributes: 4 game dimensions ─────────────

    ATTRIBUTES: ['complexity', 'strategy', 'luck', 'interaction'],
    ATTR_LABELS: {
        complexity: 'Complexity',
        strategy: 'Strategy',
        luck: 'Luck',
        interaction: 'Interaction'
    },
    ATTR_ICONS: {
        complexity: '🧩',
        strategy: '♟️',
        luck: '🎲',
        interaction: '🤝'
    },

    // ── Calculate per-player performance per attribute ──

    calculateAttributePerformance(data, players) {
        const maxRankOverall = data.reduce((max, r) => Math.max(max, parseInt(r.rank) || 0), 0);

        return players.map(player => {
            const playerData = data.filter(r => r.name === player.username);
            if (playerData.length === 0) return null;

            // Overall avg rank
            const overallAvgRank = this.avg(playerData.map(r => parseInt(r.rank)));

            // Per-attribute scores
            const scores = {};
            this.ATTRIBUTES.forEach(attr => {
                // Group games by attribute level (1-5)
                const byLevel = {};
                playerData.forEach(r => {
                    const val = parseInt(r[attr]);
                    if (val >= 1 && val <= 5) {
                        if (!byLevel[val]) byLevel[val] = [];
                        byLevel[val].push(parseInt(r.rank));
                    }
                });

                // Mid-to-high games (level 3-5)
                const midHigh = [];
                const low = [];
                Object.entries(byLevel).forEach(([level, ranks]) => {
                    const lvl = parseInt(level);
                    if (lvl >= 3) midHigh.push(...ranks);
                    else low.push(...ranks);
                });

                const avgMidHigh = midHigh.length >= 2 ? this.avg(midHigh) : null;
                const avgLow = low.length >= 2 ? this.avg(low) : null;
                const gamesMidHigh = midHigh.length;

                // Performance score (0-100): how well does player rank
                // in games heavy on this attribute?
                let score = null;
                let displayRank = null;

                if (avgMidHigh !== null) {
                    displayRank = avgMidHigh;
                    // Normalize: 1st place = 100, last = 0
                    const denominator = (maxRankOverall > 1) ? (maxRankOverall - 1) : 1;
                    score = Math.max(0, (1 - (avgMidHigh - 1) / denominator)) * 100;
                }

                // Differential: how much better/worse vs overall
                let diff = null;
                if (avgMidHigh !== null && overallAvgRank !== null) {
                    diff = overallAvgRank - avgMidHigh; // positive = better at high-attr games
                }

                scores[attr] = {
                    avgRank: displayRank,
                    avgLow,
                    avgMidHigh,
                    diff,
                    score,
                    games: gamesMidHigh,
                    byLevel
                };
            });

            return {
                username: player.username,
                display_name: player.display_name,
                fav_color: player.fav_color,
                overallAvgRank,
                scores,
                totalGames: playerData.length
            };
        }).filter(Boolean);
    },

    avg(arr) {
        return arr.reduce((s, v) => s + v, 0) / arr.length;
    },

    // ── Render Radar Grid ─────────────────────────

    renderRadars(attrData) {
        if (!this.elements.radarContainer) return;

        // Destroy previous charts
        if (this.elements.radarCharts.length) {
            this.elements.radarCharts.forEach(c => c.destroy());
            this.elements.radarCharts = [];
        }

        this.elements.radarContainer.innerHTML = '';

        if (attrData.length === 0) {
            this.elements.radarContainer.appendChild(
                createEmptyState('📡', 'Not enough data for attribute analysis.')
            );
            return;
        }

        // Section header
        const title = document.createElement('h2');
        title.textContent = 'Performance by Game Attribute';
        title.style.cssText = `
            font-size: var(--font-size-base);
            font-weight: var(--font-weight-semibold);
            margin-bottom: var(--spacing-sm);
            color: var(--color-text);
        `;
        this.elements.radarContainer.appendChild(title);

        const subtitle = document.createElement('p');
        subtitle.textContent = 'Radar shows avg rank in medium-to-high attribute games (≥3). Higher area = better performance.';
        subtitle.style.cssText = `
            font-size: var(--font-size-xs);
            color: var(--color-text-muted);
            margin-bottom: var(--spacing-lg);
        `;
        this.elements.radarContainer.appendChild(subtitle);

        // Build grid
        const cols = Math.min(attrData.length, 3);
        const grid = document.createElement('div');
        grid.className = 'attr-radar-grid';
        grid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(${cols}, 1fr);
            gap: var(--spacing-lg);
            margin-bottom: var(--spacing-xl);
        `;

        attrData.forEach(pd => {
            const cell = document.createElement('div');
            cell.className = 'attr-radar-cell';
            cell.style.cssText = `
                background: var(--color-card);
                border: 1px solid var(--color-border);
                border-radius: var(--radius-lg);
                padding: var(--spacing-md);
            `;

            // Header: player name + overall avg rank
            const header = document.createElement('div');
            header.style.cssText = `
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: var(--spacing-sm);
            `;

            const name = document.createElement('span');
            name.textContent = pd.display_name;
            name.style.cssText = `
                color: ${pd.fav_color};
                font-size: var(--font-size-sm);
                font-weight: var(--font-weight-semibold);
            `;

            const badge = document.createElement('span');
            badge.textContent = `Avg Rank ${pd.overallAvgRank.toFixed(2)}`;
            badge.style.cssText = `
                font-size: 10px;
                color: var(--color-text-muted);
                background: var(--color-neutral);
                padding: 2px 8px;
                border-radius: 999px;
                border: 1px solid var(--color-border-light);
            `;

            header.appendChild(name);
            header.appendChild(badge);
            cell.appendChild(header);

            // Small stat row showing games per attribute
            const statRow = document.createElement('div');
            statRow.style.cssText = `
                display: flex;
                gap: var(--spacing-sm);
                margin-bottom: var(--spacing-sm);
                font-size: 9px;
                color: var(--color-text-muted);
                flex-wrap: wrap;
            `;
            this.ATTRIBUTES.forEach(attr => {
                const s = pd.scores[attr];
                if (s && s.games >= 2) {
                    const pill = document.createElement('span');
                    pill.style.cssText = `
                        background: var(--color-primary-subtle);
                        padding: 1px 6px;
                        border-radius: 4px;
                    `;
                    pill.textContent = `${this.ATTR_ICONS[attr]} ${s.avgRank?.toFixed(2)} (${s.games}g)`;
                    statRow.appendChild(pill);
                }
            });
            cell.appendChild(statRow);

            // Canvas
            const canvas = document.createElement('canvas');
            canvas.style.maxHeight = '220px';
            canvas.style.maxWidth = '280px';
            canvas.style.margin = '0 auto';
            cell.appendChild(canvas);

            grid.appendChild(cell);
        });

        this.elements.radarContainer.appendChild(grid);

        // Create chart instances after layout
        requestAnimationFrame(() => {
            const canvases = grid.querySelectorAll('canvas');
            attrData.forEach((pd, i) => {
                if (canvases[i]) {
                    const chart = this.createRadarChart(canvases[i], pd);
                    this.elements.radarCharts.push(chart);
                }
            });
        });
    },

    createRadarChart(canvas, playerData) {
        const labels = this.ATTRIBUTES.map(a => this.ATTR_LABELS[a]);
        const data = this.ATTRIBUTES.map(attr => {
            const s = playerData.scores[attr];
            return (s && s.score !== null) ? s.score : null;
        });

        // Find how many valid axes
        const hasData = data.some(d => d !== null);
        if (!hasData) return null;

        return new Chart(canvas, {
            type: 'radar',
            data: {
                labels,
                datasets: [{
                    label: playerData.display_name,
                    data,
                    backgroundColor: hexToRgba(playerData.fav_color, 0.12),
                    borderColor: playerData.fav_color,
                    borderWidth: 2,
                    pointBackgroundColor: playerData.fav_color,
                    pointBorderColor: '#fff',
                    pointBorderWidth: 1.5,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100,
                        min: 0,
                        ticks: {
                            stepSize: 25,
                            color: theme.colors.textLight,
                            backdropColor: 'transparent',
                            font: { size: 8 }
                        },
                        grid: {
                            color: theme.colors.border
                        },
                        angleLines: {
                            color: theme.colors.border,
                            lineWidth: 1
                        },
                        pointLabels: {
                            color: theme.colors.text,
                            font: { size: 10, weight: '500' }
                        }
                    }
                },
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
                            label: ctx => {
                                const attr = this.ATTRIBUTES[ctx.dataIndex];
                                const s = playerData.scores[attr];
                                if (!s || s.games < 2) {
                                    return `${ctx.label}: Not enough data`;
                                }
                                const diffStr = s.diff !== null
                                    ? ` (${s.diff >= 0 ? '+' : ''}${s.diff.toFixed(2)} vs overall)`
                                    : '';
                                return `${ctx.label}: Avg Rank ${s.avgRank.toFixed(2)}${diffStr} · ${s.games} games`;
                            }
                        }
                    }
                }
            }
        });
    },

    // ── Game Stats Table ───────────────────────────

    renderGameStats(data, players) {
        if (!this.elements.statsContainer) return;

        this.elements.statsContainer.innerHTML = '';

        // Build player lookup
        const playerMap = {};
        players.forEach(p => { playerMap[p.username] = p; });

        // Group data by game
        const byGame = {};
        data.forEach(r => {
            const game = r['game name'];
            if (!byGame[game]) byGame[game] = [];
            byGame[game].push(r);
        });

        const gameNames = Object.keys(byGame).sort();

        if (gameNames.length === 0) {
            this.elements.statsContainer.appendChild(
                createEmptyState('🎮', 'No game data available.')
            );
            return;
        }

        // Section title
        const title = document.createElement('h2');
        title.textContent = 'Game Overview';
        title.style.cssText = `
            font-size: var(--font-size-base);
            font-weight: var(--font-weight-semibold);
            margin-bottom: var(--spacing-md);
            color: var(--color-text);
        `;
        this.elements.statsContainer.appendChild(title);

        // Build table
        const table = document.createElement('table');
        table.className = 'game-stats-table';

        // THEAD
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        const gameTh = document.createElement('th');
        gameTh.textContent = 'Game';
        gameTh.style.textAlign = 'left';
        headerRow.appendChild(gameTh);

        const playsTh = document.createElement('th');
        playsTh.textContent = 'Plays';
        headerRow.appendChild(playsTh);

        // Per-player avg rank columns
        players.forEach(p => {
            const th = document.createElement('th');
            th.textContent = p.display_name;
            th.style.color = p.fav_color;
            th.title = `Avg Rank for ${p.display_name}`;
            headerRow.appendChild(th);
        });

        const bestTh = document.createElement('th');
        bestTh.textContent = 'Best Player';
        headerRow.appendChild(bestTh);

        thead.appendChild(headerRow);
        table.appendChild(thead);

        // TBODY
        const tbody = document.createElement('tbody');

        gameNames.forEach(game => {
            const rows = byGame[game];
            const totalPlays = rows.length;
            const row = document.createElement('tr');

            // Game name
            const gameCell = document.createElement('td');
            gameCell.textContent = game;
            gameCell.style.fontWeight = '500';
            row.appendChild(gameCell);

            // Total plays
            const playsCell = document.createElement('td');
            playsCell.textContent = totalPlays;
            playsCell.style.textAlign = 'center';
            row.appendChild(playsCell);

            // Per-player avg rank
            const playerAvgRanks = [];
            players.forEach(p => {
                const pr = rows.filter(r => r.name === p.username);
                const avgR = pr.length > 0
                    ? pr.reduce((s, r) => s + parseInt(r.rank), 0) / pr.length
                    : null;
                playerAvgRanks.push({ username: p.username, avgRank: avgR, games: pr.length });

                const td = document.createElement('td');
                td.style.textAlign = 'center';
                if (avgR !== null) {
                    td.textContent = avgR.toFixed(2);
                    td.style.color = avgR <= 2 ? 'var(--color-success)' :
                        avgR >= 3 ? 'var(--color-danger)' :
                            'var(--color-text)';
                    td.style.fontWeight = avgR <= 2 ? '600' : '400';
                } else {
                    td.textContent = '—';
                    td.style.color = 'var(--color-text-muted)';
                }
                row.appendChild(td);
            });

            // Best player (lowest avg rank)
            const bestCell = document.createElement('td');
            bestCell.style.textAlign = 'center';
            const valid = playerAvgRanks.filter(x => x.avgRank !== null);
            if (valid.length > 0) {
                const best = valid.reduce((a, b) => a.avgRank < b.avgRank ? a : b);
                bestCell.textContent = playerMap[best.username]?.display_name || best.username;
                bestCell.style.color = playerMap[best.username]?.fav_color || 'var(--color-text)';
                bestCell.style.fontWeight = '600';
            } else {
                bestCell.textContent = '—';
                bestCell.style.color = 'var(--color-text-muted)';
            }
            row.appendChild(bestCell);

            tbody.appendChild(row);
        });

        table.appendChild(tbody);
        this.elements.statsContainer.appendChild(table);

        // Caption
        const caption = document.createElement('div');
        caption.style.cssText = `
            padding: var(--spacing-sm) var(--spacing-md);
            font-size: var(--font-size-xs);
            color: var(--color-text-muted);
            text-align: center;
            border-top: 1px solid var(--color-border-light);
        `;
        caption.textContent = 'Values show average rank per player per game · lower is better · green = ≤2.0, red = ≥3.0';
        this.elements.statsContainer.appendChild(caption);
    },

    showNoData() {
        if (this.elements.radarContainer) {
            this.elements.radarContainer.innerHTML = '';
            this.elements.radarContainer.appendChild(
                createEmptyState('📡', 'Select filters to see attribute-based performance.')
            );
        }
        if (this.elements.statsContainer) {
            this.elements.statsContainer.innerHTML = '';
            this.elements.statsContainer.appendChild(
                createEmptyState('🎮', 'Select filters to see game statistics.')
            );
        }
    }
};

window.attributesModule = attributesModule;
