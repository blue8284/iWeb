// ============================================================
// Theme configuration and utilities
// ============================================================

const theme = {
    colors: {
        primary: '#2563eb',
        secondary: '#64748b',
        success: '#16a34a',
        warning: '#ea580c',
        danger: '#dc2626',
        info: '#0891b2',
        neutral: '#f8fafc',
        text: '#1e293b',
        textLight: '#64748b',
        border: '#e2e8f0',
        background: '#ffffff',
    },
    chart: {
        blues: ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd'],
        greens: ['#16a34a', '#22c55e', '#4ade80', '#86efac'],
        reds: ['#dc2626', '#ef4444', '#f87171', '#fca5a5'],
        purples: ['#7c3aed', '#a78bfa', '#c4b5fd', '#ddd6fe'],
        grays: ['#64748b', '#94a3b8', '#cbd5e1', '#e2e8f0'],
    },
    breakpoints: { sm: 640, md: 768, lg: 1024, xl: 1280, '2xl': 1536 },
    spacing: {
        xs: '0.25rem', sm: '0.5rem', md: '1rem',
        lg: '1.5rem', xl: '2rem', '2xl': '3rem'
    },
    radius: {
        sm: '0.25rem', md: '0.5rem', lg: '0.75rem', xl: '1rem', full: '9999px'
    },
    fontSize: {
        xs: '0.75rem', sm: '0.875rem', md: '1rem', lg: '1.125rem',
        xl: '1.25rem', '2xl': '1.5rem', '3xl': '1.875rem'
    },
    fontWeight: {
        normal: 400, medium: 500, semibold: 600, bold: 700
    }
};

// -- Chart Colors -------------------------------------------------

function getChartColor(index, palette = 'blues') {
    const colors = theme.chart[palette] || theme.chart.blues;
    return colors[index % colors.length];
}

// -- Gradient Helpers ---------------------------------------------

function createLineGradient(ctx, chartArea, color, opacityTop = 0.3, opacityBottom = 0.0) {
    if (!chartArea) return hexToRgba(color, opacityTop);
    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
    gradient.addColorStop(0, hexToRgba(color, opacityTop));
    gradient.addColorStop(1, hexToRgba(color, opacityBottom));
    return gradient;
}

function createBarGradient(ctx, chartArea, color, opacityTop = 0.9, opacityBottom = 0.5) {
    if (!chartArea) return hexToRgba(color, opacityTop);
    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
    gradient.addColorStop(0, hexToRgba(color, opacityTop));
    gradient.addColorStop(1, hexToRgba(color, opacityBottom));
    return gradient;
}

