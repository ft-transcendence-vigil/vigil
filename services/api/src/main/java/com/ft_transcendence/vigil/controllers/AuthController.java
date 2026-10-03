package com.ft_transcendence.vigil.controllers;

import com.ft_transcendence.vigil.services.AuthService;
import com.ft_transcendence.vigil.domain.dtos.auth.LoginDto;
import com.ft_transcendence.vigil.domain.dtos.auth.SessionDto;
import com.ft_transcendence.vigil.domain.entities.Role;
import com.ft_transcendence.vigil.exceptions.UnauthorizedException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
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

    public record AuthResponse(Role role, String accessToken) {
    }

    public record RefreshResponse(String accessToken) {
    }

    public record SessionsResponse(List<SessionDto> sessions) {
    }

    private ResponseCookie getSessionHint(String value)
    {
        ResponseCookie sessionHint = ResponseCookie.from("session_hint",value)
                .httpOnly(false)
                .secure(true)
                .sameSite("Strict")
                .maxAge(Duration.ofDays(30))
                .path("/")
                .build();
        return  sessionHint;
    }

    private void clearAuthCookies(HttpServletResponse response) {
        response.addHeader(HttpHeaders.SET_COOKIE, ResponseCookie.from("refresh_token", "")
                .httpOnly(true).secure(true).sameSite("Strict").path("/api/auth").maxAge(0)
                .build().toString());
        response.addHeader(HttpHeaders.SET_COOKIE, ResponseCookie.from("session_hint", "")
                .httpOnly(false).secure(true).sameSite("Strict").path("/").maxAge(0)
                .build().toString());
    }

    @PostMapping("/refresh")
    public ResponseEntity<RefreshResponse> refresh(
            @CookieValue(name = "refresh_token", required = false) String rawRefreshToken,
            HttpServletResponse response) {

        AuthService.RefreshResult result;
        try {
            result = authService.refreshService(rawRefreshToken);
        } catch (UnauthorizedException e) {
            clearAuthCookies(response);
            throw e;
        }

        ResponseCookie refreshCookie = ResponseCookie.from("refresh_token", result.rawRefreshToken())
                .httpOnly(true)
                .secure(true)
                .sameSite("Strict")
                .path("/api/auth")
                .maxAge(Duration.ofDays(30))
                .build();
        ResponseCookie sessionHint = getSessionHint("1");
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, refreshCookie.toString(), sessionHint.toString())
                .body(new RefreshResponse(result.accessToken()));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @CookieValue(name = "refresh_token", required = false) String rawRefreshToken,
            HttpServletResponse response) {

        try {
            authService.logoutService(rawRefreshToken);
        } catch (UnauthorizedException e) {
            clearAuthCookies(response);
            throw e;
        }

        ResponseCookie cleared = ResponseCookie.from("refresh_token", "")
                .httpOnly(true)
                .secure(true)
                .sameSite("Strict")
                .path("/api/auth")
                .maxAge(0)
                .build();
        ResponseCookie clearedHint = ResponseCookie.from("session_hint","")
                .httpOnly(false)
                .secure(true)
                .sameSite("Strict")
                .path("/")
                .maxAge(0)
                .build();
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, cleared.toString(),clearedHint.toString())
                .build();
    }

    @DeleteMapping("/sessions/{id}")
    public ResponseEntity<Void> revokeSession(
            @PathVariable("id") UUID id,
            @CookieValue(name = "refresh_token", required = false) String rawRefreshToken) {

        boolean revokedSelf = authService.revokeSessionService(id, rawRefreshToken);

        ResponseEntity.HeadersBuilder<?> response = ResponseEntity.noContent();
        if (revokedSelf) {
            ResponseCookie cleared = ResponseCookie.from("refresh_token", "")
                    .httpOnly(true)
                    .secure(true)
                    .sameSite("Strict")
                    .path("/api/auth")
                    .maxAge(0)
                    .build();
            ResponseCookie clearnedHint = ResponseCookie.from("session_hint","").
                    httpOnly(false)
                    .maxAge(0)
                    .path("/")
                    .sameSite("Strict")
                    .secure(true)
                    .build();
            response = response.header(HttpHeaders.SET_COOKIE, cleared.toString(),clearnedHint.toString());

        }
        return response.build();
    }

    @GetMapping("/sessions")
    public ResponseEntity<SessionsResponse> sessions(
            @CookieValue(name = "refresh_token", required = false) String rawRefreshToken) {

        List<SessionDto> sessions = authService.sessionsService(rawRefreshToken);
        return ResponseEntity.ok(new SessionsResponse(sessions));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> loginController(@Valid @RequestBody LoginDto loginDto, HttpServletRequest request) {
        AuthService.AuthResult authResult = authService.loginService(loginDto, request);
        ResponseCookie responseCookie = ResponseCookie
                .from("refresh_token", authResult.rawRefreshToken())
                .secure(true)
                .httpOnly(true)
                .maxAge(Duration.ofDays(30))
                .sameSite("Strict")
                .path("/api/auth")
                .build();
        ResponseCookie sessionHint = getSessionHint("1");
        return ResponseEntity.status(HttpStatus.OK)
                .header(HttpHeaders.SET_COOKIE, responseCookie.toString(),sessionHint.toString())
                .body(new AuthResponse(authResult.role(), authResult.accessToken()));
    }
}
