package com.ft_transcendence.vigil.controllers;

import com.ft_transcendence.vigil.services.AuthService;
import com.ft_transcendence.vigil.domain.dtos.auth.LoginDto;
import com.ft_transcendence.vigil.domain.dtos.auth.SessionDto;
import com.ft_transcendence.vigil.domain.dtos.auth.SetupDto;
import com.ft_transcendence.vigil.domain.entities.Role;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public record AuthResponse(Role role, String accessToken) {}
    public record RefreshResponse(String accessToken) {}
    public record SessionsResponse(List<SessionDto> sessions) {}

    private static final String REFRESH_COOKIE = "refresh_token";

    @PostMapping("/setup")
    public ResponseEntity<AuthResponse> setup(@Valid @RequestBody SetupDto setupDto,
                                              HttpServletRequest request) {
        AuthService.AuthResult result = authService.handleSetup(setupDto, request);

        ResponseCookie refreshCookie = ResponseCookie.from("refresh_token", result.rawRefreshToken())
                .httpOnly(true)
                .secure(true)
                .sameSite("Strict")
                .path("/api/auth")
                .maxAge(Duration.ofDays(30))
                .build();

        return ResponseEntity.status(HttpStatus.CREATED)
                .header(HttpHeaders.SET_COOKIE, refreshCookie.toString())
                .body(new AuthResponse(result.role(), result.accessToken()));
    }

    @PostMapping("/refresh")
    public ResponseEntity<RefreshResponse> refresh(
            @CookieValue(name = REFRESH_COOKIE, required = false) String rawRefreshToken) {

        AuthService.RefreshResult result = authService.refreshService(rawRefreshToken);

        ResponseCookie refreshCookie = ResponseCookie.from(REFRESH_COOKIE, result.rawRefreshToken())
                .httpOnly(true)
                .secure(true)
                .sameSite("Strict")
                .path("/api/auth")
                .maxAge(Duration.ofDays(30))
                .build();

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, refreshCookie.toString())
                .body(new RefreshResponse(result.accessToken()));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @CookieValue(name = REFRESH_COOKIE, required = false) String rawRefreshToken) {

        authService.logoutService(rawRefreshToken);

        ResponseCookie cleared = ResponseCookie.from(REFRESH_COOKIE, "")
                .httpOnly(true)
                .secure(true)
                .sameSite("Strict")
                .path("/api/auth")
                .maxAge(0)
                .build();

        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, cleared.toString())
                .build();
    }

    @DeleteMapping("/sessions/{id}")
    public ResponseEntity<Void> revokeSession(
            @PathVariable("id") UUID id,
            @CookieValue(name = REFRESH_COOKIE, required = false) String rawRefreshToken) {

        boolean revokedSelf = authService.revokeSessionService(id, rawRefreshToken);

        ResponseEntity.HeadersBuilder<?> response = ResponseEntity.noContent();
        if (revokedSelf) {
            ResponseCookie cleared = ResponseCookie.from(REFRESH_COOKIE, "")
                    .httpOnly(true)
                    .secure(true)
                    .sameSite("Strict")
                    .path("/api/auth")
                    .maxAge(0)
                    .build();
            response = response.header(HttpHeaders.SET_COOKIE, cleared.toString());
        }
        return response.build();
    }

    @GetMapping("/sessions")
    public ResponseEntity<SessionsResponse> sessions(
            @CookieValue(name = REFRESH_COOKIE, required = false) String rawRefreshToken) {

        List<SessionDto> sessions = authService.sessionsService(rawRefreshToken);
        return ResponseEntity.ok(new SessionsResponse(sessions));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> loginController(@Valid @RequestBody LoginDto loginDto, HttpServletRequest request)
    {
        AuthService.AuthResult authResult = authService.loginService(loginDto, request);
        ResponseCookie responseCookie = ResponseCookie
                .from(REFRESH_COOKIE, authResult.rawRefreshToken())
                .secure(true)
                .httpOnly(true)
                .maxAge(Duration.ofDays(30))
                .sameSite("Strict")
                .path("/api/auth")
                .build();
        return ResponseEntity.status(HttpStatus.OK)
                .header(HttpHeaders.SET_COOKIE, responseCookie.toString())
                .body(new AuthResponse(authResult.role(), authResult.accessToken()));
    }
}
