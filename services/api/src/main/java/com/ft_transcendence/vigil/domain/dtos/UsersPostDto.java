package com.ft_transcendence.vigil.domain.dtos;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UsersPostDto {
    @NotBlank(message="email can't be empty")
    @Email(message = "you must enter a valid email")
    private String email;
    @Pattern(regexp = "^(admin|viewer)$", message = "role must be either 'admin' or 'viewer'")
    @NotBlank(message="role cannot be empty")
    private String role;
    @Pattern(
            regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@#$%^&+=!]).{8,}$",
            message = "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character, and be at least 8 characters long"
    )
    @NotBlank(message="password cannot be empty")
    private String password;}
