package com.ft_transcendence.vigil.services;

import com.ft_transcendence.vigil.domain.dtos.auth.SetupDto;
import com.ft_transcendence.vigil.domain.entities.Role;
import com.ft_transcendence.vigil.domain.entities.UserPrincipal;
import com.ft_transcendence.vigil.domain.entities.UsersAuth.User;
import com.ft_transcendence.vigil.exceptions.DuplicatedResourcesException;
import com.ft_transcendence.vigil.mappers.SetupMapper;
import com.ft_transcendence.vigil.repositories.UsersAuth.UserRepository;
import com.ft_transcendence.vigil.security.JjwtService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SetupService {
    private final UserRepository userRepository;
    private final SetupMapper setupMapper;
    private final BCryptPasswordEncoder passwordEncoder;
    private final AuthService authService;
    private final JjwtService jjwtService;


    public boolean getSetupHandler()
    {
        return userRepository.countByRole(Role.ADMIN) == 0;
    }
    @Transactional
    // add the first admin and also create the api user
    public AuthService.AuthResult handleSetup(SetupDto setupDto, HttpServletRequest request)
    {
        if (userRepository.count() > 0)
        {
            throw new DuplicatedResourcesException("setup already completed");
        }
        User user = setupMapper.map(setupDto);
        user.setPasswordHash(passwordEncoder.encode(setupDto.getPassword()));
        user.setRole(Role.ADMIN);
        User apiUser = User.builder()
                .email("mustbe@api.email")
                .passwordHash(passwordEncoder.encode(UUID.randomUUID().toString()))
                .role(Role.ADMIN)
                .build();
        userRepository.save(user);
        userRepository.save(apiUser);
        String rawRefreshToken = authService.createSessionAndRefreshToken(user, request);
        String accessToken = jjwtService.generateToken(new UserPrincipal(user));
        return new AuthService.AuthResult(accessToken, rawRefreshToken, user.getRole());
    }
}
