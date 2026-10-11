
package com.publicsafety.analytics.controller;

import com.publicsafety.analytics.model.AnalysisRequest;
import com.publicsafety.analytics.model.AnalysisResponse;
import com.publicsafety.analytics.service.DecisionSupportService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/analysis")
public class AnalysisController {

    private final DecisionSupportService decisionSupportService;

    public AnalysisController(
            DecisionSupportService decisionSupportService) {
        this.decisionSupportService = decisionSupportService;
    }

    @PostMapping("/evaluate")
    public AnalysisResponse evaluate(
            @Valid @RequestBody AnalysisRequest request) {
        return decisionSupportService.evaluate(request);
    }
}
