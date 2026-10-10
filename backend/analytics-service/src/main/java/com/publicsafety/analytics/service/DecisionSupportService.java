
package com.publicsafety.analytics.service;

import com.publicsafety.analytics.model.AnalysisRequest;
import com.publicsafety.analytics.model.AnalysisResponse;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class DecisionSupportService {

    private final AnalyticsService analyticsService;

    public DecisionSupportService(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    public AnalysisResponse evaluate(AnalysisRequest request) {
        String description = request.description().toLowerCase(Locale.ROOT);
        String incidentType = request.incidentType().trim();

        Map<String, Boolean> signals = detectSignals(description);
        List<String> factors = new ArrayList<>();

        int score = severityBaseline(request.reportedSeverity());

        factors.add(
            "Reported severity: " + request.reportedSeverity().trim()
        );

        if (signals.get("injuryReported")) {
            score += 20;
            factors.add("Possible injury reported in the description");
        }

        if (signals.get("threatReported")) {
            score += 25;
            factors.add("Possible immediate threat reported");
        }

        if (signals.get("fireReported")) {
            score += 25;
            factors.add("Possible fire or smoke reported");
        }

        if (signals.get("trafficBlocked")) {
            score += 10;
            factors.add("Traffic obstruction reported");
        }

        score = Math.min(score, 100);

        String priority = determinePriority(score);
        String action = determineAction(priority, signals);
        String rationale = buildRationale(priority, score, factors);

        Map<String, Object> historicalEvidence =
            buildHistoricalEvidence(incidentType, priority);

        List<AnalysisResponse.ResourceRecommendation> resources =
            recommendResources(signals, priority);

        List<String> personnel =
            recommendPersonnel(signals, priority);

        return new AnalysisResponse(
            incidentType,
            priority,
            score,
            List.copyOf(factors),
            rationale,
            action,
            Map.copyOf(signals),
            Map.copyOf(historicalEvidence),
            List.copyOf(resources),
            List.copyOf(personnel)
        );
    }

    private int severityBaseline(String severity) {
        return switch (severity.trim().toUpperCase(Locale.ROOT)) {
            case "CRITICAL" -> 90;
            case "HIGH" -> 70;
            case "MEDIUM", "MODERATE" -> 45;
            case "LOW" -> 20;
            default -> throw new IllegalArgumentException(
                "Unsupported reported severity. Use LOW, MEDIUM, HIGH, or CRITICAL."
            );
        };
    }

    private Map<String, Boolean> detectSignals(String description) {
        Map<String, Boolean> signals = new LinkedHashMap<>();

        signals.put(
            "injuryReported",
            containsAny(description,
                "injury", "injured", "bleeding", "unconscious",
                "wounded", "hurt", "casualty")
        );

        signals.put(
            "threatReported",
            containsAny(description,
                "weapon", "armed", "gun", "knife", "attack",
                "threat", "assault", "violence", "hostage")
        );

        signals.put(
            "fireReported",
            containsAny(description,
                "fire", "smoke", "burning", "flames", "explosion")
        );

        
signals.put(
    "trafficBlocked",
    containsAny(description,
        "traffic blocked",
        "traffic is blocked",
        "traffic is completely blocked",
        "road blocked",
        "road is blocked",
        "road is completely blocked",
        "roadblock",
        "traffic jam",
        "road obstruction",
        "blocked road",
        "blocked traffic",
        "traffic cannot move"
    )
);


        return signals;
    }

    private boolean containsAny(String text, String... keywords) {
        for (String keyword : keywords) {
            if (text.contains(keyword)) {
                return true;
            }
        }
        return false;
    }

    private String determinePriority(int score) {
        if (score >= 85) {
            return "P1 - CRITICAL";
        }
        if (score >= 65) {
            return "P2 - HIGH";
        }
        if (score >= 35) {
            return "P3 - MEDIUM";
        }
        return "P4 - LOW";
    }

    private String determineAction(
        String priority,
        Map<String, Boolean> signals
    ) {
        if (signals.get("fireReported")) {
            return "Recommend prompt assessment by the appropriate emergency "
                + "response service. Keep people away from the reported hazard "
                + "and follow official emergency instructions.";
        }

        if (signals.get("threatReported")) {
            return "Recommend prompt assessment by appropriate emergency "
                + "services. Avoid approaching the reported threat and follow "
                + "official safety instructions.";
        }

        if (signals.get("injuryReported")) {
            return "Recommend medical assessment by qualified responders. "
                + "Contact local emergency services if the situation is urgent.";
        }

        if (priority.equals("P1 - CRITICAL")) {
            return "Recommend immediate review by an authorised incident "
                + "coordinator and appropriate emergency services.";
        }

        if (priority.equals("P2 - HIGH")) {
            return "Recommend prompt review by the incident coordination team "
                + "and assessment of the need for emergency response.";
        }

        if (priority.equals("P3 - MEDIUM")) {
            return "Recommend timely review and assignment to the appropriate "
                + "response team.";
        }

        return "Recommend routine review and routing to the appropriate "
            + "responsible team.";
    }

    private String buildRationale(
        String priority,
        int score,
        List<String> factors
    ) {
        return "Rule-based assessment produced " + priority
            + " with a score of " + score + "/100. "
            + "Contributing factors: " + String.join("; ", factors)
            + ". This is an advisory assessment, not an automated dispatch.";
    }

    private Map<String, Object> buildHistoricalEvidence(
        String incidentType,
        String priority
    ) {
        Map<String, Object> evidence = new LinkedHashMap<>();

        evidence.put("source", "Synthetic historical CSV dataset");
        evidence.put("totalHistoricalIncidents",
            analyticsService.getIncidentCount());
        evidence.put("historicalCategoryCounts",
            analyticsService.getCategoryCounts());
        evidence.put("historicalPriorityCounts",
            analyticsService.getPriorityCounts());
        evidence.put("requestedIncidentType", incidentType);
        evidence.put("assessedPriority", priority);
        evidence.put("note",
            "Historical counts are contextual only. They do not establish "
                + "live conditions, resource availability, or incident causation.");

        return evidence;
    }

    private List<AnalysisResponse.ResourceRecommendation> recommendResources(
        Map<String, Boolean> signals,
        String priority
    ) {
        List<AnalysisResponse.ResourceRecommendation> resources =
            new ArrayList<>();

        if (signals.get("injuryReported")) {
            resources.add(new AnalysisResponse.ResourceRecommendation(
                "Medical response",
                "A possible injury was mentioned in the incident description."
            ));
        }

        if (signals.get("fireReported")) {
            resources.add(new AnalysisResponse.ResourceRecommendation(
                "Fire and rescue",
                "The description contains a possible fire or smoke indicator."
            ));
        }

        if (signals.get("threatReported")) {
            resources.add(new AnalysisResponse.ResourceRecommendation(
                "Appropriate emergency response",
                "A possible threat was detected in the description."
            ));
        }

        if (signals.get("trafficBlocked")) {
            resources.add(new AnalysisResponse.ResourceRecommendation(
                "Traffic management",
                "A road or traffic obstruction was reported."
            ));
        }

        if (resources.isEmpty()) {
            resources.add(new AnalysisResponse.ResourceRecommendation(
                "Incident assessment team",
                "Initial review is recommended to determine the appropriate response."
            ));
        }

        if (priority.equals("P1 - CRITICAL")) {
            resources.add(new AnalysisResponse.ResourceRecommendation(
                "Incident coordination",
                "The calculated priority warrants urgent authorised review."
            ));
        }

        return resources;
    }

    private List<String> recommendPersonnel(
        Map<String, Boolean> signals,
        String priority
    ) {
        List<String> personnel = new ArrayList<>();

        if (signals.get("injuryReported")) {
            personnel.add("Qualified medical responders");
        }

        if (signals.get("fireReported")) {
            personnel.add("Fire and rescue personnel");
        }

        if (signals.get("threatReported")) {
            personnel.add("Appropriately trained emergency responders");
        }

        if (signals.get("trafficBlocked")) {
            personnel.add("Traffic management personnel");
        }

        if (priority.equals("P1 - CRITICAL")
                || priority.equals("P2 - HIGH")) {
            personnel.add("Authorised incident coordinator");
        }

        if (personnel.isEmpty()) {
            personnel.add("Appropriate incident response personnel");
        }

        return personnel.stream().distinct().toList();
    }
}
