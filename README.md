# Final Incident Analysis API Integration

## Overview

The Final Incident Analysis API is part of the **AI-Enabled Public Safety & Incident Management System**. Its purpose is to combine incident information with AI-based triage results and historical analytics into a single, structured response for the frontend.

The Incident Service acts as the integration point: it retrieves the requested incident, communicates with the relevant analysis services, and formats their results into one response.

## Objectives

- Retrieve incident details using an incident ID.
- Integrate results from the AI Triage Service.
- Integrate historical insights from the Analytics Service.
- Return a consistent JSON response for the frontend.
- Handle missing incidents and service failures gracefully.
- Preserve existing incident management functionality.

## Architecture

The integration involves three backend services:

| Service | Responsibility |
|---|---|
| Incident Service | Stores and retrieves incident records and coordinates the final analysis request. |
| AI Triage Service | Provides incident classification and AI-based priority assessment. |
| Analytics Service | Provides historical incident patterns and relevant analytical insights. |

### Data flow

1. The frontend requests analysis for an incident.
2. The Incident Service retrieves the incident from the database.
3. The Incident Service requests results from the AI Triage and Analytics services.
4. The responses are combined into a structured analysis object.
5. The final response is returned to the frontend.

## API Endpoint

**Proposed endpoint:**

`GET /api/incidents/{id}/analysis`

This endpoint retrieves an incident and returns its associated analysis.

> The final URL and response contract should match the actual implementation in the project.

### Example request

```http
GET /api/incidents/123/analysis
```

### Example response

```json
{
  "incident": {
    "id": 123,
    "incidentType": "Traffic Accident",
    "location": "Zone A, Chennai",
    "severity": "HIGH",
    "status": "OPEN"
  },
  "analysis": {
    "classification": "Traffic Accident",
    "recommendedPriority": "HIGH",
    "confidence": null,
    "keyFactors": [],
    "historicalEvidence": [],
    "recommendedResources": []
  }
}
```

*Note: This is an illustrative response. Actual fields and values depend on the incident model and the responses returned by the integrated services.*

## Error Handling

The API should handle the following situations:

- **404 Not Found:** The requested incident does not exist.
- **Service unavailable:** The AI Triage or Analytics Service cannot be reached.
- **Timeout:** An analysis service takes too long to respond.
- **Invalid response:** A downstream service returns malformed or unexpected data.
- **Partial analysis:** One service fails while another succeeds, if partial results are supported by the implementation.

Errors should be returned in a consistent format without exposing sensitive internal details.

## Technology Stack

- Java
- Spring Boot
- REST APIs
- JSON
- Neon PostgreSQL for incident persistence
- HTTP client supported by the project, such as `RestClient` or `WebClient`

## Implementation Responsibilities

The integration work includes:

1. Reviewing the existing Incident Service structure.
2. Confirming endpoint contracts with the AI Triage and Analytics teams.
3. Implementing communication with the downstream services.
4. Creating DTOs to structure the combined response.
5. Adding the final analysis endpoint.
6. Implementing appropriate error handling.
7. Testing successful and unsuccessful request scenarios.

## Testing

The following scenarios should be validated:

- Analysis request for an existing incident.
- Request for a nonexistent incident ID.
- Successful responses from both downstream services.
- AI Triage Service unavailable or timing out.
- Analytics Service unavailable or timing out.
- Unexpected downstream response formats.
- Correct JSON structure for frontend consumption.

## Expected Outcome

The expected result is a single API endpoint that combines the incident record, AI triage findings, and historical analytics into a unified response. This reduces the frontend's need to coordinate multiple backend services independently.

The implementation must use actual service responses and must not fabricate AI predictions or historical evidence.

## Future Improvements

- Cache analysis results where appropriate.
- Persist analysis snapshots when required.
- Add request tracing and structured logging.
- Improve resilience with configurable timeouts and retry policies.
- Expand automated integration testing.
- Add authentication and authorization where required.

## Project Status

The integration should be marked **Complete** only after the downstream service contracts have been confirmed, the endpoint has been implemented, and end-to-end tests have passed. Until then, mark the relevant integration and testing tasks as **In Progress** or **Pending**.
