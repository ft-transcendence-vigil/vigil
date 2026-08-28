package mappers;

import domain.dtos.RegisterDto;
import domain.entities.User;
import org.mapstruct.InheritInverseConfiguration;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface RegisterMapper {
    @Mapping(target = "passwordHash", source = "password")
    User map(RegisterDto registerDto);
    @InheritInverseConfiguration
    RegisterDto map(User user);
}
