package repositories;

import domain.entities.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Component;

import java.util.UUID;
@Component
public interface RefrechTokenRepository extends JpaRepository<RefreshToken, UUID> {
}
