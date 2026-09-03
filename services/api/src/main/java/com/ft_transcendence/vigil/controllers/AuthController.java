package com.ft_transcendence.vigil.controllers;

import com.ft_transcendence.vigil.Services.AuthService;
import com.ft_transcendence.vigil.domain.dtos.LoginDto;
import com.ft_transcendence.vigil.domain.dtos.SetupDto;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public record AuthResponse(String role, String accessToken) {}

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





















    @PostMapping("/login")

    ResponseEntity<AuthResponse> loginController(@Valid LoginDto loginDto,HttpServletRequest request)
    {
        AuthService.AuthResult authResult = authService.loginService(loginDto,request);
        ResponseCookie responseCookie = ResponseCookie
                .from("refresh_token",authResult.rawRefreshToken())
                .secure(true)
                .httpOnly(true)
                .maxAge(Duration.ofDays(30))
                .sameSite("strict")
                .path("/api/auth")
                .build();
        return ResponseEntity.status(HttpStatus.OK)
        .body(new AuthResponse(authResult.role(),authResult.accessToken()));
    }
}
