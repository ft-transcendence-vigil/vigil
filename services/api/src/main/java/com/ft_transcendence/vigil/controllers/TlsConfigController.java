package com.ft_transcendence.vigil.controllers;

import com.ft_transcendence.vigil.services.TlsConfigService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/config/tls")
public class TlsConfigController {
    private final TlsConfigService service;

    public record ConfigureAddressRequest(@NotBlank @Size(max = 512) String address) {}

    @PostMapping("/addresses")
    @PreAuthorize("hasRole('admin')")
    public ResponseEntity<Map<String, Object>> configure(@Valid @RequestBody ConfigureAddressRequest request) {
        var result = service.configure(request.address());
        return ResponseEntity.status(result.httpStatus()).cacheControl(CacheControl.noStore()).body(result.body());
    }

    @GetMapping("/ca")
    @PreAuthorize("hasRole('admin')")
    public ResponseEntity<byte[]> ca() {
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("application/x-pem-file"))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename("vigil-ca.crt").build().toString())
                .cacheControl(CacheControl.noStore())
                .body(service.publicCa());
    }

    @ExceptionHandler(TlsConfigService.UnavailableException.class)
    public ResponseEntity<Map<String, String>> unavailable(TlsConfigService.UnavailableException ex) {
        return ResponseEntity.status(503).cacheControl(CacheControl.noStore()).body(Map.of("message", ex.getMessage()));
    }
}
