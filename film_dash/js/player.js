// ═══════════════════════════════════════════════════
// Floating YouTube Trailer Player (PiP-style)
// ═══════════════════════════════════════════════════

const TrailerPlayer = (() => {
    let container, iframe, closeBtn, minimizeBtn, titleEl;
    let lastUrl = '';
    let isDragging = false;
    let dragOffsetX = 0, dragOffsetY = 0;

    function init() {
        container = document.getElementById('trailerPlayer');
        iframe = document.getElementById('trailerIframe');
        closeBtn = document.getElementById('trailerClose');
        minimizeBtn = document.getElementById('trailerMinimize');
        titleEl = container?.querySelector('.trailer-pip-title');

        if (!container || !iframe) return;

        // Close
        closeBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            hide();
        });

        // Minimize
        minimizeBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            container.classList.toggle('minimized');
            minimizeBtn.textContent = container.classList.contains('minimized') ? '▢' : '─';
        });

        // Draggable header
        const header = container.querySelector('.trailer-pip-header');
        header?.addEventListener('mousedown', startDrag);
        header?.addEventListener('touchstart', startDragTouch, { passive: true });
    }

    function play(url, title = '') {
        if (!url || !container || !iframe) return;
        const vid = extractYoutubeId(url);
        if (!vid) {
            console.warn('Invalid YouTube URL:', url);
            return;
        }

        // Toggle if same URL and visible
        if (url === lastUrl && !container.classList.contains('hidden')) {
            hide();
            return;
        }

        const embedUrl = `https://www.youtube.com/embed/${vid}?autoplay=1&rel=0&modestbranding=1`;
        iframe.src = embedUrl;
        lastUrl = url;
        if (titleEl) titleEl.textContent = `▶ ${title || 'Trailer'}`;
        container.classList.remove('hidden', 'minimized');
        if (minimizeBtn) minimizeBtn.textContent = '─';
    }

    function hide() {
        if (iframe) iframe.src = '';
        if (container) container.classList.add('hidden');
        lastUrl = '';
    }

    function extractYoutubeId(url) {
        if (!url) return null;
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
            /^([a-zA-Z0-9_-]{11})$/,
        ];
        for (const pat of patterns) {
            const m = url.match(pat);
            if (m) return m[1];
        }
        return null;
    }

    // ── Drag ──────────────────────────────────────
    function startDrag(e) {
        if (e.target.closest('.trailer-pip-controls')) return;
        isDragging = true;
        const rect = container.getBoundingClientRect();
        dragOffsetX = e.clientX - rect.left;
        dragOffsetY = e.clientY - rect.top;
        document.addEventListener('mousemove', onDrag);
        document.addEventListener('mouseup', stopDrag);
    }

    function startDragTouch(e) {
        if (e.target.closest('.trailer-pip-controls')) return;
        isDragging = true;
        const rect = container.getBoundingClientRect();
        const touch = e.touches[0];
        dragOffsetX = touch.clientX - rect.left;
        dragOffsetY = touch.clientY - rect.top;
        document.addEventListener('touchmove', onDragTouch, { passive: true });
        document.addEventListener('touchend', stopDragTouch);
    }

    function onDrag(e) {
        if (!isDragging) return;
        container.style.left = (e.clientX - dragOffsetX) + 'px';
        container.style.top = (e.clientY - dragOffsetY) + 'px';
        container.style.right = 'auto';
        container.style.bottom = 'auto';
    }

    function onDragTouch(e) {
        if (!isDragging) return;
        const touch = e.touches[0];
        container.style.left = (touch.clientX - dragOffsetX) + 'px';
        container.style.top = (touch.clientY - dragOffsetY) + 'px';
        container.style.right = 'auto';
        container.style.bottom = 'auto';
    }

    function stopDrag() {
        isDragging = false;
        document.removeEventListener('mousemove', onDrag);
        document.removeEventListener('mouseup', stopDrag);
    }

    function stopDragTouch() {
        isDragging = false;
        document.removeEventListener('touchmove', onDragTouch);
        document.removeEventListener('touchend', stopDragTouch);
    }

    return { init, play, hide, extractYoutubeId };
})();
