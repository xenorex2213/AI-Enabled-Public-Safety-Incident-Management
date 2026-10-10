
package com.civicshield.incident.service;
public class IncidentNotFoundException extends RuntimeException {

    public IncidentNotFoundException(Long id) {
        super("Incident not found with ID: " + id);
    }
}
