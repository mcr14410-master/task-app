package com.pp.taskmanagementbackend.repository;

import com.pp.taskmanagementbackend.model.Assignee;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AssigneeRepository extends JpaRepository<Assignee, Long> {

    /** Nur aktive Assignees, alphabetisch */
    List<Assignee> findByActiveTrueOrderByNameAsc();

    /** Alle: erst aktiv, dann inaktiv; innerhalb alphabetisch */
    List<Assignee> findAllByOrderByActiveDescNameAsc();
}
