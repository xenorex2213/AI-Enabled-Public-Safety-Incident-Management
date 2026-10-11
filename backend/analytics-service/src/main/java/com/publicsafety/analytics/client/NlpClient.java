
package com.publicsafety.analytics.client;

import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class NlpClient {

    private final RestClient restClient;

    public NlpClient(
            @Value("${nlp.service.base-url:http://localhost:5000}")
            String baseUrl) {

        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .build();
    }

    public NlpPrediction classify(String description) {
        return restClient.post()
                .uri("/api/v1/classify-incident")
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("description", description))
                .retrieve()
                .body(NlpPrediction.class);
    }
}
