

# Changelog

## [0.6.0] - 2025-10-14
### Added
- FolderPicker: Inline-Heroicons (Home/Up), kompakte Action-Leiste in der Liste, Breadcrumbs mit Klick-Navigation.
- Health-Check `/api/fs/health` (lokal im FolderPicker verwendet).
- Backend-Endpoint `/api/fs/base-label` zur Anzeige des echten Basis-Pfads.
- Rename-API `/api/fs/rename` (Service + Controller).

### Changed
- FilePicker → FolderPicker (Service + Controller) mit gestrafften Routen: `/api/fs/subfolders|exists|mkdir|empty|rmdir|rename|base-label|health`.
- `exists`-Response auf `{ "exists": boolean }` harmonisiert, `empty` auf `{ "empty": boolean }`.
- Frontend `fsApi.js`: konsolidierte Calls, Nutzung von `VITE_API_BASE`, Korrektur der Response-Shapes.
- TaskEditModal / TaskCreationModal: echte Basis-Pfad-Anzeige (Server-Label), Pfadprüfung via `fsExists`.
- UI-Politur: Dezentere Layouts, klare Buttons, „Löschen nur wenn leer“–Logik konsistent.

### Fixed
- Path Traversal Absicherung im Service (`startsWith(base)`), valide Ordnernamenprüfung.
- 404 auf `/api/fs/base-label` (fehlender Endpoint) behoben.
- Falscher Import `DirectoryNotEmptyException` (jetzt `java.nio.file.*`).
- `useToast must be used within <ToastProvider>` durch globalen Provider-Fix.

### Removed
- Doppelte „Übernehmen“-Buttons im FolderPicker, redundanter Doppelklick-Hinweis.


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

