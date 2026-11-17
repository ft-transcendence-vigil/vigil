package com.ft_transcendence.vigil.services;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.core.env.SystemEnvironmentPropertySource;
import org.springframework.test.util.ReflectionTestUtils;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.PropertyNamingStrategies;
import tools.jackson.databind.json.JsonMapper;

import java.io.ByteArrayInputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.cert.CertificateFactory;
import java.security.cert.X509Certificate;
import java.time.Duration;
import java.util.Map;
import java.util.stream.Stream;

import static com.ft_transcendence.vigil.services.TlsTestSupport.*;
import static org.junit.jupiter.api.Assertions.*;

@Timeout(15)
class TlsConfigServiceTest {
    @TempDir Path temporary;
    private final ObjectMapper mapper = JsonMapper.builder()
            .propertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE).build();

    private TlsConfigService service() {
        return new TlsConfigService(mapper, temporary.resolve("control.sock").toString(),
                temporary.resolve("root.crt").toString());
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void valuePropertiesSupportDefaultsAndDeploymentEnvironmentNames(boolean overrides) {
        try (var context = new AnnotationConfigApplicationContext()) {
            if (overrides) {
                context.getEnvironment().getPropertySources().addFirst(new SystemEnvironmentPropertySource(
                        "tls-test-env", Map.of("VIGIL_TLS_CONTROL_SOCKET", "/test/control.sock",
                        "VIGIL_TLS_CA_PATH", "/test/public.crt")));
            }
            context.registerBean(ObjectMapper.class, () -> mapper);
            context.register(TlsConfigService.class);
            context.refresh();
            TlsConfigService service = context.getBean(TlsConfigService.class);
            assertEquals(Path.of(overrides ? "/test/control.sock" : "/run/vigil-tls/control.sock"),
                    ReflectionTestUtils.getField(service, "socketPath"));
            assertEquals(Path.of(overrides ? "/test/public.crt" : "/etc/vigil/ca/root.crt"),
                    ReflectionTestUtils.getField(service, "caPath"));
        }
    }

    private static String verified(int status) {
        return "{\"http_status\":" + status + ",\"body\":{\"address\":\"https://example.test\","
                + "\"configured\":true,\"status\":\"verified\",\"tls_mode\":\"local\","
                + "\"otlp_endpoint\":\"https://example.test\",\"ca_download_url\":\"/api/config/tls/ca\"}}\n";
    }

    @ParameterizedTest
    @ValueSource(ints = {200, 409})
    void sendsOneDelimitedConfigureRequestAndReturnsVerifiedWithoutWaitingForEof(int status) throws Exception {
        try (var stub = new UnixStub(temporary.resolve("control.sock"), (peer, request) -> {
            var json = mapper.readTree(request);
            assertEquals(2, json.size());
            assertEquals("configure", json.path("operation").asString());
            assertEquals("https://example.test", json.path("address").asString());
            for (String fragment : new String[]{verified(status).substring(0, 20), verified(status).substring(20)}) {
                UnixStub.write(peer, fragment);
            }
            UnixStub.assertClientClosed(peer);
        })) {
            var result = service().configure("https://example.test");
            assertEquals(status, result.httpStatus());
            assertEquals("verified", result.body().get("status"));
            assertEquals("local", result.body().get("tls_mode"));
            assertEquals("/api/config/tls/ca", result.body().get("ca_download_url"));
        }
    }

    @Test
    void pendingReturnsImmediatelyAndDoesNotExposeUnknownFieldsOrMessages() throws Exception {
        String response = "{\"http_status\":202,\"body\":{\"address\":\"https://example.test\","
                + "\"configured\":false,\"status\":\"pending\",\"retry_after_seconds\":3,"
                + "\"code\":\"CERT_PENDING\",\"message\":\"/private/secret\",\"internal\":\"secret\"}}\n";
        try (var stub = new UnixStub(temporary.resolve("control.sock"), (peer, request) -> {
            UnixStub.write(peer, response);
            UnixStub.assertClientClosed(peer);
        })) {
            var result = service().configure("https://example.test");
            assertEquals(202, result.httpStatus());
            assertEquals(3, result.body().get("retry_after_seconds"));
            assertFalse(result.body().containsKey("tls_mode"));
            assertFalse(result.body().containsKey("message"));
            assertFalse(result.body().containsKey("internal"));
        }
    }

    @Test
    void publicVerifiedMayHaveNullCaUrl() throws Exception {
        try (var stub = new UnixStub(temporary.resolve("control.sock"), verified(200)
                .replace("\"local\"", "\"public\"").replace("\"/api/config/tls/ca\"", "null"))) {
            var result = service().configure("https://example.test");
            assertEquals(200, result.httpStatus());
            assertEquals("public", result.body().get("tls_mode"));
            assertNull(result.body().get("ca_download_url"));
        }
    }

    @Test
    void supportsIpv6OriginAndOtlpPath() throws Exception {
        String response = verified(200).replace("https://example.test", "https://[::1]:8443")
                .replace("\"otlp_endpoint\":\"https://[::1]:8443\"", "\"otlp_endpoint\":\"https://[::1]:8443/otlp\"");
        try (var stub = new UnixStub(temporary.resolve("control.sock"), response)) {
            var result = service().configure("https://[::1]:8443");
            assertEquals(200, result.httpStatus());
            assertEquals("https://[::1]:8443/otlp", result.body().get("otlp_endpoint"));
        }
    }

    @ParameterizedTest
    @ValueSource(ints = {400, 503})
    void helperErrorsKeepAllowedStatusButNeverEchoHelperDiagnostics(int status) throws Exception {
        try (var stub = new UnixStub(temporary.resolve("control.sock"),
                "{\"http_status\":" + status + ",\"body\":{\"message\":\"/private/key: stack trace\"}}\n")) {
            var result = service().configure("https://example.test");
            assertEquals(status, result.httpStatus());
            assertFalse(result.body().toString().contains("/private"));
            assertTrue(result.body().get("message").toString().length() > 20);
        }
    }

    static Stream<String> invalidReplies() {
        return Stream.of("not-json\n", "\n", "[]\n", "null\n", "{}\n",
                "{\"http_status\":201,\"body\":{}}\n",
                "{\"http_status\":500,\"body\":{}}\n",
                "{\"http_status\":4294967496,\"body\":{}}\n",
                "{\"http_status\":200.0,\"body\":{}}\n",
                "{\"http_status\":\"200\",\"body\":{}}\n",
                "{\"http_status\":503,\"body\":{}}\n",
                "{\"http_status\":200,\"body\":[]}\n",
                verified(200).replace("\"tls_mode\":\"local\",", ""),
                verified(200).replace("\"local\"", "\"unknown\""),
                verified(200).replace("\"verified\"", "\"pending\""),
                verified(200).replace("\"configured\":true", "\"configured\":\"true\""),
                verified(409).replace("\"configured\":true", "\"configured\":false"),
                verified(200).replace("/api/config/tls/ca", "https://evil.test/ca"),
                verified(200).replace("https://example.test", "/private/secret"),
                verified(200).replace("https://example.test", "http://example.test"),
                verified(200).replace("https://example.test", "https://user:password@example.test"),
                verified(200).replace("https://example.test", "https://example.test:99999"),
                verified(200).replace("\"otlp_endpoint\":\"https://example.test\"", "\"otlp_endpoint\":42"),
                verified(200).stripTrailing() + " {}\n",
                verified(200).stripTrailing(),
                "{\"http_status\":202,\"body\":{\"address\":\"https://example.test\","
                        + "\"configured\":false,\"status\":\"pending\",\"tls_mode\":\"local\",\"retry_after_seconds\":3}}\n",
                "{\"http_status\":202,\"body\":{\"address\":\"https://example.test\","
                        + "\"configured\":false,\"status\":\"pending\",\"retry_after_seconds\":4}}\n");
    }

    @ParameterizedTest
    @MethodSource("invalidReplies")
    void rejectsMalformedUnframedOrContractViolatingResponses(String response) throws Exception {
        try (var stub = new UnixStub(temporary.resolve("control.sock"), response)) {
            assertSafeUnavailable(service().configure("https://example.test"));
        }
    }

    @Test
    void rejectsResponseOver64KiB() throws Exception {
        try (var stub = new UnixStub(temporary.resolve("control.sock"), " ".repeat(64 * 1024 + 1) + "\n")) {
            assertSafeUnavailable(service().configure("https://example.test"));
        }
    }

    @Test
    void acceptsCompleteFrameAt64KiBBoundary() throws Exception {
        String reply = verified(200).stripTrailing();
        try (var stub = new UnixStub(temporary.resolve("control.sock"),
                reply + " ".repeat(64 * 1024 - reply.length() - 1) + "\n")) {
            assertEquals(200, service().configure("https://example.test").httpStatus());
        }
    }

    @Test
    void missingSocketAndOversizedRequestsFailSafely() {
        assertSafeUnavailable(service().configure("https://example.test"));
        assertSafeUnavailable(service().configure("x".repeat(4096)));
    }

    @Test
    void timeoutBoundsEntireSlowDripResponseAndClosesConnection() throws Exception {
        try (var stub = new UnixStub(temporary.resolve("control.sock"), (peer, request) -> {
            UnixStub.write(peer, "{\"http_status\":");
            for (int i = 0; i < 5; i++) {
                Thread.sleep(900);
                UnixStub.write(peer, " ");
            }
            UnixStub.assertClientClosed(peer);
        })) {
            long start = System.nanoTime();
            assertSafeUnavailable(service().configure("https://example.test"));
            Duration elapsed = Duration.ofNanos(System.nanoTime() - start);
            assertTrue(elapsed.compareTo(Duration.ofMillis(7500)) >= 0, elapsed.toString());
            assertTrue(elapsed.compareTo(Duration.ofSeconds(10)) < 0, elapsed.toString());
        }
    }

    @Test
    void interruptedRequestDoesNotSpinOrClearInterrupt() {
        Thread.currentThread().interrupt();
        try {
            assertSafeUnavailable(service().configure("https://example.test"));
            assertTrue(Thread.currentThread().isInterrupted());
        } finally {
            Thread.interrupted();
        }
    }

    private static void assertSafeUnavailable(TlsConfigService.ProtocolResult result) {
        assertEquals(503, result.httpStatus());
        assertEquals(1, result.body().size());
        String message = result.body().get("message").toString();
        assertTrue(message.contains("helper"));
        assertTrue(message.contains("retry"));
        assertFalse(message.contains("/"));
        assertFalse(message.contains("Exception"));
    }

    @Test
    void downloadsOnlyParsedCaCertificatesAndCanonicalizesPem() throws Exception {
        Files.writeString(temporary.resolve("root.crt"), " \n" + CA.replace("\n", "\r\n") + "\n" + CA);
        byte[] pem = service().publicCa();
        assertEquals(CA + CA, new String(pem, java.nio.charset.StandardCharsets.US_ASCII));
        var certificates = CertificateFactory.getInstance("X.509").generateCertificates(new ByteArrayInputStream(pem));
        assertEquals(2, certificates.size());
        certificates.forEach(certificate -> assertTrue(((X509Certificate) certificate).getBasicConstraints() >= 0));
        assertFalse(new String(pem, java.nio.charset.StandardCharsets.US_ASCII).contains("PRIVATE KEY"));
    }

    static Stream<String> invalidCaFiles() {
        return Stream.of("", "garbage", LEAF, CA + LEAF, "junk\n" + CA, CA + "junk",
                CA.replace("MIIDET", "!IIDET"),
                "-----BEGIN CERTIFICATE-----\nYWJj\n-----END CERTIFICATE-----\n",
                CA + "-----BEGIN PRIVATE KEY-----\nYWJj\n-----END PRIVATE KEY-----\n",
                "-----BEGIN RSA PRIVATE KEY-----\nYWJj\n-----END RSA PRIVATE KEY-----\n" + CA,
                CA + "-----BEGIN PUBLIC KEY-----\nYWJj\n-----END PUBLIC KEY-----\n",
                " ".repeat(64 * 1024 + 1));
    }

    @ParameterizedTest
    @MethodSource("invalidCaFiles")
    void refusesMalformedNonCaOversizedOrMixedPrivateContent(String content) throws Exception {
        Files.writeString(temporary.resolve("root.crt"), content);
        assertCaUnavailable();
    }

    @Test
    void missingCaFileFailsSafely() {
        assertCaUnavailable();
    }

    private void assertCaUnavailable() {
        var ex = assertThrows(TlsConfigService.UnavailableException.class, () -> service().publicCa());
        assertFalse(ex.getMessage().contains(temporary.toString()));
        assertFalse(ex.getMessage().contains("PRIVATE KEY"));
        assertTrue(ex.getMessage().contains("provisioned"));
        assertNull(ex.getCause());
    }
}
