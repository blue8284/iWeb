// Player Profile Module - Shows detailed player stats in a modal panel
const playerProfileModule = {
    // DOM elements
    elements: {
        modal: null,
        overlay: null,
        closeBtn: null,
        content: null
    },
    
    // Current player being viewed
    currentPlayer: null,
    
    // Initialize the module
    async init() {
        this.createModal();
        this.bindEvents();
        return this;
    },
    
    // Create modal DOM structure
    createModal() {
        // Create overlay
        const overlay = document.createElement('div');
        overlay.id = 'playerProfileOverlay';
        overlay.className = 'profile-overlay';
        overlay.style.display = 'none';
        
        // Create modal
        const modal = document.createElement('div');
        modal.id = 'playerProfileModal';
        modal.className = 'profile-modal';
        
        // Modal header
        const header = document.createElement('div');
        header.className = 'profile-header';
        
        const title = document.createElement('h2');
        title.id = 'profileTitle';
        title.textContent = 'Player Profile';
        
        const closeBtn = document.createElement('button');
        closeBtn.id = 'profileCloseBtn';
        closeBtn.className = 'profile-close-btn';
        closeBtn.innerHTML = '&times;';
        closeBtn.setAttribute('aria-label', 'Close');
        
        header.appendChild(title);
        header.appendChild(closeBtn);
        
        // Modal content
        const content = document.createElement('div');
        content.id = 'profileContent';
        content.className = 'profile-content';
        
        // Assemble modal
        modal.appendChild(header);
        modal.appendChild(content);
        overlay.appendChild(modal);
        
        // Add to document
        document.body.appendChild(overlay);
        
        // Cache elements
        this.elements.modal = modal;
        this.elements.overlay = overlay;
        this.elements.closeBtn = closeBtn;
        this.elements.content = content;
    },
    
    // Bind event listeners
    bindEvents() {
        // Close button
        if (this.elements.closeBtn) {
            this.elements.closeBtn.addEventListener('click', () => {
                this.close();
            });
        }
        
        // Click overlay to close
        if (this.elements.overlay) {
            this.elements.overlay.addEventListener('click', (e) => {
                if (e.target === this.elements.overlay) {
                    this.close();
                }
            });
        }
        
        // ESC key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.elements.overlay.style.display === 'flex') {
                this.close();
            }
        });
    },
    
    // Open profile for a player
    open(username) {
        const players = dataModule.getUniquePlayers();
        const player = players.find(p => p.username === username);
        
        if (!player) {
            console.error('Player not found:', username);
            return;
        }
        
        this.currentPlayer = player;
        this.render();
        
        // Show modal
        this.elements.overlay.style.display = 'flex';
        document.body.style.overflow = 'hidden'; // Prevent background scroll
    },
    
    // Close profile
    close() {
        this.elements.overlay.style.display = 'none';
        document.body.style.overflow = ''; // Restore scroll
        this.currentPlayer = null;
    },
    
    // Render profile content
    render() {
        if (!this.currentPlayer) return;
        
        const player = this.currentPlayer;
        const stats = this.calculatePlayerStats(player.username);
        
        // Update modal title
        const title = document.getElementById('profileTitle');
        if (title) {
            title.textContent = player.display_name;
            title.style.color = player.fav_color;
        }
        
        // Build content
        let html = '';
        
        // Player identity section
        html += `<div class="profile-section profile-identity" style="border-left: 4px solid ${player.fav_color};">`;
        html += `<div class="profile-display-name" style="color: ${player.fav_color};">${player.display_name}</div>`;
        if (player.login_spell) {
            html += `<div class="profile-login-spell">"${player.login_spell}"</div>`;
        }
        html += `<div class="profile-username">@${player.username}</div>`;
        html += `</div>`;
        
        // Overall stats section
        html += `<div class="profile-section">`;
        html += `<h3>Overall Performance</h3>`;
        html += `<div class="profile-stats-grid">`;
        html += `<div class="profile-stat-card">`;
        html += `<div class="stat-label">Win Rate</div>`;
        html += `<div class="stat-value" style="color: ${player.fav_color};">${stats.overall.winRate.toFixed(1)}%</div>`;
        html += `<div class="stat-detail">${stats.overall.wins}/${stats.overall.games} games</div>`;
        html += `</div>`;
        html += `<div class="profile-stat-card">`;
        html += `<div class="stat-label">First Places</div>`;
        html += `<div class="stat-value" style="color: ${player.fav_color};">🥇 ${stats.overall.wins}</div>`;
        html += `<div class="stat-detail">Total wins</div>`;
        html += `</div>`;
        html += `<div class="profile-stat-card">`;
        html += `<div class="stat-label">Avg Score</div>`;
        html += `<div class="stat-value" style="color: ${player.fav_color};">${stats.overall.avgScore.toFixed(1)}</div>`;
        html += `<div class="stat-detail">Per game</div>`;
        html += `</div>`;
        html += `<div class="profile-stat-card">`;
        html += `<div class="stat-label">Games Played</div>`;
        html += `<div class="stat-value" style="color: ${player.fav_color};">${stats.overall.games}</div>`;
        html += `<div class="stat-detail">Total sessions</div>`;
        html += `</div>`;
        html += `</div>`;
        html += `</div>`;
        
        // Per-game performance
        if (stats.perGame.length > 0) {
            html += `<div class="profile-section">`;
            html += `<h3>Performance by Game</h3>`;
            html += `<div class="profile-game-list">`;
            
            stats.perGame.forEach(game => {
                html += `<div class="profile-game-item">`;
                html += `<div class="game-name">${game.game}</div>`;
                html += `<div class="game-stats">`;
                html += `<span class="game-stat">Win Rate: <strong>${game.winRate.toFixed(1)}%</strong></span>`;
                html += `<span class="game-stat">Games: <strong>${game.games}</strong></span>`;
                html += `<span class="game-stat">Avg: <strong>${game.avgScore.toFixed(1)}</strong></span>`;
                html += `<span class="game-stat">Median: <strong>${game.medianScore.toFixed(1)}</strong></span>`;
                html += `<span class="game-stat">Mode: <strong>${game.modeScore}</strong></span>`;
                html += `<span class="game-stat">High: <strong>${game.highScore}</strong></span>`;
                html += `<span class="game-stat">Low: <strong>${game.lowScore}</strong></span>`;
                html += `</div>`;
                html += `</div>`;
            });
            
            html += `</div>`;
            html += `</div>`;
        }
        
        // Best and worst games
        if (stats.perGame.length > 0) {
            const bestGame = stats.perGame[0];
            const worstGame = stats.perGame[stats.perGame.length - 1];
            
            html += `<div class="profile-section">`;
            html += `<h3>Strengths & Challenges</h3>`;
            html += `<div class="profile-stats-grid">`;
            html += `<div class="profile-stat-card" style="border-left: 3px solid ${theme.colors.success};">`;
            html += `<div class="stat-label">Best Game</div>`;
            html += `<div class="stat-value">${bestGame.game}</div>`;
            html += `<div class="stat-detail">${bestGame.winRate.toFixed(1)}% win rate</div>`;
            html += `</div>`;
            html += `<div class="profile-stat-card" style="border-left: 3px solid ${theme.colors.warning};">`;
            html += `<div class="stat-label">Challenge Game</div>`;
            html += `<div class="stat-value">${worstGame.game}</div>`;
            html += `<div class="stat-detail">${worstGame.winRate.toFixed(1)}% win rate</div>`;
            html += `</div>`;
            html += `</div>`;
            html += `</div>`;
        }
        
        // Streaks section
        if (stats.streaks) {
            html += `<div class="profile-section">`;
            html += `<h3>Streaks</h3>`;
            html += `<div class="profile-stats-grid">`;
        
            // Current streaks
            if (stats.streaks.currentWin > 0) {
                html += `<div class="profile-stat-card" style="border-left: 3px solid ${theme.colors.success};">`;
                html += `<div class="stat-label">Current Win Streak</div>`;
                html += `<div class="stat-value" style="color: ${theme.colors.success};">🔥 ${stats.streaks.currentWin}</div>`;
                html += `<div class="stat-detail">Games in a row</div>`;
                html += `</div>`;
            }
        
            if (stats.streaks.currentLoss > 0) {
                html += `<div class="profile-stat-card" style="border-left: 3px solid ${theme.colors.warning};">`;
                html += `<div class="stat-label">Current Loss Streak</div>`;
                html += `<div class="stat-value" style="color: ${theme.colors.warning};">❄️ ${stats.streaks.currentLoss}</div>`;
                html += `<div class="stat-detail">Games in a row</div>`;
                html += `</div>`;
            }
        
            // Best streaks
            if (stats.streaks.bestWin > 0) {
                html += `<div class="profile-stat-card">`;
                html += `<div class="stat-label">Best Win Streak</div>`;
                html += `<div class="stat-value" style="color: ${player.fav_color};">🏆 ${stats.streaks.bestWin}</div>`;
                html += `<div class="stat-detail">Personal record</div>`;
                html += `</div>`;
            }
        
            if (stats.streaks.bestLoss > 0) {
                html += `<div class="profile-stat-card">`;
                html += `<div class="stat-label">Longest Drought</div>`;
                html += `<div class="stat-value" style="color: ${player.fav_color};">${stats.streaks.bestLoss}</div>`;
                html += `<div class="stat-detail">Games without win</div>`;
                html += `</div>`;
            }
        
            html += `</div>`;
            html += `</div>`;
        }
        
        // Rival section
        if (stats.rival) {
            html += `<div class="profile-section">`;
            html += `<h3>Arch-Rival</h3>`;
            html += `<div class="profile-rival-card" style="border-left: 4px solid ${stats.rival.fav_color};">`;
            html += `<div class="rival-name" style="color: ${stats.rival.fav_color};">${stats.rival.display_name}</div>`;
            html += `<div class="rival-stats">Most frequent opponent with ${stats.rival.games} games together</div>`;
            html += `</div>`;
            html += `</div>`;
        }
        
        // Head-to-head section
        if (stats.headToHead && stats.headToHead.length > 0) {
            html += `<div class="profile-section">`;
            html += `<h3>Head-to-Head Records</h3>`;
            html += `<div class="profile-h2h-list">`;
        
            stats.headToHead.forEach(record => {
                const winRateColor = record.winRate >= 50 ? theme.colors.success : theme.colors.warning;
                html += `<div class="profile-h2h-item">`;
                html += `<div class="h2h-player">`;
                html += `<span class="h2h-name" style="color: ${record.fav_color};">${record.display_name}</span>`;
                html += `<span class="h2h-games">${record.games} games</span>`;
                html += `</div>`;
                html += `<div class="h2h-record">`;
                html += `<span class="h2h-score">${record.wins}W - ${record.losses}L</span>`;
                html += `<span class="h2h-winrate" style="color: ${winRateColor};">${record.winRate.toFixed(1)}%</span>`;
                html += `</div>`;
                html += `</div>`;
            });
        
            html += `</div>`;
            html += `</div>`;
        }
        
        this.elements.content.innerHTML = html;
    },
    
    // Calculate detailed stats for a player
    calculatePlayerStats(username) {
        const filters = filtersModule.getFilters();
        const allData = dataModule.getFilteredData(filters);
        const playerData = allData.filter(row => row.name === username);
        
        // Overall stats
        const overall = {
            games: playerData.length,
            wins: playerData.filter(row => row['is win'] === '1').length,
            totalScore: playerData.reduce((sum, row) => sum + (parseInt(row.score) || 0), 0),
            winRate: 0,
            avgScore: 0
        };
        
        if (overall.games > 0) {
            overall.winRate = (overall.wins / overall.games) * 100;
            overall.avgScore = overall.totalScore / overall.games;
        }
        
        // Per-game stats
        const gameStats = {};
        playerData.forEach(row => {
            const game = row['game name'];
            if (!gameStats[game]) {
                gameStats[game] = {
                    game,
                    games: 0,
                    wins: 0,
                    totalScore: 0,
                    scores: [],
                    aggData: null
                };
            }
            gameStats[game].games++;
            if (row['is win'] === '1') gameStats[game].wins++;
            const score = parseInt(row.score) || 0;
            gameStats[game].totalScore += score;
            gameStats[game].scores.push(score);
        });

        // Merge agg data (score_max, score_min, win_rate, etc.)
        const aggData = (dataModule.aggPlayerGame || []).filter(row => row.username === username);

        Object.values(gameStats).forEach(gs => {
            const agg = aggData.find(a => a.game === gs.game);
            gs.aggData = agg || null;

            // Compute median
            const sorted = [...gs.scores].sort((a, b) => a - b);
            const mid = Math.floor(sorted.length / 2);
            gs.medianScore = sorted.length > 0
                ? (sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid])
                : 0;

            // Compute mode (most frequent score)
            const freq = {};
            gs.scores.forEach(s => { freq[s] = (freq[s] || 0) + 1; });
            let modeScore = 0, maxFreq = 0;
            Object.entries(freq).forEach(([score, count]) => {
                if (count > maxFreq) { maxFreq = count; modeScore = parseInt(score); }
            });
            gs.modeScore = modeScore;

            // High/low from agg if available, else from raw
            gs.highScore = agg ? parseInt(agg.score_max) : Math.max(...gs.scores);
            gs.lowScore = agg ? parseInt(agg.score_min) : Math.min(...gs.scores);
        });
        
        const perGame = Object.values(gameStats).map(g => ({
            game: g.game,
            games: g.games,
            wins: g.wins,
            winRate: (g.wins / g.games) * 100,
            avgScore: g.totalScore / g.games,
            medianScore: g.medianScore,
            modeScore: g.modeScore,
            highScore: g.highScore,
            lowScore: g.lowScore
        }));
        
        // Sort by win rate descending
        perGame.sort((a, b) => b.winRate - a.winRate);
        
        // Get streak data from agg_player_game
        const streaks = this.getStreakData(username);
        
        // Calculate head-to-head records
        const headToHead = this.calculateHeadToHead(username, allData);
        
        // Find most-played rival
        const rival = this.findRival(username, allData);
        
        return {
            overall,
            perGame,
            streaks,
            headToHead,
            rival
        };
    },
    
    // Get streak data from agg_player_game sheet
    getStreakData(username) {
        const aggData = dataModule.aggPlayerGame || [];
        const playerAgg = aggData.filter(row => row.username === username);
        
        // Aggregate streaks across all games
        let currentWinStreak = 0;
        let currentLossStreak = 0;
        let currentNotWinStreak = 0;
        let bestWinStreak = 0;
        let bestLossStreak = 0;
        
        playerAgg.forEach(row => {
            currentWinStreak += parseInt(row.streak_win) || 0;
            currentLossStreak += parseInt(row.streak_loss) || 0;
            currentNotWinStreak += parseInt(row.streak_not_win) || 0;
            bestWinStreak = Math.max(bestWinStreak, parseInt(row.streak_win_best) || 0);
            bestLossStreak = Math.max(bestLossStreak, parseInt(row.streak_loss_best) || 0);
        });
        
        return {
            currentWin: currentWinStreak,
            currentLoss: currentLossStreak,
            currentNotWin: currentNotWinStreak,
            bestWin: bestWinStreak,
            bestLoss: bestLossStreak
        };
    },
    
    // Calculate head-to-head records against each opponent
    calculateHeadToHead(username, allData) {
        const h2h = {};
        
        // Group games by session (end date + game name)
        const sessions = {};
        allData.forEach(row => {
            const sessionKey = `${row['end date']}_${row['game name']}`;
            if (!sessions[sessionKey]) {
                sessions[sessionKey] = [];
            }
            sessions[sessionKey].push(row);
        });
        
        // For each session where our player participated
        Object.values(sessions).forEach(session => {
            const ourPlayer = session.find(row => row.name === username);
            if (!ourPlayer) return;
            
            const ourWin = ourPlayer['is win'] === '1';
            
            // Check each opponent in the same session
            session.forEach(row => {
                if (row.name === username) return; // Skip self
                
                const opponent = row.name;
                if (!h2h[opponent]) {
                    h2h[opponent] = {
                        username: opponent,
                        display_name: row.display_name || opponent,
                        fav_color: row.fav_color || '#666',
                        wins: 0,
                        losses: 0,
                        games: 0
                    };
                }
                
                h2h[opponent].games++;
                
                const opponentWin = row['is win'] === '1';
                if (ourWin && !opponentWin) {
                    h2h[opponent].wins++;
                } else if (!ourWin && opponentWin) {
                    h2h[opponent].losses++;
                }
                // If both won or both lost, it's a tie (no increment)
            });
        });
        
        // Convert to array and calculate win rate
        const h2hArray = Object.values(h2h).map(record => ({
            ...record,
            winRate: record.games > 0 ? (record.wins / record.games) * 100 : 0
        }));
        
        // Sort by games played descending
        h2hArray.sort((a, b) => b.games - a.games);
        
        return h2hArray;
    },
    
    // Find most-played rival (most games against)
    findRival(username, allData) {
        const opponentCounts = {};
        
        // Group games by session
        const sessions = {};
        allData.forEach(row => {
            const sessionKey = `${row['end date']}_${row['game name']}`;
            if (!sessions[sessionKey]) {
                sessions[sessionKey] = [];
            }
            sessions[sessionKey].push(row);
        });
        
        // Count games with each opponent
        Object.values(sessions).forEach(session => {
            const ourPlayer = session.find(row => row.name === username);
            if (!ourPlayer) return;
            
            session.forEach(row => {
                if (row.name === username) return; // Skip self
                
                const opponent = row.name;
                if (!opponentCounts[opponent]) {
                    opponentCounts[opponent] = {
                        username: opponent,
                        display_name: row.display_name || opponent,
                        fav_color: row.fav_color || '#666',
                        games: 0
                    };
                }
                opponentCounts[opponent].games++;
            });
        });
        
        // Find the opponent with most games
        const rivals = Object.values(opponentCounts);
        rivals.sort((a, b) => b.games - a.games);
        
        return rivals.length > 0 ? rivals[0] : null;
    }
};

// Export for use in other modules
window.playerProfileModule = playerProfileModule;
