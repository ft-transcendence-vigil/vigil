package com.ft_transcendence.vigil.cli;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.security.SecureRandom;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Arrays;
import java.util.HexFormat;
import java.util.Map;
import java.util.Properties;
import java.util.UUID;

/** Database access is deliberately limited to the fixed API-key identity, never CLI user arguments. */
final class ApiAccountRecovery implements ApiAdminCli.Recovery {
    private static final String EMAIL = "mustbe@api.email";
    private static final int TIMEOUT_SECONDS = 10;
    private static final String DATABASE_HELP = "Check database availability, permissions and SPRING_DATASOURCE_URL/USERNAME/PASSWORD inside the container.";

    enum State { READY, MISSING, DEMOTED }

    @FunctionalInterface
    interface Connections {
        Connection open() throws SQLException;
    }

    static final class Failure extends RuntimeException {
        Failure(String message) { super(message); }
    }

    private record Account(UUID id, String role) {}
    private final Connections connections;

    ApiAccountRecovery(Map<String, String> env) {
        this(() -> connect(env));
    }

    ApiAccountRecovery(Connections connections) {
        this.connections = connections;
    }

    @Override
    public State state() {
        try (Connection connection = connections.open()) {
            Account account = find(connection, false);
            return account == null ? State.MISSING : "ADMIN".equals(account.role()) ? State.READY : State.DEMOTED;
        } catch (SQLException | RuntimeException e) {
            throw new Failure("Could not inspect the API backing account; no database change was attempted. " + DATABASE_HELP);
        }
    }

    @Override
    public void repair() {
        try (Connection connection = connections.open()) {
            connection.setAutoCommit(false);
            try {
                // Re-check under a row lock: state may have changed while confirmation was pending.
                Account account = find(connection, true);
                if (account == null) {
                    create(connection);
                } else if (!"ADMIN".equals(account.role())) {
                    try (PreparedStatement statement = connection.prepareStatement("UPDATE users SET role = ? WHERE email = ? AND id = ?")) {
                        statement.setQueryTimeout(TIMEOUT_SECONDS);
                        statement.setString(1, "ADMIN");
                        statement.setString(2, EMAIL);
                        statement.setObject(3, account.id());
                        if (statement.executeUpdate() != 1) throw new SQLException("Unexpected account count");
                    }
                }
                connection.commit();
            } catch (SQLException | RuntimeException e) {
                boolean rolledBack = false;
                try {
                    connection.rollback();
                    rolledBack = true;
                } catch (SQLException ignored) {
                    // The connection may have failed; never claim a confirmed rollback in that case.
                }
                if (e instanceof SQLException sql && "23505".equals(sql.getSQLState()) && rolledBack) {
                    throw new Failure("The API backing account changed concurrently; recovery was rolled back without overwriting it. No automatic retry was made; run the command again to verify.");
                }
                throw new Failure("API backing account recovery failed; "
                        + (rolledBack ? "the transaction was rolled back. " : "the database outcome could not be confirmed. ")
                        + "No automatic retry was made. " + DATABASE_HELP);
            }
        } catch (SQLException e) {
            throw new Failure("Could not complete API backing account recovery; the database outcome could not be confirmed. No automatic retry was made. " + DATABASE_HELP);
        }
    }

    private static Connection connect(Map<String, String> env) throws SQLException {
        String url = env.get("SPRING_DATASOURCE_URL");
        String username = env.get("SPRING_DATASOURCE_USERNAME");
        String password = env.get("SPRING_DATASOURCE_PASSWORD");
        if (url == null || url.isBlank() || username == null || username.isBlank() || password == null) {
            throw new SQLException("Missing datasource configuration");
        }
        Properties properties = new Properties();
        properties.setProperty("user", username);
        properties.setProperty("password", password);
        if (url.startsWith("jdbc:postgresql:")) {
            // Driver-local timeouts, not DriverManager's process-wide login timeout.
            properties.setProperty("connectTimeout", Integer.toString(TIMEOUT_SECONDS));
            properties.setProperty("socketTimeout", Integer.toString(TIMEOUT_SECONDS));
            properties.setProperty("loginTimeout", Integer.toString(TIMEOUT_SECONDS));
        }
        return DriverManager.getConnection(url, properties);
    }

    private static Account find(Connection connection, boolean lock) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement("SELECT id, role FROM users WHERE email = ?" + (lock ? " FOR UPDATE" : ""))) {
            statement.setQueryTimeout(TIMEOUT_SECONDS);
            statement.setString(1, EMAIL);
            try (ResultSet rows = statement.executeQuery()) {
                if (!rows.next()) return null;
                Account account = new Account(rows.getObject("id", UUID.class), rows.getString("role"));
                if (rows.next()) throw new SQLException("Ambiguous fixed identity");
                return account;
            }
        }
    }

    private static void create(Connection connection) throws SQLException {
        byte[] random = new byte[32];
        String passwordHash;
        try {
            new SecureRandom().nextBytes(random);
            passwordHash = new BCryptPasswordEncoder().encode(HexFormat.of().formatHex(random));
        } finally {
            Arrays.fill(random, (byte) 0);
        }
        try (PreparedStatement statement = connection.prepareStatement("INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)")) {
            statement.setQueryTimeout(TIMEOUT_SECONDS);
            statement.setObject(1, UUID.randomUUID());
            statement.setString(2, EMAIL);
            statement.setString(3, passwordHash);
            statement.setString(4, "ADMIN");
            if (statement.executeUpdate() != 1) throw new SQLException("Unexpected account count");
        }
    }
}
