package com.ft_transcendence.vigil.exceptions;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ResourcesNotFoundException extends RuntimeException{
    public ResourcesNotFoundException(String message)
    {
        super(message);
    }
}
