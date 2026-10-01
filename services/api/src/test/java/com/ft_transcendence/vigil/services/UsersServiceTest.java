package com.ft_transcendence.vigil.services;

import com.ft_transcendence.vigil.domain.dtos.users.UsersPatchIdDto;
import com.ft_transcendence.vigil.domain.dtos.users.UsersPostDto;
import com.ft_transcendence.vigil.domain.entities.Role;
import com.ft_transcendence.vigil.domain.entities.UsersAuth.User;
import com.ft_transcendence.vigil.exceptions.DuplicatedResourcesException;
import com.ft_transcendence.vigil.exceptions.ResourcesNotFoundException;
import com.ft_transcendence.vigil.mappers.UsersGetResponseMapper;
import com.ft_transcendence.vigil.repositories.UsersAuth.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class UsersServiceTest {
    private UserRepository users;
    private PasswordEncoder encoder;
    private UsersService service;

    @BeforeEach
    void setUp() {
        users = mock(UserRepository.class);
        encoder = mock(PasswordEncoder.class);
        service = new UsersService(mock(UsersGetResponseMapper.class), users, encoder);
    }

    @Test
    void duplicateEmailIsRejectedBeforeEncodingOrSaving() {
        UsersPostDto request = request("taken@example.com", Role.VIEWER);
        when(users.findByEmail(request.getEmail())).thenReturn(Optional.of(new User()));

        assertThatThrownBy(() -> service.usersPostService(request)).isInstanceOf(DuplicatedResourcesException.class);
        verifyNoInteractions(encoder);
        verify(users, never()).save(any());
    }

    @Test
    void newUsersAreSavedWithEncodedPasswordAndRequestedRole() {
        UsersPostDto request = request("new@example.com", Role.VIEWER);
        when(users.findByEmail(request.getEmail())).thenReturn(Optional.empty());
        when(encoder.encode("Cleartext1!")).thenReturn("encoded");

        service.usersPostService(request);

        verify(users).save(argThat(user ->
                "new@example.com".equals(user.getEmail())
                        && "encoded".equals(user.getPasswordHash())
                        && user.getRole() == Role.VIEWER));
    }

    @Test
    void lastAdministratorCannotBeDemoted() {
        User admin = user(Role.ADMIN);
        UsersPatchIdDto request = new UsersPatchIdDto();
        request.setRole(Role.VIEWER);
        when(users.findById(admin.getId())).thenReturn(Optional.of(admin));
        when(users.countByRole(Role.ADMIN)).thenReturn(1);

        assertThatThrownBy(() -> service.usersPatchIdService(admin.getId(), request))
                .isInstanceOf(DuplicatedResourcesException.class);
        assertThat(admin.getRole()).isEqualTo(Role.ADMIN);
        verify(users, never()).save(any());
    }

    @Test
    void lastAdministratorCannotBeDeleted() {
        User admin = user(Role.ADMIN);
        when(users.findById(admin.getId())).thenReturn(Optional.of(admin));
        when(users.countByRole(Role.ADMIN)).thenReturn(1);

        assertThatThrownBy(() -> service.usersDeleteIdService(admin.getId()))
                .isInstanceOf(DuplicatedResourcesException.class);
        verify(users, never()).delete(any());
    }

    @Test
    void administratorCanBeDemotedWhenAnotherRemains() {
        User admin = user(Role.ADMIN);
        UsersPatchIdDto request = new UsersPatchIdDto();
        request.setRole(Role.VIEWER);
        when(users.findById(admin.getId())).thenReturn(Optional.of(admin));
        when(users.countByRole(Role.ADMIN)).thenReturn(2);

        service.usersPatchIdService(admin.getId(), request);

        assertThat(admin.getRole()).isEqualTo(Role.VIEWER);
        verify(users).save(admin);
    }

    @Test
    void changingEmailToAnotherUsersAddressIsRejected() {
        User user = user(Role.VIEWER);
        UsersPatchIdDto request = new UsersPatchIdDto();
        request.setEmail("taken@example.com");
        when(users.findById(user.getId())).thenReturn(Optional.of(user));
        when(users.findByEmail("taken@example.com")).thenReturn(Optional.of(new User()));

        assertThatThrownBy(() -> service.usersPatchIdService(user.getId(), request))
                .isInstanceOf(DuplicatedResourcesException.class);
        verify(users, never()).save(any());
    }

    @Test
    void missingUserCannotBeDeleted() {
        UUID id = UUID.randomUUID();
        when(users.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.usersDeleteIdService(id)).isInstanceOf(ResourcesNotFoundException.class);
        verify(users, never()).delete(any());
    }

    private UsersPostDto request(String email, Role role) {
        UsersPostDto request = new UsersPostDto();
        request.setEmail(email);
        request.setRole(role);
        request.setPassword("Cleartext1!");
        return request;
    }

    private User user(Role role) {
        return User.builder().id(UUID.randomUUID()).email("owner@example.com").role(role).build();
    }
}
