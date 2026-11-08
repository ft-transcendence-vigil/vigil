package com.ft_transcendence.vigil.cli;

import com.ft_transcendence.vigil.security.ApiKeyFile;
import com.ft_transcendence.vigil.ratelimiter.ApiRateLimitPolicy;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import tools.jackson.databind.ObjectMapper;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.PrintStream;
import java.net.InetSocketAddress;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermissions;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Queue;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Consumer;
import java.util.function.Supplier;

import static org.junit.jupiter.api.Assertions.*;

class ApiAdminCliTest {
    private static final String API_ID = "00000000-0000-0000-0000-000000000001";
    private static final String ADMIN_ID = "00000000-0000-0000-0000-000000000002";
    private static final String VIEWER_ID = "00000000-0000-0000-0000-000000000003";
    private static final String OTHER_ID = "00000000-0000-0000-0000-000000000004";
    private static final String ADMIN = "admin@example.com";
    private static final String NEW_PASSWORD = "NewSecret42!";
    private static final String KEY = "actual-live-api-secret";
    private static final String NEXT_KEY = "newly-published-api-secret";
    private static final String COOKIE = "refresh-cookie-secret";
    private static final String API_KEY = "ApiKey " + KEY;
    private static final Map<String, String> BACKING = user(API_ID, "mustbe@api.email", "admin");
    private static final Map<String, String> HUMAN = user(ADMIN_ID, ADMIN, "admin");
    private static final Map<String, String> VIEWER = user(VIEWER_ID, "viewer@example.com", "viewer");
    private static final List<Map<String, String>> USERS = List.of(BACKING, HUMAN, VIEWER);
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final ApiAdminCli.Input NO_INPUT = new ApiAdminCli.Input() {
        public String line(String prompt) { throw new AssertionError("Unexpected console read"); }
        public char[] password(String prompt) { throw new AssertionError("Unexpected password read"); }
    };

    private record Expected(String method, String path, String auth, Consumer<Object> payload, int status, String body) {}
    private final Queue<Expected> expected = new ConcurrentLinkedQueue<>();
    private final AtomicReference<Throwable> serverFailure = new AtomicReference<>();
    private final ByteArrayOutputStream stdout = new ByteArrayOutputStream();
    private final ByteArrayOutputStream stderr = new ByteArrayOutputStream();
    private HttpServer server;
    private final AtomicInteger requestsInWindow = new AtomicInteger();
    private final List<java.time.Duration> waits = new ArrayList<>();
    private ApiAdminCli.Sleeper sleeper = duration -> {
        waits.add(duration);
        requestsInWindow.set(0);
    };
    private String origin;
    private String context = "";
    private Path keyFile;
    private ApiAdminCli.KeyReader keyReader = ApiKeyFile::read;
    private Supplier<? extends ApiAdminCli.Recovery> recovery = () -> { throw new AssertionError("Unexpected database access"); };
    @TempDir Path temporary;

    @BeforeEach
    void startMock() throws IOException {
        Files.setPosixFilePermissions(temporary, PosixFilePermissions.fromString("rwx------"));
        Path directory = Files.createDirectory(temporary.resolve("private"),
                PosixFilePermissions.asFileAttribute(PosixFilePermissions.fromString("rwx------")));
        keyFile = Files.createFile(directory.resolve("api-key"),
                PosixFilePermissions.asFileAttribute(PosixFilePermissions.fromString("rw-------")));
        Files.writeString(keyFile, KEY);
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", this::handle);
        server.start();
        origin = "http://127.0.0.1:" + server.getAddress().getPort();
    }

    @AfterEach
    void verifyMock() throws IOException {
        server.stop(0);
        assertNull(serverFailure.get(), () -> "Mock assertion failed: " + serverFailure.get());
        assertTrue(expected.isEmpty(), () -> "Unsent requests: " + expected);
        for (String secret : List.of(NEW_PASSWORD, KEY, NEXT_KEY, COOKIE, "private-response-secret", "database-secret")) {
            assertFalse(output().contains(secret), "Credentials or response bodies leaked to output");
        }
        try (var files = Files.list(keyFile.getParent())) {
            assertTrue(files.allMatch(keyFile::equals), "The client must not create credential files");
        }
    }

