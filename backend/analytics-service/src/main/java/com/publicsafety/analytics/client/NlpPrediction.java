
package com.publicsafety.analytics.client;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.Map;

public record NlpPrediction(
        String category,
        String priority,

        @JsonProperty("category_confidence")
        double categoryConfidence,

        @JsonProperty("priority_confidence")
        double priorityConfidence,

        @JsonProperty("extracted_signals")
        Map<String, Boolean> extractedSignals,

        @JsonProperty("needs_review")
        boolean needsReview
) {}
