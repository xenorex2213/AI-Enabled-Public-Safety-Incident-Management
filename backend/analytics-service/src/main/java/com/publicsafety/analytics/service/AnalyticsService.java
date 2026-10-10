
package com.publicsafety.analytics.service;

import com.publicsafety.analytics.model.IncidentRecord;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class AnalyticsService {

    // Temporary synthetic data until the Neon database is ready.
    private final List<IncidentRecord> incidents = List.of(
        new IncidentRecord(1L, "Fire", "Central Market",
            LocalDate.of(2026, 10, 8).atTime(9, 15), "High"),
        new IncidentRecord(2L, "Theft", "Bus Station",
            LocalDate.of(2026, 10, 8).atTime(10, 30), "Medium"),
        new IncidentRecord(3L, "Fire", "Central Market",
            LocalDate.of(2026, 10, 9).atTime(9, 45), "High"),
        new IncidentRecord(4L, "Accident", "Main Road",
            LocalDate.of(2026, 10, 9).atTime(17, 20), "High"),
        new IncidentRecord(5L, "Theft", "Bus Station",
            LocalDate.of(2026, 10, 10).atTime(11, 0), "Medium"),
        new IncidentRecord(6L, "Fire", "Central Market",
            LocalDate.of(2026, 10, 10).atTime(8, 50), "High")
    );

    public Map<String, Long> getCategoryCounts() {
        return incidents.stream().collect(Collectors.groupingBy(
            IncidentRecord::type,
            Collectors.counting()
        ));
    }

    public Map<String, Long> getLocationCounts() {
        return incidents.stream().collect(Collectors.groupingBy(
            IncidentRecord::location,
            Collectors.counting()
        ));
    }

    public Map<LocalDate, Long> getDailyCounts() {
        return incidents.stream().collect(Collectors.groupingBy(
            incident -> incident.reportedAt().toLocalDate(),
            Collectors.counting()
        ));
    }

    public List<IncidentRecord> getIncidents() {
        return incidents;
    }
}
