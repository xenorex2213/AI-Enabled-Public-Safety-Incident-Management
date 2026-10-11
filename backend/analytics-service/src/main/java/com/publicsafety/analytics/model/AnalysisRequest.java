
package com.publicsafety.analytics.model;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

public record AnalysisRequest(
    @NotBlank(message = "Incident type is required")
    String incidentType,

    @NotBlank(message = "Location is required")
    String location,

    @NotNull(message = "Incident date and time are required")
    LocalDateTime dateTime,

    @NotBlank(message = "Reported severity is required")
    String reportedSeverity,

    @NotBlank(message = "Incident description is required")
    @Size(max = 5000, message = "Description must not exceed 5000 characters")
    String description
) {
}
