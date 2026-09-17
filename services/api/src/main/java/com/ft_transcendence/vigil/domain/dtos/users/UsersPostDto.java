package com.ft_transcendence.vigil.domain.dtos.users;

import com.ft_transcendence.vigil.domain.entities.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UsersPostDto {
    @NotBlank(message="email can't be empty")
    @Email(message = "you must enter a valid email")
    private String email;
    @NotNull(message="role cannot be empty")
    private Role role;
    @Pattern(
            regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@#$%^&+=!]).{8,}$",
            message = "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character, and be at least 8 characters long"
    )
    @NotBlank(message="password cannot be empty")
    private String password;
}
