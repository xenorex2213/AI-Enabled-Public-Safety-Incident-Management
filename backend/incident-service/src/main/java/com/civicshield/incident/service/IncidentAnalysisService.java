package com.civicshield.incident.service;

import com.civicshield.incident.dto.IncidentAnalysisResponse;
import com.civicshield.incident.dto.IncidentAnalysisResponse.AnalysisSummary;
import com.civicshield.incident.model.Incident;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class IncidentAnalysisService {

    private static final Set<String> VALID_SEVERITIES =
            Set.of("LOW", "MEDIUM", "HIGH", "CRITICAL", "MODERATE");

    private final IncidentService incidentService;
    private final RestClient analyticsRestClient;

    public IncidentAnalysisService(
            IncidentService incidentService,
            RestClient analyticsRestClient) {
        this.incidentService = incidentService;
        this.analyticsRestClient = analyticsRestClient;
    }

    public IncidentAnalysisResponse analyze(Long id) {
        Incident incident = incidentService.getIncidentById(id);

        if (incident.getIncidentDateTime() == null) {
            return IncidentAnalysisResponse.unavailable(
                    incident, "INVALID_INCIDENT",
                    "Analysis requires the incident date and time.");
        }
        if (incident.getSeverity() == null
                || !VALID_SEVERITIES.contains(
                        incident.getSeverity().trim().toUpperCase(Locale.ROOT))) {
            return IncidentAnalysisResponse.unavailable(
                    incident, "INVALID_INCIDENT",
                    "Analysis requires a supported severity: LOW, MEDIUM, HIGH, or CRITICAL.");
        }

        Map<String, Object> response;
        try {
            response = analyticsRestClient.post()
                    .uri("/api/analysis/evaluate")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(new AnalysisRequest(
                            incident.getType(), incident.getLocation(),
                            incident.getIncidentDateTime(), incident.getSeverity(),
                            incident.getDescription()))
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() {});
        } catch (ResourceAccessException | RestClientResponseException ex) {
            return IncidentAnalysisResponse.unavailable(
                    incident, "UNAVAILABLE",
                    "Analytics service did not return an analysis.");
        } catch (RestClientException ex) {
            return IncidentAnalysisResponse.unavailable(
                    incident, "INVALID_RESPONSE",
                    "Analytics service returned an unreadable response.");
        } catch (RuntimeException ex) {
            return IncidentAnalysisResponse.unavailable(
                    incident, "UNAVAILABLE",
                    "Analytics service did not return an analysis.");
        }

        if (response == null) {
            return IncidentAnalysisResponse.unavailable(
                    incident, "INVALID_RESPONSE",
                    "Analytics service returned an empty or invalid response.");
        }

        Object nlpPrediction = response.get("nlpPrediction");
        Map<?, ?> nlp = asMap(nlpPrediction);
        boolean validNlpPrediction = nlpPrediction instanceof Map<?, ?>;
        AnalysisSummary analysis = new AnalysisSummary(
                text(nlp.get("category")),
                text(nlp.get("priority")),
                text(response.get("recommendedPriority")),
                integer(response.get("priorityScore")),
                decimal(nlp.get("category_confidence")),
                decimal(nlp.get("priority_confidence")),
                strings(response.get("factors")),
                text(response.get("recommendationRationale")),
                text(response.get("recommendedAction")),
                response.get("signals"),
                response.get("historicalEvidence"),
                response.get("recommendedResources"),
                response.get("recommendedPersonnel"),
                nlpPrediction,
                response);

        boolean incomplete = !response.containsKey("recommendedPriority")
                || !response.containsKey("priorityScore");
        return new IncidentAnalysisResponse(
                IncidentAnalysisResponse.IncidentSummary.from(incident),
                analysis,
                incomplete ? "PARTIAL" : "SUCCESS",
                nlpPrediction == null ? "NO_PREDICTION"
                        : validNlpPrediction ? "AVAILABLE" : "INVALID_RESPONSE",
                incomplete
                        ? "Analytics response was missing priority fields; returned fields are preserved."
                        : null);
    }

    private Map<?, ?> asMap(Object value) {
        return value instanceof Map<?, ?> map ? map : Map.of();
    }

    private String text(Object value) {
        return value instanceof String string ? string : null;
    }

    private Integer integer(Object value) {
        return value instanceof Number number ? number.intValue() : null;
    }

    private Double decimal(Object value) {
        return value instanceof Number number ? number.doubleValue() : null;
    }

    private List<String> strings(Object value) {
        if (!(value instanceof List<?> values)) {
            return List.of();
        }
        List<String> result = new ArrayList<>();
        values.forEach(item -> {
            if (item instanceof String string) {
                result.add(string);
            }
        });
        return List.copyOf(result);
    }

    private record AnalysisRequest(
            String incidentType,
            String location,
            java.time.LocalDateTime dateTime,
            String reportedSeverity,
            String description) {
    }
}
