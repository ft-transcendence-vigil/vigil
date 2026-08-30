package com.ft_transcendence.vigil.repositories;

import com.ft_transcendence.vigil.domain.entities.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.UUID;
@Component
public interface UserRepository extends JpaRepository<User, UUID> {
    public Optional<User> findByEmail(String email) throws UsernameNotFoundException;
}
