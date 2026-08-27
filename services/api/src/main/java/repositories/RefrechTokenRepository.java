package repositories;

import domain.entities.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface RefrechTokenRepository extends JpaRepository<RefreshToken, UUID> {
}
