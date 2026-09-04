package com.ft_transcendence.vigil.domain.dtos.users;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UsersPatchIdDto {
    @Email(message = "you must enter a valid email")
    private String email;
    @Pattern(regexp = "^(admin|viewer)$", message = "role must be either 'admin' or 'viewer'")
    private String role;
    @Pattern(
            regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@#$%^&+=!]).{8,}$",
            message = "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character, and be at least 8 characters long"
    )
    private String password;
}
