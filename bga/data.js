// Data module - handles Google Sheets data loading and filtering
const dataModule = {
    // Configuration
    config: {
        sheetID: '2PACX-1vQR473_3wvzUJNDAtu6S7jZGf-L8dbCxNB4xSoCOJlQMOQSf2feN2Zh91rH7tU06fcgdz0GHDpPUlWX',
        gids: {
            fact_play: 611151317,
            dim_user: 666894404,
            dim_game: 1726316824,
            agg_player_game: 1326005344
        },
        useLocalData: false
    },

    // Raw data storage
    rawData: [],
    dimUsers: [],
    dimGames: [],
    aggPlayerGame: [],
    
    // Initialize data module
    async init() {
        await this.loadData();
        return this;
    },
    
    // Fetch a single sheet by GID
    async fetchSheet(gid) {
        const url = `https://docs.google.com/spreadsheets/d/e/${this.config.sheetID}/pub?gid=${gid}&single=true&output=csv`;
        console.log(`Fetching sheet ${gid}...`);
        
        // Try direct fetch first
        try {
            const response = await fetch(url);
            if (response.ok) {
                const csvText = await response.text();
                const parsed = this.parseCSV(csvText);
                console.log(`✓ Fetched sheet ${gid}: ${parsed.length} rows`);
                return parsed;
            }
            console.warn(`Direct fetch failed for sheet ${gid}: ${response.status}, trying CORS proxy...`);
        } catch (error) {
            console.warn(`Direct fetch error for sheet ${gid}:`, error.message);
        }
        
        // Fallback: use CORS proxy
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
        console.log(`Trying CORS proxy for sheet ${gid}...`);
        const response = await fetch(proxyUrl);
        if (!response.ok) {
            console.error(`CORS proxy also failed for sheet ${gid}: ${response.status} ${response.statusText}`);
            throw new Error(`Failed to fetch sheet ${gid}: ${response.status}`);
        }
        const csvText = await response.text();
        const parsed = this.parseCSV(csvText);
        console.log(`✓ Fetched sheet ${gid} via CORS proxy: ${parsed.length} rows`);
        return parsed;
    },
    
    // Load data from Google Sheets or mock data
    async loadData() {
        if (!this.config.useLocalData) {
            try {
                console.log('Loading data from Google Sheets...');
                
                // Fetch all 4 sheets in parallel
                const [factData, dimUsers, dimGames, aggData] = await Promise.all([
                    this.fetchSheet(this.config.gids.fact_play),
                    this.fetchSheet(this.config.gids.dim_user),
                    this.fetchSheet(this.config.gids.dim_game),
                    this.fetchSheet(this.config.gids.agg_player_game)
                ]);
                
                this.dimUsers = dimUsers;
                this.dimGames = dimGames;
                this.aggPlayerGame = aggData;
                
                console.log('✓ Loaded sheets:', {
                    fact_play: factData.length,
                    dim_user: dimUsers.length,
                    dim_game: dimGames.length,
                    agg_player_game: aggData.length
                });
                
                // Build joined model
                this.rawData = this.buildJoinedModel(factData);
                console.log('✓ Built joined model:', this.rawData.length, 'records');
                return;
            } catch (error) {
                console.error('Failed to load from Google Sheets:', error);
                console.error('Error details:', error.message, error.stack);
            }
        }
        
        // Fall back to mock data
        console.log('Using mock data...');
        this.rawData = this.generateMockData();
        console.log('✓ Generated', this.rawData.length, 'mock records');
    },
    
    // Build joined model: fact rows + dim_user + dim_game data
    buildJoinedModel(factData) {
        // Index dim_user by username
        const userMap = {};
        this.dimUsers.forEach(user => {
            userMap[user.username] = user;
        });
        
        // Index dim_game by game_display and compute is_active_15
        const gameMap = {};
        const now = new Date();
        const fifteenDaysAgo = new Date(now);
        fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
        
        this.dimGames.forEach(game => {
            const gameDisplay = game.game_display;
            gameMap[gameDisplay] = {
                ...game,
                game_aliases: game.game_alias ? game.game_alias.split('|').map(a => a.trim()) : [],
                is_active_15: false // Will be computed below
            };
        });
        
        // Normalize all end date values (handle Excel serial dates mixed with ISO strings)
        factData.forEach(row => {
            const raw = row['end date'];
            if (raw) {
                row['end date'] = this.normalizeDate(raw);
            }
        });
        
        // Compute is_active_15: check if any fact row for this game is within last 15 days
        factData.forEach(row => {
            const gameName = row['game name'];
            const endDate = this.parseDate(row['end date']);
            if (gameMap[gameName] && endDate >= fifteenDaysAgo) {
                gameMap[gameName].is_active_15 = true;
            }
        });
        
        // Join fact rows with dimensions
        return factData.map(row => {
            const username = row.name;
            const gameName = row['game name'];
            
            const user = userMap[username] || {};
            const game = gameMap[gameName] || {};
            
            return {
                ...row,
                display_name: user.display_name || username,
                fav_color: user.fav_color || '#666666',
                login_spell: user.login_spell || '',
                game_aliases: game.game_aliases || [],
                is_active_15: game.is_active_15 || false,
                avg_duration: game.avg_duration || '',
                complexity: game.complexity || '',
                strategy: game.strategy || '',
                luck: game.luck || '',
                interaction: game.interaction || '',
                objective: game.objective || ''
            };
        });
    },
    
    // Parse CSV text into array of objects
    parseCSV(csvText) {
        const lines = csvText.trim().split('\n').map(line => line.replace(/\r/g, ''));
        if (lines.length < 2) return [];
        
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        return lines.slice(1).map(line => {
            const values = this.parseCSVLine(line);
            const obj = {};
            headers.forEach((header, index) => {
                obj[header] = values[index] !== undefined ? values[index].trim().replace(/"/g, '') : '';
            });
            return obj;
        });
    },
    
    // Parse a single CSV line (handles quoted fields)
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current);
        return result;
    },
    
    // Generate mock data for testing
    generateMockData() {
        const games = ['Harmonies', 'Wingspan', 'Terraforming Mars', 'Gloomhaven', 'Scythe', 'Codenames'];
        const players = ['tuanhuytruong13', 'hoaiphan0109', 'blue8284', 'alice'];
        
        const data = [];
        
        // Generate games over the last 30 days
        for (let i = 0; i < 60; i++) {
            const game = games[Math.floor(Math.random() * games.length)];
            const duration = Math.floor(Math.random() * 180) + 30; // 30-210 minutes
            const daysAgo = Math.floor(Math.random() * 30);
            const date = new Date();
            date.setDate(date.getDate() - daysAgo);
            
            const gameId = 700000000 + i;
            
            // Each game has all 4 players
            const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
            const scores = [100, 85, 70, 55].map(s => s + Math.floor(Math.random() * 20));
            
            shuffledPlayers.forEach((player, index) => {
                const rank = index + 1;
                const isWin = rank === 1;
                
                data.push({
                    'table id': gameId,
                    'game name': game,
                    'end date time': date.toISOString().slice(0, 16).replace('T', ' '),
                    'duration (minutes)': duration,
                    'rank': rank,
                    'name': player,
                    'score': scores[index],
                    'is_crv': Math.random() > 0.7 ? '1' : '0',
                    'end date': date.toISOString().slice(0, 10),
                    'duration hour': (duration / 60).toFixed(1),
                    'start datetime': new Date(date.getTime() - duration * 60000).toISOString().slice(0, 16).replace('T', ' '),
                    'is fallen': '0',
                    'is win': isWin ? '1' : '0',
                    'not win': isWin ? '0' : '1',
                    'is playing': 'TRUE'
                });
            });
        }
        
        return data;
    },
    
    // Get filtered data based on current filters
    getFilteredData(filters = {}) {
        return this.rawData.filter(record => {
            // Game filter
            if (filters.games && filters.games.length > 0) {
                if (!filters.games.includes(record['game name'])) return false;
            }
            
            // Player filter
            if (filters.players && filters.players.length > 0) {
                if (!filters.players.includes(record.name)) return false;
            }
            
            // Date range filter
            if (filters.dateFrom) {
                const recordDate = new Date(record['end date']);
                const fromDate = new Date(filters.dateFrom);
                if (recordDate < fromDate) return false;
            }
            if (filters.dateTo) {
                const recordDate = new Date(record['end date']);
                const toDate = new Date(filters.dateTo);
                toDate.setDate(toDate.getDate() + 1); // Include entire day
                if (recordDate >= toDate) return false;
            }
            
            // Wins only filter
            if (filters.winsOnly) {
                if (record['is win'] !== '1') return false;
            }
            
            // Show retired games toggle — skip only when no specific game is selected
            if (!filters.showRetiredGames && !record.is_active_15
                && (!filters.games || filters.games.length === 0)) {
                return false;
            }
            
            return true;
        });
    },
    
    // Get unique values for filter dropdowns
    getUniqueGames() {
        const games = [...new Set(this.rawData.map(r => r['game name']))];
        return games.filter(g => g).sort();
    },
    
    // Get games with activity status
    getGamesWithActivity() {
        const gameMap = new Map();
        this.rawData.forEach(r => {
            if (r['game name'] && !gameMap.has(r['game name'])) {
                gameMap.set(r['game name'], {
                    name: r['game name'],
                    is_active_15: r.is_active_15,
                    aliases: r.game_aliases
                });
            }
        });
        return Array.from(gameMap.values()).sort((a, b) => 
            a.name.localeCompare(b.name)
        );
    },
    
    getUniquePlayers() {
        // Return objects with both username and display_name
        const playerMap = new Map();
        this.rawData.forEach(r => {
            if (r.name && !playerMap.has(r.name)) {
                playerMap.set(r.name, {
                    username: r.name,
                    display_name: r.display_name,
                    fav_color: r.fav_color,
                    login_spell: r.login_spell || ''
                });
            }
        });
        return Array.from(playerMap.values()).sort((a, b) => 
            a.display_name.localeCompare(b.display_name)
        );
    },
    
    // Get date range of data
    getDateRange() {
        const dates = this.rawData.map(r => this.parseDate(r['end date']));
        return {
            min: new Date(Math.min(...dates)),
            max: new Date(Math.max(...dates))
        };
    },
    
    // Normalize a date value that may be ISO string ("2026-06-08") or Excel serial ("46012")
    normalizeDate(value) {
        if (!value || value === '') return '';
        // Excel serial dates are numbers >= 40000 (Excel dates after ~2009)
        const num = Number(value);
        if (!Number.isNaN(num) && num >= 40000 && Number.isInteger(num)) {
            return this.excelSerialToDateStr(num);
        }
        // Already an ISO or human-readable date string
        return value;
    },
    
    // Convert Excel serial day number to YYYY-MM-DD string
    excelSerialToDateStr(serial) {
        // Excel epoch: Jan 0, 1900 = serial 0, but due to the leap year bug,
        // Dec 30, 1899 is the correct JS epoch.
        const epoch = new Date(1899, 11, 30);
        const date = new Date(epoch.getTime() + serial * 86400000);
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    },
    
    // Parse a date string into a Date object, handling our normalized format
    parseDate(value) {
        if (!value || value === '') return new Date(0);
        // Already normalized to YYYY-MM-DD
        return new Date(value + 'T00:00:00');
    },
    
    // Get dimension tables (for advanced use)
    getDimensions() {
        return {
            users: this.dimUsers,
            games: this.dimGames,
            aggPlayerGame: this.aggPlayerGame
        };
    }
};

// Export for use in other modules
window.dataModule = dataModule;
