# Film Dashboard V4 — Backend API + Layout Redesign Spec

**Date:** 2026-07-31
**Status:** Approved (design validated section-by-section)

## Overview

Redesign film_dash: thêm FastAPI backend query trực tiếp PostgreSQL (thay vì read JSON files), chuyển layout từ tabs ngang → sidebar dọc + header thu gọn, tách subtabs với interactions + animations. Where to Watch (providers) và Distribution giữ nguyên hiện tại.

## Architecture

### Networking

```
portfolio.xuandai.space/film_dash/  (Cloudflare tunnel → nginx)
        │
   portfolio-web-1 (172.25.0.2, network portfolio_default)
        │  proxy_pass /api/ →
   film_dash_api container (172.25.0.x)  ← JOIN portfolio_default + postgres_internal
        │  psycopg2
   postgres (172.23.0.2, network postgres_internal)
```

- Backend container joins **2 networks**: `portfolio_default` (nginx reach) + `postgres_internal` (reach DB)
- Không publish port ra host (chỉ nginx gọi qua mạng nội bộ)
- Credentials postgres từ `.env` (pattern giống các app khác)
- systemd service `film_dash_api` (pattern icm_runner) — docker run container

### Backend endpoints

| Endpoint | Trả về | Dùng cho |
|----------|--------|----------|
| `GET /api/new-arrivals?days=30&date=YYYY-MM-DD` | List film theo ngày (min fshare_created_at), kèm deleted_count, dead_detected_at | Waterfall + list |
| `GET /api/top-downloads?year=&genre=` | Aggregated downloads theo năm/genre + list films (filterable) | Top Downloads |
| `GET /api/top-rated` | Scatter data: mỗi film {year, rating, genres, poster} | Top Rated scatter |
| `GET /api/people?type=actor|director&search=` | Top cast/director + filmography | Cast/Director |
| `GET /api/film/{imdb_id}` | Chi tiết 1 film (poster, cast, versions active + dead) | Film detail zone |

### Query mẫu (new-arrivals)

```sql
SELECT fi.imdb_id, fi.title, fi.year, fi.poster_url,
       MIN(ff.fshare_created_at)::date AS first_seen,
       MAX(ff.dead_detected_at)::date  AS deleted_at
FROM fshare_film.film_imdb fi
JOIN fshare_film.film_fshare ff USING (imdb_id)
GROUP BY fi.imdb_id
```

- `dead_detected_at` có sẵn (247 dead, 55 film xoá hoàn toàn)
- `link_status` = active/dead/unknown

## Layout

### Header (thu gọn)

- Header cao ~80% hiện tại (padding + font giảm)
- Logo/ô chữ nhật tỉ lệ **9:16**, nhỏ, đặt trái
- Subtitle: `"downloadable films based on {N} films"` (N động theo data)
- Dark/light toggle đưa lên cao hơn (canh đỉnh header)

### Sidebar (hamburger, dọc)

- Tabs ngang → **sidebar dọc** trái
- Nút **hamburger** `▤` mở/đóng sidebar
- **Auto-hide**: màn hình hẹp (mobile) hoặc content bị ép → sidebar ẩn, chỉ còn icon
- Cấu trúc: Stats / Browse / Watchlist; Stats có submenu dọc (New Arrivals, Top Downloads, Top Rated, Top Cast, Top Directors, Where to Watch, Distribution)

### Subtab → header dynamic

- Click subtab → header thu nhỏ thêm, **breadcrumb tên subtab** hiện giữa header (`Stats / New Arrivals`)
- Không gian còn lại là nội dung subtab

### Film detail zone (dùng chung mọi subtab có list)

- Bên phải, neo, **rộng hơn hiện tại**
- **Nút hide/collapse** để thu gọn khi list dài
- Click film/chọn → mở lại
- Mobile: collapsed mặc định, có nút mở

## Subtab details

### New Arrivals