    private void handle(HttpExchange exchange) throws IOException {
        try {
            assertTrue(requestsInWindow.incrementAndGet() <= ApiRateLimitPolicy.CAPACITY,
                    "CLI exceeded the shared request budget before waiting");
            Expected next = expected.remove();
            assertEquals(next.method(), exchange.getRequestMethod());
            assertEquals(next.path(), exchange.getRequestURI().toString());
            assertEquals(next.auth(), exchange.getRequestHeaders().getFirst("Authorization"));
            assertTrue(next.auth().startsWith("ApiKey "));
            assertNull(exchange.getRequestHeaders().getFirst("Cookie"));
            assertTrue(next.path().equals(context + "/api/users") || next.path().startsWith(context + "/api/users/"));
            assertTrue(List.of("GET", "PATCH", "DELETE").contains(next.method()));
            byte[] payload = exchange.getRequestBody().readAllBytes();
            if (next.payload() == null) {
                assertEquals(0, payload.length);
            } else {
                assertEquals("application/json", exchange.getRequestHeaders().getFirst("Content-Type"));
                next.payload().accept(JSON.readValue(payload, Object.class));
            }
            // Even an unsolicited cookie must never become client authentication.
            exchange.getResponseHeaders().add("Set-Cookie", "refresh_token=" + COOKIE + "; Path=/; HttpOnly");
            if (next.status() == 0) return;
            if (next.status() == -1) { exchange.sendResponseHeaders(200, 1024); return; }
            if (next.status() == 302) exchange.getResponseHeaders().add("Location", origin + "/must-not-follow");
            byte[] body = next.body() == null ? new byte[0] : next.body().getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(next.status(), body.length == 0 ? -1 : body.length);
            if (body.length > 0) exchange.getResponseBody().write(body);
        } catch (Throwable e) {
            serverFailure.compareAndSet(null, e);
            exchange.sendResponseHeaders(500, -1);
        } finally {
            exchange.close();
        }
    }

    private void expect(String method, String path, String auth, Object payload, int status, Object body) {
        Consumer<Object> check = payload == null ? null : actual -> assertEquals(payload, actual);
        expected.add(new Expected(method, context + path, auth, check, status, body == null ? null : JSON.writeValueAsString(body)));
    }

    private void ready() { expect("GET", "/api/users", API_KEY, null, 200, USERS); }
    private void rejected(int status) { expect("GET", "/api/users", API_KEY, null, status, Map.of("error", "private-response-secret")); }
    private int run(ApiAdminCli.Input input, String... args) { return run(input, Map.of("VIGIL_API_URL", origin), args); }
    private int run(ApiAdminCli.Input input, Map<String, String> env, String... args) {
        Map<String, String> configured = new HashMap<>(env);
        configured.putIfAbsent("VIGIL_API_KEY_FILE", keyFile.toString());
        return ApiAdminCli.run(args, input, new PrintStream(stdout), new PrintStream(stderr), configured, keyReader, recovery, sleeper);
    }
    private String output() { return stdout.toString(StandardCharsets.UTF_8) + stderr.toString(StandardCharsets.UTF_8); }
    private static Map<String, String> user(String id, String email, String role) { return Map.of("id", id, "email", email, "role", role); }

    private FakeRecovery recover(ApiAccountRecovery.State state) {
        FakeRecovery fake = new FakeRecovery(state);
        recovery = () -> { fake.supplied++; return fake; };
        return fake;
    }

    private static final class FakeRecovery implements ApiAdminCli.Recovery {
        private final ApiAccountRecovery.State state;
        private int supplied;
        private int inspected;
        private int repaired;
        private Runnable onRepair = () -> {};
        FakeRecovery(ApiAccountRecovery.State state) { this.state = state; }
        public ApiAccountRecovery.State state() { inspected++; return state; }
        public void repair() { repaired++; onRepair.run(); }
        void assertCalls(int repairs) {
            assertEquals(1, supplied);
            assertEquals(1, inspected);
            assertEquals(repairs, repaired);
        }
    }

    private static final class ScriptInput implements ApiAdminCli.Input {
        private final Queue<String> lines;
        private final Queue<char[]> passwords = new ArrayDeque<>();
        private final List<char[]> suppliedPasswords = new ArrayList<>();
        private final List<String> linePrompts = new ArrayList<>();
        private final List<String> hiddenPrompts = new ArrayList<>();
        ScriptInput(List<String> lines, String... passwords) {
            this.lines = new ArrayDeque<>(lines);
            for (String password : passwords) {
                char[] chars = password.toCharArray();
                this.passwords.add(chars);
                suppliedPasswords.add(chars);
            }
        }
        public String line(String prompt) { linePrompts.add(prompt); return lines.remove(); }
        public char[] password(String prompt) { hiddenPrompts.add(prompt); return passwords.remove(); }
    }

