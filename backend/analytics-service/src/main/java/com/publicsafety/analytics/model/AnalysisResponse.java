
package com.publicsafety.analytics.model;

import com.publicsafety.analytics.client.NlpPrediction;
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
    List<String> recommendedPersonnel,
    NlpPrediction nlpPrediction
) {
    public record ResourceRecommendation(
        String category,
        String reason
    ) {
    }
}
