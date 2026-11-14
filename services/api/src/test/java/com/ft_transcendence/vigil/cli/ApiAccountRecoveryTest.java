package com.ft_transcendence.vigil.cli;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

class ApiAccountRecoveryTest {
    private static final String EMAIL = "mustbe@api.email";
    private static final String SECRET = "database-secret-not-for-output";
    private static final String ORIGINAL_PASSWORD = "Original42!";
    private record Row(UUID id, String email, String passwordHash, String role) {}

    private String url;
    private Map<String, String> env;
    private ApiAccountRecovery recovery;
    private Connection schemaConnection;
    private Row humanAdmin;
    private Row humanViewer;

    @BeforeEach
    void database() throws SQLException {
        url = "jdbc:h2:mem:cli-recovery-" + UUID.randomUUID() + ";MODE=PostgreSQL;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=1000";
        env = Map.of("SPRING_DATASOURCE_URL", url, "SPRING_DATASOURCE_USERNAME", "sa", "SPRING_DATASOURCE_PASSWORD", "");
        recovery = new ApiAccountRecovery(env);
        // H2's cached IN-check comparison retains the DDL session, so keep it open until teardown.
        schemaConnection = open();
        try (var statement = schemaConnection.createStatement()) {
            statement.execute("CREATE TABLE users (id UUID PRIMARY KEY, email VARCHAR(255) NOT NULL UNIQUE, "
                    + "password_hash VARCHAR(255) NOT NULL, role VARCHAR(255) NOT NULL CHECK (role IN ('ADMIN', 'VIEWER')))");
        }
        humanAdmin = insert("admin@example.com", "ADMIN", "unchanged-human-admin-hash");
        humanViewer = insert("viewer@example.com", "VIEWER", "unchanged-human-viewer-hash");
    }

    @AfterEach
    void humansUnchangedAndDatabaseClosed() throws SQLException {
        try {
            if (humanAdmin != null) assertEquals(humanAdmin, row(humanAdmin.email()));
            if (humanViewer != null) assertEquals(humanViewer, row(humanViewer.email()));
        } finally {
            if (schemaConnection != null) {
                try (Connection connection = schemaConnection; var statement = connection.createStatement()) {
                    statement.execute("SHUTDOWN");
                }
            }
        }
    }

    private Connection open() throws SQLException {
        assertTrue(url.startsWith("jdbc:h2:mem:cli-recovery-"));
        return DriverManager.getConnection(url, "sa", "");
    }

    private Row insert(String email, String role, String hash) throws SQLException {
        Row row = new Row(UUID.randomUUID(), email, hash, role);
        try (Connection connection = open(); PreparedStatement statement = connection.prepareStatement(
                "INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)")) {
            statement.setObject(1, row.id());
            statement.setString(2, row.email());
            statement.setString(3, row.passwordHash());
            statement.setString(4, row.role());
            assertEquals(1, statement.executeUpdate());
        }
        return row;
    }

    private Row row(String email) throws SQLException {
        try (Connection connection = open(); PreparedStatement statement = connection.prepareStatement(
                "SELECT id, email, password_hash, role FROM users WHERE email = ?")) {
            statement.setString(1, email);
            try (ResultSet rows = statement.executeQuery()) {
                if (!rows.next()) return null;
                Row row = new Row(rows.getObject("id", UUID.class), rows.getString("email"), rows.getString("password_hash"), rows.getString("role"));
                assertFalse(rows.next());
                return row;
            }
        }
    }

    private int count() throws SQLException {
        try (Connection connection = open(); var statement = connection.createStatement(); var rows = statement.executeQuery("SELECT COUNT(*) FROM users")) {
            assertTrue(rows.next());
            return rows.getInt(1);
        }
    }

    @FunctionalInterface
    private interface StatementHook {
        Object invoke(String sql, PreparedStatement target, Method method, Object[] args) throws Throwable;
    }

