package com.ft_transcendence.vigil.services;
import com.ft_transcendence.vigil.security.JjwtService;
import com.ft_transcendence.vigil.domain.dtos.auth.LoginDto;
import com.ft_transcendence.vigil.domain.dtos.auth.SessionDto;
import com.ft_transcendence.vigil.domain.dtos.auth.SetupDto;
import com.ft_transcendence.vigil.domain.entities.Role;
import com.ft_transcendence.vigil.domain.entities.UsersAuth.RefreshToken;
import com.ft_transcendence.vigil.domain.entities.UsersAuth.Session;
import com.ft_transcendence.vigil.domain.entities.UsersAuth.User;
import com.ft_transcendence.vigil.domain.entities.UserPrincipal;
import com.ft_transcendence.vigil.exceptions.DuplicatedResourcesException;
import com.ft_transcendence.vigil.exceptions.ForbiddenException;
import com.ft_transcendence.vigil.exceptions.ResourcesNotFoundException;
import com.ft_transcendence.vigil.exceptions.UnauthorizedException;
import com.ft_transcendence.vigil.mappers.SessionMapper;
import com.ft_transcendence.vigil.mappers.SetupMapper;
import com.ft_transcendence.vigil.repositories.UsersAuth.RefreshTokenRepository;
import com.ft_transcendence.vigil.repositories.UsersAuth.SessionRepository;
import com.ft_transcendence.vigil.repositories.UsersAuth.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import java.time.Instant;
import java.util.List;
import java.util.UUID;


@RequiredArgsConstructor
@Service


public class AuthService {
    public record AuthResult(String accessToken, String rawRefreshToken, Role role) {}
    private final AuthenticationManager authenticationManager;
    private final PasswordEncoder passwordEncoder;
    private final JjwtService jjwtService;
    private final SetupMapper setupMapper;
    private final UserRepository userRepository;
    public final RefreshTokenRepository refreshTokenRepository;
    private final SessionRepository sessionRepository;
    private final SessionMapper sessionMapper;
    // I create a session and refresh token and return the string of  refresh token
    private String createSessionAndRefreshToken(User user, HttpServletRequest request)
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
                .expiresAt(Instant.now().plusMillis(jjwtService.getRefreshTokenExpiration()))
                .build();

        sessionRepository.save(session);
        refreshTokenRepository.save(refreshToken);
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
        user.setRole(Role.ADMIN);
        userRepository.save(user);
        String rawRefreshToken = createSessionAndRefreshToken(user, request);
        String accessToken = jjwtService.generateToken(new UserPrincipal(user));
        return new AuthResult(accessToken, rawRefreshToken, user.getRole());
    }

    @Transactional
    public AuthResult loginService(LoginDto loginDto, HttpServletRequest request){
        Authentication authentication = authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(loginDto.getEmail(),loginDto.getPassword()));
        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
        User user = userPrincipal.getUser();
        String rawRefreshToken = createSessionAndRefreshToken(user, request);
        String accessToken = jjwtService.generateToken(new UserPrincipal(user));
        return new AuthResult(accessToken, rawRefreshToken, user.getRole());
    }
    @Transactional
    public boolean revokeSessionService(UUID sessionId, String rawRefreshToken){
        if (rawRefreshToken == null)
            throw new UnauthorizedException("invalid Refresh Token");
        String hashedRefreshToken = jjwtService.hashRefreshToken(rawRefreshToken);
        RefreshToken callerToken = refreshTokenRepository.findByTokenHash(hashedRefreshToken).orElseThrow(() -> new UnauthorizedException("invalid Refresh Token"));
        Session target = sessionRepository.findById(sessionId).orElseThrow(() -> new ResourcesNotFoundException("session not found"));
        if (!target.getUser().getId().equals(callerToken.getUser().getId()))
            throw new ForbiddenException("forbidden");
        target.setRevoked(true);
        target.getRefreshTokens().forEach(rt -> rt.setRevoked(true));

        return target.getId().equals(callerToken.getSession().getId());
    }

    public record RefreshResult(String accessToken, String rawRefreshToken) {}

    @Transactional(dontRollbackOn = UnauthorizedException.class)
    public RefreshResult refreshService(String rawRefreshToken){
        if (rawRefreshToken == null)
            throw new UnauthorizedException("invalid Refresh Token");
        String hashedRefreshToken = jjwtService.hashRefreshToken(rawRefreshToken);
        RefreshToken rawHashToken = refreshTokenRepository.findByTokenHash(hashedRefreshToken)
                .orElseThrow(() -> new UnauthorizedException("invalid Refresh Token"));
        User user = rawHashToken.getUser();
        if (rawHashToken.isSuperseded()) {
            user.getSessions().forEach(s -> s.setRevoked(true));
            user.getRefreshTokens().forEach(t -> t.setRevoked(true));
            throw new UnauthorizedException("invalid Refresh Token");
        }
        if (rawHashToken.isRevoked() || rawHashToken.getExpiresAt().isBefore(Instant.now()))
            throw new UnauthorizedException("invalid Refresh Token");
        Session session = rawHashToken.getSession();
        if (session.isRevoked())
            throw new UnauthorizedException("invalid Refresh Token");
        rawHashToken.setSuperseded(true);
        String newRaw = jjwtService.generateRefreshToken();
        RefreshToken rotated = RefreshToken.builder()
                .tokenHash(jjwtService.hashRefreshToken(newRaw))
                .user(user)
                .session(session)
                .expiresAt(Instant.now().plusMillis(jjwtService.getRefreshTokenExpiration()))
                .build();
        refreshTokenRepository.save(rotated);
        session.setLastUsedAt(Instant.now());
        String accessToken = jjwtService.generateToken(new UserPrincipal(user));
        return new RefreshResult(accessToken, newRaw);
    }

    @Transactional
    public void logoutService(String rawRefreshToken){
        if (rawRefreshToken == null)
            throw new UnauthorizedException("invalid Refresh Token");
        String hashedRefreshToken = jjwtService.hashRefreshToken(rawRefreshToken);
        RefreshToken refreshToken = refreshTokenRepository.findByTokenHash(hashedRefreshToken)
                .orElseThrow(() -> new UnauthorizedException("invalid Refresh Token"));
        refreshToken.getSession().setRevoked(true);
        refreshToken.setRevoked(true);
    }
    @Transactional
    public List<SessionDto> sessionsService(String rawRefreshToken){
        if (rawRefreshToken == null)
            throw new UnauthorizedException("invalid Refresh Token");
        String hashedRefreshToken = jjwtService.hashRefreshToken(rawRefreshToken);
        RefreshToken refreshToken = refreshTokenRepository.findByTokenHash(hashedRefreshToken).orElseThrow(()->new UnauthorizedException("Invalid Refresh Token"));
        User user = refreshToken.getUser();
        UUID currentSessionId = refreshToken.getSession().getId();
        List<Session> sessions = sessionRepository.findByUserAndRevokedFalse(user);
        List<SessionDto> sessionsDtos = sessions.stream()
                .map(session -> {
                    SessionDto dto = sessionMapper.map(session);
                    dto.setCurrent(session.getId().equals(currentSessionId));
                    return dto;
                })
                .toList();
        return sessionsDtos;
    }

}
