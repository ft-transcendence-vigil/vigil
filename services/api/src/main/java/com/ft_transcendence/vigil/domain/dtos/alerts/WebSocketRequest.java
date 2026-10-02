package com.ft_transcendence.vigil.domain.dtos.alerts;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.ft_transcendence.vigil.domain.entities.Alerts.Status;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class WebSocketRequest{

        private String type;
        @JsonInclude(JsonInclude.Include.NON_NULL)
        private UUID alert_id;
        @JsonInclude(JsonInclude.Include.NON_NULL)
        private Status status;
        @JsonInclude(JsonInclude.Include.NON_NULL)
        private Boolean seen;

}