    private ApiAccountRecovery withStatements(StatementHook hook) {
        return new ApiAccountRecovery(() -> {
            Connection target = open();
            return (Connection) Proxy.newProxyInstance(Connection.class.getClassLoader(), new Class<?>[]{Connection.class}, (proxy, method, args) -> {
                Object result = invoke(target, method, args);
                if (method.getName().equals("prepareStatement")) {
                    String sql = (String) args[0];
                    PreparedStatement statement = (PreparedStatement) result;
                    return Proxy.newProxyInstance(PreparedStatement.class.getClassLoader(), new Class<?>[]{PreparedStatement.class},
                            (statementProxy, statementMethod, statementArgs) -> hook.invoke(sql, statement, statementMethod, statementArgs));
                }
                return result;
            });
        });
    }

    private static Object invoke(Object target, Method method, Object[] args) throws Throwable {
        try {
            return method.invoke(target, args);
        } catch (InvocationTargetException e) {
            throw e.getCause();
        }
    }

    private static void safeFailure(ApiAccountRecovery.Failure failure) {
        assertFalse(failure.getMessage().contains(SECRET));
        assertFalse(failure.getMessage().contains("jdbc:"));
        assertNull(failure.getCause(), "Driver exception details may contain database credentials");
    }

    @Test
    void missingStateIsReadOnly() throws SQLException {
        assertEquals(ApiAccountRecovery.State.MISSING, recovery.state());
        assertEquals(2, count());
        assertNull(row(EMAIL));
    }

    @Test
    void readyStateIsReadOnly() throws SQLException {
        Row original = insert(EMAIL, "ADMIN", "existing-service-account-hash");
        assertEquals(ApiAccountRecovery.State.READY, recovery.state());
        assertEquals(original, row(EMAIL));
        assertEquals(3, count());
    }

    @Test
    void demotedStateIsReadOnly() throws SQLException {
        Row original = insert(EMAIL, "VIEWER", "existing-service-account-hash");
        assertEquals(ApiAccountRecovery.State.DEMOTED, recovery.state());
        assertEquals(original, row(EMAIL));
    }

    @Test
    void createsOnlyFixedIdentityWithUuidAdminAndDiscardedBcryptPassword() throws SQLException {
        recovery.repair();
        Row created = row(EMAIL);
        assertNotNull(created);
        assertNotNull(created.id());
        assertEquals(4, created.id().version());
        assertEquals(EMAIL, created.email());
        assertEquals("ADMIN", created.role());
        assertTrue(created.passwordHash().matches("\\$2[aby]\\$10\\$[./A-Za-z0-9]{53}"));
        BCryptPasswordEncoder bcrypt = new BCryptPasswordEncoder();
        for (String known : List.of("", EMAIL, "admin", "password", ORIGINAL_PASSWORD)) {
            assertFalse(bcrypt.matches(known, created.passwordHash()));
        }
        assertEquals(ApiAccountRecovery.State.READY, recovery.state());
        assertEquals(3, count());
    }

    @Test
    void repeatedRepairPreservesIdAndPasswordHash() throws SQLException {
        recovery.repair();
        Row created = row(EMAIL);
        recovery.repair();
        recovery.repair();
        assertEquals(created, row(EMAIL));
        assertEquals(3, count());
    }

    @Test
    void demotedRepairChangesOnlyRoleAndPreservesWorkingPasswordAndId() throws SQLException {
        String hash = new BCryptPasswordEncoder().encode(ORIGINAL_PASSWORD);
        Row original = insert(EMAIL, "VIEWER", hash);
        recovery.repair();
        Row repaired = row(EMAIL);
        assertEquals(new Row(original.id(), EMAIL, hash, "ADMIN"), repaired);
        assertTrue(new BCryptPasswordEncoder().matches(ORIGINAL_PASSWORD, repaired.passwordHash()));
        assertEquals(3, count());
    }

    @Test
    void alreadyAdminRepairDoesNotGenerateOrReplaceCredentials() throws SQLException {
        Row original = insert(EMAIL, "ADMIN", "existing-service-account-hash");
        AtomicInteger writes = new AtomicInteger();
        ApiAccountRecovery checked = withStatements((sql, target, method, args) -> {
            if (method.getName().equals("executeUpdate")) writes.incrementAndGet();
            return invoke(target, method, args);
        });
        checked.repair();
        assertEquals(0, writes.get());
        assertEquals(original, row(EMAIL));
    }

