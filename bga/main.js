// ═══════════════════════════════════════════════════
// Main application controller
// ═══════════════════════════════════════════════════

const app = {
    modules: {
        data: null,
        auth: null,
        filters: null,
        playerProfile: null,
        arena: null,
        rivalries: null,
        attributes: null,
        metagame: null
    },

    async init() {
        console.log('🚀 Initializing Board Game Dashboard...');

        // Show splash / loading header
        this.showSplash();

        try {
            this.modules.data = await dataModule.init();

            if (typeof authModule === 'undefined') {
                console.error('authModule not loaded yet, waiting...');
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            this.modules.auth = authModule;
            const authenticatedUser = await authModule.init();
            console.log('✅ Authenticated as:', authenticatedUser.display_name);

            await this.initModules(authenticatedUser);

            this.setupFilterHandlers();
            this.setupTabs();
            this.setupTheme();

            await this.renderAll();

            // Apply entrance animations after everything is rendered
            this.applyEntranceAnimations();

            console.log('✅ Dashboard initialized successfully!');
        } catch (error) {
            console.error('❌ Failed to initialize dashboard:', error);
            this.showError('Failed to initialize dashboard. See console for details.');
        }
    },

    // Show a brief splash effect in the header
    showSplash() {
        const title = document.querySelector('.dashboard-header h1');
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

    async initModules(authenticatedUser) {
        this.modules.filters = await filtersModule.init();

        if (authenticatedUser) {
            filtersModule.setInitialPlayerFilter(authenticatedUser.username);
        }

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
            this.renderAll();
        };
    },

    setupTabs() {
        const buttons = Array.from(document.querySelectorAll('.tab-btn'));
        const panels = Array.from(document.querySelectorAll('.tab-panel'));

        buttons.forEach(button => {
            button.addEventListener('click', () => {
                const targetId = button.dataset.tab;
                buttons.forEach(btn => btn.classList.toggle('active', btn === button));
                panels.forEach(panel => panel.classList.toggle('active', panel.id === targetId));

                // Dim date range filter for tabs that show all-time data
                const ignoreDateTabs = ['metagameModule', 'attributesModule'];
                filtersModule.setDateRangeEnabled(!ignoreDateTabs.includes(targetId));

                // Chart.js resize after activation + brief delay for layout settle
                setTimeout(() => {
                    if (this.modules.arena?.elements?.chart) this.modules.arena.elements.chart.resize();
                    if (this.modules.rivalries?.elements?.chart) this.modules.rivalries.elements.chart.resize();
                    if (this.modules.attributes?.radarCharts?.length) {
                        this.modules.attributes.radarCharts.forEach(c => { if (c) c.resize(); });
                    }
                    if (this.modules.metagame?.elements?.chart) this.modules.metagame.elements.chart.resize();
                }, 50);
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

    async renderAll() {
        console.log('🔄 Re-rendering all modules...');

        await this.modules.arena.render();
        await this.modules.rivalries.render();
        await this.modules.attributes.render();
        await this.modules.metagame.render();

        // Apply staggered animations to newly rendered content
        this.applyEntranceAnimations();

        console.log('✅ Re-render complete');
    },

    // Apply staggered entrance animations to all rendered content
    applyEntranceAnimations() {
        // Animate stat cards with stagger
        animateStaggered('.stat-card', 'animate-fade-in-up', 0.07);

        // Animate chart containers
        document.querySelectorAll('.chart-container').forEach(el => {
            el.classList.add('animate-fade-in');
        });

        // Animate tables
        const tables = document.querySelectorAll('.table-container');
        tables.forEach((el, i) => {
            el.classList.add('animate-fade-in-up');
            el.style.animationDelay = `${i * 0.1 + 0.15}s`;
        });
    },

    showError(message) {
        const dashboardContent = document.querySelector('.dashboard-content');
        if (dashboardContent) {
            dashboardContent.innerHTML = `
                <div style="
                    text-align: center;
                    padding: ${theme.spacing.xl};
                    background: var(--color-danger-light);
                    color: var(--color-danger);
                    border: 1px solid var(--color-danger);
                    border-radius: var(--radius-lg);
                    margin-top: var(--spacing-xl);
                ">
                    <div style="font-size: 2rem; margin-bottom: var(--spacing-md);">⚠️</div>
                    <h2 style="margin-bottom: var(--spacing-sm); font-weight: var(--font-weight-semibold);">Error</h2>
                    <p>${message}</p>
                </div>
            `;
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
