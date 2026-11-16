App: portfolio (nginx aggregator for static sites)
Chức năng: Single nginx container serving multiple static mini-sites under portfolio.xuandai.space via path-based routing
Trạng thái: active
Path: ~/docker/webs/portfolio/
Dependencies: ../bga/ and ../film_dash/ directories must exist (bind-mounted read-only)
Cách chạy: docker compose up -d
Container: portfolio-web-1 (nginx:alpine)
Port: 127.0.0.1:8766 → container 80
Routes:
  - portfolio.xuandai.space/bga/        → ~/docker/webs/bga/
  - portfolio.xuandai.space/film_dash/  → ~/docker/webs/film_dash/
Sub-apps:
  - bga/         — Board game arena webapp (static JS/HTML), served via nginx alias
  - film_dash/   — Film dashboard (static JS/HTML/JSON data), served via nginx alias
Cloudflare: One Public Hostname rule: portfolio.xuandai.space → http://127.0.0.1:8766
Ghi chú:
  - All source folders mounted read-only (:ro). Updates via pull scripts, not direct container edits.
  - Adding new mini-site: add location block in nginx.conf + bind-mount in docker-compose.yml.
  - BGA has its OWN docker-compose.yml (for standalone container on port 8765) but that container is NOT running. The portfolio nginx serves it instead.
  - Readme cũ: basic info still accurate. Reformatted to match new convention.
Known issues:
  - BGA standalone container (port 8765) defined but not running — portfolio covers it.
