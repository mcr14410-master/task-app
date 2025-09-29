package com.pp.taskmanagementbackend.repository;

import com.pp.taskmanagementbackend.model.Arbeitsstation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ArbeitsstationRepository extends JpaRepository<Arbeitsstation, Long> {
    Optional<Arbeitsstation> findByName(String name);
}
