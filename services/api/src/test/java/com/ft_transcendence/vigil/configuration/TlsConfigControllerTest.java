package com.ft_transcendence.vigil.configuration;

import com.ft_transcendence.vigil.controllers.TlsConfigController;
import com.ft_transcendence.vigil.exceptions.GlobalExceptionsHandler;
import com.ft_transcendence.vigil.ratelimiter.RateLimiter;
import com.ft_transcendence.vigil.ratelimiter.RateLimiterRegistry;
import com.ft_transcendence.vigil.security.JjwtAuthFilter;
import com.ft_transcendence.vigil.security.JjwtService;
import com.ft_transcendence.vigil.services.TlsConfigService;
import com.ft_transcendence.vigil.services.TlsTestSupport.UnixStub;
import com.ft_transcendence.vigil.services.UserDetailsServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;

import static com.ft_transcendence.vigil.services.TlsTestSupport.CA;
import static org.hamcrest.Matchers.*;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = TlsConfigController.class, properties = {
        "spring.jackson.property-naming-strategy=SNAKE_CASE",
        "spring.jackson.deserialization.fail-on-unknown-properties=true"
})
@Import({SecurityConfig.class, JjwtAuthFilter.class, RateLimiter.class,
        TlsConfigService.class, GlobalExceptionsHandler.class})
class TlsConfigControllerTest {
    @TempDir static Path temporary;
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @MockitoBean JjwtService jwt;
    @MockitoBean UserDetailsServiceImpl users;
    @MockitoBean VigilProperties properties;
    @MockitoBean RateLimiterRegistry limits;

    @DynamicPropertySource
    static void paths(DynamicPropertyRegistry registry) {
        registry.add("vigil.tls-control-socket", () -> temporary.resolve("control.sock").toString());
        registry.add("vigil.tls-ca-path", () -> temporary.resolve("root.crt").toString());
    }

    @BeforeEach
    void clearCa() throws Exception {
        Files.deleteIfExists(temporary.resolve("root.crt"));
    }

