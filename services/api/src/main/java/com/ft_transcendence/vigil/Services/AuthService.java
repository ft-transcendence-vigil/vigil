package com.ft_transcendence.vigil.Services;
import com.ft_transcendence.vigil.Security.JjwtService;
import com.ft_transcendence.vigil.domain.dtos.LoginDto;
import com.ft_transcendence.vigil.domain.dtos.SessionDto;
import com.ft_transcendence.vigil.domain.dtos.SetupDto;
import com.ft_transcendence.vigil.domain.entities.RefreshToken;
import com.ft_transcendence.vigil.domain.entities.Session;
import com.ft_transcendence.vigil.domain.entities.User;
import com.ft_transcendence.vigil.domain.entities.UserPrincipal;
import com.ft_transcendence.vigil.exceptions.DuplicatedResourcesException;
import com.ft_transcendence.vigil.exceptions.ResourcesNotFoundException;
import com.ft_transcendence.vigil.exceptions.UnauthorizedException;
import com.ft_transcendence.vigil.mappers.SessionMapper;
import com.ft_transcendence.vigil.mappers.SetupMapper;
import com.ft_transcendence.vigil.repositories.RefreshTokenRepository;
import com.ft_transcendence.vigil.repositories.SessionRepository;
import com.ft_transcendence.vigil.repositories.UserRepository;
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
    public record AuthResult(String accessToken, String rawRefreshToken, String role) {}
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
                .expiresAt(Instant.now().plusMillis(jjwtService.getRefrechTokenExpiration()))
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
        user.setRole("admin");
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
    public void logoutService(String rawRefreshToken){
        if (rawRefreshToken == null)
            throw new UnauthorizedException("invalid Refresh Token");
        String hashedRefreshToken = jjwtService.hashRefreshToken(rawRefreshToken);
        RefreshToken refreshToken = refreshTokenRepository.findByTokenHash(hashedRefreshToken).orElseThrow(()->new ResourcesNotFoundException("Invalid Refresh Token"));
        refreshToken.getSession().setRevoked(true);
        refreshToken.setRevoked(true);
    }


}
