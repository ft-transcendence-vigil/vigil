package mappers;

import domain.dtos.LoginDto;
import domain.entities.User;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
@Mapper(componentModel = "spring")
public interface LoginMapper extends StandardMapper<User, LoginDto> {
    @Mapping(target = "password", source = "passwordHash")
    LoginDto map(User user);
    @Mapping(target = "passwordHash", source = "password")
    User map(LoginDto loginDto);
}