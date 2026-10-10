
package com.publicsafety.analytics.model;

import java.util.List;
import java.util.Map;

public record AnalysisResponse(
    String incidentClassification,
    String recommendedPriority,
    int priorityScore,
    List<String> factors,
    String recommendationRationale,
    String recommendedAction,
    Map<String, Boolean> signals,
    Map<String, Object> historicalEvidence,
    List<ResourceRecommendation> recommendedResources,
    List<String> recommendedPersonnel
) {
    public record ResourceRecommendation(
        String category,
        String reason
    ) {
    }
}
