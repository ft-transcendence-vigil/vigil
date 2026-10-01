package com.ft_transcendence.vigil.controllers;

import com.ft_transcendence.vigil.domain.dtos.alerts.*;
import com.ft_transcendence.vigil.domain.entities.Alerts.Status;
import com.ft_transcendence.vigil.services.AlertsService;
import jakarta.annotation.Nullable;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Null;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@Validated
@RequestMapping("/api/alerts")

public class AlertsController {
    private final AlertsService alertsService;

    @GetMapping("")
    @PreAuthorize("hasAnyRole('admin', 'viewer')")
    public ResponseEntity<PaginationResponse<AlertsGetResponseDto>> alertsGetController(@RequestParam(required = false) String period, @RequestParam(required = false) String service, @RequestParam(defaultValue = "20") @Min(1) @Max(100) Integer count, @RequestParam(required = false) String before)
    {
        PaginationResponse<AlertsGetResponseDto> response = alertsService.getAlertsService(count,period,service,before);
        return ResponseEntity.status(HttpStatus.OK).body(response);
    }

    @GetMapping("/rules")
    @PreAuthorize("hasAnyRole('admin', 'viewer')")
    public ResponseEntity<PaginationResponse<AlertRulesGetAndPatchResponseDto>> alertRulesgetController(@RequestParam(defaultValue = "20") @Min(1) @Max(100) Integer count, @RequestParam(required = false) @Min(0) Integer offset)
    {
        PaginationResponse<AlertRulesGetAndPatchResponseDto> response = alertsService.getAlertRulesService(count,offset);
        return ResponseEntity.status(HttpStatus.OK).body(response);
    }

    @PostMapping("/rules")
    @PreAuthorize("hasRole('admin')")
    public ResponseEntity<AlertRulesPostDtoResponse> alertRulesPostController(@Valid @RequestBody AlertRulesPostRequestDto dto) {
        AlertRulesPostDtoResponse response = alertsService.rulesPostService(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PatchMapping("/rules/{id}")
    @PreAuthorize("hasRole('admin')")
    public ResponseEntity<AlertRulesGetAndPatchResponseDto> alertRulesPatchController(@PathVariable UUID id, @Valid @RequestBody AlertRulesPatchRequestDto dto) {
        AlertRulesGetAndPatchResponseDto response = alertsService.alertRulesPatchService(id, dto);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/rules/{id}")
    @PreAuthorize("hasRole('admin')")
    public ResponseEntity<Void> alertRulesDeleteController(@PathVariable UUID id) {
        alertsService.alertRulesDeleteService(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('admin', 'viewer')")
    public ResponseEntity<AlertNotoficationResponsePutDto> notificationPutController(@PathVariable UUID id, @Valid @RequestBody AlertNotoficationRequestPutDto dto) {
        AlertNotoficationResponsePutDto response = alertsService.alertNotificationPutService(id, dto.isStatus());
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAnyRole('admin', 'viewer')")
    public ResponseEntity<AlertHistoryPatchResponseDto> alertHistoryPatchController(@PathVariable UUID id, @RequestParam(required = true) Status status) {
        AlertHistoryPatchResponseDto response = alertsService.alertHistoryPatchService(id, status);
        return ResponseEntity.ok(response);
    }
}