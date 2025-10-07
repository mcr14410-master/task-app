package com.pp.taskmanagementbackend.repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Robustes Lookup:
 * - Läuft OHNE aktive Transaktion (NOT_SUPPORTED), damit Fehler hier nicht die Sort-Transaktion killen.
 * - Prüft zuerst information_schema, ob 'arbeitsstationen' existiert.
 * - Wenn die Tabelle fehlt oder irgendwas schief geht: gibt TRUE zurück (Soft-Validation).
 */
@Repository
public class StationLookupRepository {

    @PersistenceContext
    private EntityManager em;

    @Transactional(propagation = Propagation.NOT_SUPPORTED, readOnly = true)
    public boolean existsByName(String name) {
        if (name == null || name.isBlank()) return false;

        // 1) Tabelle existiert?
        if (!tableExistsSafe()) {
            return true; // Soft-Validation: nicht blockieren
        }

        // 2) Wirkliche Prüfung gegen Tabelle (safe, da nicht in deiner Sort-Transaktion)
        try {
            Number n = (Number) em.createNativeQuery(
                "SELECT COUNT(*) FROM arbeitsstationen WHERE LOWER(name) = LOWER(:name)")
                .setParameter("name", name)
                .getSingleResult();
            return n != null && n.longValue() > 0;
        } catch (Exception ignored) {
            return true; // im Zweifel nicht blockieren
        }
    }

    @Transactional(propagation = Propagation.NOT_SUPPORTED, readOnly = true)
    protected boolean tableExistsSafe() {
        try {
            // Postgres & MySQL: information_schema.tables verfügbar
            Number n = (Number) em.createNativeQuery(
                "SELECT COUNT(*) FROM information_schema.tables " +
                "WHERE LOWER(table_name) = 'arbeitsstationen'")
                .getSingleResult();
            return n != null && n.longValue() > 0;
        } catch (Exception ignored) {
            return false; // wenn selbst info_schema failed, gehen wir von „nicht vorhanden“ aus
        }
    }
}
