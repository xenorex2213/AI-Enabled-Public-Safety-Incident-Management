package com.civicshield.incident.service;

import com.civicshield.incident.model.Incident;
import com.civicshield.incident.repository.IncidentRepository;
import org.springframework.stereotype.Service;

import com.civicshield.incident.specification.IncidentSpecifications;
import org.springframework.data.jpa.domain.Specification;
import java.time.LocalDateTime;

import java.util.List;

@Service
public class IncidentService {

    private final IncidentRepository incidentRepository;

    public IncidentService(IncidentRepository incidentRepository) {
        this.incidentRepository = incidentRepository;
    }

    public Incident createIncident(Incident incident) {
        incident.setId(null);
        if (incident.getStatus() == null || incident.getStatus().isBlank()) {
            incident.setStatus("OPEN");
        }
        return incidentRepository.save(incident);
    }

    public List<Incident> getAllIncidents() {
        return incidentRepository.findAll();
    }

    public Incident getIncidentById(Long id) {
        return incidentRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Incident not found with id: " + id));
    }
    public List<Incident> getIncidentsByTimeWindow(int hours) {
    if (hours <= 0) {
        throw new IllegalArgumentException("Hours must be positive");
    }

    LocalDateTime now = LocalDateTime.now();
    LocalDateTime from = now.minusHours(hours);

    return incidentRepository.findAll(
            IncidentSpecifications.fromDate(from)
                    .and(IncidentSpecifications.toDate(now))
    );
}

    public Incident updateIncident(Long id, Incident updatedIncident) {
        Incident existing = getIncidentById(id);

        existing.setTitle(updatedIncident.getTitle());
        existing.setDescription(updatedIncident.getDescription());
        existing.setType(updatedIncident.getType());
        existing.setLocation(updatedIncident.getLocation());
        existing.setIncidentDateTime(updatedIncident.getIncidentDateTime());
        existing.setSeverity(updatedIncident.getSeverity());
        existing.setStatus(updatedIncident.getStatus());

        return incidentRepository.save(existing);
    }

    public List<Incident> searchIncidents(
            String type,
            String location,
            String severity,
            String status,
            String q,
            LocalDateTime from,
            LocalDateTime to) {

        Specification<Incident> spec =
                Specification.where(IncidentSpecifications.hasType(type))
                        .and(IncidentSpecifications.hasLocation(location))
                        .and(IncidentSpecifications.hasSeverity(severity))
                        .and(IncidentSpecifications.hasStatus(status))
                        .and(IncidentSpecifications.matchesText(q))
                        .and(IncidentSpecifications.fromDate(from))
                        .and(IncidentSpecifications.toDate(to));

        return incidentRepository.findAll(spec);
    }
}