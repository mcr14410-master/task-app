package com.pp.taskmanagementbackend.repository;

import com.pp.taskmanagementbackend.model.Customer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CustomerRepository extends JpaRepository<Customer, Long> {

    /** Nur aktive Kunden, alphabetisch */
    List<Customer> findByActiveTrueOrderByNameAsc();

    /** Alle Kunden: zuerst aktiv, dann inaktiv; jeweils alphabetisch */
    List<Customer> findAllByOrderByActiveDescNameAsc();
}
