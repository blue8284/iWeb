App: BGA (Board Game Arena)
Chức năng: Board game arena webapp (static JS/HTML) — player profiles, arenas, rivalries, attributes
Trạng thái: active
Path: ~/docker/webs/bga/
Dependencies: served via portfolio-web-1 nginx (see ~/docker/webs/portfolio/)
Access: portfolio.xuandai.space/bga/
Standalone compose: ~/docker/webs/bga/docker-compose.yml (port 8765) — NOT running
Ghi chú:
  - Static webapp (nginx only), no backend/DB.
  - Served via portfolio nginx, NOT standalone container.
  - Has own docker-compose.yml for standalone mode but container is not running.
Known issues:
  - Standalone container not running — using portfolio aggregator instead. This is intentional.