    @Test
    void accountCreatedWhileConfirmationPendingIsNotOverwritten() throws SQLException {
        assertEquals(ApiAccountRecovery.State.MISSING, recovery.state());
        Row concurrent = insert(EMAIL, "ADMIN", "concurrently-created-password-hash");
        recovery.repair();
        assertEquals(concurrent, row(EMAIL));
    }

    @Test
    void demotedAccountCreatedWhileConfirmationPendingPreservesItsIdAndHash() throws SQLException {
        assertEquals(ApiAccountRecovery.State.MISSING, recovery.state());
        Row concurrent = insert(EMAIL, "VIEWER", "concurrently-created-password-hash");
        recovery.repair();
        assertEquals(new Row(concurrent.id(), EMAIL, concurrent.passwordHash(), "ADMIN"), row(EMAIL));
    }

    @Test
    void caseVariantsAndArbitraryOtherUsersAreNeverRecoveredOrModified() throws SQLException {
        Row caseVariant = insert("MUSTBE@API.EMAIL", "VIEWER", "case-variant-password-hash");
        Row arbitrary = insert("other@example.com", "VIEWER", "arbitrary-password-hash");
        assertEquals(ApiAccountRecovery.State.MISSING, recovery.state());
        recovery.repair();
        assertEquals(caseVariant, row(caseVariant.email()));
        assertEquals(arbitrary, row(arbitrary.email()));
        assertEquals("ADMIN", row(EMAIL).role());
        assertEquals(5, count());
    }

    @Test
    void failedInsertRollsBackWithoutPartialAccountOrHumanMutation() throws SQLException {
        AtomicInteger attempts = new AtomicInteger();
        ApiAccountRecovery failing = withStatements((sql, target, method, args) -> {
            Object result = invoke(target, method, args);
            if (sql.startsWith("INSERT") && method.getName().equals("executeUpdate")) {
                attempts.incrementAndGet();
                throw new SQLException(SECRET);
            }
            return result;
        });
        ApiAccountRecovery.Failure failure = assertThrows(ApiAccountRecovery.Failure.class, failing::repair);
        safeFailure(failure);
        assertTrue(failure.getMessage().contains("transaction was rolled back"));
        assertEquals(1, attempts.get());
        assertNull(row(EMAIL));
        assertEquals(2, count());
    }

    @Test
    void failedPromotionRollsBackPreservingOriginalRolePasswordAndId() throws SQLException {
        Row original = insert(EMAIL, "VIEWER", "existing-service-account-hash");
        AtomicInteger attempts = new AtomicInteger();
        ApiAccountRecovery failing = withStatements((sql, target, method, args) -> {
            Object result = invoke(target, method, args);
            if (sql.startsWith("UPDATE") && method.getName().equals("executeUpdate")) {
                attempts.incrementAndGet();
                throw new SQLException(SECRET);
            }
            return result;
        });
        ApiAccountRecovery.Failure failure = assertThrows(ApiAccountRecovery.Failure.class, failing::repair);
        safeFailure(failure);
        assertEquals(1, attempts.get());
        assertEquals(original, row(EMAIL));
    }

    @Test
    void failedCommitRollsBackAndDoesNotRetryMutation() throws SQLException {
        AtomicInteger commits = new AtomicInteger();
        ApiAccountRecovery failing = new ApiAccountRecovery(() -> {
            Connection target = open();
            return (Connection) Proxy.newProxyInstance(Connection.class.getClassLoader(), new Class<?>[]{Connection.class}, (proxy, method, args) -> {
                if (method.getName().equals("commit")) {
                    commits.incrementAndGet();
                    throw new SQLException(SECRET);
                }
                return invoke(target, method, args);
            });
        });
        ApiAccountRecovery.Failure failure = assertThrows(ApiAccountRecovery.Failure.class, failing::repair);
        safeFailure(failure);
        assertTrue(failure.getMessage().contains("transaction was rolled back"));
        assertEquals(1, commits.get());
        assertNull(row(EMAIL));
    }

