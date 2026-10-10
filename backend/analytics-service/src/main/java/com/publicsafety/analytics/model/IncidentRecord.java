
package com.publicsafety.analytics.model;

import java.time.LocalDateTime;

public record IncidentRecord(
        Long id,
        String type,
        String location,
        LocalDateTime reportedAt,
        String severity
) {
}
