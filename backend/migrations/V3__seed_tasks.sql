-- V3__seed_tasks.sql (PostgreSQL)
-- Inserts 30 demo tasks referencing the provided stations

INSERT INTO tasks (bezeichnung, teilenummer, kunde, zustaendig, aufwand_stunden, zusaetzliche_infos, end_datum, arbeitsstation, status, prioritaet)
VALUES ('Auftrag 01 – Fräs-/Montagearbeit', 'T-2025-001', 'Delta Systems', 'S. Walter', 2.00, 'Losgröße 20 Stück; Prüfplan P-101', '2025-10-09', 'DMG DMU85', 'TO_DO', 101);
INSERT INTO tasks (bezeichnung, teilenummer, kunde, zustaendig, aufwand_stunden, zusaetzliche_infos, end_datum, arbeitsstation, status, prioritaet)
VALUES ('Auftrag 02 – Fräs-/Montagearbeit', 'T-2025-002', 'Alpha GmbH', 'T. Schulz', 2.50, 'Losgröße 30 Stück; Prüfplan P-102', '2025-10-10', 'Hermle C22', 'IN_BEARBEITUNG', 102);
INSERT INTO tasks (bezeichnung, teilenummer, kunde, zustaendig, aufwand_stunden, zusaetzliche_infos, end_datum, arbeitsstation, status, prioritaet)
VALUES ('Auftrag 03 – Fräs-/Montagearbeit', 'T-2025-003', 'Delta Systems', 'P. Roth', 3.00, 'Losgröße 40 Stück; Prüfplan P-103', '2025-10-11', 'Grob G350', 'FERTIG', 103);
INSERT INTO tasks (bezeichnung, teilenummer, kunde, zustaendig, aufwand_stunden, zusaetzliche_infos, end_datum, arbeitsstation, status, prioritaet)
VALUES ('Auftrag 04 – Fräs-/Montagearbeit', 'T-2025-004', 'Alpha GmbH', 'L. König', 3.50, 'Losgröße 50 Stück; Prüfplan P-104', '2025-10-12', 'Mazak HCN5000', 'NEU', 104);
INSERT INTO tasks (bezeichnung, teilenummer, kunde, zustaendig, aufwand_stunden, zusaetzliche_infos, end_datum, arbeitsstation, status, prioritaet)
VALUES ('Auftrag 05 – Fräs-/Montagearbeit', 'T-2025-005', 'Delta Systems', 'A. Neumann', 4.00, 'Losgröße 60 Stück; Prüfplan P-105', '2025-10-13', 'MTrent MTCut', 'TO_DO', 105);
INSERT INTO tasks (bezeichnung, teilenummer, kunde, zustaendig, aufwand_stunden, zusaetzliche_infos, end_datum, arbeitsstation, status, prioritaet)
VALUES ('Auftrag 06 – Fräs-/Montagearbeit', 'T-2025-006', 'Alpha GmbH', 'K. Mayer', 4.50, 'Losgröße 10 Stück; Prüfplan P-106', '2025-10-14', 'nicht zugeordnet', 'IN_BEARBEITUNG', 106);
INSERT INTO tasks (bezeichnung, teilenummer, kunde, zustaendig, aufwand_stunden, zusaetzliche_infos, end_datum, arbeitsstation, status, prioritaet)
VALUES ('Auftrag 07 – Fräs-/Montagearbeit', 'T-2025-007', 'Delta Systems', 'M. Berger', 5.00, 'Losgröße 20 Stück; Prüfplan P-107', '2025-10-15', 'DMG DMU85', 'FERTIG', 107);
INSERT INTO tasks (bezeichnung, teilenummer, kunde, zustaendig, aufwand_stunden, zusaetzliche_infos, end_datum, arbeitsstation, status, prioritaet)
VALUES ('Auftrag 08 – Fräs-/Montagearbeit', 'T-2025-008', 'Alpha GmbH', 'S. Walter', 0.50, 'Losgröße 30 Stück; Prüfplan P-108', '2025-10-16', 'Hermle C22', 'NEU', 108);
INSERT INTO tasks (bezeichnung, teilenummer, kunde, zustaendig, aufwand_stunden, zusaetzliche_infos, end_datum, arbeitsstation, status, prioritaet)
VALUES ('Auftrag 09 – Fräs-/Montagearbeit', 'T-2025-009', 'Delta Systems', 'T. Schulz', 1.00, 'Losgröße 40 Stück; Prüfplan P-109', '2025-10-17', 'Grob G350', 'TO_DO', 109);
INSERT INTO tasks (bezeichnung, teilenummer, kunde, zustaendig, aufwand_stunden, zusaetzliche_infos, end_datum, arbeitsstation, status, prioritaet)
VALUES ('Auftrag 10 – Fräs-/Montagearbeit', 'T-2025-010', 'Alpha GmbH', 'P. Roth', 1.50, 'Losgröße 50 Stück; Prüfplan P-110', '2025-10-18', 'Mazak HCN5000', 'IN_BEARBEITUNG', 100);
INSERT INTO tasks (bezeichnung, teilenummer, kunde, zustaendig, aufwand_stunden, zusaetzliche_infos, end_datum, arbeitsstation, status, prioritaet)
VALUES ('Auftrag 11 – Fräs-/Montagearbeit', 'T-2025-011', 'Delta Systems', 'L. König', 2.00, 'Losgröße 60 Stück; Prüfplan P-111', '2025-10-19', 'MTrent MTCut', 'FERTIG', 101);
INSERT INTO tasks (bezeichnung, teilenummer, kunde, zustaendig, aufwand_stunden, zusaetzliche_infos, end_datum, arbeitsstation, status, prioritaet)
VALUES ('Auftrag 12 – Fräs-/Montagearbeit', 'T-2025-012', 'Alpha GmbH', 'A. Neumann', 2.50, 'Losgröße 10 Stück; Prüfplan P-112', '2025-10-20', 'nicht zugeordnet', 'NEU', 102);
INSERT INTO tasks (bezeichnung, teilenummer, kunde, zustaendig, aufwand_stunden, zusaetzliche_infos, end_datum, arbeitsstation, status, prioritaet)
VALUES ('Auftrag 13 – Fräs-/Montagearbeit', 'T-2025-013', 'Delta Systems', 'K. Mayer', 3.00, 'Losgröße 20 Stück; Prüfplan P-113', '2025-10-21', 'DMG DMU85', 'TO_DO', 103);
INSERT INTO tasks (bezeichnung, teilenummer, kunde, zustaendig, aufwand_stunden, zusaetzliche_infos, end_datum, arbeitsstation, status, prioritaet)
VALUES ('Auftrag 14 – Fräs-/Montagearbeit', 'T-2025-014', 'Alpha GmbH', 'M. Berger', 3.50, 'Losgröße 30 Stück; Prüfplan P-114', '2025-10-22', 'Hermle C22', 'IN_BEARBEITUNG', 104);
INSERT INTO tasks (bezeichnung, teilenummer, kunde, zustaendig, aufwand_stunden, zusaetzliche_infos, end_datum, arbeitsstation, status, prioritaet)
VALUES ('Auftrag 15 – Fräs-/Montagearbeit', 'T-2025-015', 'Delta Systems', 'S. Walter', 4.00, 'Losgröße 40 Stück; Prüfplan P-115', '2025-10-23', 'Grob G350', 'FERTIG', 105);
INSERT INTO tasks (bezeichnung, teilenummer, kunde, zustaendig, aufwand_stunden, zusaetzliche_infos, end_datum, arbeitsstation, status, prioritaet)
VALUES ('Auftrag 16 – Fräs-/Montagearbeit', 'T-2025-016', 'Alpha GmbH', 'T. Schulz', 4.50, 'Losgröße 50 Stück; Prüfplan P-116', '2025-10-24', 'Mazak HCN5000', 'NEU', 106);
INSERT INTO tasks (bezeichnung, teilenummer, kunde, zustaendig, aufwand_stunden, zusaetzliche_infos, end_datum, arbeitsstation, status, prioritaet)
VALUES ('Auftrag 17 – Fräs-/Montagearbeit', 'T-2025-017', 'Delta Systems', 'P. Roth', 5.00, 'Losgröße 60 Stück; Prüfplan P-117', '2025-10-25', 'MTrent MTCut', 'TO_DO', 107);
INSERT INTO tasks (bezeichnung, teilenummer, kunde, zustaendig, aufwand_stunden, zusaetzliche_infos, end_datum, arbeitsstation, status, prioritaet)
VALUES ('Auftrag 18 – Fräs-/Montagearbeit', 'T-2025-018', 'Alpha GmbH', 'L. König', 0.50, 'Losgröße 10 Stück; Prüfplan P-118', '2025-10-26', 'nicht zugeordnet', 'IN_BEARBEITUNG', 108);
INSERT INTO tasks (bezeichnung, teilenummer, kunde, zustaendig, aufwand_stunden, zusaetzliche_infos, end_datum, arbeitsstation, status, prioritaet)
VALUES ('Auftrag 19 – Fräs-/Montagearbeit', 'T-2025-019', 'Delta Systems', 'A. Neumann', 1.00, 'Losgröße 20 Stück; Prüfplan P-119', '2025-10-27', 'DMG DMU85', 'FERTIG', 109);
INSERT INTO tasks (bezeichnung, teilenummer, kunde, zustaendig, aufwand_stunden, zusaetzliche_infos, end_datum, arbeitsstation, status, prioritaet)
VALUES ('Auftrag 20 – Fräs-/Montagearbeit', 'T-2025-020', 'Alpha GmbH', 'K. Mayer', 1.50, 'Losgröße 30 Stück; Prüfplan P-120', '2025-10-28', 'Hermle C22', 'NEU', 100);
INSERT INTO tasks (bezeichnung, teilenummer, kunde, zustaendig, aufwand_stunden, zusaetzliche_infos, end_datum, arbeitsstation, status, prioritaet)
VALUES ('Auftrag 21 – Fräs-/Montagearbeit', 'T-2025-021', 'Delta Systems', 'M. Berger', 2.00, 'Losgröße 40 Stück; Prüfplan P-121', '2025-10-29', 'Grob G350', 'TO_DO', 101);
INSERT INTO tasks (bezeichnung, teilenummer, kunde, zustaendig, aufwand_stunden, zusaetzliche_infos, end_datum, arbeitsstation, status, prioritaet)
VALUES ('Auftrag 22 – Fräs-/Montagearbeit', 'T-2025-022', 'Alpha GmbH', 'S. Walter', 2.50, 'Losgröße 50 Stück; Prüfplan P-122', '2025-10-30', 'Mazak HCN5000', 'IN_BEARBEITUNG', 102);
INSERT INTO tasks (bezeichnung, teilenummer, kunde, zustaendig, aufwand_stunden, zusaetzliche_infos, end_datum, arbeitsstation, status, prioritaet)
VALUES ('Auftrag 23 – Fräs-/Montagearbeit', 'T-2025-023', 'Delta Systems', 'T. Schulz', 3.00, 'Losgröße 60 Stück; Prüfplan P-123', '2025-10-31', 'MTrent MTCut', 'FERTIG', 103);
INSERT INTO tasks (bezeichnung, teilenummer, kunde, zustaendig, aufwand_stunden, zusaetzliche_infos, end_datum, arbeitsstation, status, prioritaet)
VALUES ('Auftrag 24 – Fräs-/Montagearbeit', 'T-2025-024', 'Alpha GmbH', 'P. Roth', 3.50, 'Losgröße 10 Stück; Prüfplan P-124', '2025-11-01', 'nicht zugeordnet', 'NEU', 104);
INSERT INTO tasks (bezeichnung, teilenummer, kunde, zustaendig, aufwand_stunden, zusaetzliche_infos, end_datum, arbeitsstation, status, prioritaet)
VALUES ('Auftrag 25 – Fräs-/Montagearbeit', 'T-2025-025', 'Delta Systems', 'L. König', 4.00, 'Losgröße 20 Stück; Prüfplan P-125', '2025-11-02', 'DMG DMU85', 'TO_DO', 105);
INSERT INTO tasks (bezeichnung, teilenummer, kunde, zustaendig, aufwand_stunden, zusaetzliche_infos, end_datum, arbeitsstation, status, prioritaet)
VALUES ('Auftrag 26 – Fräs-/Montagearbeit', 'T-2025-026', 'Alpha GmbH', 'A. Neumann', 4.50, 'Losgröße 30 Stück; Prüfplan P-126', '2025-11-03', 'Hermle C22', 'IN_BEARBEITUNG', 106);
INSERT INTO tasks (bezeichnung, teilenummer, kunde, zustaendig, aufwand_stunden, zusaetzliche_infos, end_datum, arbeitsstation, status, prioritaet)
VALUES ('Auftrag 27 – Fräs-/Montagearbeit', 'T-2025-027', 'Delta Systems', 'K. Mayer', 5.00, 'Losgröße 40 Stück; Prüfplan P-127', '2025-11-04', 'Grob G350', 'FERTIG', 107);
INSERT INTO tasks (bezeichnung, teilenummer, kunde, zustaendig, aufwand_stunden, zusaetzliche_infos, end_datum, arbeitsstation, status, prioritaet)
VALUES ('Auftrag 28 – Fräs-/Montagearbeit', 'T-2025-028', 'Alpha GmbH', 'M. Berger', 0.50, 'Losgröße 50 Stück; Prüfplan P-128', '2025-11-05', 'Mazak HCN5000', 'NEU', 108);
INSERT INTO tasks (bezeichnung, teilenummer, kunde, zustaendig, aufwand_stunden, zusaetzliche_infos, end_datum, arbeitsstation, status, prioritaet)
VALUES ('Auftrag 29 – Fräs-/Montagearbeit', 'T-2025-029', 'Delta Systems', 'S. Walter', 1.00, 'Losgröße 60 Stück; Prüfplan P-129', '2025-11-06', 'MTrent MTCut', 'TO_DO', 109);
INSERT INTO tasks (bezeichnung, teilenummer, kunde, zustaendig, aufwand_stunden, zusaetzliche_infos, end_datum, arbeitsstation, status, prioritaet)
VALUES ('Auftrag 30 – Fräs-/Montagearbeit', 'T-2025-030', 'Alpha GmbH', 'T. Schulz', 1.50, 'Losgröße 10 Stück; Prüfplan P-130', '2025-11-07', 'nicht zugeordnet', 'IN_BEARBEITUNG', 100);