    @Test
    void uniqueCreateRaceRollsBackWithoutOverwritingConcurrentIdentity() throws SQLException {
        AtomicInteger attempts = new AtomicInteger();
        List<Row> concurrent = new ArrayList<>();
        ApiAccountRecovery racing = withStatements((sql, target, method, args) -> {
            if (sql.startsWith("INSERT") && method.getName().equals("executeUpdate")) {
                assertEquals(1, attempts.incrementAndGet(), "Recovery must not retry a mutation");
                concurrent.add(insert(EMAIL, "ADMIN", "concurrently-created-password-hash"));
            }
            return invoke(target, method, args);
        });
        ApiAccountRecovery.Failure failure = assertThrows(ApiAccountRecovery.Failure.class, racing::repair);
        safeFailure(failure);
        assertTrue(failure.getMessage().contains("changed concurrently"));
        assertTrue(failure.getMessage().contains("without overwriting"));
        assertEquals(1, attempts.get());
        assertEquals(concurrent.getFirst(), row(EMAIL));
        assertEquals(3, count());
    }

    @Test
    void everyStatementHasTimeoutAndRepairLocksBeforeWriting() throws SQLException {
        List<String> executed = new ArrayList<>();
        ApiAccountRecovery checked = withStatements((sql, target, method, args) -> {
            if (method.getName().equals("executeQuery") || method.getName().equals("executeUpdate")) {
                assertEquals(10, target.getQueryTimeout());
                executed.add(sql);
            }
            return invoke(target, method, args);
        });
        checked.state();
        checked.repair();
        checked.repair();
        assertEquals(List.of(
                "SELECT id, role FROM users WHERE email = ?",
                "SELECT id, role FROM users WHERE email = ? FOR UPDATE",
                "INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)",
                "SELECT id, role FROM users WHERE email = ? FOR UPDATE"), executed);
        insert("other-demoted@example.com", "VIEWER", "other-password-hash");
        assertEquals("VIEWER", row("other-demoted@example.com").role());
    }

    @Test
    void inspectionConnectionFailureHasActionableDiagnosticWithoutDriverSecrets() throws SQLException {
        ApiAccountRecovery unreachable = new ApiAccountRecovery(() -> { throw new SQLException("jdbc:postgresql://" + SECRET); });
        ApiAccountRecovery.Failure failure = assertThrows(ApiAccountRecovery.Failure.class, unreachable::state);
        safeFailure(failure);
        assertTrue(failure.getMessage().contains("Could not inspect"));
        assertTrue(failure.getMessage().contains("no database change was attempted"));
        assertTrue(failure.getMessage().contains("SPRING_DATASOURCE_URL/USERNAME/PASSWORD"));
        assertEquals(2, count());
    }

    @Test
    void repairConnectionFailureDoesNotExposeDriverSecretsOrRetry() throws SQLException {
        AtomicInteger connections = new AtomicInteger();
        ApiAccountRecovery unreachable = new ApiAccountRecovery(() -> {
            connections.incrementAndGet();
            throw new SQLException("jdbc:postgresql://" + SECRET);
        });
        ApiAccountRecovery.Failure failure = assertThrows(ApiAccountRecovery.Failure.class, unreachable::repair);
        safeFailure(failure);
        assertTrue(failure.getMessage().contains("No automatic retry was made"));
        assertEquals(1, connections.get());
        assertEquals(2, count());
    }

    @Test
    void missingDatasourceConfigurationFailsWithoutEchoingValues() throws SQLException {
        for (String name : List.of("SPRING_DATASOURCE_URL", "SPRING_DATASOURCE_USERNAME", "SPRING_DATASOURCE_PASSWORD")) {
            Map<String, String> incomplete = new HashMap<>(env);
            incomplete.remove(name);
            ApiAccountRecovery missing = new ApiAccountRecovery(incomplete);
            safeFailure(assertThrows(ApiAccountRecovery.Failure.class, missing::state));
            safeFailure(assertThrows(ApiAccountRecovery.Failure.class, missing::repair));
        }
        assertEquals(2, count());
    }
}
