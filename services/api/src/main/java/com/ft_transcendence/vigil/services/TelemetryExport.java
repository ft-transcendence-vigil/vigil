package com.ft_transcendence.vigil.services;

import java.util.function.Consumer;

@FunctionalInterface
public interface TelemetryExport<T> {
    void forEachRow(Consumer<T> consumer);
}
