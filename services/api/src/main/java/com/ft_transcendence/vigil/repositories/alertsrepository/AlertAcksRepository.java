package com.ft_transcendence.vigil.repositories.alertsrepository;

import com.ft_transcendence.vigil.domain.entities.Alerts.AlertAcks;
import com.ft_transcendence.vigil.domain.entities.Alerts.AlertAcksId;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AlertAcksRepository extends JpaRepository<AlertAcks, AlertAcksId> {

}