    @Test
    void helpAndArgumentErrorsPrecedeConsoleConfigurationAndKeyIO() {
        keyReader = path -> { throw new AssertionError("Unexpected key file read"); };
        Map<String, String> invalidEnv = Map.of("VIGIL_API_URL", "invalid-private-response-secret");
        for (String flag : List.of("--help", "-h")) {
            assertEquals(0, run(NO_INPUT, invalidEnv, flag));
            for (String command : List.of("reset-password", "delete-all-accounts", "restore-api-user")) {
                assertEquals(0, run(NO_INPUT, invalidEnv, command, flag));
            }
        }
        for (String[] args : List.of(new String[0], new String[]{"unknown"}, new String[]{"reset-password"},
                new String[]{"reset-password", ADMIN, "plaintext"}, new String[]{"delete-all-accounts", "extra"},
                new String[]{"restore-api-user", "extra"}, new String[]{"reset-password", "--help", "extra"},
                new String[]{"reset-password", "MUSTBE@API.EMAIL"}, new String[]{"reset-password", "bad @email"},
                new String[]{"reset-password", "a@b@c"}, new String[]{"reset-password", "@email"},
                new String[]{"reset-password", "email@"}, new String[]{"reset-password", "no-at"})) {
            assertEquals(2, run(NO_INPUT, invalidEnv, args));
        }
        assertTrue(output().contains("http://localhost:8080"));
        assertTrue(output().contains("VIGIL_API_KEY_FILE"));
        assertFalse(output().contains("prompts for an existing admin"));
    }

    private record ShellResult(int status, String output) {}

