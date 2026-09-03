package com.ft_transcendence.vigil.Services;

import com.ft_transcendence.vigil.Security.JjwtService;
import com.ft_transcendence.vigil.domain.dtos.SetupDto;
import com.ft_transcendence.vigil.domain.entities.RefreshToken;
import com.ft_transcendence.vigil.domain.entities.Session;
import com.ft_transcendence.vigil.domain.entities.User;
import com.ft_transcendence.vigil.domain.entities.UserPrincipal;
import com.ft_transcendence.vigil.exceptions.DuplicatedResourcesException;
import com.ft_transcendence.vigil.mappers.SetupMapper;
import com.ft_transcendence.vigil.repositories.RefrechTokenRepository;
import com.ft_transcendence.vigil.repositories.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@RequiredArgsConstructor
@Service


public class AuthService {
    public record AuthResult(String accessToken, String rawRefreshToken, String role) {}

    private final PasswordEncoder passwordEncoder;
    private final JjwtService jjwtService;
    private final SetupMapper setupMapper;
    private final UserRepository userRepository;
    private final RefrechTokenRepository refrechTokenRepository;

    // I create a session and refresh token and return the string of  refresh token
    public String createSessionAndRefreshToken(User user, HttpServletRequest request)
    {
        String raw = jjwtService.generateRefreshToken();

        Session session = Session.builder()
                .userAgent(request.getHeader("user-agent"))
                .ipAddress(request.getRemoteAddr())
                .user(user)
                .build();
        RefreshToken refreshToken = RefreshToken.builder()
                .tokenHash(jjwtService.hashRefreshToken(raw))
                .user(user)
                .session(session)
                .expiresAt(Instant.now().plusMillis(jjwtService.getRefrechTokenExpiration()))
                .build();
        session.setRefreshTokens(List.of(refreshToken));
        user.setSessions(List.of(session));
        user.setRefreshTokens(List.of(refreshToken));

        return raw;
    }

    @Transactional
    public AuthResult handleSetup(SetupDto setupDto, HttpServletRequest request)
    {
        if (userRepository.count() > 0)
        {
            throw new DuplicatedResourcesException("setup already completed");
        }
        User user = setupMapper.map(setupDto);
        user.setPasswordHash(passwordEncoder.encode(setupDto.getPassword()));
        user.setRole("admin");
        String rawRefreshToken = createSessionAndRefreshToken(user, request);
        userRepository.save(user);
        String accessToken = jjwtService.generateToken(new UserPrincipal(user));
        return new AuthResult(accessToken, rawRefreshToken, user.getRole());
    }
}
