package com.ft_transcendence.vigil.controllers;

import com.ft_transcendence.vigil.domain.dtos.auth.SetupDto;
import com.ft_transcendence.vigil.services.AuthService;
import com.ft_transcendence.vigil.services.SetupService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api")
public class SetupController {
    private final SetupService setupService;
    @PostMapping("/setup")
    public ResponseEntity<AuthController.AuthResponse> setup(@Valid @RequestBody SetupDto setupDto,
                                                             HttpServletRequest request) {
        AuthService.AuthResult result = setupService.handleSetup(setupDto, request);

        ResponseCookie refreshCookie = ResponseCookie.from("refresh_token", result.rawRefreshToken())
                .httpOnly(true)
                .secure(true)
                .sameSite("Strict")
                .path("/api/auth")
                .maxAge(Duration.ofDays(30))
                .build();
        ResponseCookie sessionHint = ResponseCookie.from("session_hint", "1")
                .httpOnly(false)
                .secure(true)
                .sameSite("Strict")
                .path("/")
                .maxAge(Duration.ofDays(30))
                .build();

        return ResponseEntity.status(HttpStatus.CREATED)
                .header(HttpHeaders.SET_COOKIE, refreshCookie.toString(), sessionHint.toString())
                .body(new AuthController.AuthResponse(result.role(), result.accessToken()));
    }
    @GetMapping("/setup")
    public ResponseEntity<Boolean> getSetupHandler()
    {
        Boolean setupRequired = setupService.getSetupHandler();
        return ResponseEntity.status(HttpStatus.OK).body(setupRequired);
    }

}
