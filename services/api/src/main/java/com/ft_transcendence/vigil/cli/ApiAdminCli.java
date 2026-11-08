package com.ft_transcendence.vigil.cli;

import com.ft_transcendence.vigil.security.ApiKeyFile;
import com.ft_transcendence.vigil.ratelimiter.ApiRateLimitPolicy;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManagerFactory;
import java.io.Console;
import java.io.IOException;
import java.io.PrintStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyStore;

import java.security.cert.CertificateFactory;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Arrays;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.function.Supplier;
import java.util.regex.Pattern;

public final class ApiAdminCli {
    private static final String API_EMAIL = "mustbe@api.email";
    private static final String DELETE_CONFIRMATION = "DELETE ALL HUMAN ACCOUNTS";
    private static final String USAGE = "Usage: reset-password <email> | delete-all-accounts | restore-api-user";
    private static final Set<String> COMMANDS = Set.of("reset-password", "delete-all-accounts", "restore-api-user");
    private static final Pattern EMAIL = Pattern.compile("[^\\s@]+@[^\\s@]+", Pattern.UNICODE_CHARACTER_CLASS);
    private static final Pattern PASSWORD = Pattern.compile("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@#$%^&+=!]).{8,}$");
    private static final Duration TIMEOUT = Duration.ofSeconds(30);

    interface Input {
        String line(String prompt);
        char[] password(String prompt);
    }

    private record User(UUID id, String email, String role) {}
    @FunctionalInterface
    interface KeyReader {
        String read(Path path) throws IOException;
    }

    @FunctionalInterface
    interface Sleeper {
        void sleep(Duration duration) throws InterruptedException;
    }

    interface Recovery {
        ApiAccountRecovery.State state();
        void repair();
    }

    private record VerifiedUsers(List<User> users, String auth) {}
    private static class Failure extends RuntimeException {
        Failure(String message) { super(message); }
    }
    private static final class HttpFailure extends Failure {
        private final int status;
        HttpFailure(String method, String path, int status) {
            super(method + " " + path + ": HTTP " + status + "." + (status == 429 ? " Rate limited; no automatic retry." : ""));
            this.status = status;
        }
    }

    private final Input input;
    private final PrintStream out;

    private final URI base;
    private final HttpClient http;
    private final ObjectMapper json = new ObjectMapper();
    private final Path keyFile;
    private final KeyReader keyReader;
    private final Supplier<? extends Recovery> recovery;
    private final Sleeper sleeper;
    private long requestsInBudget;

    private ApiAdminCli(Input input, PrintStream out, URI base, HttpClient http, Path keyFile,
                        KeyReader keyReader, Supplier<? extends Recovery> recovery, Sleeper sleeper) {
        this.input = input;
        this.out = out;
        this.base = base;
        this.http = http;
        this.keyFile = keyFile;
        this.keyReader = keyReader;
        this.recovery = recovery;
        this.sleeper = sleeper;
    }

    public static int run(String[] args) {
        return run(args, new Input() {
            private Console console() {
                Console console = System.console();
                if (console == null) throw new Failure("An interactive terminal with hidden password input is required.");
                return console;
            }
            public String line(String prompt) { return console().readLine("%s", prompt); }
            public char[] password(String prompt) { return console().readPassword("%s", prompt); }
        }, System.out, System.err, System.getenv());
    }

    static int run(String[] args, Input input, PrintStream out, PrintStream err, Map<String, String> env) {
        return run(args, input, out, err, env, ApiKeyFile::read, () -> new ApiAccountRecovery(env));
    }

    static int run(String[] args, Input input, PrintStream out, PrintStream err, Map<String, String> env,
                   KeyReader keyReader, Supplier<? extends Recovery> recovery) {
        return run(args, input, out, err, env, keyReader, recovery, Thread::sleep);
    }

