package com.civicshield.incident.repository;

import com.civicshield.incident.model.Incident;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IncidentRepository
        extends JpaRepository<Incident, Long> {
}