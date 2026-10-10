
package com.publicsafety.analytics.service;

import com.publicsafety.analytics.model.IncidentRecord;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class AnalyticsService {

    private final List<IncidentRecord> incidents;

    public AnalyticsService() {
        this.incidents = loadIncidents();
    }

    private List<IncidentRecord> loadIncidents() {
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(
                    new ClassPathResource(
                        "data/combined_synthetic_full.csv"
                    ).getInputStream(),
                    StandardCharsets.UTF_8))) {

            return reader.lines()
                    .skip(1)
                    .filter(line -> !line.isBlank())
                    .map(this::parseIncident)
                    .toList();

        } catch (Exception e) {
            throw new IllegalStateException(
                "Could not load incident CSV from resources/data", e
            );
        }
    }

    private IncidentRecord parseIncident(String line) {
        List<String> fields = parseCsvLine(line);

        if (fields.size() != 6) {
            throw new IllegalArgumentException(
                "Expected 6 CSV columns but found " + fields.size()
            );
        }

        return new IncidentRecord(
            fields.get(0),
            LocalDateTime.parse(fields.get(1).trim().replace(" ", "T")),
            fields.get(2),
            fields.get(3),
            fields.get(4),
            fields.get(5)
        );
    }

    // Handles commas and escaped quotes inside quoted CSV fields.
    private List<String> parseCsvLine(String line) {
        java.util.ArrayList<String> fields = new java.util.ArrayList<>();
        StringBuilder field = new StringBuilder();
        boolean quoted = false;

        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);

            if (c == '"') {
                if (quoted && i + 1 < line.length()
                        && line.charAt(i + 1) == '"') {
                    field.append('"');
                    i++;
                } else {
                    quoted = !quoted;
                }
            } else if (c == ',' && !quoted) {
                fields.add(field.toString().trim());
                field.setLength(0);
            } else {
                field.append(c);
            }
        }

        fields.add(field.toString().trim());
        return fields;
    }

    public Map<String, Long> getCategoryCounts() {
        return incidents.stream().collect(Collectors.groupingBy(
            IncidentRecord::category, Collectors.counting()
        ));
    }

    public Map<String, Long> getLocationCounts() {
        return incidents.stream().collect(Collectors.groupingBy(
            IncidentRecord::location, Collectors.counting()
        ));
    }

    public Map<String, Long> getPriorityCounts() {
        return incidents.stream().collect(Collectors.groupingBy(
            IncidentRecord::priority, Collectors.counting()
        ));
    }

    public Map<LocalDate, Long> getDailyCounts() {
        return incidents.stream().collect(Collectors.groupingBy(
            incident -> incident.timestamp().toLocalDate(),
            Collectors.counting()
        ));
    }

    public Map<Integer, Long> getHourlyCounts() {
        return incidents.stream().collect(Collectors.groupingBy(
            incident -> incident.timestamp().getHour(),
            Collectors.counting()
        ));
    }

    public List<IncidentRecord> getIncidents() {
        return incidents;
    }

    public int getIncidentCount() {
        return incidents.size();
    }
}