- **Waterfall chart** neo đầu, chỉ list cuộn
- Đếm **film** theo **min(fshare_created_at)**; cột deleted theo **dead_detected_at**
- **Click cột/ngày** → filter list theo ngày (kèm film xoá hoàn toàn)
- **Không chọn** → mặc định 30 ngày gần nhất
- Film detail zone (phải, neo, hide)

### Top Downloads

- **2 charts**: theo năm phát hành + số download; theo thể loại + download
- **Click element** → filter list bên dưới
- List giữ cột hiện tại (rank, CD, title, genres, bar, year)
- Film detail zone giống New Arrivals

### Top Rated

- **Scatter plot**: trục hoành = năm, trục tung = rating, mỗi chấm = 1 film, màu = genre
- **Jitter ngang** ngẫu nhiên nhẹ (tránh 1 cột thẳng)
- **Legend genre chips** bên phải, **chọn nhiều** để filter (style chip hiện có)
- List films + detail zone giống New Arrivals

### Top Cast / Top Director (tách riêng, UI tương tự)

- Search + Clear ở đầu
- Mỗi dòng: tên, avg rating, số film, icon mở rộng (click được)
- **Hover**: row mở rộng, **avatar chữ nhật đứng** hiện bên trái tên, viền/màu nổi bật
- UX giống nhau cho cast và director

### Where to Watch / Distribution

- **Giữ nguyên** hiện tại (đợt này không đổi)

## Animations

| Chỗ | Animation |
|-----|-----------|
| Waterfall chart | Cột grow 0→100% khi load (stagger) |
| List films | FadeInUp staggered (30ms/item) khi filter/đổi ngày |
| Scatter plot | Chấm pop-in trái→phải khi load |
| Hover cast/director | Avatar slide-in trái, row mở rộng mượt (height transition) |
| Sidebar | Slide-in/out (transform translateX, 200ms) |
| Film detail zone | Collapse/expand height transition + nút hide rotate |
| Tab switch | FadeIn nhẹ |

**Quy tắc:**
- CSS-only (không thêm lib), Chart.js có sẵn
- `prefers-reduced-motion: reduce` → tắt hết animation
- Motion chỉ khi có ý nghĩa (data đổ về, lọc, mở) — không rải rác vô nghĩa

## Error handling

| Tình huống | Xử lý |
|-----------|-------|
| Backend down | Skeleton loading → nút Retry + "Không thể tải dữ liệu", không crash trang |
| Chưa chọn film | Placeholder "👆 Chọn một film" |
| Chart không data | Empty state, không vẽ rỗng |
| Dead film | Vẫn mở detail, badge "⚠ Deleted" danger, versions đánh dấu dead |
| Filter không kết quả | "Không có film nào khớp" + nút clear |

## Files

| File | Trạng thái | Nội dung |
|------|-----------|----------|
| `~/docker/film_dash_api/` | **Mới** | Dockerfile + FastAPI app + systemd service |
| `~/docker/webs/film_dash/css/style.css` | Sửa | Sidebar, header, subtab layout, animations |
| `~/docker/webs/film_dash/js/*.js` | Sửa | Fetch API thay JSON, tách modules |
| `~/docker/webs/portfolio/nginx.conf` | Sửa | `location /api/ { proxy_pass ... }` |
| `index.html` | Sửa | Sidebar + header structure |

## Implementation order (giảm rủi ro)

1. Backend API + nginx proxy_pass → verify curl `/api/new-arrivals`
2. Layout khung (sidebar, header, breadcrumb) — subtab cũ hoạt động
3. New Arrivals (waterfall + list + detail zone)
4. Top Downloads (2 charts + filter)
5. Top Rated (scatter + legend)
6. Top Cast/Director (hover-expand, avatar)
7. Animations hoàn thiện + responsive + reduced-motion

## Non-goals

- Không đổi Where to Watch / Distribution
- Không sửa iptables / firewall
- Không đổi Cloudflare tunnel config
- Không thêm build step / framework cho frontend