    static int run(String[] args, Input input, PrintStream out, PrintStream err, Map<String, String> env,
                   KeyReader keyReader, Supplier<? extends Recovery> recovery, Sleeper sleeper) {
        if (args.length == 1 && isHelp(args[0])) { help(null, out); return 0; }
        if (args.length == 2 && COMMANDS.contains(args[0]) && isHelp(args[1])) { help(args[0], out); return 0; }
        if (args.length == 0 || !COMMANDS.contains(args[0]) || args.length != (args[0].equals("reset-password") ? 2 : 1)) {
            err.println(USAGE);
            return 2;
        }
        if (args[0].equals("reset-password") && !humanEmail(args[1])) {
            err.println("A valid human account email is required; the API backing account is reserved.");
            return 2;
        }
        try {
            URI base = apiUrl(env);
            // One exchange attempt, including on pooled-connection failures during DELETE.
            System.setProperty("jdk.httpclient.redirects.retrylimit", "1");
            System.setProperty("jdk.httpclient.disableRetryConnect", "true");
            System.setProperty("jdk.httpclient.enableAllMethodRetry", "false");
            var builder = HttpClient.newBuilder().connectTimeout(TIMEOUT)
                    .followRedirects(HttpClient.Redirect.NEVER).version(HttpClient.Version.HTTP_1_1);
            if (base.getScheme().equals("https") && env.containsKey("VIGIL_TLS_CA_PATH")) {
                builder.sslContext(tls(env.get("VIGIL_TLS_CA_PATH")));
            }
            try (HttpClient http = builder.build()) {
                Path keyFile = Path.of(env.getOrDefault("VIGIL_API_KEY_FILE", "/var/lib/vigil/admin/api-key"));
                new ApiAdminCli(input, out, base, http, keyFile, keyReader, recovery, sleeper)
                        .execute(args[0], args.length == 2 ? args[1] : null);
            }
            return 0;
        } catch (Failure | ApiAccountRecovery.Failure e) {
            err.println("Error: " + e.getMessage());
        } catch (Exception e) {
            err.println("Error: invalid configuration or unexpected client failure; no automatic retry was made.");
        }
        return 1;
    }

    private static boolean isHelp(String arg) { return arg.equals("--help") || arg.equals("-h"); }
    private static boolean humanEmail(String email) { return EMAIL.matcher(email).matches() && !API_EMAIL.equalsIgnoreCase(email); }

    private static void help(String command, PrintStream out) {
        if (command == null) {
            out.println(USAGE + "\nRun any command with --help for details.");
        } else {
            out.println("Usage: " + command + (command.equals("reset-password") ? " <email>" : ""));
            out.println(switch (command) {
                case "reset-password" -> "\nReset an account password. Prompts for a hidden new password and confirmation.\nThe API backing account cannot be reset with this command.";
                case "delete-all-accounts" -> "\nDelete all human accounts while preserving the API backing account.\nRequires typing DELETE ALL HUMAN ACCOUNTS. Deletions commit separately.";
                default -> "\nCheck the API backing account. Ask before creating it or repairing its admin role.";
            });
        }
        out.println("\nAuthentication: reads the running API key from VIGIL_API_KEY_FILE.\n"
                + "Default key file: /var/lib/vigil/admin/api-key (inside the container).\n"
                + "Asks before restoring the API-key account through the database if authentication fails.\n"
                + "Runs inside vigil-api; default API URL: http://localhost:8080.\n"
                + "Honors SERVER_PORT, SERVER_SERVLET_CONTEXT_PATH and SERVER_SSL_ENABLED.\n"
                + "Override the trusted origin with VIGIL_API_URL (remote HTTPS or loopback HTTP).\n"
                + "HTTPS trust: Java defaults, or VIGIL_TLS_CA_PATH inside the container.");
    }

    static URI apiUrl(Map<String, String> env) {
        try {
            String origin = env.get("VIGIL_API_URL");
            if (origin == null) {
                String ssl = env.getOrDefault("SERVER_SSL_ENABLED", "false");
                if (!ssl.equalsIgnoreCase("true") && !ssl.equalsIgnoreCase("false")) throw new IllegalArgumentException();
                int port = Integer.parseInt(env.getOrDefault("SERVER_PORT", "8080"));
                if (port < 1 || port > 65535) throw new IllegalArgumentException();
                origin = (Boolean.parseBoolean(ssl) ? "https" : "http") + "://localhost:" + port;
            }
            URI uri = URI.create(origin);
            if (!Set.of("http", "https").contains(uri.getScheme()) || uri.getHost() == null
                    || uri.getRawUserInfo() != null || uri.getRawQuery() != null || uri.getRawFragment() != null
                    || !Set.of("", "/").contains(uri.getRawPath()) || uri.getPort() == 0 || uri.getPort() > 65535) {
                throw new IllegalArgumentException();
            }
            if (uri.getScheme().equals("http") && !Set.of("localhost", "127.0.0.1", "[::1]").contains(uri.getHost().toLowerCase(Locale.ROOT))) {
                throw new Failure("Remote API URLs must use HTTPS.");
            }
            String context = env.getOrDefault("SERVER_SERVLET_CONTEXT_PATH", "");
            if (context.equals("/")) context = "";
            if (!context.matches("(?:/(?!\\.{1,2}(?:/|$))[A-Za-z0-9_.~-]+)*")) {
                throw new IllegalArgumentException();
            }
            return URI.create(origin.replaceFirst("/$", "") + context);
        } catch (IllegalArgumentException | NullPointerException e) {
            throw new Failure("Invalid API URL or server configuration; VIGIL_API_URL must be an HTTP(S) origin without credentials or a path.");
        }
    }

