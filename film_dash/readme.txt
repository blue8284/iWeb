Film Dashboard — Personal Film Library

Served via portfolio nginx aggregator (portfolio.xuandai.space/film_dash/).

Architecture (V4):
- Static frontend + FastAPI backend query PostgreSQL trực tiếp (không còn đọc JSON chính)
- Backend: ~/docker/film_dash_api/ (container film-dash-api, join portfolio_default + postgres_internal)
- nginx proxy_pass /api/ → film-dash-api:8000 (không expose port host)
- Frontend subtabs New Arrivals / Top Downloads / Top Rated / Top Cast đọc từ API
- Where to Watch + Distribution vẫn dùng stats.json (không đổi)

Backend API (FastAPI, ~/docker/film_dash_api/app/main.py):
- GET /api/new-arrivals?days=&date= — film mới theo min(fshare_created_at) + deleted
- GET /api/top-downloads?year=&genre= — aggregated downloads theo năm/genre + list
- GET /api/top-rated — scatter data {year, rating, genres, poster} (≥1000 votes)
- GET /api/people?type=actor|director&search= — top cast/director + filmography (kèm genres, poster_url)
- GET /api/film/{imdb_id} — chi tiết 1 film (poster, cast, versions active + dead)
- GET /api/health
- Sửa code backend cần: cd ~/docker/film_dash_api && docker compose up -d --build

Data Generation:
- ~/docker/n8n_jobs/film_dash/generate_data.py — query PostgreSQL → JSON (fallback + providers)
- n8n trigger: n8n_generate_data.sh (runs workspace copy /home/ubuntu/workspace/film_dash/generate_data.py)
- ⚠️ Sync both copies when editing (docker/n8n_jobs + workspace), owner khác nhau (ubuntu vs opc, dùng sudo)
- New arrivals dùng ff.fshare_created_at (ngày file upload thật trên Fshare)
- Actors/directors dedup theo imdb_id (fallback name+character) khi build JSON

V4 — Layout khung (2026-07-31):
- Sidebar dọc trái: Stats (submenu: New Arrivals, Top Downloads, Top Rated, Top Cast, Where to Watch, Distribution), Browse, Watchlist
- Hamburger ☰ trên mobile (<768px): sidebar ẩn, click mở
- Header thu gọn: logo nhỏ, subtitle động "downloadable films based on {N} films"
- Breadcrumb "Stats / New Arrivals" đổi theo subtab
- Subtabs vẫn render vào #statsContent (logic render giữ nguyên)
- CSS/JS cache-busting: style.css?nocache=3, stats.js?nocache=3, data.js?nocache=2

V4 — New Arrivals API waterfall (2026-07-31, Task 3):
- renderNewArrivals() giờ là shell .subtab-layout: chart-anchor (sticky top) + na-list + detail-zone (sticky phải, 340px)
- loadNewArrivals(days, date) fetch /api/new-arrivals?days=&date= (async)
- Waterfall Chart.js 2 datasets: Films (đỏ) + Deleted (xám), animation 600ms
- Click bar/ngày → selectNewArrivalDay(day) refetch ?date=YYYY-MM-DD, list lọc theo ngày
- Range toggle 7d/30d/90d + nút "✕ Clear" để về toàn bộ
- Detail zone dùng chung cho T4/T5/T6: openDetailFromApi(imdbId) fetch /api/film/{id}
  → poster, rating, genres chips, plot, cast chips, versions (active 📥 + dead ⚠)
- 📎 toggle collapse/expand; collapsed mặc định trên mobile (<768px)
- Exports mới: loadNewArrivals, selectNewArrivalDay, selectNewArrivalRange,
  retryNewArrivals, openDetailFromApi, toggleDetailZone, renderNewArrivalsData
- renderSubtab('new') → render shell + loadNewArrivals(30, null) (async)

V4 — Top Downloads API (2026-07-31, Task 4):
- renderTopDownloads() shell: dl-filter-bar + chart-grid-2 (by year + by genre) + dl-list + detail-zone
- loadTopDownloads() fetch /api/top-downloads?year=&genre= (filter params)
- Click bar year/genre → filterDlByYear()/filterDlByGenre() refetch; ✕ Clear all
- renderDlTable: rank | CD thumb | title | genres chips | download bar | year
- Exports: loadTopDownloads, filterDlByYear, filterDlByGenre, retryTopDownloads

