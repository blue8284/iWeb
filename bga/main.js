// ============================================================================
// Main application controller — v2 (Drawer + Hero + Transitions)
// ============================================================================

const app = {
    modules: {
        data: null,
        filters: null,
        playerProfile: null,
        arena: null,
        rivalries: null,
        attributes: null,
        metagame: null
    },

    async init() {
        console.log('🚀 Initializing Board Game Dashboard...');
        this.showSplash();

        try {
            this.modules.data = await dataModule.init();
            await this.initModules();
            this.renderHeaderAvatars();
            this.setupFilterHandlers();
            this.setupTabs();
            this.setupTheme();

            await this.renderAll();
            this.updateHeroStats();
            this.applyEntranceAnimations();

            console.log('✅ Dashboard initialized successfully!');
        } catch (error) {
            console.error('❌ Failed to initialize dashboard:', error);
            this.showError('Failed to initialize dashboard. See console for details.');
        }
    },

    showSplash() {
        const title = document.querySelector('.header-title-block h1');
        if (title) {
            title.style.opacity = '0';
            title.style.transform = 'translateY(-4px)';
            title.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            requestAnimationFrame(() => {
                title.style.opacity = '1';
                title.style.transform = 'translateY(0)';
            });
        }
    },

    renderHeaderAvatars() {
        const container = document.getElementById('headerAvatars');
        if (!container || !window.dataModule) return;

        container.innerHTML = '';
        const players = dataModule.getUniquePlayers();
        players.forEach(player => {
            const avatar = document.createElement('button');
            avatar.type = 'button';
            avatar.className = 'header-avatar';
            avatar.title = player.display_name;
            avatar.textContent = (player.display_name || player.username || '?').charAt(0).toUpperCase();
            avatar.style.setProperty('--avatar-color', player.fav_color || '#ffffff');
            avatar.addEventListener('click', () => {
                if (window.playerProfileModule) {
                    window.playerProfileModule.open(player.username);
                }
            });
            container.appendChild(avatar);
        });
    },

    async initModules() {
        this.modules.filters = await filtersModule.init();

        if (window.playerProfileModule) {
            this.modules.playerProfile = await playerProfileModule.init();
        }

        this.modules.arena = await arenaModule.init();
        this.modules.rivalries = await rivalriesModule.init();
        this.modules.attributes = await attributesModule.init();
        this.modules.metagame = await metagameModule.init();
    },

    setupFilterHandlers() {
        filtersModule.onFiltersChanged = () => {
            filtersModule.updateFilterIndicators();
            this.renderAll();
            this.updateHeroStats();
        };
        // Initial indicator update
        filtersModule.updateFilterIndicators();
    },

    setupTabs() {
        const buttons = Array.from(document.querySelectorAll('.tab-btn'));
        const panels = Array.from(document.querySelectorAll('.tab-panel'));

        buttons.forEach(button => {
            button.addEventListener('click', () => {
                const targetId = button.dataset.tab;

                buttons.forEach(btn => btn.classList.toggle('active', btn === button));

                panels.forEach(panel => {
                    const isTarget = panel.id === targetId;
                    panel.classList.toggle('active', isTarget);
                });

                // Dim date range filter for tabs that show all-time data
                const ignoreDateTabs = ['metagameModule', 'attributesModule'];
                filtersModule.setDateRangeEnabled(!ignoreDateTabs.includes(targetId));

                // Chart.js resize after activation
                setTimeout(() => {
                    if (this.modules.arena?.elements?.chart) this.modules.arena.elements.chart.resize();
                    if (this.modules.rivalries?.elements?.chart) this.modules.rivalries.elements.chart.resize();
                    if (this.modules.attributes?.elements?.radarCharts?.length) {
                        this.modules.attributes.elements.radarCharts.forEach(c => { if (c) c.resize(); });
                    }
                    if (this.modules.metagame?.elements?.chart) this.modules.metagame.elements.chart.resize();
                }, 60);
            });
        });
    },

    setupTheme() {
        const toggleBtn = document.getElementById('themeToggle');
        if (!toggleBtn) return;

        const savedTheme = localStorage.getItem('dashboard-theme') || 'dark';
        if (savedTheme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
            toggleBtn.textContent = '☀️';
        } else {
            document.documentElement.removeAttribute('data-theme');
            toggleBtn.textContent = '🌙';
        }
        this.syncJsTheme();

        toggleBtn.addEventListener('click', () => {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            if (isDark) {
                document.documentElement.removeAttribute('data-theme');
                localStorage.setItem('dashboard-theme', 'light');
                toggleBtn.textContent = '🌙';
            } else {
                document.documentElement.setAttribute('data-theme', 'dark');
                localStorage.setItem('dashboard-theme', 'dark');
                toggleBtn.textContent = '☀️';
            }
            this.syncJsTheme();
            this.renderAll();
        });
    },

    syncJsTheme() {
        const style = getComputedStyle(document.documentElement);
        if (theme && theme.colors) {
            theme.colors.primary = style.getPropertyValue('--color-primary').trim();
            theme.colors.secondary = style.getPropertyValue('--color-secondary').trim();
            theme.colors.success = style.getPropertyValue('--color-success').trim();
            theme.colors.warning = style.getPropertyValue('--color-warning').trim();
            theme.colors.danger = style.getPropertyValue('--color-danger').trim();
            theme.colors.neutral = style.getPropertyValue('--color-neutral').trim();
            theme.colors.text = style.getPropertyValue('--color-text').trim();
            theme.colors.textLight = style.getPropertyValue('--color-text-light').trim();
            theme.colors.border = style.getPropertyValue('--color-border').trim();
            theme.colors.background = style.getPropertyValue('--color-background').trim();
        }
    },

    // ── Hero Live Stats ──────────────────────────

    updateHeroStats() {
        const container = document.getElementById('heroLiveStats');
        const subtitleEl = document.getElementById('heroSubtitle');
        if (!container) return;

        const filters = filtersModule.getFilters();
        const data = dataModule.getFilteredData(filters);

        container.innerHTML = '';

        if (data.length === 0) {
            if (subtitleEl) subtitleEl.textContent = 'No games in selected range';
            return;
        }

        // Calculate quick stats
        const totalGames = new Set(data.map(r => r['table id'])).size;
        const totalWins = data.filter(r => r['is win'] === '1').length;
        const uniquePlayers = new Set(data.map(r => r.name)).size;

        // Find hottest player (most wins in period)
        const winsByPlayer = {};
        data.forEach(r => {
            if (r['is win'] === '1') {
                winsByPlayer[r.name] = (winsByPlayer[r.name] || 0) + 1;
            }
        });
        const hottestEntry = Object.entries(winsByPlayer).sort((a, b) => b[1] - a[1])[0];
        const hottestPlayer = hottestEntry ? dataModule.getUniquePlayers().find(p => p.username === hottestEntry[0]) : null;

        // Update subtitle
        if (subtitleEl) {
            if (hottestPlayer) {
                subtitleEl.textContent = `🔥 ${hottestPlayer.display_name} leads with ${hottestEntry[1]} wins`;
            } else {
                subtitleEl.textContent = 'Recent Performance';
            }
        }

        // Build pills
        const stats = [
            { value: totalGames, label: 'Games' },
            { value: totalWins, label: 'Wins' },
            { value: uniquePlayers, label: 'Players' }
        ];

        stats.forEach(s => {
            const pill = document.createElement('div');
            pill.className = 'hero-stat-pill';
            pill.innerHTML = `
                <span class="hero-stat-value">${s.value}</span>
                <span class="hero-stat-label">${s.label}</span>
            `;
            container.appendChild(pill);
        });
    },

    async renderAll() {
        console.log('🔄 Re-rendering all modules...');

        await this.modules.arena.render();
        await this.modules.rivalries.render();
        await this.modules.attributes.render();
        await this.modules.metagame.render();

        this.applyEntranceAnimations();
        console.log('✅ Re-render complete');
    },

    applyEntranceAnimations() {
        animateStaggered('.stat-card', 'animate-fade-in-up', 0.07);
        document.querySelectorAll('.chart-container').forEach(el => {
            el.classList.add('animate-fade-in');
        });
        document.querySelectorAll('.table-container').forEach(el => {
            el.classList.add('animate-fade-in-up');
        });
    },

    showError(message) {
        const content = document.querySelector('.dashboard-content');
        if (content) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.innerHTML = `<strong>Error:</strong> ${message}`;
            content.prepend(errorDiv);
        }
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => app.init());
} else {
    app.init();
}

window.app = app;
