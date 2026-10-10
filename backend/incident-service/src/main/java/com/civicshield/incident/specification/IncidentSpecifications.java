
package com.civicshield.incident.specification;

import com.civicshield.incident.model.Incident;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;

public class IncidentSpecifications {

    public static Specification<Incident> hasType(String type) {
        return (root, query, cb) ->
                type == null || type.isBlank()
                        ? cb.conjunction()
                        : cb.equal(
                                cb.lower(root.get("type")),
                                type.toLowerCase());
    }

    public static Specification<Incident> hasLocation(String location) {
        return (root, query, cb) ->
                location == null || location.isBlank()
                        ? cb.conjunction()
                        : cb.like(
                                cb.lower(root.get("location")),
                                "%" + location.toLowerCase() + "%");
    }

    public static Specification<Incident> hasSeverity(String severity) {
        return (root, query, cb) ->
                severity == null || severity.isBlank()
                        ? cb.conjunction()
                        : cb.equal(
                                cb.lower(root.get("severity")),
                                severity.toLowerCase());
    }

    public static Specification<Incident> hasStatus(String status) {
        return (root, query, cb) ->
                status == null || status.isBlank()
                        ? cb.conjunction()
                        : cb.equal(
                                cb.lower(root.get("status")),
                                status.toLowerCase());
    }

    public static Specification<Incident> matchesText(String q) {
        return (root, query, cb) ->
                q == null || q.isBlank()
                        ? cb.conjunction()
                        : cb.or(
                                cb.like(cb.lower(root.get("title")),
                                        "%" + q.toLowerCase() + "%"),
                                cb.like(cb.lower(root.get("description")),
                                        "%" + q.toLowerCase() + "%"),
                                cb.like(cb.lower(root.get("location")),
                                        "%" + q.toLowerCase() + "%"));
    }

    public static Specification<Incident> fromDate(LocalDateTime from) {
        return (root, query, cb) ->
                from == null ? cb.conjunction()
                        : cb.greaterThanOrEqualTo(
                                root.get("incidentDateTime"), from);
    }

    public static Specification<Incident> toDate(LocalDateTime to) {
        return (root, query, cb) ->
                to == null ? cb.conjunction()
                        : cb.lessThanOrEqualTo(
                                root.get("incidentDateTime"), to);
    }
}
