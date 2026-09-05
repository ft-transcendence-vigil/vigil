package com.ft_transcendence.vigil.domain.entities;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Getter
@Setter
@Builder
@Entity
@Table(name = "webhooks")
@NoArgsConstructor
@AllArgsConstructor
public class Webhook {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(unique = true, nullable = false)
    private String url;
}
