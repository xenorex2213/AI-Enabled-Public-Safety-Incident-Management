package com.publicsafety.analytics.config;

import com.publicsafety.analytics.model.IncidentRecord;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Configuration
public class HistoricalDataInitializer {

    @Bean
    ApplicationRunner importHistoricalIncidents(JdbcTemplate jdbcTemplate) {
        return args -> {
            System.out.println(">>> HISTORICAL INITIALIZER STARTED <<<");
            System.out.println(">>> Creating table...");
createTable(jdbcTemplate);
System.out.println(">>> Table created or already exists.");

System.out.println(">>> Loading CSV...");
List<IncidentRecord> incidents = loadCsv();
System.out.println(">>> CSV rows loaded: " + incidents.size());

int inserted = 0;

            for (IncidentRecord incident : incidents) {
                inserted += jdbcTemplate.update("""
                    INSERT INTO historical_data
                    (incident_id, timestamp, location, category, priority, description)
                    VALUES (?, ?, ?, ?, ?, ?)
                    ON CONFLICT (incident_id) DO NOTHING
                    """,
                    incident.incidentId(),
                    incident.timestamp(),
                    incident.location(),
                    incident.category(),
                    incident.priority(),
                    incident.description()
                );
            }

            Integer total = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM historical_data", Integer.class
            );

            System.out.println(
                "Historical import complete. Newly inserted: " + inserted
                + ", total in Neon: " + total
            );
        };
    }

    private void createTable(JdbcTemplate jdbcTemplate) {
        jdbcTemplate.execute("""
            CREATE TABLE IF NOT EXISTS historical_data (
                incident_id TEXT PRIMARY KEY,
                timestamp TIMESTAMP NOT NULL,
                location TEXT NOT NULL,
                category TEXT NOT NULL,
                priority TEXT,
                description TEXT
            )
            """);
    }

    private List<IncidentRecord> loadCsv() throws Exception {
        ClassPathResource resource =
            new ClassPathResource("data/combined_synthetic_full.csv");

        List<IncidentRecord> incidents = new ArrayList<>();

        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(
                    resource.getInputStream(), StandardCharsets.UTF_8))) {

            String line;
            boolean header = true;

            while ((line = reader.readLine()) != null) {
                if (header) {
                    header = false;
                    continue;
                }
                if (line.isBlank()) continue;

                List<String> fields = parseCsvLine(line);

                if (fields.size() != 6) {
                    throw new IllegalArgumentException(
                        "Expected 6 columns, found " + fields.size()
                    );
                }

                incidents.add(new IncidentRecord(
                    fields.get(0),
                    LocalDateTime.parse(
                        fields.get(1).trim().replace(" ", "T")
                    ),
                    fields.get(2),
                    fields.get(3),
                    fields.get(4),
                    fields.get(5)
                ));
            }
        }

        return incidents;
    }

    private List<String> parseCsvLine(String line) {
        List<String> fields = new ArrayList<>();
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
}