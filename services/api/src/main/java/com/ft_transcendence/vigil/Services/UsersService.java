package com.ft_transcendence.vigil.Services;

import com.ft_transcendence.vigil.domain.dtos.LoginDto;
import com.ft_transcendence.vigil.domain.dtos.UsersGetResponseDto;
import com.ft_transcendence.vigil.domain.dtos.UsersPatchIdDto;
import com.ft_transcendence.vigil.domain.dtos.UsersPatchMeDto;
import com.ft_transcendence.vigil.domain.entities.User;
import com.ft_transcendence.vigil.domain.entities.UserPrincipal;
import com.ft_transcendence.vigil.exceptions.DuplicatedResourcesException;
import com.ft_transcendence.vigil.exceptions.ResourcesNotFoundException;
import com.ft_transcendence.vigil.mappers.UsersGetResponseMapper;
import com.ft_transcendence.vigil.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@RequiredArgsConstructor
@Service
public class UsersService {
    private final UsersGetResponseMapper usersGetResponseMapper;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public List<UsersGetResponseDto> usersGetService() {
        return userRepository.findAll().stream().map(usersGetResponseMapper::map).toList();
    }

    //    public List<UsersGetResponseDto> usersPostService()
//    {
//
//    }
    public UsersGetResponseDto usersMeService() {
        //user cannot be null since we check it with JjwtAuthFilter before getting into the controller
        UserPrincipal userPrincipal = (UserPrincipal) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        User user = userPrincipal.getUser();
        return usersGetResponseMapper.map(user);
    }

    public UsersGetResponseDto usersPatchMeService(UsersPatchMeDto usersPatchMeDto) {
        //user cannot be null since we check it with JjwtAuthFilter before getting into the controller
        UserPrincipal userPrincipal = (UserPrincipal) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        User user = userPrincipal.getUser();
        // in case user added same email and wanted to change the password
        if (usersPatchMeDto.getEmail() != null && !usersPatchMeDto.getEmail().equals(user.getEmail()))
        {
            if (userRepository.findByEmail(usersPatchMeDto.getEmail()).isPresent())
            {
                throw new DuplicatedResourcesException("email already registered");
            }
            user.setEmail(usersPatchMeDto.getEmail());
        }
        if (usersPatchMeDto.getPassword() != null)
            user.setPasswordHash(passwordEncoder.encode( usersPatchMeDto.getPassword()));
        userRepository.save(user);
        return usersGetResponseMapper.map(user);
    }
    public UsersGetResponseDto usersPatchIdService(UUID id, UsersPatchIdDto usersPatchIdDto) {
        User user = userRepository.findById(id).orElseThrow(()->new ResourcesNotFoundException("user not found"));
        // in case user added same email and wanted to change the password
        if (usersPatchIdDto.getEmail() != null && !usersPatchIdDto.getEmail().equals(user.getEmail()))
        {
            if (userRepository.findByEmail(usersPatchIdDto.getEmail()).isPresent())
            {
                throw new DuplicatedResourcesException("email already registered");
            }
            user.setEmail(usersPatchIdDto.getEmail());
        }
        if (usersPatchIdDto.getPassword() != null)
            user.setPasswordHash(passwordEncoder.encode( usersPatchIdDto.getPassword()));
        if (usersPatchIdDto.getRole() != null)
            user.setRole(usersPatchIdDto.getRole());
        userRepository.save(user);
        return usersGetResponseMapper.map(user);
    }
    public void usersPatchIdService(UUID id) {
        User user = userRepository.findById(id).orElseThrow(()->new ResourcesNotFoundException("user not found"));
        userRepository.delete(user);
    }
}
