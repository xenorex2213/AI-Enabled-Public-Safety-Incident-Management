package com.civicshield.incident.dto;

import com.civicshield.incident.model.Incident;
import java.util.List;

/** API response for an incident and the analysis returned by Analytics. */
public record IncidentAnalysisResponse(
        IncidentSummary incident,
        AnalysisSummary analysis,
        String analyticsStatus,
        String nlpStatus,
        String message) {

    public static IncidentAnalysisResponse unavailable(
            Incident incident, String status, String message) {
        return new IncidentAnalysisResponse(
                IncidentSummary.from(incident), null, status,
                "NOT_CONFIRMED", message);
    }

    public record IncidentSummary(
            Long id,
            String title,
            String description,
            String type,
            String location,
            java.time.LocalDateTime incidentDateTime,
            String severity,
            String status) {

        public static IncidentSummary from(Incident incident) {
            return new IncidentSummary(
                    incident.getId(), incident.getTitle(),
                    incident.getDescription(), incident.getType(),
                    incident.getLocation(), incident.getIncidentDateTime(),
                    incident.getSeverity(), incident.getStatus());
        }
    }

    public record AnalysisSummary(
            String classification,
            String nlpPriority,
            String recommendedPriority,
            Integer priorityScore,
            Double confidence,
            Double priorityConfidence,
            List<String> keyFactors,
            String recommendationRationale,
            String recommendedAction,
            Object signals,
            Object historicalEvidence,
            Object recommendedResources,
            Object recommendedPersonnel,
            Object nlpPrediction,
            Object analyticsResponse) {
    }
}
