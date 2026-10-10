
package com.publicsafety.analytics.model;

import java.time.LocalDateTime;

public record IncidentRecord(
        String incidentId,
        LocalDateTime timestamp,
        String location,
        String category,
        String priority,
        String description
) {}