    private ShellResult shell(String script, String... args) throws Exception {
        List<String> command = new ArrayList<>(List.of(Path.of(script).toAbsolutePath().toString()));
        command.addAll(Arrays.asList(args));
        ProcessBuilder builder = new ProcessBuilder(command).redirectErrorStream(true);
        builder.environment().put("PATH", temporary.toString());
        builder.environment().put("VIGIL_API_URL", "invalid-private-response-secret");
        Process process = builder.start();
        try {
            assertTrue(process.waitFor(5, TimeUnit.SECONDS), "Shell command timed out");
            return new ShellResult(process.exitValue(), new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8));
        } finally {
            process.destroyForcibly();
        }
    }

    @Test
    void shellHelpMatchesJavaWithoutDockerOrAnyExternalRuntime() throws Exception {
        for (String script : List.of("admin-command", "reset-password", "delete-all-accounts", "restore-api-user")) {
            for (String flag : List.of("--help", "-h")) {
                String[] args = script.equals("admin-command") ? new String[]{flag} : new String[]{script, flag};
                ByteArrayOutputStream javaHelp = new ByteArrayOutputStream();
                assertEquals(0, ApiAdminCli.run(args, NO_INPUT, new PrintStream(javaHelp), new PrintStream(stderr), Map.of()));
                ShellResult result = shell(script, flag);
                assertEquals(0, result.status());
                assertEquals(javaHelp.toString(StandardCharsets.UTF_8), result.output());
            }
        }
    }

    @Test
    void shellRejectsExtraArgumentsAndReservedEmailsBeforeDocker() throws Exception {
        assertEquals(2, shell("admin-command").status());
        assertEquals(2, shell("admin-command", "unknown").status());
        assertEquals(2, shell("reset-password", ADMIN, "plaintext").status());
        assertEquals(2, shell("reset-password", "--help", "extra").status());
        assertEquals(2, shell("delete-all-accounts", "extra").status());
        assertEquals(2, shell("restore-api-user", "extra").status());
        for (String email : List.of("MUSTBE@API.EMAIL", "bad @email", "a@b@c", "@email", "email@", "no-at")) {
            assertEquals(2, shell("reset-password", email).status());
        }
    }

    @Test
    void resetUsesLiveKeyOnlyAndWipesHiddenPasswords() {
        ready();
        expect("PATCH", "/api/users/" + VIEWER_ID, API_KEY, Map.of("password", NEW_PASSWORD), 200, VIEWER);
        ScriptInput input = new ScriptInput(List.of(), NEW_PASSWORD, NEW_PASSWORD);
        assertEquals(0, run(input, "reset-password", "VIEWER@example.com"));
        assertEquals(List.of("New password: ", "Confirm new password: "), input.hiddenPrompts);
        assertTrue(input.linePrompts.isEmpty());
        input.suppliedPasswords.forEach(chars -> assertArrayEquals(new char[chars.length], chars));
        assertTrue(output().contains("Existing sessions are not revoked"));
    }

    @Test
    void passwordMismatchDoesNotPatch() {
        ready();
        ScriptInput input = new ScriptInput(List.of(), NEW_PASSWORD, "Different42!");
        assertEquals(1, run(input, "reset-password", ADMIN));
        input.suppliedPasswords.forEach(chars -> assertArrayEquals(new char[chars.length], chars));
        assertTrue(output().contains("Passwords do not match"));
    }

    @Test
    void invalidPasswordDoesNotPatch() {
        ready();
        assertEquals(1, run(new ScriptInput(List.of(), "weak", "weak"), "reset-password", ADMIN));
        assertTrue(output().contains("at most 72 UTF-8 bytes"));
    }

    @Test
    void passwordPolicyMatchesDtoPatternAndBcryptUtf8Limit() {
        for (char special : "@#$%^&+=!".toCharArray()) assertTrue(ApiAdminCli.validPassword("Aa1" + special + "abcd"));
        assertTrue(ApiAdminCli.validPassword("Aa1!" + "x".repeat(68)));
        assertFalse(ApiAdminCli.validPassword("Aa1!" + "x".repeat(69)));
        assertTrue(ApiAdminCli.validPassword("Aa1!" + "é".repeat(34)));
        assertFalse(ApiAdminCli.validPassword("Aa1!" + "é".repeat(35)));
        for (String invalid : List.of("Aa1!abc", "AA1!ABCD", "aa1!abcd", "Aaa!abcd", "Aa1*abcd")) {
            assertFalse(ApiAdminCli.validPassword(invalid));
        }
        for (String newline : List.of("\r", "\n", "\u0085", "\u2028", "\u2029")) {
            assertFalse(ApiAdminCli.validPassword("Aa1!abcd" + newline));
        }
    }

    @Test
    void missingBackingAccountDefaultsToNoBeforePasswordPrompts() {
        FakeRecovery fake = recover(ApiAccountRecovery.State.MISSING);
        rejected(401);
        ScriptInput input = new ScriptInput(List.of(""));
        assertEquals(1, run(input, "reset-password", ADMIN));
        fake.assertCalls(0);
        assertTrue(input.hiddenPrompts.isEmpty());
        assertEquals(List.of("Create this service account and continue? [y/N] "), input.linePrompts);
        assertTrue(output().contains("backing account was not changed"));
        assertTrue(output().contains("dedicated admin account (mustbe@api.email)"));
        assertTrue(output().contains("That account is missing, so API-key commands cannot run."));
        assertTrue(output().contains("Creating it restores API-key access."));
    }

    @Test
    void demotedBackingAccountCanBeDeclinedBeforeDeletionConfirmation() {
        FakeRecovery fake = recover(ApiAccountRecovery.State.DEMOTED);
        rejected(403);
        ScriptInput input = new ScriptInput(List.of("no"));
        assertEquals(1, run(input, "delete-all-accounts"));
        fake.assertCalls(0);
        assertEquals(List.of("Restore its admin role and continue? [y/N] "), input.linePrompts);
        assertTrue(output().contains("That account no longer has admin permissions"));
        assertTrue(output().contains("Restoring its role restores access."));
    }

    @Test
    void createsMissingBackingAccountOnlyThroughRecoveryThenVerifiesApiKey() {
        FakeRecovery fake = recover(ApiAccountRecovery.State.MISSING);
        rejected(401);
        ready();
        assertEquals(0, run(new ScriptInput(List.of(" yes ")), "restore-api-user"));
        fake.assertCalls(1);
        assertTrue(output().contains("live API key is not reset or rotated"));
        assertTrue(output().contains("existing passwords preserved"));
    }

    @Test
    void repairsDemotedBackingAccountBeforeResettingHumanPasswordThroughHttp() {
        FakeRecovery fake = recover(ApiAccountRecovery.State.DEMOTED);
        rejected(403);
        ready();
        expect("PATCH", "/api/users/" + ADMIN_ID, API_KEY, Map.of("password", NEW_PASSWORD), 200, HUMAN);
        ScriptInput input = new ScriptInput(List.of("Y"), NEW_PASSWORD, NEW_PASSWORD);
        fake.onRepair = () -> assertTrue(input.hiddenPrompts.isEmpty());
        assertEquals(0, run(input, "reset-password", ADMIN));
        fake.assertCalls(1);
        assertEquals(List.of("New password: ", "Confirm new password: "), input.hiddenPrompts);
    }

    @Test
    void healthyRestoreDoesNotPromptTouchDatabaseOrWriteKeyFile() throws IOException {
        byte[] original = Files.readAllBytes(keyFile);
        ready();
        assertEquals(0, run(NO_INPUT, "restore-api-user"));
        assertArrayEquals(original, Files.readAllBytes(keyFile));
        assertEquals(PosixFilePermissions.fromString("rw-------"), Files.getPosixFilePermissions(keyFile));
    }

    @Test
    void deletePreservesBackingAndNeedsNoHumanLogin() {
        List<Map<String, String>> mixedCase = List.of(HUMAN, user(API_ID, "MUSTBE@API.EMAIL", "admin"), VIEWER);
        expect("GET", "/api/users", API_KEY, null, 200, mixedCase);
        expect("DELETE", "/api/users/" + ADMIN_ID, API_KEY, null, 204, null);
        expect("DELETE", "/api/users/" + VIEWER_ID, API_KEY, null, 204, null);
        ScriptInput input = new ScriptInput(List.of("DELETE ALL HUMAN ACCOUNTS"));
        assertEquals(0, run(input, "delete-all-accounts"));
        assertTrue(input.hiddenPrompts.isEmpty());
        assertEquals(1, input.linePrompts.size());
        assertTrue(output().contains("Deleted 2/2 human account(s)"));
        assertTrue(output().contains("non-atomic"));
    }

    @Test
    void bulkDeletionPacesMultipleWindowsIncludingInitialGet() {
        int count = Math.toIntExact(ApiRateLimitPolicy.CAPACITY * 2 + 3);
        List<Map<String, String>> snapshot = new ArrayList<>();
        snapshot.add(BACKING);
        for (int i = 0; i < count; i++) {
            snapshot.add(user(new java.util.UUID(1, i).toString(), "human" + i + "@example.com", "viewer"));
        }
        expect("GET", "/api/users", API_KEY, null, 200, snapshot);
        for (int i = 1; i < snapshot.size(); i++) {
            expect("DELETE", "/api/users/" + snapshot.get(i).get("id"), API_KEY, null, 204, null);
        }
        assertEquals(0, run(new ScriptInput(List.of("DELETE ALL HUMAN ACCOUNTS")), "delete-all-accounts"));
        assertEquals(List.of(ApiRateLimitPolicy.REFILL_PERIOD, ApiRateLimitPolicy.REFILL_PERIOD), waits);
        assertTrue(output().contains("Done: " + count + " human account(s) deleted"));
    }

    @Test
    void interruptedBudgetWaitStopsBeforeNextDelete() {
        int count = Math.toIntExact(ApiRateLimitPolicy.CAPACITY + 1);
        List<Map<String, String>> snapshot = new ArrayList<>();
        snapshot.add(BACKING);
        for (int i = 0; i < count; i++) {
            snapshot.add(user(new java.util.UUID(1, i).toString(), "human" + i + "@example.com", "viewer"));
        }
        expect("GET", "/api/users", API_KEY, null, 200, snapshot);
        for (int i = 1; i < ApiRateLimitPolicy.CAPACITY; i++) {
            expect("DELETE", "/api/users/" + snapshot.get(i).get("id"), API_KEY, null, 204, null);
        }
        sleeper = duration -> { throw new InterruptedException(); };
        try {
            assertEquals(1, run(new ScriptInput(List.of("DELETE ALL HUMAN ACCOUNTS")), "delete-all-accounts"));
            assertTrue(Thread.currentThread().isInterrupted());
            assertTrue(output().contains((ApiRateLimitPolicy.CAPACITY - 1) + "/" + count + " confirmed deleted"));
            assertTrue(output().contains("next request was not sent"));
        } finally {
            Thread.interrupted();
        }
    }

    @Test
    void rateLimitedDeleteStopsWithoutRetry() {
        ready();
        expect("DELETE", "/api/users/" + ADMIN_ID, API_KEY, null, 429, null);
        assertEquals(1, run(new ScriptInput(List.of("DELETE ALL HUMAN ACCOUNTS")), "delete-all-accounts"));
        assertTrue(output().contains("0/2 confirmed deleted"));
        assertTrue(output().contains("HTTP 429. Rate limited; no automatic retry"));
    }

    @Test
    void deleteRequiresExactConfirmationWithoutTrimming() {
        ready();
        assertEquals(1, run(new ScriptInput(List.of("DELETE ALL HUMAN ACCOUNTS ")), "delete-all-accounts"));
        assertTrue(output().contains("no accounts deleted"));
    }

    @Test
    void deletionErrorStopsSnapshotReportsProgressAndNeverRetries() {
        List<Map<String, String>> snapshot = List.of(BACKING, HUMAN, VIEWER, user(OTHER_ID, "other@example.com", "viewer"));
        expect("GET", "/api/users", API_KEY, null, 200, snapshot);
        expect("DELETE", "/api/users/" + ADMIN_ID, API_KEY, null, 204, null);
        expect("DELETE", "/api/users/" + VIEWER_ID, API_KEY, null, 503, Map.of("error", "private-response-secret"));
        assertEquals(1, run(new ScriptInput(List.of("DELETE ALL HUMAN ACCOUNTS")), "delete-all-accounts"));
        assertTrue(output().contains("1/3 confirmed deleted"));
        assertTrue(output().contains("HTTP 503"));
        assertTrue(output().contains("Partial deletion is possible"));
    }

    @Test
    void droppedDeleteConnectionIsNotRetried() {
        ready();
        expect("DELETE", "/api/users/" + ADMIN_ID, API_KEY, null, 0, null);
        assertEquals(1, run(new ScriptInput(List.of("DELETE ALL HUMAN ACCOUNTS")), "delete-all-accounts"));
        assertTrue(output().contains("0/2 confirmed deleted"));
        assertTrue(output().contains("No retry was made; a mutation may have completed"));
    }

    @Test
    void rateLimitedUsersGetReportsStatusNotBodyAndNeverRecovers() {
        rejected(429);
        assertEquals(1, run(NO_INPUT, "restore-api-user"));
        assertTrue(output().contains("HTTP 429. Rate limited; no automatic retry"));
    }

    @Test
    void serverErrorsNeverTriggerDatabaseRecovery() {
        for (int status : List.of(500, 503)) {
            rejected(status);
            assertEquals(1, run(NO_INPUT, "restore-api-user"));
            assertTrue(output().contains("HTTP " + status));
        }
    }

    @Test
    void droppedUsersGetNeverTriggersDatabaseRecovery() {
        expect("GET", "/api/users", API_KEY, null, 0, null);
        assertEquals(1, run(NO_INPUT, "restore-api-user"));
        assertTrue(output().contains("connection/TLS/timeout failure"));
    }

    @Test
    void malformedUsersJsonNeverTriggersDatabaseRecovery() {
        expected.add(new Expected("GET", "/api/users", API_KEY, null, 200, "private-response-secret not JSON"));
        assertEquals(1, run(NO_INPUT, "restore-api-user"));
        assertTrue(output().contains("invalid JSON response"));
    }

    @Test
    void brokenUsersBodyNeverTriggersDatabaseRecovery() {
        expect("GET", "/api/users", API_KEY, null, -1, null);
        assertEquals(1, run(NO_INPUT, "restore-api-user"));
        assertTrue(output().contains("connection/TLS/timeout failure"));
    }

    @Test
    void redirectsAreRejectedNotFollowed() {
        rejected(302);
        assertEquals(1, run(NO_INPUT, "restore-api-user"));
        assertTrue(output().contains("HTTP 302"));
    }

    @Test
    void readyBackingAccountRejectsStaleKeyWithoutPromptOrFalseRestore() {
        for (int status : List.of(401, 403)) {
            FakeRecovery fake = recover(ApiAccountRecovery.State.READY);
            rejected(status);
            assertEquals(1, run(NO_INPUT, "reset-password", ADMIN));
            fake.assertCalls(0);
            assertTrue(output().contains("already admin"));
            assertTrue(output().contains("stale or mismatched live API key"));
            assertTrue(output().contains("No account was changed"));
        }
    }

    @Test
    void duplicateBackingAccountsAbortWithoutDatabaseAccessOrMutation() {
        expect("GET", "/api/users", API_KEY, null, 200, List.of(BACKING, user(OTHER_ID, "MUSTBE@API.EMAIL", "admin"), HUMAN));
        assertEquals(1, run(NO_INPUT, "restore-api-user"));
        assertTrue(output().contains("Multiple API backing accounts"));
    }

    @Test
    void healthyUsersResponseMissingBackingAccountDoesNotRecoverOrMutateTarget() {
        expect("GET", "/api/users", API_KEY, null, 200, List.of(HUMAN, VIEWER));
        assertEquals(1, run(NO_INPUT, "reset-password", ADMIN));
        assertTrue(output().contains("backing account verification failed"));
    }

    @Test
    void healthyUsersResponseWithDemotedBackingAccountDoesNotRecover() {
        expect("GET", "/api/users", API_KEY, null, 200, List.of(user(API_ID, "mustbe@api.email", "viewer"), HUMAN));
        assertEquals(1, run(NO_INPUT, "delete-all-accounts"));
        assertTrue(output().contains("backing account verification failed"));
    }

    @Test
    void contextPathAppliesToEveryHttpRequest() {
        context = "/vigil";
        ready();
        expect("PATCH", "/api/users/" + ADMIN_ID, API_KEY, Map.of("password", NEW_PASSWORD), 200, HUMAN);
        assertEquals(0, run(new ScriptInput(List.of(), NEW_PASSWORD, NEW_PASSWORD),
                Map.of("VIGIL_API_URL", origin, "SERVER_SERVLET_CONTEXT_PATH", context), "reset-password", ADMIN));
    }

    @Test
    void urlFactoryUsesContainerDefaultsAndValidatesTrustedOriginsBeforeKeyIO() {
        keyReader = path -> { throw new AssertionError("Unexpected key file read"); };
        assertEquals(URI.create("http://localhost:8080"), ApiAdminCli.apiUrl(Map.of()));
        assertEquals(URI.create("https://localhost:8443/vigil"), ApiAdminCli.apiUrl(Map.of(
                "SERVER_PORT", "8443", "SERVER_SSL_ENABLED", "true", "SERVER_SERVLET_CONTEXT_PATH", "/vigil")));
        assertEquals(URI.create("http://[::1]:8080"), ApiAdminCli.apiUrl(Map.of("VIGIL_API_URL", "http://[::1]:8080/")));
        assertEquals(URI.create("https://trusted.example"), ApiAdminCli.apiUrl(Map.of("VIGIL_API_URL", "https://trusted.example")));
        for (String bad : List.of("http://remote.example", "ftp://localhost", "https://name:private-response-secret@localhost",
                "https://localhost/path", "https://localhost?private-response-secret", "https://localhost/#fragment",
                "https://localhost:70000", "http://localhost:0", "not a URL")) {
            assertEquals(1, run(NO_INPUT, Map.of("VIGIL_API_URL", bad), "restore-api-user"));
        }
        for (Map<String, String> bad : List.of(Map.of("SERVER_PORT", "0"), Map.of("SERVER_PORT", "wrong"),
                Map.of("SERVER_SSL_ENABLED", "wrong"), Map.of("SERVER_SERVLET_CONTEXT_PATH", "/../escape"))) {
            assertEquals(1, run(NO_INPUT, bad, "restore-api-user"));
        }
    }

    @Test
    void missingKeyFileFailsBeforeHttpAndDatabaseAccess() throws IOException {
        Files.delete(keyFile);
        assertEquals(1, run(NO_INPUT, "restore-api-user"));
        assertTrue(output().contains("Could not read the running API key"));
    }

    @Test
    void nonPrivateKeyFileFailsBeforeHttpAndDatabaseAccess() throws IOException {
        Files.setPosixFilePermissions(keyFile, PosixFilePermissions.fromString("rw-r--r--"));
        assertEquals(1, run(NO_INPUT, "restore-api-user"));
        assertTrue(output().contains("private file permissions"));
    }

    @Test
    void emptyKeyFileFailsBeforeHttpAndDatabaseAccess() throws IOException {
        Files.writeString(keyFile, "");
        assertEquals(1, run(NO_INPUT, "restore-api-user"));
        assertTrue(output().contains("Could not read the running API key"));
    }

    @Test
    void injectedKeyReaderUsesConfiguredPathExactlyOnceForHealthyOperation() {
        AtomicInteger reads = new AtomicInteger();
        Path configured = temporary.resolve("private").resolve("not-created");
        keyReader = path -> { assertEquals(configured, path); reads.incrementAndGet(); return KEY; };
        ready();
        assertEquals(0, run(NO_INPUT, Map.of("VIGIL_API_URL", origin, "VIGIL_API_KEY_FILE", configured.toString()), "restore-api-user"));
        assertEquals(1, reads.get());
        assertFalse(Files.exists(configured));
    }

    @Test
    void injectedKeyReaderUsesDefaultPathAndDoesNotLeakIOException() {
        ApiAdminCli.KeyReader failing = path -> {
            assertEquals(Path.of("/var/lib/vigil/admin/api-key"), path);
            throw new IOException(KEY + " private-response-secret");
        };
        assertEquals(1, ApiAdminCli.run(new String[]{"restore-api-user"}, NO_INPUT,
                new PrintStream(stdout), new PrintStream(stderr), Map.of("VIGIL_API_URL", origin), failing, recovery));
        assertTrue(output().contains("VIGIL_API_KEY_FILE"));
    }

    @Test
    void approvedRecoveryRereadsLiveKeyBeforeRetryingGet() {
        FakeRecovery fake = recover(ApiAccountRecovery.State.MISSING);
        AtomicInteger reads = new AtomicInteger();
        keyReader = path -> { reads.incrementAndGet(); return ApiKeyFile.read(path); };
        fake.onRepair = () -> {
            try { Files.writeString(keyFile, NEXT_KEY); } catch (IOException e) { throw new AssertionError(e); }
        };
        rejected(401);
        expect("GET", "/api/users", "ApiKey " + NEXT_KEY, null, 200, USERS);
        expect("PATCH", "/api/users/" + ADMIN_ID, "ApiKey " + NEXT_KEY, Map.of("password", NEW_PASSWORD), 200, HUMAN);
        assertEquals(0, run(new ScriptInput(List.of("y"), NEW_PASSWORD, NEW_PASSWORD), "reset-password", ADMIN));
        fake.assertCalls(1);
        assertEquals(2, reads.get());
    }

    @Test
    void repairFailureStopsBeforePasswordsOrHttpMutationAndDoesNotRetry() {
        FakeRecovery fake = recover(ApiAccountRecovery.State.DEMOTED);
        fake.onRepair = () -> { throw new ApiAccountRecovery.Failure("Database recovery unavailable; no automatic retry was made."); };
        rejected(403);
        ScriptInput input = new ScriptInput(List.of("yes"));
        assertEquals(1, run(input, "reset-password", ADMIN));
        fake.assertCalls(1);
        assertTrue(input.hiddenPrompts.isEmpty());
        assertTrue(output().contains("Database recovery unavailable"));
    }

    @Test
    void failedAuthAfterRecoveryDoesNotRecoverTwiceOrPromptForPasswords() {
        FakeRecovery fake = recover(ApiAccountRecovery.State.MISSING);
        rejected(401);
        rejected(403);
        ScriptInput input = new ScriptInput(List.of("yes"));
        assertEquals(1, run(input, "reset-password", ADMIN));
        fake.assertCalls(1);
        assertTrue(input.hiddenPrompts.isEmpty());
        assertTrue(output().contains("HTTP 403"));
    }

    @Test
    void failedBackingVerificationAfterRecoveryDoesNotMutateHumanAccount() {
        FakeRecovery fake = recover(ApiAccountRecovery.State.MISSING);
        rejected(401);
        expect("GET", "/api/users", API_KEY, null, 200, List.of(HUMAN));
        ScriptInput input = new ScriptInput(List.of("yes"));
        assertEquals(1, run(input, "reset-password", ADMIN));
        fake.assertCalls(1);
        assertTrue(input.hiddenPrompts.isEmpty());
        assertTrue(output().contains("backing account verification failed"));
    }

    @Test
    void failedKeyRereadAfterRepairDoesNotClaimNoRecoveryWasAttempted() {
        FakeRecovery fake = recover(ApiAccountRecovery.State.MISSING);
        AtomicInteger reads = new AtomicInteger();
        keyReader = path -> { if (reads.incrementAndGet() == 1) return KEY; throw new IOException("private-response-secret"); };
        rejected(401);
        assertEquals(1, run(new ScriptInput(List.of("yes")), "restore-api-user"));
        fake.assertCalls(1);
        assertTrue(output().contains("Could not read the running API key"));
        assertFalse(output().contains("No database recovery was attempted"));
    }

    @Test
    void patchAuthFailureDoesNotTriggerDatabaseRecoveryOrMutationRetry() {
        ready();
        expect("PATCH", "/api/users/" + ADMIN_ID, API_KEY, Map.of("password", NEW_PASSWORD), 401, Map.of("error", "private-response-secret"));
        assertEquals(1, run(new ScriptInput(List.of(), NEW_PASSWORD, NEW_PASSWORD), "reset-password", ADMIN));
        assertTrue(output().contains("HTTP 401"));
    }

    @Test
    void deleteAuthFailureDoesNotTriggerDatabaseRecoveryOrMutationRetry() {
        ready();
        expect("DELETE", "/api/users/" + ADMIN_ID, API_KEY, null, 403, Map.of("error", "private-response-secret"));
        assertEquals(1, run(new ScriptInput(List.of("DELETE ALL HUMAN ACCOUNTS")), "delete-all-accounts"));
        assertTrue(output().contains("HTTP 403"));
        assertTrue(output().contains("0/2 confirmed deleted"));
    }

    @Test
    void missingHumanTargetHasClearErrorBeforePasswordPrompts() {
        ready();
        assertEquals(1, run(NO_INPUT, "reset-password", "missing@example.com"));
        assertTrue(output().contains("Account not found: missing@example.com. Password was not changed."));
    }

    @Test
    void ambiguousHumanTargetIsRejectedBeforePasswordPrompts() {
        expect("GET", "/api/users", API_KEY, null, 200, List.of(BACKING, HUMAN, user(OTHER_ID, "ADMIN@example.com", "viewer")));
        assertEquals(1, run(NO_INPUT, "reset-password", ADMIN));
        assertTrue(output().contains("Exactly one matching human account"));
    }
}
