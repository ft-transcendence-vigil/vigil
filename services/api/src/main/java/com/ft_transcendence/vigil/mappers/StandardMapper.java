package com.ft_transcendence.vigil.mappers;

import org.mapstruct.MappingTarget;

public interface StandardMapper<From, To> {
    To map(From from);
    To update(From from, @MappingTarget To to);
}