package com.ft_transcendence.vigil.domain.dtos;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SetupDto {
    @Email(message="you must enter a valid email")
    @NotBlank(message="email can't be empty")
    private String email;
    @NotBlank(message="password can't be empty")
    @Pattern(
            regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@#$%^&+=!]).{8,}$",
            message = "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character, and be at least 8 characters long"
    )
    private String password;
}