    private static SSLContext tls(String caPath) {
        try (var stream = Files.newInputStream(Path.of(caPath))) {
            var certificates = CertificateFactory.getInstance("X.509").generateCertificates(stream);
            if (certificates.isEmpty()) throw new IllegalArgumentException();
            KeyStore store = KeyStore.getInstance(KeyStore.getDefaultType());
            store.load(null, null);
            int index = 0;
            for (var certificate : certificates) store.setCertificateEntry("ca-" + index++, certificate);
            var managers = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm());
            managers.init(store);
            SSLContext context = SSLContext.getInstance("TLS");
            context.init(null, managers.getTrustManagers(), null);
            return context;
        } catch (Exception e) {
            throw new Failure("Could not load TLS trust; check VIGIL_TLS_CA_PATH inside the container.");
        }
    }

    private void execute(String command, String email) {
        VerifiedUsers verified = verifiedUsers();
        List<User> snapshot = verified.users();
        User account = backingUser(snapshot);
        if (account == null || !account.role().equals("admin")) throw new Failure("API-key backing account verification failed; no user operation was attempted.");
        switch (command) {
            case "restore-api-user" -> out.println("API backing account verified as admin; existing passwords preserved.");
            case "reset-password" -> reset(snapshot, account, email, verified.auth());
            case "delete-all-accounts" -> delete(snapshot, account, verified.auth());
            default -> throw new Failure("Unknown command.");
        }
    }

    private VerifiedUsers verifiedUsers() {
        String auth = "ApiKey " + readKey();
        try {
            return new VerifiedUsers(users(auth), auth);
        } catch (HttpFailure failure) {
            if (failure.status != 401 && failure.status != 403) throw failure;
            Recovery account = recovery.get();
            ApiAccountRecovery.State state = account.state();
            if (state == ApiAccountRecovery.State.READY) {
                throw new Failure("GET /api/users: HTTP " + failure.status + ". The API backing account is already admin; "
                        + "check for a stale or mismatched live API key or API URL. No account was changed.");
            }
            out.println("These commands use a dedicated admin account (" + API_EMAIL + ") to authenticate with the API key.");
            out.println(state == ApiAccountRecovery.State.MISSING
                    ? "That account is missing, so API-key commands cannot run. Creating it restores API-key access."
                    : "That account no longer has admin permissions, so API-key commands cannot run. Restoring its role restores access.");
            out.println("Recovery changes only this service account in the container database; the live API key is not reset or rotated.");
            String action = state == ApiAccountRecovery.State.MISSING ? "Create this service account and continue" : "Restore its admin role and continue";
            if (!Set.of("y", "yes").contains(line(action + "? [y/N] ").strip().toLowerCase(Locale.ROOT))) {
                throw new Failure("Cancelled; the API backing account was not changed.");
            }
            account.repair();
            // Re-read only after an approved repair, so a concurrently published live key can be used.
            auth = "ApiKey " + readKey();
            return new VerifiedUsers(users(auth), auth);
        }
    }

    private String readKey() {
        try {
            String key = keyReader.read(keyFile);
            if (key == null || key.isBlank()) throw new IOException();
            return key;
        } catch (IOException e) {
            throw new Failure("Could not read the running API key; check VIGIL_API_KEY_FILE and its private file permissions inside the container.");
        }
    }

    private void reset(List<User> snapshot, User account, String email, String auth) {
        List<User> matches = snapshot.stream().filter(u -> u.email().equalsIgnoreCase(email)).toList();
        if (matches.isEmpty()) throw new Failure("Account not found: " + email + ". Password was not changed.");
        if (matches.size() != 1 || matches.getFirst().id().equals(account.id())) throw new Failure("Exactly one matching human account is required.");
        String password = password("New password: ");
        if (!password.equals(password("Confirm new password: "))) throw new Failure("Passwords do not match; password not changed.");
        if (!validPassword(password)) throw new Failure("Password must be at least 8 characters, at most 72 UTF-8 bytes, and include uppercase, lowercase, a digit and one of @#$%^&+=! (no line breaks).");
        request("PATCH", userPath(matches.getFirst()), auth, Map.of("password", password));
        out.println("Password reset. Existing sessions are not revoked by this endpoint.");
    }

    static boolean validPassword(String password) {
        return PASSWORD.matcher(password).matches() && password.getBytes(StandardCharsets.UTF_8).length <= 72;
    }

    private void delete(List<User> snapshot, User account, String auth) {
        List<User> targets = snapshot.stream().filter(u -> !u.id().equals(account.id()) && !u.email().equalsIgnoreCase(API_EMAIL)).toList();
        out.printf("Snapshot contains %d human account(s); the API backing account is preserved.%nDeletions are non-atomic; partial deletion is possible.%n", targets.size());
        if (!line("Type " + DELETE_CONFIRMATION + " to continue: ").equals(DELETE_CONFIRMATION)) throw new Failure("Cancelled; no accounts deleted.");
        int deleted = 0;
        for (User user : targets) {
            try {
                request("DELETE", userPath(user), auth, null);
            } catch (Failure e) {
                throw new Failure("Deletion stopped: " + deleted + "/" + targets.size() + " confirmed deleted. Partial deletion is possible. " + e.getMessage());
            }
            out.printf("Deleted %d/%d human account(s).%n", ++deleted, targets.size());
        }
        out.printf("Done: %d human account(s) deleted; API backing account preserved.%n", deleted);
    }

    private List<User> users(String auth) {
        Object response = request("GET", "/api/users", auth, null);
        if (!(response instanceof List<?> list)) throw new Failure("The API returned an unexpected users response.");
        List<User> users = new ArrayList<>();
        for (Object user : list) {
            try {
                users.add(new User(UUID.fromString(field(user, "id")), field(user, "email"), field(user, "role")));
            } catch (IllegalArgumentException e) {
                throw new Failure("The API returned an unexpected users response.");
            }
        }
        return users;
    }

    private static User backingUser(List<User> users) {
        List<User> matches = users.stream().filter(u -> u.email().equalsIgnoreCase(API_EMAIL)).toList();
        if (matches.size() > 1) throw new Failure("Multiple API backing accounts found; resolve them before continuing.");
        return matches.isEmpty() ? null : matches.getFirst();
    }

    private static String field(Object response, String name) {
        if (response instanceof Map<?, ?> map && map.get(name) instanceof String value && !value.isBlank()) return value;
        throw new Failure("The API returned an unexpected response (missing " + name + ").");
    }

    private static String userPath(User user) { return "/api/users/" + user.id(); }
    private String line(String prompt) {
        String value = input.line(prompt);
        if (value == null) throw new Failure("Cancelled.");
        return value;
    }
    private String password(String prompt) {
        char[] value = input.password(prompt);
        if (value == null) throw new Failure("Cancelled.");
        try { return new String(value); } finally { Arrays.fill(value, '\0'); }
    }

    private void awaitRequestBudget() {
        if (requestsInBudget == ApiRateLimitPolicy.CAPACITY) {
            out.printf("Request budget used; waiting %d seconds for rate-limit refill.%n",
                    ApiRateLimitPolicy.REFILL_PERIOD.toSeconds());
            try {
                // A full period after the last completed request avoids depending on server window alignment.
                sleeper.sleep(ApiRateLimitPolicy.REFILL_PERIOD);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new Failure("Interrupted while waiting for rate-limit refill; next request was not sent.");
            }
            requestsInBudget = 0;
        }
        requestsInBudget++;
    }

    private Object request(String method, String path, String auth, Map<String, String> payload) {
        var request = HttpRequest.newBuilder(URI.create(base + path)).timeout(TIMEOUT).header("Accept", "application/json");
        if (auth != null) request.header("Authorization", auth);

        if (payload != null) request.header("Content-Type", "application/json");
        request.method(method, payload == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofByteArray(json.writeValueAsBytes(payload)));
        awaitRequestBudget();
        var pending = http.sendAsync(request.build(), HttpResponse.BodyHandlers.ofByteArray());
        HttpResponse<byte[]> response;
        try {
            response = pending.get(TIMEOUT.toSeconds(), TimeUnit.SECONDS);
        } catch (ExecutionException | TimeoutException | InterruptedException e) {
            pending.cancel(true);
            if (e instanceof InterruptedException) Thread.currentThread().interrupt();
            throw new Failure(method + " " + path + ": connection/TLS/timeout failure. Check the URL and Java trust or VIGIL_TLS_CA_PATH. No retry was made; a mutation may have completed.");
        }
        int status = response.statusCode();
        if (status < 200 || status >= 300) throw new HttpFailure(method, path, status);
        try {
            return response.body().length == 0 ? null : json.readValue(response.body(), Object.class);
        } catch (JacksonException e) {
            throw new Failure(method + " " + path + ": invalid JSON response; a mutation may have completed.");
        }
    }
}
