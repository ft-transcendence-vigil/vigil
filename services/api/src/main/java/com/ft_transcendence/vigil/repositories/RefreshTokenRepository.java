package com.ft_transcendence.vigil.repositories;

import com.ft_transcendence.vigil.domain.entities.RefreshToken;
import com.ft_transcendence.vigil.exceptions.ResourcesNotFoundException;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.UUID;
@Component
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {
    public Optional<RefreshToken> findByTokenHash(String tokenHash) throws ResourcesNotFoundException;
}
