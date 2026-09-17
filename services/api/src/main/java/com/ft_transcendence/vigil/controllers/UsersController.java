package com.ft_transcendence.vigil.controllers;

import com.ft_transcendence.vigil.Services.UsersService;
import com.ft_transcendence.vigil.domain.dtos.users.UsersGetAndPostResponseDto;
import com.ft_transcendence.vigil.domain.dtos.users.UsersPatchIdDto;
import com.ft_transcendence.vigil.domain.dtos.users.UsersPatchMeDto;
import com.ft_transcendence.vigil.domain.dtos.users.UsersPostDto;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@RequestMapping("api/users")
public class UsersController {
    private final UsersService usersService;
    @PreAuthorize("hasRole('admin')")
    @GetMapping("")
    ResponseEntity<List<UsersGetAndPostResponseDto> > getUsers()
    {
        List<UsersGetAndPostResponseDto> users = usersService.usersGetService();
        return ResponseEntity.status(HttpStatus.OK).body(users);
    }
    @PreAuthorize("hasRole('admin')")
    @PostMapping("")
    ResponseEntity<UsersGetAndPostResponseDto> createUser(@RequestBody @Valid UsersPostDto usersPostDto)
    {
        UsersGetAndPostResponseDto user = usersService.usersPostService(usersPostDto);
        return ResponseEntity.status(HttpStatus.CREATED).body(user);
    }
    @PreAuthorize("hasAnyRole('admin', 'viewer')")
    @GetMapping("/me")
    ResponseEntity<UsersGetAndPostResponseDto> getMe()
    {
        UsersGetAndPostResponseDto user = usersService.usersMeService();
        return ResponseEntity.status(HttpStatus.OK).body(user);
    }
    @PreAuthorize("hasAnyRole('admin', 'viewer')")
    @PatchMapping("/me")
    ResponseEntity<UsersGetAndPostResponseDto> patchMe(@RequestBody @Valid UsersPatchMeDto usersPatchMeDto)
    {
        UsersGetAndPostResponseDto user = usersService.usersPatchMeService(usersPatchMeDto);
        return ResponseEntity.status(HttpStatus.OK).body(user);
    }
    @PreAuthorize("hasRole('admin')")
    @PatchMapping("/{id}")
    ResponseEntity<UsersGetAndPostResponseDto> patchId(@PathVariable UUID id,@RequestBody @Valid UsersPatchIdDto usersPatchIdDto)
    {
        UsersGetAndPostResponseDto user = usersService.usersPatchIdService(id,usersPatchIdDto);
        return ResponseEntity.status(HttpStatus.OK).body(user);
    }
    @PreAuthorize("hasRole('admin')")
    @DeleteMapping("/{id}")
    ResponseEntity<Void> deleteId(@PathVariable UUID id)
    {
        usersService.usersDeleteIdService(id);
        return ResponseEntity.status(HttpStatus.NO_CONTENT).body(null);
    }


}
