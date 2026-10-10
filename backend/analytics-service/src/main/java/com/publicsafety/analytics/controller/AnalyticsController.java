
package com.publicsafety.analytics.controller;

import com.publicsafety.analytics.model.IncidentRecord;
import com.publicsafety.analytics.service.AnalyticsService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @GetMapping("/summary")
    public Map<String, Object> summary() {
        return Map.of(
            "totalIncidents", analyticsService.getIncidentCount(),
            "categories", analyticsService.getCategoryCounts(),
            "priorities", analyticsService.getPriorityCounts()
        );
    }

    @GetMapping("/categories")
    public Map<String, Long> categories() {
        return analyticsService.getCategoryCounts();
    }

    @GetMapping("/locations")
    public Map<String, Long> locations() {
        return analyticsService.getLocationCounts();
    }

    @GetMapping("/trends")
    public Map<LocalDate, Long> trends() {
        return analyticsService.getDailyCounts();
    }

    @GetMapping("/hours")
    public Map<Integer, Long> hours() {
        return analyticsService.getHourlyCounts();
    }

    @GetMapping("/incidents")
    public List<IncidentRecord> incidents() {
        return analyticsService.getIncidents();
    }
}
