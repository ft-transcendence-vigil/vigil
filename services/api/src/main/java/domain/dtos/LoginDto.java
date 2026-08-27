package domain.dtos;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class LoginDto {
    @NotBlank(message="email can't be empty")
    @Email(message="you must enter a valid email")
    private String email;
    @NotBlank(message="password canno't be empty")
    private String password;
}
