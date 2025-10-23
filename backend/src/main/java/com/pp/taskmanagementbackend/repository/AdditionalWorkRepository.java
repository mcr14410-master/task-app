package com.pp.taskmanagementbackend.repository;

import com.pp.taskmanagementbackend.model.AdditionalWork;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AdditionalWorkRepository extends JpaRepository<AdditionalWork, Long> {

    Optional<AdditionalWork> findByCode(String code);

    /** Nur aktive Zusatzarbeiten (für Dropdowns) */
    List<AdditionalWork> findByActiveTrueOrderBySortOrderAscLabelAsc();

    /** Alle: aktiv zuerst, dann inaktiv; innerhalb sort_order/label */
    List<AdditionalWork> findAllByOrderByActiveDescSortOrderAscLabelAsc();
}
