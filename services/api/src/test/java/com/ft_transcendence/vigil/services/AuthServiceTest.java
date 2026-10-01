package com.ft_transcendence.vigil.services;

import com.ft_transcendence.vigil.domain.dtos.auth.SetupDto;
import com.ft_transcendence.vigil.domain.entities.Role;
import com.ft_transcendence.vigil.domain.entities.UserPrincipal;
import com.ft_transcendence.vigil.domain.entities.UsersAuth.RefreshToken;
import com.ft_transcendence.vigil.domain.entities.UsersAuth.Session;
import com.ft_transcendence.vigil.domain.entities.UsersAuth.User;
import com.ft_transcendence.vigil.exceptions.DuplicatedResourcesException;
import com.ft_transcendence.vigil.exceptions.ForbiddenException;
import com.ft_transcendence.vigil.exceptions.UnauthorizedException;
import com.ft_transcendence.vigil.mappers.SessionMapper;
import com.ft_transcendence.vigil.mappers.SetupMapper;
import com.ft_transcendence.vigil.repositories.UsersAuth.RefreshTokenRepository;
import com.ft_transcendence.vigil.repositories.UsersAuth.SessionRepository;
import com.ft_transcendence.vigil.repositories.UsersAuth.UserRepository;
import com.ft_transcendence.vigil.security.JjwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class AuthServiceTest {
    private final AuthenticationManager authenticationManager = mock(AuthenticationManager.class);
    private final PasswordEncoder encoder = mock(PasswordEncoder.class);
    private final JjwtService jwt = mock(JjwtService.class);
    private final SetupMapper setupMapper = mock(SetupMapper.class);
    private final UserRepository users = mock(UserRepository.class);
    private final RefreshTokenRepository tokens = mock(RefreshTokenRepository.class);
    private final SessionRepository sessions = mock(SessionRepository.class);
    private final SessionMapper sessionMapper = mock(SessionMapper.class);
    private AuthService service;

    @BeforeEach
    void setUp() {
        service = new AuthService(authenticationManager, encoder, jwt, setupMapper, users, tokens, sessions, sessionMapper);
    }

    @Test
    void setupCannotCreateAnotherInitialAdministrator() {
        when(users.count()).thenReturn(1L);
        SetupService setupService = new SetupService(users, setupMapper,
                mock(BCryptPasswordEncoder.class), service, jwt);

        assertThatThrownBy(() -> setupService.handleSetup(new SetupDto(), mock(jakarta.servlet.http.HttpServletRequest.class)))
                .isInstanceOf(DuplicatedResourcesException.class);
        verify(users, never()).save(any());
    }

    @Test
    void missingRefreshTokenIsRejectedBeforeRepositoryAccess() {
        assertThatThrownBy(() -> service.refreshService(null)).isInstanceOf(UnauthorizedException.class);
        assertThatThrownBy(() -> service.logoutService(null)).isInstanceOf(UnauthorizedException.class);
        verifyNoInteractions(tokens);
    }

    @Test
    void refreshRotatesTokenWithinCurrentSession() {
        User user = user();
        Session session = Session.builder().id(UUID.randomUUID()).user(user).build();
        RefreshToken original = RefreshToken.builder()
                .user(user).session(session).expiresAt(Instant.now().plusSeconds(3600)).build();
        when(jwt.hashRefreshToken("old")).thenReturn("old-hash");
        when(jwt.hashRefreshToken("new")).thenReturn("new-hash");
        when(jwt.generateRefreshToken()).thenReturn("new");
        when(jwt.getRefreshTokenExpiration()).thenReturn(3600000L);
        when(jwt.generateToken(any(UserPrincipal.class))).thenReturn("access");
        when(tokens.findByTokenHash("old-hash")).thenReturn(Optional.of(original));

        AuthService.RefreshResult result = service.refreshService("old");

        assertThat(result.accessToken()).isEqualTo("access");
        assertThat(result.rawRefreshToken()).isEqualTo("new");
        assertThat(original.isSuperseded()).isTrue();
        verify(tokens).save(argThat(rotated ->
                rotated.getUser() == user && rotated.getSession() == session
                        && "new-hash".equals(rotated.getTokenHash())));
        assertThat(session.getLastUsedAt()).isNotNull();
    }

    @Test
    void replayedRefreshTokenRevokesEverySessionAndToken() {
        User user = user();
        Session first = Session.builder().id(UUID.randomUUID()).user(user).build();
        Session second = Session.builder().id(UUID.randomUUID()).user(user).build();
        RefreshToken replayed = RefreshToken.builder().user(user).session(first).superseded(true).build();
        RefreshToken other = RefreshToken.builder().user(user).session(second).build();
        when(sessions.findByUser(user)).thenReturn(List.of(first, second));
        when(tokens.findBySession(first)).thenReturn(List.of(replayed));
        when(tokens.findBySession(second)).thenReturn(List.of(other));
        when(jwt.hashRefreshToken("replayed")).thenReturn("hash");
        when(tokens.findByTokenHash("hash")).thenReturn(Optional.of(replayed));

        assertThatThrownBy(() -> service.refreshService("replayed")).isInstanceOf(UnauthorizedException.class);

        assertThat(first.isRevoked()).isTrue();
        assertThat(second.isRevoked()).isTrue();
        assertThat(replayed.isRevoked()).isTrue();
        assertThat(other.isRevoked()).isTrue();
        verify(tokens, never()).save(any());
    }

    @Test
    void cannotRevokeAnotherUsersSession() {
        User caller = user();
        User owner = user();
        Session callerSession = Session.builder().id(UUID.randomUUID()).user(caller).build();
        Session target = Session.builder().id(UUID.randomUUID()).user(owner).build();
        RefreshToken token = RefreshToken.builder().user(caller).session(callerSession).build();
        when(jwt.hashRefreshToken("raw")).thenReturn("hash");
        when(tokens.findByTokenHash("hash")).thenReturn(Optional.of(token));
        when(sessions.findById(target.getId())).thenReturn(Optional.of(target));

        assertThatThrownBy(() -> service.revokeSessionService(target.getId(), "raw"))
                .isInstanceOf(ForbiddenException.class);
        assertThat(target.isRevoked()).isFalse();
    }

    @Test
    void revokingCurrentSessionRevokesItsRefreshTokens() {
        User user = user();
        Session session = Session.builder().id(UUID.randomUUID()).user(user).build();
        RefreshToken token = RefreshToken.builder().user(user).session(session).build();
        when(jwt.hashRefreshToken("raw")).thenReturn("hash");
        when(tokens.findByTokenHash("hash")).thenReturn(Optional.of(token));
        when(tokens.findBySession(session)).thenReturn(List.of(token));
        when(sessions.findById(session.getId())).thenReturn(Optional.of(session));

        assertThat(service.revokeSessionService(session.getId(), "raw")).isTrue();
        assertThat(session.isRevoked()).isTrue();
        assertThat(token.isRevoked()).isTrue();
    }

    private User user() {
        return User.builder().id(UUID.randomUUID()).email("user@example.com").role(Role.ADMIN).build();
    }
}
