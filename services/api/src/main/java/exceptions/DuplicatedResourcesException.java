package exceptions;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class DuplicatedResourcesException extends RuntimeException{
    DuplicatedResourcesException(String message)
    {
        super(message);
    }
}
