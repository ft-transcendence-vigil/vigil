package com.ft_transcendence.vigil.domain.entities.Alerts;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Entity
@Setter
@Getter
@Table(name = "alert_rules")
public class AlertRules {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String service;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private SignalType signalType;

    @Column(nullable = false)
    private String metricName;

    private String aggregation;

    @Column(nullable = false)
    private Integer windowSeconds;

    @Column(nullable = false)
    private Double threshold;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private Severity severity;

    @Column(nullable = false)
    private boolean enabled;

    @Column(nullable = false,columnDefinition = "BOOLEAN DEFAULT true")
    private boolean isDefault;
    
}
