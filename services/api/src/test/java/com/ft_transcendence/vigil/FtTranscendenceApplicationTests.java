package com.ft_transcendence.vigil;

import java.nio.file.Path;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

@SpringBootTest
@ActiveProfiles("test")
class FtTranscendenceApplicationTests {

    @TempDir
    static Path temporary;

    @DynamicPropertySource
    static void apiKeyFile(DynamicPropertyRegistry registry) {
        registry.add("vigil.api-key-file", () -> temporary.resolve("credentials/api-key").toString());
    }

    @Test
    void contextLoads() {
    }

}
