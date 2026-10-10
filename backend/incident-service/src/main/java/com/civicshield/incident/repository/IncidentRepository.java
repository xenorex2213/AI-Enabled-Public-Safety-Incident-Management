
package com.civicshield.incident.repository;
import com.civicshield.incident.model.Incident;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface IncidentRepository
        extends JpaRepository<Incident, Long>,
                JpaSpecificationExecutor<Incident> {
}