    @Test
    void bothEndpointsRequireAuthentication() throws Exception {
        mvc.perform(post("/api/config/tls/addresses").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"address\":\"https://example.test\"}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/config/tls/ca")).andExpect(status().isUnauthorized());
    }

    @Test
    void viewersCannotConfigureOrReadCa() throws Exception {
        mvc.perform(post("/api/config/tls/addresses").with(user("viewer").roles("viewer"))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"address\":\"https://example.test\"}"))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/config/tls/ca").with(user("viewer").roles("viewer")))
                .andExpect(status().isForbidden());
    }

    @ParameterizedTest
    @ValueSource(ints = {200, 409})
    void adminGetsVerifiedFrontendSchemaIncludingVerifiedConflict(int httpStatus) throws Exception {
        String response = mapper.writeValueAsString(Map.of("http_status", httpStatus, "body", Map.of(
                "address", "https://example.test:8443", "configured", true, "status", "verified",
                "tls_mode", "local", "otlp_endpoint", "https://example.test:8443",
                "ca_download_url", "/api/config/tls/ca"))) + "\n";
        try (var stub = new UnixStub(temporary.resolve("control.sock"), response)) {
            mvc.perform(post("/api/config/tls/addresses").with(user("admin").roles("admin"))
                            .contentType(MediaType.APPLICATION_JSON).content("{\"address\":\"https://example.test:8443\"}"))
                    .andExpect(status().is(httpStatus))
                    .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                    .andExpect(header().string("Cache-Control", "no-store"))
                    .andExpect(jsonPath("$.address").value("https://example.test:8443"))
                    .andExpect(jsonPath("$.configured").value(true))
                    .andExpect(jsonPath("$.status").value("verified"))
                    .andExpect(jsonPath("$.tls_mode").value("local"))
                    .andExpect(jsonPath("$.otlp_endpoint").value("https://example.test:8443"))
                    .andExpect(jsonPath("$.ca_download_url").value("/api/config/tls/ca"))
                    .andExpect(jsonPath("$.tlsMode").doesNotExist());
        }
    }

    @Test
    void pendingHasRetryThreeAndNoTlsMode() throws Exception {
        try (var stub = new UnixStub(temporary.resolve("control.sock"),
                "{\"http_status\":202,\"body\":{\"address\":\"https://example.test\","
                        + "\"configured\":false,\"status\":\"pending\",\"retry_after_seconds\":3,\"code\":\"CERT_PENDING\"}}\n")) {
            mvc.perform(post("/api/config/tls/addresses").with(user("admin").roles("admin"))
                            .contentType(MediaType.APPLICATION_JSON).content("{\"address\":\"https://example.test\"}"))
                    .andExpect(status().isAccepted())
                    .andExpect(jsonPath("$.configured").value(false))
                    .andExpect(jsonPath("$.status").value("pending"))
                    .andExpect(jsonPath("$.retry_after_seconds").value(3))
                    .andExpect(jsonPath("$.code").value("CERT_PENDING"))
                    .andExpect(jsonPath("$.tls_mode").doesNotExist());
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"{}", "{\"address\":null}", "{\"address\":\"\"}", "{\"address\":\"   \"}",
            "{", "[]", "{\"address\":{}}", "{\"address\":\"https://example.test\",\"extra\":true}"})
    void malformedOrInvalidInputIs400(String body) throws Exception {
        mvc.perform(post("/api/config/tls/addresses").with(user("admin").roles("admin"))
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("invalid request"));
    }

    @Test
    void addressOver512CharactersIs400() throws Exception {
        mvc.perform(post("/api/config/tls/addresses").with(user("admin").roles("admin"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of("address", "x".repeat(513)))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void helperOriginValidationIsReturnedAsSafe400() throws Exception {
        try (var stub = new UnixStub(temporary.resolve("control.sock"),
                "{\"http_status\":400,\"body\":{\"message\":\"private diagnostic\"}}\n")) {
            mvc.perform(post("/api/config/tls/addresses").with(user("admin").roles("admin"))
                            .contentType(MediaType.APPLICATION_JSON).content("{\"address\":\"http://example.test/path\"}"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message", containsString("HTTPS origin")))
                    .andExpect(content().string(not(containsString("private diagnostic"))));
        }
    }

    @Test
    void invalidHelperReplyIsSafe503() throws Exception {
        try (var stub = new UnixStub(temporary.resolve("control.sock"), "{\"http_status\":302,\"body\":{}}\n")) {
            mvc.perform(post("/api/config/tls/addresses").with(user("admin").roles("admin"))
                            .contentType(MediaType.APPLICATION_JSON).content("{\"address\":\"https://example.test\"}"))
                    .andExpect(status().isServiceUnavailable())
                    .andExpect(jsonPath("$.message", containsString("helper")))
                    .andExpect(content().string(not(containsString(temporary.toString()))));
        }
    }

    @Test
    void adminDownloadsPublicPemWithSafeHeaders() throws Exception {
        Files.writeString(temporary.resolve("root.crt"), CA);
        mvc.perform(get("/api/config/tls/ca").with(user("admin").roles("admin")))
                .andExpect(status().isOk())
                .andExpect(content().contentType("application/x-pem-file"))
                .andExpect(header().string("Content-Disposition", "attachment; filename=\"vigil-ca.crt\""))
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(content().string(CA));
    }

    @Test
    void missingOrPrivateCaReturnsJson503NeverPem() throws Exception {
        for (boolean privateFile : new boolean[]{false, true}) {
            if (privateFile) {
                Files.writeString(temporary.resolve("root.crt"), CA
                        + "-----BEGIN PRIVATE KEY-----\nYWJj\n-----END PRIVATE KEY-----\n");
            }
            mvc.perform(get("/api/config/tls/ca").with(user("admin").roles("admin")))
                    .andExpect(status().isServiceUnavailable())
                    .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                    .andExpect(header().string("Cache-Control", "no-store"))
                    .andExpect(header().doesNotExist("Content-Disposition"))
                    .andExpect(jsonPath("$.message", containsString("public CA")))
                    .andExpect(content().string(not(containsString("PRIVATE KEY"))));
        }
    }
}
