package com.pp.taskmanagementbackend.repository;

import com.pp.taskmanagementbackend.model.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface TaskRepository extends JpaRepository<Task, Long> {

    // Legacy (falls noch genutzt)
    List<Task> findByArbeitsstationOrderByPrioritaetAsc(String arbeitsstation);

    // Robust: normalisierte Suche + stabile Sortierung
    @Query("""
           SELECT t
           FROM Task t
           WHERE LOWER(TRIM(t.arbeitsstation)) = LOWER(TRIM(:station))
           ORDER BY COALESCE(t.prioritaet, 0) ASC, t.id ASC
           """)
    List<Task> findByStationNormalized(@Param("station") String station);
}
