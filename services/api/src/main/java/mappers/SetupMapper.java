package mappers;

import domain.dtos.SetupDto;
import domain.entities.User;
import org.mapstruct.InheritInverseConfiguration;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
@Mapper(componentModel = "spring")
public interface SetupMapper {

        @Mapping(target = "passwordHash", source = "password")
        User map(SetupDto setupDto);
        @InheritInverseConfiguration
        SetupDto map(User user);

}
