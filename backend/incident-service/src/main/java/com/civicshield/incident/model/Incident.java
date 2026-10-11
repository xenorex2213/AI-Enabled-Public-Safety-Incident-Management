
package com.civicshield.incident.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;

@Entity
@Table(name = "incidents")
public class Incident {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    private String title;

    @NotBlank
    @Size(max = 2000)
    @Column(length = 2000)
    private String description;

    @NotBlank
    private String type;

    @NotBlank
    private String location;

    private LocalDateTime incidentDateTime;

    private String severity;

    private String status = "OPEN";

    public Incident() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) {
        this.description = description;
    }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public LocalDateTime getIncidentDateTime() {
        return incidentDateTime;
    }
    public void setIncidentDateTime(LocalDateTime incidentDateTime) {
        this.incidentDateTime = incidentDateTime;
    }

    public String getSeverity() { return severity; }
    public void setSeverity(String severity) { this.severity = severity; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
