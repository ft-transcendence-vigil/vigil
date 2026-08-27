package domain.entities;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;

import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import java.time.Instant;
import java.util.UUID;
@Getter
@Setter
@Entity(name = "refresh_tokens")
@Table(name = "refresh_tokens")
public class RefreshToken {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "token_hash", unique = true)
    @NotBlank
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

    @ManyToOne
    @OnDelete(action = OnDeleteAction.CASCADE)
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne
    @OnDelete(action = OnDeleteAction.CASCADE)
    @JoinColumn(name = "session_id")
    private Session session;


}
