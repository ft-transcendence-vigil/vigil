package com.ft_transcendence.vigil.repositories.alertsrepository;
import com.ft_transcendence.vigil.domain.entities.Alerts.AlertRules;
import org.hibernate.annotations.processing.HQL;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.UUID;

public interface AlertRuleRepository extends JpaRepository<AlertRules, UUID> {
    @Query("Select a from AlertRules a where a.id >= :offset OrderBy a.id limit :count")
    List<AlertRules> getAlertRulesByCountAndOffset(@Param("count") int count,@Param("offset") UUID offset);
}
