package com.ft_transcendence.vigil.repositories.alertsrepository;

import com.ft_transcendence.vigil.domain.entities.Alerts.AlertHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface AlertHistoryRepository extends JpaRepository<AlertHistory, UUID> {
    @Query("SELECT a from AlertHistory a WHERE (:before is null or  a.triggeredAt < :before) AND (:service is null or a.service = :service) AND (:after is null or a.triggeredAt > :after) Order By a.triggeredAt desc limit :count")
    List<AlertHistory> findAlertHistoriesByAggregation(@Param("after") Instant after, @Param("service") String service, @Param("count") Integer count, @Param("before") Instant before);

}