V4 — Top Rated scatter (2026-08-03, Task 5):
- renderTopRated() shell: tr-anchor (sticky) + tr-legend + tr-list + detail-zone
- loadTopRated() fetch /api/top-rated (cache 1 lần, trLoaded)
- Scatter: x=năm (jitter deterministic từ imdb_id, tránh cột thẳng), y=rating, màu=genre
- Legend genre chips (đa chọn): toggleTrGenre(), màu lấy từ TR_GENRE_COLORS
- Click point → openDetailFromApi(imdbId)
- List films sort rating desc + stagger animation
- Exports: loadTopRated, toggleTrGenre, retryTopRated

V4 — Top Cast/Director API (2026-08-03, Task 6):
- getAllCastData() fetch /api/people?type=actor + director (cache, castLoaded)
- renderPersonFilmsGrid dùng p.films từ API (kèm genres + poster_url — backend mới thêm)
- Avatar dọc (avatar-portrait 34×46px), hover slide-in + row highlight
- Backend /api/people đã bổ sung fi.genres + fi.poster_url per film
- Exports: retryPeople

V4 — Animations polish (2026-08-03, Task 7):
- .stagger-item (div) fadeInUp staggered 30ms/item; .stagger-row (tr) fade-only
- Tr-chart-box canvas fadeInUp khi load
- prefers-reduced-motion: reduce đã tắt toàn bộ animation/transition (có sẵn)

V4.1 — UI tweaks + dup director fix (2026-08-05):
- Top Downloads tab: icon ⬇ emoji nhỏ → SVG download icon màu xanh lá (--color-signature #22c55e)
- Top Rated: list dọc → horizontal rail poster portrait 168px, hover 3D tilt
  (perspective rotateX/Y theo chuột, translateZ + khung + đổ bóng), rank top 3 màu
- Top Cast: bỏ grouping theo genre, hiển thị film theo grid poster portrait, sort rating desc
- Fix dup director/actor trong DB: thêm script scripts/dedup_credits.py +
  dedup theo name trong remap_persons.py và enricher.py `_prepare_credits`
  (197 film bị dup directors, root cause film_person aggregate không dedup)
- .stagger-item (div) fadeInUp staggered 30ms/item; .stagger-row (tr) fade-only
- Tr-chart-box canvas fadeInUp khi load
- prefers-reduced-motion: reduce đã tắt toàn bộ animation/transition (có sẵn)
- Sidebar slide 200ms + detail-zone collapse max-height 0.2s (đã có)

V3.1 — Data fixes (2026-07-31):
- Xóa hero section (giới thiệu phim random)
- Fix click actor/director từ modal: đóng modal + chuyển tab Stats + mở People
- Fix duplicate actors/directors (was 187 films dup directors; dedup theo imdb_id/name)
- Fix new arrivals: dùng fshare_created_at thay vì created_at (ngày crawl sai)
- enricher.py _prepare_credits: dedup theo tmdb_id chặn root cause

V3 — Cinematic Design (2026-07-28):
- Color palette: Netflix red (#e50914) + IMDb gold (#f5c518)
- Typography: DM Serif Display for film titles
- Poster gallery card layout with hover overlay
- Stats card/table view toggle (localStorage persisted)
- Chart.js colors updated to red/gold theme
- Micro-animations: textGlow, gold CD hover

V2 — Visual Refresh (2026-07-27):
- CD disk concept (circular poster thumbs)
- Genre icon chips (color-coded)
- Inline download/rating bars
- Avatar thumbnails for cast
- Watch providers integration
- Full English localization

Folders:
  css/style.css   — All styles (design system variables)
  js/             — 7 JS files (data, browse, stats, film-detail, watchlist, player, main)
  data/           — Generated JSON data
  docs/           — Design specs and implementation plans
  ~/docker/film_dash_api/ — FastAPI backend (app/main.py + Dockerfile + systemd)

Cache-busting (V4): style.css?nocache=7, stats.js?nocache=7
