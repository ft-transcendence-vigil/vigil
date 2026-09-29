package com.ft_transcendence.vigil.repositories.UsersAuth;

import com.ft_transcendence.vigil.domain.entities.UsersAuth.RefreshToken;
import com.ft_transcendence.vigil.domain.entities.UsersAuth.Session;
import com.ft_transcendence.vigil.exceptions.ResourcesNotFoundException;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Component;

import java.sql.Ref;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
@Component
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {
    public Optional<RefreshToken> findByTokenHash(String tokenHash) throws ResourcesNotFoundException;
    public List<RefreshToken> findBySession(Session session);
}
