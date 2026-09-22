package com.ft_transcendence.vigil.domain.entities.Alerts;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "alert_history")
@Getter
@Setter
public class AlertHistory {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne()
    @OnDelete(action = OnDeleteAction.SET_NULL)
    private AlertRules rule;

    @Column(nullable = false)
    private String service;

    @Column(nullable = false,columnDefinition = "TIMESTAMPTZ DEFAULT now()")
    private Instant triggeredAt;

    @Column(nullable = false)
    private String metricName;

    @Enumerated(EnumType.STRING)
    private SignalType signalType;

    private Integer windowSeconds;

    private String aggregation;

    @Column(nullable = false)
    private Double threshold;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private Severity severity;

    private String llmAnalysis;

}
