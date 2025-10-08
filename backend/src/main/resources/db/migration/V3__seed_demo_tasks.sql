-- V3__seed_demo_tasks.sql (PostgreSQL)
-- Seedet ~30 Demo-Tasks verteilt über Stationen, Status & Fälligkeiten.
-- Idempotent: läuft nur, wenn noch keine Tasks vorhanden sind.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.tasks) THEN

    INSERT INTO public.tasks
      (bezeichnung, teilenummer, kunde, zustaendig, zusaetzliche_infos, end_datum, aufwand_stunden, arbeitsstation, status, prioritaet, fai, qs)
    VALUES
      -- nicht zugeordnet (5)
      ('Erstaufnahme Auftrag 1001', 'TN-1001-A', 'Kunde Alpha', 'M. Meier', 'Anfrage prüfen', CURRENT_DATE + INTERVAL '3 day', 2.5, 'nicht zugeordnet', 'NEU', 10, FALSE, FALSE),
      ('Vorprüfung Zeichnung',      'TN-1002-B', 'Kunde Beta',  'S. Kurz',   'Toleranzen unklar', CURRENT_DATE + INTERVAL '7 day', 1.0, 'nicht zugeordnet', 'TO_DO', 20, FALSE, TRUE),
      ('Material checken',          'TN-1003-C', 'Kunde Gamma', 'T. Huber',  'Rohteil im Lager', CURRENT_DATE - INTERVAL '1 day', 0.5, 'nicht zugeordnet', 'IN_BEARBEITUNG', 30, TRUE, FALSE),
      ('Kalkulation Aufwand',       'TN-1004-D', 'Kunde Delta', 'A. Vogel',  'Kunde wartet', CURRENT_DATE + INTERVAL '1 day', 3.0, 'nicht zugeordnet', 'TO_DO', 40, FALSE, FALSE),
      ('Abstimmung mit QS',         'TN-1005-E', 'Kunde Epsilon','N. Wolf',  'Sonderfreigabe nötig', CURRENT_DATE - INTERVAL '5 day', 1.5, 'nicht zugeordnet', 'FERTIG', 50, FALSE, TRUE),

      -- DMG DMU85 (5)
      ('Fräsen Deckelteil A',       'TN-1101-A', 'Huber GmbH',  'P. König', 'Werkzeugliste erstellt', CURRENT_DATE + INTERVAL '2 day', 6.0, 'DMG DMU85', 'IN_BEARBEITUNG', 10, FALSE, FALSE),
      ('Nacharbeit Passfläche',     'TN-1102-B', 'Kraus AG',    'L. Ernst', '0.02 mm', CURRENT_DATE + INTERVAL '5 day', 2.0, 'DMG DMU85', 'TO_DO', 20, TRUE, FALSE),
      ('Programmoptimierung',       'TN-1103-C', 'Kraus AG',    'L. Ernst', 'Zykluszeit senken', CURRENT_DATE + INTERVAL '9 day', 4.0, 'DMG DMU85', 'NEU', 30, FALSE, FALSE),
      ('FAI Vermessung',            'TN-1104-D', 'Müller KG',   'J. Baum',  'Erstmuster fällig', CURRENT_DATE - INTERVAL '2 day', 1.0, 'DMG DMU85', 'TO_DO', 40, TRUE, TRUE),
      ('Kantenbruch R0.2',          'TN-1105-E', 'Müller KG',   'J. Baum',  'Manuell', CURRENT_DATE + INTERVAL '4 day', 0.8, 'DMG DMU85', 'FERTIG', 50, FALSE, FALSE),

      -- Hermle C22 (5)
      ('5-Achs Schruppen',          'TN-1201-A', 'Techno AG',   'R. Lang',  'NC fertig', CURRENT_DATE + INTERVAL '1 day', 5.0, 'Hermle C22', 'IN_BEARBEITUNG', 10, FALSE, FALSE),
      ('Planlauf kontrollieren',    'TN-1202-B', 'Techno AG',   'R. Lang',  'Mit Messuhr', CURRENT_DATE - INTERVAL '1 day', 0.5, 'Hermle C22', 'TO_DO', 20, FALSE, TRUE),
      ('Spannmittel umrüsten',      'TN-1203-C', 'Rossi GmbH',  'T. Graf',  'Vorrichtung B', CURRENT_DATE + INTERVAL '6 day', 1.2, 'Hermle C22', 'NEU', 30, FALSE, FALSE),
      ('Feinbearbeitung Tasche',    'TN-1204-D', 'Rossi GmbH',  'T. Graf',  '0.01 mm', CURRENT_DATE + INTERVAL '12 day', 3.3, 'Hermle C22', 'TO_DO', 40, FALSE, FALSE),
      ('Reinigung & Dokumentation', 'TN-1205-E', 'Rossi GmbH',  'T. Graf',  'Fotos im Anhang', CURRENT_DATE - INTERVAL '3 day', 0.7, 'Hermle C22', 'FERTIG', 50, FALSE, TRUE),

      -- Grob G350 (5)
      ('Innenkontur ausräumen',     'TN-1301-A', 'BetaTech',    'M. Kern',  'HSC Fräser', CURRENT_DATE + INTERVAL '8 day', 4.5, 'Grob G350', 'NEU', 10, FALSE, FALSE),
      ('T-Nuten fräsen',            'TN-1302-B', 'BetaTech',    'M. Kern',  'T-Nut Fräser 14', CURRENT_DATE + INTERVAL '3 day', 2.4, 'Grob G350', 'TO_DO', 20, FALSE, FALSE),
      ('Einpassung prüfen',         'TN-1303-C', 'Formix AG',   'C. Adler', 'Lehren vorhanden', CURRENT_DATE - INTERVAL '2 day', 1.1, 'Grob G350', 'IN_BEARBEITUNG', 30, FALSE, TRUE),
      ('FAI Dokumente',             'TN-1304-D', 'Formix AG',   'C. Adler', 'FAI Formular', CURRENT_DATE + INTERVAL '14 day', 0.9, 'Grob G350', 'TO_DO', 40, TRUE, TRUE),
      ('Entgraten Kanten',          'TN-1305-E', 'Formix AG',   'C. Adler', 'Vibro gleit', CURRENT_DATE + INTERVAL '2 day', 1.0, 'Grob G350', 'FERTIG', 50, FALSE, FALSE),

      -- Mazak HCN5000 (5)
      ('Palettenwechsel Test',      'TN-1401-A', 'Zemo KG',     'B. Paul',  'APC prüfen', CURRENT_DATE + INTERVAL '5 day', 0.6, 'Mazak HCN5000', 'NEU', 10, FALSE, FALSE),
      ('Bohrbild M8',               'TN-1402-B', 'Zemo KG',     'B. Paul',  'Gewindeformer', CURRENT_DATE - INTERVAL '1 day', 1.8, 'Mazak HCN5000', 'IN_BEARBEITUNG', 20, FALSE, FALSE),
      ('Planfräsen Seite B',        'TN-1403-C', 'Zemo KG',     'B. Paul',  'Ap 0.5', CURRENT_DATE + INTERVAL '9 day', 2.0, 'Mazak HCN5000', 'TO_DO', 30, FALSE, FALSE),
      ('QS Zwischenprüfung',        'TN-1404-D', 'DeltaForm',   'U. Dietz', 'Erstmuster 2/5', CURRENT_DATE + INTERVAL '1 day', 0.7, 'Mazak HCN5000', 'TO_DO', 40, FALSE, TRUE),
      ('Kühlmittel tauschen',       'TN-1405-E', 'DeltaForm',   'U. Dietz', 'Wartung', CURRENT_DATE + INTERVAL '11 day', 1.5, 'Mazak HCN5000', 'FERTIG', 50, FALSE, FALSE),

      -- MTrent MTCut (5)
      ('Langloch 14H7',             'TN-1501-A', 'GigaParts',   'S. Frei',  'Reiben nachbohren', CURRENT_DATE + INTERVAL '4 day', 1.4, 'MTrent MTCut', 'IN_BEARBEITUNG', 10, FALSE, FALSE),
      ('Klebeeinlage setzen',       'TN-1502-B', 'GigaParts',   'S. Frei',  '2K Epoxy', CURRENT_DATE + INTERVAL '6 day', 0.9, 'MTrent MTCut', 'TO_DO', 20, FALSE, FALSE),
      ('FAI Freigabe Kunde',        'TN-1503-C', 'Omega Tools', 'D. Scholz','Rückmeldung offen', CURRENT_DATE - INTERVAL '4 day', 0.6, 'MTrent MTCut', 'TO_DO', 30, TRUE, TRUE),
      ('Doku anfertigen',           'TN-1504-D', 'Omega Tools', 'D. Scholz','Fotos & Maße', CURRENT_DATE + INTERVAL '13 day', 1.1, 'MTrent MTCut', 'NEU', 40, FALSE, TRUE),
      ('Abschlussprüfung',          'TN-1505-E', 'Omega Tools', 'D. Scholz','Checkliste', CURRENT_DATE + INTERVAL '2 day', 1.3, 'MTrent MTCut', 'FERTIG', 50, FALSE, FALSE);

  END IF;
END $$;
