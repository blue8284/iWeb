// ═══════════════════════════════════════════════════
// Film Detail & Folder/Version Expansion
// ═══════════════════════════════════════════════════

const FilmDetail = (() => {

    // ── HTML Escaping ─────────────────────────────
    function esc(s) {
        if (s == null) return '';
        return String(s).replace(/[&<>"']/g, m => {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            if (m === '"') return '&quot;';
            if (m === "'") return '&#039;';
            return m;
        });
    }

    function fmtNum(n) {
        if (n == null) return '—';
        return Number(n).toLocaleString('en-US');
    }

    function fmtSize(gb) {
        if (gb == null) return '—';
        return gb.toFixed(1) + ' GB';
    }

    // ── Render film detail expanded section ────────
    function renderFilmDetail(film) {
        const parts = [];

        // Plot & info
        if (film.plot) {
            parts.push(`<div class="film-detail-section">
                <h4>Plot</h4>
                <div class="film-detail-plot">${esc(film.plot)}</div>
            </div>`);
        }

        // Runtime, country, rating info
        const infoItems = [];
        if (film.runtime) infoItems.push(`<strong>Runtime:</strong> ${film.runtime} min`);
        if (film.rating) infoItems.push(`<strong>IMDb:</strong> <span class="film-card-rating">⭐ ${film.rating}</span>`);
        if (film.votes) infoItems.push(`<strong>Votes:</strong> ${fmtNum(film.votes)}`);
        if (infoItems.length) {
            parts.push(`<div class="film-detail-section">
                <div class="film-detail-info">${infoItems.join(' · ')}</div>
            </div>`);
        }

        // Watch Providers
        var wpText = FilmData.getWatchProvidersText(film.watch_providers);
        if (wpText) {
          parts.push('<div class="watch-provider-line">' + wpText + '</div>');
        }

        // Actors
        if (film.actors && film.actors.length) {
            parts.push('<div class="film-detail-section"><h4>Cast</h4><div class="person-chips">' +
                film.actors.map(function(a) {
                    return '<span class="person-chip actor-chip" style="cursor:pointer;" onclick="StatsModule.selectPersonFilms(\'' + esc(a.name) + '\')">🎭 ' + esc(a.name) + '</span>';
                }).join('') +
            '</div></div>');
        }

        // Directors
        if (film.directors && film.directors.length) {
            parts.push('<div class="film-detail-section"><h4>Directors</h4><div class="person-chips">' +
                film.directors.map(function(d) {
                    return '<span class="person-chip director-chip" style="cursor:pointer;" onclick="StatsModule.selectPersonFilms(\'' + esc(d.name) + '\')">🎬 ' + esc(d.name) + '</span>';
                }).join('') +
            '</div></div>');
        }

        // Folders → Versions
        if (film.folders && film.folders.length) {
            parts.push(`<div class="film-detail-section">
                <h4>📁 Files (${film.folders.length} folders, ${countVersions(film)} versions)</h4>
                ${film.folders.map(folder => renderFolder(folder)).join('')}
            </div>`);
        }

        return parts.join('\n');
    }

    function countVersions(film) {
        let count = 0;
        film.folders?.forEach(f => { count += f.versions?.length || 0; });
        return count;
    }

    function renderFolder(folder) {
        const verCount = folder.versions?.length || 0;
        return `<div class="folder-group">
            <div class="folder-header" onclick="this.nextElementSibling.classList.toggle('hidden')">
                <span class="folder-name">📁 ${esc(folder.folder_name)}</span>
                <span class="folder-count">${verCount} version${verCount > 1 ? 's' : ''} ▾</span>
            </div>
            <div class="version-list">
                ${folder.versions.map(v => renderVersion(v)).join('')}
            </div>
        </div>`;
    }

    function renderVersion(v) {
        const isDead = v.link_status && v.link_status !== 'active';
        const statusBadge = isDead
            ? `<span class="v-status" style="color:var(--color-danger);font-size:0.65rem;font-weight:600;">⚠ ${esc(v.link_status)}</span>`
            : '';
        return `<div class="version-item${isDead ? ' version-dead' : ''}" style="${isDead ? 'opacity:0.5;' : ''}">
            <span class="v-res">${esc(v.resolution || '?')}</span>
            <span class="v-format">${esc(v.video_format || '')}</span>
            <span class="v-size">${fmtSize(v.size_gb)}</span>
            <span class="v-dl">${fmtNum(v.download_count)} dl</span>
            ${isDead
                ? `<span class="v-status-badge">${statusBadge}</span>`
                : `<a class="dl-link" href="${esc(v.fshare_url)}" target="_blank" rel="noopener"
                     onclick="event.stopPropagation()">📥 Download</a>`}
        </div>`;
    }

    // ── Render film detail for modal ───────────────
    function renderModalContent(film) {
        const html = [];
        html.push(`<div style="display:flex;gap:20px;margin-bottom:20px;">`);

        // Poster
        if (film.poster_url) {
            html.push(`<img src="${esc(film.poster_url)}" alt="${esc(film.title)}"
                style="width:150px;height:225px;object-fit:cover;border-radius:var(--radius-md);flex-shrink:0;">`);
        } else {
            html.push(`<div style="width:150px;height:225px;background:var(--color-surface-2);
                border-radius:var(--radius-md);display:flex;align-items:center;justify-content:center;
                font-size:3rem;flex-shrink:0;">🎬</div>`);
        }

        html.push(`<div style="flex:1;">`);
        html.push(`<h2 style="font-size:1.2rem;margin-bottom:8px;">${esc(film.title)} <span style="color:var(--color-text-muted);font-weight:400;">(${film.year || '?'})</span></h2>`);

        if (film.rating) {
            html.push(`<div style="margin-bottom:6px;"><span style="color:var(--color-star);font-weight:600;">⭐ ${film.rating}</span>`);
            if (film.votes) html.push(` <span style="color:var(--color-text-muted);font-size:0.85rem;">(${fmtNum(film.votes)} votes)</span>`);
            html.push(`</div>`);
        }

        // Genres
        if (film.genres?.length) {
            html.push('<div class="film-card-genres" style="margin-bottom:8px;">' +
                film.genres.map(function(g) { return FilmData.getGenreChip(g); }).join('') +
            '</div>');
        }

        // Watch Providers
        var wpText = FilmData.getWatchProvidersText(film.watch_providers);
        if (wpText) {
          html.push('<div class="watch-provider-line">' + wpText + '</div>');
        }

        if (film.runtime) html.push(`<div style="color:var(--color-text-muted);font-size:0.85rem;">⏱ ${film.runtime} min</div>`);

        // Trailer button
        if (film.trailer_url) {
            html.push(`<button class="btn btn-primary" style="margin-top:12px;"
                onclick="TrailerPlayer.play('${esc(film.trailer_url)}', '${esc(film.title)}')">
                ▶ Trailer</button>`);
        }

        html.push(`</div></div>`);

        // Plot
        if (film.plot) {
            html.push(`<div style="margin-bottom:16px;">
                <h4 style="font-size:0.85rem;color:var(--color-text-light);margin-bottom:6px;">Plot</h4>
                <p style="color:var(--color-text-light);line-height:1.7;font-size:0.9rem;">${esc(film.plot)}</p>
            </div>`);
        }

        // Cast
        if (film.actors && film.actors.length) {
            html.push('<div style="margin-bottom:12px;">' +
                '<h4 style="font-size:0.85rem;color:var(--color-text-light);margin-bottom:6px;">Cast</h4>' +
                '<div class="person-chips">' +
                film.actors.map(function(a) {
                    return '<span class="person-chip actor-chip" style="cursor:pointer;" onclick="StatsModule.selectPersonFilms(\'' + esc(a.name) + '\')">🎭 ' + esc(a.name) + '</span>';
                }).join('') +
                '</div></div>');
        }

        // Directors
        if (film.directors && film.directors.length) {
            html.push('<div style="margin-bottom:12px;">' +
                '<h4 style="font-size:0.85rem;color:var(--color-text-light);margin-bottom:6px;">Directors</h4>' +
                '<div class="person-chips">' +
                film.directors.map(function(d) {
                    return '<span class="person-chip director-chip" style="cursor:pointer;" onclick="StatsModule.selectPersonFilms(\'' + esc(d.name) + '\')">🎬 ' + esc(d.name) + '</span>';
                }).join('') +
                '</div></div>');
        }

        // Folders & versions
        html.push(`<h4 style="font-size:0.85rem;color:var(--color-text-light);margin-bottom:10px;">
            📁 Files (${countVersions(film)} versions across ${film.folders?.length || 0} folders)</h4>`);
        html.push(film.folders?.map(f => renderFolder(f)).join('') || '<p>No files</p>');

        return html.join('\n');
    }

    // ── Open modal with full film detail ───────────
    function openModal(film) {
        const modal = document.getElementById('filmModal');
        const title = document.getElementById('modalFilmTitle');
        const body = document.getElementById('modalBody');
        if (!modal || !body) return;
        if (title) title.textContent = `${esc(film.title)} (${film.year || '?'})`;
        body.innerHTML = renderModalContent(film);
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        const modal = document.getElementById('filmModal');
        if (modal) modal.classList.add('hidden');
        document.body.style.overflow = '';
    }

    // ── Init modal close events ────────────────────
    function init() {
        const modal = document.getElementById('filmModal');
        const closeBtn = document.getElementById('modalClose');
        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        if (modal) modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeModal();
        });
    }

    return {
        init,
        renderFilmDetail,
        renderModalContent,
        openModal,
        closeModal,
    };
})();
