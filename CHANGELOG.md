# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
- _Place upcoming changes here_

## [0.5.0] - 2025-10-10
### Added
- **Release checklist** to streamline version cuts. See `RELEASE_CHECKLIST.md`.
- **Toast system** reactivated (provider + hooks), error/success feedback wired.
- **Station Management** button and modal; stations sortable via UI.
- **Search & Filter** toolbar with toggle (dim vs. hard filter), ESC/reset behavior.
- **Status pills** unified across TaskItem / Create / Edit (NEU, TO_DO, IN_BEARBEITUNG, FERTIG).
- **Zusatzarbeiten** pills (FAI, QS) with server persistence and display on cards.
- **Docker/Nginx** templates and CORS best-practice (works across multiple PCs).

### Changed
- **CORS**: centralized & hardened via `GlobalCorsConfig` + `AppCorsProperties` (env-driven origins).
- **DnD**: smoother behavior; server-side sort endpoint stabilized.
- **Task modals**: styling aligned with board (sizes/colors), non-breaking update.

### Fixed
- Drag glitching/z-flicker on drop by removing transform transitions on cards.
- First-column drop issues and missing “unassigned” handling.
- DB migration consistency (Flyway baseline + seed data).

### Migrations
- **Flyway** baseline + seeds:
  - `V1__baseline_schema.sql`
  - `V2__seed_arbeitsstation.sql`
  - `V3__seed_demo_tasks.sql`

### Notes
- SSE-based realtime updates were explored but are **not** part of 0.5.0 (kept out to keep release stable).
- For multi-PC setups ensure `APP_CORS_ALLOWED_ORIGINS` contains all used hosts/ports.

