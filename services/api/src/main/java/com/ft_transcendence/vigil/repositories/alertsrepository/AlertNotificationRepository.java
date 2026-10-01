package com.ft_transcendence.vigil.repositories.alertsrepository;

import com.ft_transcendence.vigil.domain.entities.Alerts.AlertNotification;
import com.ft_transcendence.vigil.domain.entities.Alerts.AlertNotificationId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface AlertNotificationRepository extends JpaRepository<AlertNotification, AlertNotificationId> {
    public AlertNotification findByUser_IdAndAlertHistory_Id(UUID UserId,UUID alertHistoryId);

    @Query(value = """
                Select an.* from alert_notification as an 
                inner join alert_history as ah on ah.id = an.alert_history_id 
                where an.user_id = :userId 
                And 
                (:before is null or ah.triggered_at < :before)  Order by ah.triggered_at Desc limit :count;"""
                , nativeQuery = true)

    public List<AlertNotification> findNotificationByTimeAndCount(@Param("before") Instant before, @Param("count") int count,@Param("userId") UUID userId);
}
