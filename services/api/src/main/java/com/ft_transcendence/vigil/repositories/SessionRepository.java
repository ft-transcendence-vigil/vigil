package com.ft_transcendence.vigil.repositories;

import com.ft_transcendence.vigil.domain.entities.Session;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Component;

import java.util.UUID;
@Component
public interface SessionRepository extends JpaRepository<Session, UUID> {
}
