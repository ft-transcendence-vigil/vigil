package com.ft_transcendence.vigil.domain.entities;

import com.fasterxml.jackson.annotation.JsonValue;

public enum Role {
    ADMIN("admin"),
    VIEWER("viewer");

    private final String value;

    Role(String value) {
        this.value = value;
    }
    @JsonValue
    public String getValue() {
        return value;
    }
}
