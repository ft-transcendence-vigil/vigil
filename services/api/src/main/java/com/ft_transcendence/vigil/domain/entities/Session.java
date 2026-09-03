package com.ft_transcendence.vigil.domain.entities;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

import java.util.List;
import java.util.UUID;
@Builder
@Getter
@Setter
@Entity(name="sessions")
@Table(name = "sessions")
@NoArgsConstructor
@AllArgsConstructor
public class Session {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_agent")
    private String userAgent;

    @Column(name = "ip_address")
    private String ipAddress;

    @UpdateTimestamp
    @Column(name = "last_used_at", nullable = false,columnDefinition = "TIMESTAMPTZ default now()")
    private Instant lastUsedAt;

    @Column(nullable = false, columnDefinition = "boolean default false")
    private boolean revoked = false;

    @ManyToOne(optional = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @OneToMany(mappedBy = "session", cascade = {CascadeType.PERSIST,CascadeType.MERGE,CascadeType.REMOVE} ,orphanRemoval = true)
    private List<RefreshToken> refreshTokens;

}
