package com.ft_transcendence.vigil.domain.entities;

import jakarta.persistence.*;
// import jakarta.validation.constraints.NotBlank;   //old code — input validation moved to DTOs

import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import java.time.Instant;
import java.util.UUID;
@Getter
@Setter
@Builder
@Entity(name = "refresh_tokens")
@Table(name = "refresh_tokens")
@NoArgsConstructor
@AllArgsConstructor
public class RefreshToken {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "token_hash", unique = true, nullable = false)
    private String tokenHash;

    @CreationTimestamp
    @Column(name = "issued_at",columnDefinition = "TIMESTAMPTZ default now()",nullable = false)
    private Instant issuedAt;

    @Column(name = "expires_at",nullable = false,columnDefinition = "TIMESTAMPTZ")
    private Instant expiresAt;

    @Column(nullable = false, columnDefinition = "boolean default false")
    private boolean superseded = false;

    @Column(nullable = false, columnDefinition = "boolean default false")
    private boolean revoked = false;

    @ManyToOne(optional = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(optional = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @JoinColumn(name = "session_id", nullable = false)
    private Session session;


}
