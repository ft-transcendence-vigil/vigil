package com.ft_transcendence.vigil.services;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InterruptedIOException;
import java.net.StandardProtocolFamily;
import java.net.URI;
import java.net.UnixDomainSocketAddress;
import java.nio.ByteBuffer;
import java.nio.channels.SelectionKey;
import java.nio.channels.Selector;
import java.nio.channels.SocketChannel;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.cert.CertificateFactory;
import java.security.cert.X509Certificate;
import java.time.Duration;
import java.util.Arrays;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

@Service
public class TlsConfigService {
    private static final int MAX_REQUEST_BYTES = 4096;
    private static final int MAX_RESPONSE_BYTES = 64 * 1024;
    private static final int MAX_CA_BYTES = 64 * 1024;
    private static final Duration TIMEOUT = Duration.ofSeconds(8);
    private static final Set<Integer> ALLOWED_STATUSES = Set.of(200, 202, 409, 400, 503);
    private static final Pattern CERTIFICATE = Pattern.compile(
            "-----BEGIN CERTIFICATE-----\\s*([A-Za-z0-9+/=\\r\\n\\t ]+)\\s*-----END CERTIFICATE-----");
    private static final String HELPER_UNAVAILABLE =
            "TLS configuration is unavailable. Check that the TLS control helper is running and accessible, then retry.";
    private static final String CA_UNAVAILABLE =
            "The public TLS CA certificate is unavailable. Check that the public CA certificate is provisioned, then retry.";

    private final ObjectMapper mapper;
    private final Path socketPath;
    private final Path caPath;

    public TlsConfigService(ObjectMapper mapper,
                            @Value("${vigil.tls-control-socket:/run/vigil-tls/control.sock}") String socketPath,
                            @Value("${vigil.tls-ca-path:/etc/vigil/ca/root.crt}") String caPath) {
        this.mapper = mapper;
        this.socketPath = Path.of(socketPath);
        this.caPath = Path.of(caPath);
    }

    public record ProtocolResult(int httpStatus, Map<String, Object> body) {}

    public static class UnavailableException extends RuntimeException {
        private UnavailableException(String message) {
            super(message);
        }
    }

    public ProtocolResult configure(String address) {
        try {
            byte[] json = mapper.writeValueAsBytes(Map.of("operation", "configure", "address", address));
            if (json.length + 1 > MAX_REQUEST_BYTES) {
                return unavailable();
            }
            byte[] request = Arrays.copyOf(json, json.length + 1);
            request[json.length] = '\n';
            return validateReply(exchange(request));
        } catch (IOException | RuntimeException ex) {
            // Neither helper messages nor transport/parse exceptions are safe to expose to clients.
            return unavailable();
        }
    }

    private byte[] exchange(byte[] request) throws IOException {
        long deadline = System.nanoTime() + TIMEOUT.toNanos();
        try (Selector selector = Selector.open();
             SocketChannel channel = SocketChannel.open(StandardProtocolFamily.UNIX)) {
            channel.configureBlocking(false);
            SelectionKey key = channel.register(selector, 0);
            if (!channel.connect(UnixDomainSocketAddress.of(socketPath))) {
                while (!channel.finishConnect()) {
                    await(selector, key, SelectionKey.OP_CONNECT, deadline);
                }
            }
            ByteBuffer outgoing = ByteBuffer.wrap(request);
            while (outgoing.hasRemaining()) {
                checkDeadline(deadline);
                if (channel.write(outgoing) == 0) {
                    await(selector, key, SelectionKey.OP_WRITE, deadline);
                }
            }
            ByteBuffer incoming = ByteBuffer.allocate(MAX_RESPONSE_BYTES);
            int scanned = 0;
            while (true) {
                checkDeadline(deadline);
                int count = channel.read(incoming);
                if (count < 0) {
                    throw new IOException("Missing response delimiter");
                }
                for (; scanned < incoming.position(); scanned++) {
                    if (incoming.get(scanned) == '\n') {
                        if (scanned != incoming.position() - 1) {
                            throw new IOException("Multiple response frames");
                        }
                        return Arrays.copyOf(incoming.array(), scanned);
                    }
                }
                if (!incoming.hasRemaining()) {
                    throw new IOException("Response exceeds limit");
                }
                if (count == 0) {
                    await(selector, key, SelectionKey.OP_READ, deadline);
                }
            }
        }
    }

    private static void checkDeadline(long deadline) throws IOException {
        if (Thread.currentThread().isInterrupted()) {
            throw new InterruptedIOException("TLS control request interrupted");
        }
        if (System.nanoTime() >= deadline) {
            throw new IOException("TLS control request timed out");
        }
    }

    private static void await(Selector selector, SelectionKey key, int operation, long deadline) throws IOException {
        checkDeadline(deadline);
        key.interestOps(operation);
        long remaining = deadline - System.nanoTime();
        if (remaining <= 0) {
            throw new IOException("TLS control request timed out");
        }
        selector.select(Math.max(1, (remaining + 999_999) / 1_000_000));
        selector.selectedKeys().clear();
        checkDeadline(deadline);
    }

