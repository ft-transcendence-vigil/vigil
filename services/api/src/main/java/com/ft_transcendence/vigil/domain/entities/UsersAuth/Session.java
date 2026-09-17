package com.ft_transcendence.vigil.domain.entities.UsersAuth;

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
@Entity()
@Table(name = "sessions")
@NoArgsConstructor
@AllArgsConstructor
public class Session {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private String userAgent;

    private String ipAddress;

    @UpdateTimestamp
    @Column(nullable = false,columnDefinition = "TIMESTAMPTZ default now()")
    private Instant lastUsedAt;

    @Column(nullable = false, columnDefinition = "boolean default false")
    private boolean revoked = false;

    @ManyToOne()
    @OnDelete(action = OnDeleteAction.CASCADE)
    @JoinColumn(nullable = false)
    private User user;

    @OneToMany(mappedBy = "session", cascade = {CascadeType.PERSIST,CascadeType.MERGE,CascadeType.REMOVE} ,orphanRemoval = true)
    private List<RefreshToken> refreshTokens;

}
