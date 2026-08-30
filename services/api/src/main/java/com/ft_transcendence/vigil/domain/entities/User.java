package com.ft_transcendence.vigil.domain.entities;
import jakarta.persistence.*;
// import jakarta.validation.constraints.Email;      //old code — input validation moved to DTOs
// import jakarta.validation.constraints.NotBlank;   //old code — input validation moved to DTOs
import lombok.Getter;
import lombok.Setter;
import java.util.List;
import java.util.UUID;
@Getter
@Setter
@Entity(name="users")
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(unique = true,nullable = false)
    private String email;

    @Column(name = "password_hash",nullable = false)
    private String passwordHash;

    @Column(nullable = false)
    private String role;

    @OneToMany(mappedBy = "user", cascade = {CascadeType.PERSIST,CascadeType.MERGE,CascadeType.REMOVE} ,orphanRemoval = true)
    private List<Session> sessions;

    @OneToMany(mappedBy = "user", cascade = {CascadeType.PERSIST,CascadeType.MERGE,CascadeType.REMOVE} ,orphanRemoval = true)
    private List<RefreshToken> refreshTokens;
}