    private ProtocolResult validateReply(byte[] response) throws IOException {
        JsonNode envelope = mapper.reader().with(DeserializationFeature.FAIL_ON_TRAILING_TOKENS).readTree(response);
        if (envelope == null || !envelope.isObject()) {
            throw new IOException("Invalid envelope");
        }
        JsonNode statusNode = envelope.path("http_status");
        JsonNode body = envelope.path("body");
        if (!statusNode.isIntegralNumber() || !statusNode.canConvertToInt()
                || !ALLOWED_STATUSES.contains(statusNode.intValue()) || !body.isObject()) {
            throw new IOException("Invalid helper status or body");
        }
        int httpStatus = statusNode.intValue();
        if (httpStatus == 400 || httpStatus == 503) {
            if (!body.path("message").isString() || body.path("message").asString().isBlank()) {
                throw new IOException("Invalid helper error");
            }
            return httpStatus == 400
                    ? new ProtocolResult(400, Map.of("message", "Invalid TLS address. Use an HTTPS origin such as https://host[:port]."))
                    : unavailable();
        }

        Map<String, Object> result = new LinkedHashMap<>();
        String address = requiredText(body, "address", 512);
        validateHttpsUrl(address, true);
        result.put("address", address);
        if (!body.path("configured").isBoolean()) {
            throw new IOException("Missing configured flag");
        }
        boolean configured = body.path("configured").booleanValue();
        String status = requiredText(body, "status", 16);
        result.put("configured", configured);
        result.put("status", status);
        if (httpStatus == 202) {
            if (!"pending".equals(status) || (!body.path("tls_mode").isMissingNode() && !body.path("tls_mode").isNull())
                    || !body.path("retry_after_seconds").isIntegralNumber()
                    || !body.path("retry_after_seconds").canConvertToInt()
                    || body.path("retry_after_seconds").intValue() != 3) {
                throw new IOException("Invalid pending result");
            }
            result.put("retry_after_seconds", 3);
        } else {
            String mode = requiredText(body, "tls_mode", 16);
            if (!"verified".equals(status) || !configured || !Set.of("local", "public").contains(mode)) {
                throw new IOException("Invalid verified result");
            }
            result.put("tls_mode", mode);
        }
        if (body.has("otlp_endpoint")) {
            String endpoint = requiredText(body, "otlp_endpoint", 1024);
            validateHttpsUrl(endpoint, false);
            result.put("otlp_endpoint", endpoint);
        }
        if (body.has("ca_download_url")) {
            JsonNode caUrl = body.path("ca_download_url");
            if (!caUrl.isNull() && (!caUrl.isString() || !"/api/config/tls/ca".equals(caUrl.asString()))) {
                throw new IOException("Invalid CA URL");
            }
            result.put("ca_download_url", caUrl.isNull() ? null : caUrl.asString());
        }
        if (body.has("code")) {
            String code = requiredText(body, "code", 64);
            if (!code.matches("[A-Za-z0-9_.-]+")) {
                throw new IOException("Invalid code");
            }
            result.put("code", code);
        }
        return new ProtocolResult(httpStatus, result);
    }

    private static String requiredText(JsonNode body, String name, int limit) throws IOException {
        JsonNode value = body.path(name);
        if (!value.isString() || value.asString().isBlank() || value.asString().length() > limit
                || value.asString().chars().anyMatch(Character::isISOControl)) {
            throw new IOException("Invalid helper field");
        }
        return value.asString();
    }

    private static void validateHttpsUrl(String value, boolean originOnly) throws IOException {
        // This checks the reply's shape; the helper remains the authority for allowed origins.
        URI uri = URI.create(value);
        if (!"https".equals(uri.getScheme()) || uri.getHost() == null || uri.getRawUserInfo() != null
                || uri.getRawQuery() != null || uri.getRawFragment() != null
                || uri.getPort() == 0 || uri.getPort() > 65535
                || (originOnly && !uri.getRawPath().isEmpty())) {
            throw new IOException("Invalid HTTPS URL in helper reply");
        }
    }

    private static ProtocolResult unavailable() {
        return new ProtocolResult(503, Map.of("message", HELPER_UNAVAILABLE));
    }

    public byte[] publicCa() {
        try {
            if (!Files.isRegularFile(caPath)) {
                throw new IOException("Missing public CA file");
            }
            byte[] input;
            try (var stream = Files.newInputStream(caPath)) {
                input = stream.readNBytes(MAX_CA_BYTES + 1);
            }
            if (input.length > MAX_CA_BYTES) {
                throw new IOException("CA file exceeds limit");
            }
            String pem = new String(input, StandardCharsets.US_ASCII);
            var matcher = CERTIFICATE.matcher(pem);
            var factory = CertificateFactory.getInstance("X.509");
            StringBuilder output = new StringBuilder();
            int end = 0;
            while (matcher.find()) {
                if (!pem.substring(end, matcher.start()).isBlank()) {
                    throw new IOException("Unexpected PEM content");
                }
                byte[] der = Base64.getDecoder().decode(matcher.group(1).replaceAll("\\s", ""));
                X509Certificate certificate = (X509Certificate) factory.generateCertificate(new ByteArrayInputStream(der));
                if (certificate.getBasicConstraints() < 0 || !Arrays.equals(der, certificate.getEncoded())) {
                    throw new IOException("Not a CA certificate");
                }
                output.append("-----BEGIN CERTIFICATE-----\n")
                        .append(Base64.getMimeEncoder(64, new byte[]{'\n'}).encodeToString(certificate.getEncoded()))
                        .append("\n-----END CERTIFICATE-----\n");
                end = matcher.end();
            }
            if (output.isEmpty() || !pem.substring(end).isBlank() || output.length() > MAX_CA_BYTES) {
                throw new IOException("Invalid CA PEM");
            }
            return output.toString().getBytes(StandardCharsets.US_ASCII);
        } catch (Exception ex) {
            throw new UnavailableException(CA_UNAVAILABLE);
        }
    }
}
