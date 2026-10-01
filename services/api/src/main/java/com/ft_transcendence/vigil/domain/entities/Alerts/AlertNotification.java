package com.ft_transcendence.vigil.domain.entities.Alerts;


import com.ft_transcendence.vigil.domain.entities.UsersAuth.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.Instant;
@Getter
@Setter
@NoArgsConstructor
@Entity()
public class AlertNotification {
    @EmbeddedId()
    private AlertNotificationId alertNotificationId;



    @ManyToOne(optional = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @JoinColumn(nullable = false)
    @MapsId("userId")
    private User user;

    @ManyToOne(optional = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @JoinColumn(nullable = false)
    @MapsId("alertHistoryId")
    private AlertHistory alertHistory;

    @Column(columnDefinition = "boolean default false")
    private boolean seen;
    @Column(columnDefinition = "TIMESTAMPZ DEFAULT NOW()")
    private Instant seenAt;
    @PreUpdate()
    private void updateSeenAt()
    {
        seenAt = Instant.now();
    }

}
