package com.ft_transcendence.vigil.domain.entities.Alerts;

import com.ft_transcendence.vigil.domain.entities.UsersAuth.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.io.Serializable;
import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "alert_acks")
public class AlertAcks {
    @EmbeddedId
    private AlertAcksId id;

    @ManyToOne()
    @OnDelete(action = OnDeleteAction.CASCADE)
    @MapsId("userId")
    private User user;

    @ManyToOne
    @OnDelete(action = OnDeleteAction.CASCADE)
    @MapsId("alertId")
    private AlertHistory alert;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status;
    @Column(nullable = false,columnDefinition = "TIMESTAMPTZ DEFAULT  now()")
    private Instant ackedAt;
    @PreUpdate
    void onUpdate()
    {
        this.ackedAt = Instant.now();
    }
}
