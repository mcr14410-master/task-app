package com.pp.taskmanagementbackend.repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class StationLookupRepository {

    @PersistenceContext
    private EntityManager em;

    @Transactional(propagation = Propagation.NOT_SUPPORTED, readOnly = true)
    public boolean existsByName(String name) {
        if (name == null || name.isBlank()) return false;

        if (!tableExistsSafe()) {
            return true;
        }

        try {
            Number n = (Number) em.createNativeQuery(
                "SELECT COUNT(*) FROM arbeitsstation WHERE LOWER(name) = LOWER(:name)")
                .setParameter("name", name)
                .getSingleResult();
            return n != null && n.longValue() > 0;
        } catch (Exception ignored) {
            return true;
        }
    }

    @Transactional(propagation = Propagation.NOT_SUPPORTED, readOnly = true)
    protected boolean tableExistsSafe() {
        try {
            Number n = (Number) em.createNativeQuery(
                "SELECT COUNT(*) FROM information_schema.tables WHERE LOWER(table_name) = 'arbeitsstation'")
                .getSingleResult();
            return n != null && n.longValue() > 0;
        } catch (Exception ignored) {
            return false;
        }
    }
}