function hexToRgba(color, alpha) {
    if (color.startsWith('rgba')) {
        return color.replace(/rgba\(([^,]+),([^,]+),([^,]+),([^)]+)\)/,
            (_, r, g, b) => `rgba(${r.trim()},${g.trim()},${b.trim()},${alpha})`);
    }
    if (color.startsWith('rgb(')) {
        return color.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`);
    }
    let hex = color.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// -- Chart.js Defaults --------------------------------------------

function chartDefaults() {
    Chart.defaults.font.family = theme.fontFamily || "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    Chart.defaults.font.size = 11;
    Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(15, 23, 42, 0.92)';
    Chart.defaults.plugins.tooltip.titleColor = '#f8fafc';
    Chart.defaults.plugins.tooltip.bodyColor = '#e2e8f0';
    Chart.defaults.plugins.tooltip.padding = 10;
    Chart.defaults.plugins.tooltip.cornerRadius = 6;
    Chart.defaults.plugins.tooltip.boxPadding = 3;
    Chart.defaults.animation.duration = 800;
    Chart.defaults.animation.easing = 'easeOutQuart';
    Chart.defaults.interaction.mode = 'index';
    Chart.defaults.interaction.intersect = false;
}

// -- Logo Helper --------------------------------------------------

const LOGO_PATH = 'logo.png';

function setLogo(imageUrl) {
    const img = document.getElementById('dashboardLogo');
    const placeholder = document.querySelector('.logo-placeholder');
    if (img && placeholder) {
        if (imageUrl) {
            img.src = imageUrl;
            img.style.display = 'block';
            img.onerror = () => {
                img.style.display = 'none';
                if (placeholder) placeholder.style.display = 'flex';
            };
            placeholder.style.display = 'none';
        } else {
            img.style.display = 'none';
            if (placeholder) placeholder.style.display = 'flex';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (LOGO_PATH) setLogo(LOGO_PATH);
});

// ============================================================
// Animations - Entrance, Counter, Loading
// ============================================================

// -- Staggered Entrance Animation ---------------------------------
// Apply to child elements of a container with configurable delay increment.
// Example: animateStaggered('#arenaStats .stat-card', 'animate-fade-in-up', 0.08);
function animateStaggered(selector, animationClass = 'animate-fade-in-up', delayIncrement = 0.07) {
    const elements = document.querySelectorAll(selector);
    elements.forEach((el, i) => {
        el.classList.add(animationClass);
        el.style.animationDelay = `${i * delayIncrement}s`;
    });
}

// -- Intersection Observer Entrance -------------------------------
// Fades in elements when they scroll into view.
// Usage: observeEntrance('.module', 'animate-slide-up');
function observeEntrance(selector, animationClass = 'animate-slide-up', threshold = 0.1) {
    if (!('IntersectionObserver' in window)) {
        document.querySelectorAll(selector).forEach(el => el.classList.add(animationClass));
        return;
    }
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add(animationClass);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold });
    document.querySelectorAll(selector).forEach(el => observer.observe(el));
}

// -- Animated Number Counter --------------------------------------
// Counts up from 0 to target over duration.
// Usage: animateCounter(element, 75, '%', 1200);
function animateCounter(element, target, suffix = '', duration = 1000) {
    if (!element) return;
    const start = performance.now();

    function update(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        // Ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(eased * target);
        element.textContent = current + suffix;
        element.style.opacity = 1;
        element.style.transform = 'translateY(0)';
        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            element.textContent = target + suffix;
        }
    }

    element.style.opacity = 0;
    element.style.transform = 'translateY(8px)';
    element.style.transition = 'none';
    requestAnimationFrame(update);
}

// -- Loading State ------------------------------------------------
// Shows skeleton/shimmer placeholder while data loads.
function showLoading(container) {
    if (!container) return;
    container.innerHTML = `
        <div style="padding: var(--spacing-md);">
            <div class="skeleton skeleton-title"></div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: var(--spacing-md); margin-bottom: var(--spacing-lg);">
                <div class="skeleton skeleton-card"></div>
                <div class="skeleton skeleton-card"></div>
                <div class="skeleton skeleton-card"></div>
            </div>
            <div class="skeleton" style="height: 280px; border-radius: var(--radius-lg);"></div>
        </div>
    `;
}

function hideLoading(container) {
    if (!container) container.innerHTML = '';
}

// -- Enhanced Stat Card Builder -----------------------------------
// Returns a card element with accent top bar, icon badge, animation class, and counter support.
function inferStatIcon(title = '', label = '') {
    const text = `${title} ${label}`.toLowerCase();
    if (text.includes('streak')) return '🔥';
    if (text.includes('duration') || text.includes('time')) return '⏱️';
    if (text.includes('win') && !text.includes('rate')) return '🏆';
    if (text.includes('game') || text.includes('play')) return '🎲';
    return '⭐';
}

function createStatCard({
    title = '',
    value = '',
    subtitle = '',
    label = '',
    accentColor = null,
    username = null,
    badge = null,
    icon = null,
    animateDelay = 0
} = {}) {
    const card = document.createElement('div');
    card.className = 'stat-card';
    card.style.animationDelay = `${animateDelay}s`;

    // Accent top bar & glow
    if (accentColor) {
        card.style.setProperty('--stat-accent', accentColor);
    }

    const iconBadge = document.createElement('div');
    iconBadge.className = 'stat-icon-badge';
    iconBadge.textContent = icon || inferStatIcon(title, label);
    card.appendChild(iconBadge);

    if (title) {
        const titleEl = document.createElement('div');
        titleEl.className = 'stat-label';
        titleEl.textContent = title;
        if (username) {
            titleEl.classList.add('player-name-link');
            titleEl.addEventListener('click', () => {
                if (window.playerProfileModule) {
                    window.playerProfileModule.open(username);
                }
            });
        }
        card.appendChild(titleEl);
    }

    if (value !== '') {
        const valueEl = document.createElement('div');
        valueEl.className = 'stat-value';
        if (accentColor) valueEl.style.color = accentColor;
        valueEl.textContent = value;
        valueEl.dataset.counter = value;
        card.appendChild(valueEl);
    }

    if (subtitle) {
        const subtitleEl = document.createElement('div');
        subtitleEl.className = 'stat-subtitle';
        subtitleEl.textContent = subtitle;
        card.appendChild(subtitleEl);
    }

    if (label) {
        const labelEl = document.createElement('div');
        labelEl.className = 'stat-footer';
        labelEl.textContent = label;
        card.appendChild(labelEl);
    }

    if (badge) {
        const badgeEl = document.createElement('div');
        badgeEl.style.cssText = `
            display: inline-block;
            margin-top: var(--spacing-xs);
            background: var(--color-success-light);
            color: var(--color-success);
            border-radius: var(--radius-sm);
            padding: 1px var(--spacing-sm);
            font-size: var(--font-size-xs);
            font-weight: var(--font-weight-semibold);
        `;
        badgeEl.textContent = badge;
        card.appendChild(badgeEl);
    }

    return card;
}

// -- Empty State Helper -------------------------------------------

function createEmptyState(icon = '🎲', message = 'No data matches current filters') {
    const div = document.createElement('div');
    div.className = 'empty-state';
    div.innerHTML = `
        <div class="empty-state-illustration">
            <div class="empty-state-icon">${icon}</div>
        </div>
        <div class="empty-state-text">${message}</div>
    `;
    return div;
}

// -- Formatting Helpers -------------------------------------------

function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

function formatPercent(value, total) {
    if (total === 0) return '0%';
    return ((value / total) * 100).toFixed(1) + '%';
}

function parseDate(dateStr) {
    const d = new Date(dateStr);
    return d;
}

function formatDate(date) {
    if (!date || isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    }).format(date);
}

function formatDateTime(dateStr) {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

function groupBy(array, keyFn) {
    return array.reduce((acc, item) => {
        const key = keyFn(item);
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
    }, {});
}

function sortBy(array, keyFn, ascending = true) {
    return [...array].sort((a, b) => {
        const aVal = keyFn(a);
        const bVal = keyFn(b);
        if (aVal < bVal) return ascending ? -1 : 1;
        if (aVal > bVal) return ascending ? 1 : -1;
        return 0;
    });
}

function topN(array, n, keyFn) {
    return sortBy(array, keyFn, false).slice(0, n);
}

function calculateWinRate(wins, total) {
    return total > 0 ? (wins / total) * 100 : 0;
}

function sumBy(array, keyFn) {
    return array.reduce((sum, item) => sum + (keyFn(item) || 0), 0);
}

function countBy(array, keyFn) {
    const counts = {};
    array.forEach(item => {
        const key = keyFn(item);
        counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
}

function toLocalISODate(d = new Date()) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getTodayString() {
    return toLocalISODate(new Date());
}

function getDateDaysAgo(days) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return toLocalISODate(date);
}

function isToday(dateStr) {
    return dateStr === getTodayString();
}

function isThisWeek(dateStr) {
    const date = new Date(dateStr);
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    return date >= startOfWeek && date <= today;
}

// -- Export -------------------------------------------------------

window.theme = theme;
window.themeUtils = {
    getChartColor,
    createLineGradient,
    createBarGradient,
    hexToRgba,
    chartDefaults,
    setLogo,
    formatNumber,
    formatPercent,
    parseDate,
    formatDate,
    formatDateTime,
    groupBy,
    sortBy,
    topN,
    calculateWinRate,
    sumBy,
    countBy,
    toLocalISODate,
    getTodayString,
    getDateDaysAgo,
    isToday,
    isThisWeek,
    // Animation helpers
    animateStaggered,
    observeEntrance,
    animateCounter,
    showLoading,
    hideLoading,
    createStatCard,
    createEmptyState,
};