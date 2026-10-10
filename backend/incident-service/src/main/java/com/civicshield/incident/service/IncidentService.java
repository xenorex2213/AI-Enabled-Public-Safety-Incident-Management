package com.civicshield.incident.service;

import com.civicshield.incident.model.Incident;
import com.civicshield.incident.repository.IncidentRepository;
import org.springframework.stereotype.Service;

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
}