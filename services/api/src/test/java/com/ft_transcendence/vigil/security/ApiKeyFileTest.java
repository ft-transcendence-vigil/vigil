package com.ft_transcendence.vigil.security;

import com.ft_transcendence.vigil.configuration.VigilProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.context.properties.bind.Binder;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.SystemEnvironmentPropertySource;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.nio.channels.Channels;
import java.nio.channels.SeekableByteChannel;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.nio.file.attribute.PosixFileAttributeView;
import java.nio.file.attribute.PosixFilePermissions;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

class ApiKeyFileTest {
    private static final String KEY = "actual-running-test-key-é";
    @TempDir Path temporary;
    private Path root;

    @BeforeEach
    void useRealPosixPaths() throws IOException {
        root = temporary.toRealPath();
        assumeTrue(Files.getFileStore(root).supportsFileAttributeView(PosixFileAttributeView.class));
    }

    @Test
    void publishesExactUtf8KeyWithoutNewlineWithPrivatePermissionsAndOwnership() throws IOException {
        Path file = publish();

        assertArrayEquals(KEY.getBytes(StandardCharsets.UTF_8), Files.readAllBytes(file));
        assertEquals(KEY, ApiKeyFile.read(file));
        assertTrue(Files.isRegularFile(file, LinkOption.NOFOLLOW_LINKS));
        assertEquals(PosixFilePermissions.fromString("rw-------"), Files.getPosixFilePermissions(file));
        assertEquals(PosixFilePermissions.fromString("rwx------"), Files.getPosixFilePermissions(file.getParent()));
        assertEquals(Files.getOwner(root), Files.getOwner(file, LinkOption.NOFOLLOW_LINKS));
        assertEquals(Files.getOwner(root), Files.getOwner(file.getParent(), LinkOption.NOFOLLOW_LINKS));
        try (var entries = Files.list(file.getParent())) {
            assertEquals(List.of(file), entries.toList());
        }
    }

    @Test
    void replacesStaleKeyAtomicallyInsteadOfTruncatingItsInode() throws IOException {
        Path file = publish();
        try (SeekableByteChannel previous = Files.newByteChannel(file,
                StandardOpenOption.READ, LinkOption.NOFOLLOW_LINKS)) {
            ApiKeyFile.publish(file, "replacement-test-key");
            assertEquals("replacement-test-key", ApiKeyFile.read(file));
            assertArrayEquals(KEY.getBytes(StandardCharsets.UTF_8), Channels.newInputStream(previous).readAllBytes());
        }
        try (var entries = Files.list(file.getParent())) {
            assertEquals(List.of(file), entries.toList());
        }
    }

    @Test
    void createsOnlyPrivateLeafWithoutChangingExistingAncestorPermissions() throws IOException {
        Path ancestor = Files.createDirectory(root.resolve("existing"));
        Files.setPosixFilePermissions(ancestor, PosixFilePermissions.fromString("rwxr-xr-x"));
        Files.writeString(ancestor.resolve("unrelated"), "unchanged");
        Path file = ancestor.resolve("credentials/api-key");

        ApiKeyFile.publish(file, KEY);

        assertEquals(KEY, ApiKeyFile.read(file));
        assertEquals(PosixFilePermissions.fromString("rwxr-xr-x"), Files.getPosixFilePermissions(ancestor));
        assertEquals("unchanged", Files.readString(ancestor.resolve("unrelated")));
    }

    @Test
    void doesNotCreateMissingIntermediateDirectories() {
        Path missing = root.resolve("missing");
        assertThrows(IOException.class, () -> ApiKeyFile.publish(missing.resolve("credentials/api-key"), KEY));
        assertFalse(Files.exists(missing, LinkOption.NOFOLLOW_LINKS));
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void hardensOwnedDedicatedVolumeRootBeforePublishing(boolean hasStaleKey) throws IOException {
        Path parent = Files.createDirectory(root.resolve("credentials"));
        Files.setPosixFilePermissions(parent, PosixFilePermissions.fromString("rwxr-xr-x"));
        Path file = parent.resolve("api-key");
        if (hasStaleKey) {
            Files.writeString(file, "stale-test-key");
            Files.setPosixFilePermissions(file, PosixFilePermissions.fromString("rw-r--r--"));
        }

        ApiKeyFile.publish(file, KEY);

        assertEquals(KEY, ApiKeyFile.read(file));
        assertEquals(PosixFilePermissions.fromString("rwx------"), Files.getPosixFilePermissions(parent));
        assertEquals(PosixFilePermissions.fromString("rw-------"), Files.getPosixFilePermissions(file));
    }

    @Test
    void refusesToChmodAnUnrelatedExistingDirectory() throws IOException {
        Path parent = Files.createDirectory(root.resolve("not-dedicated"));
        Files.setPosixFilePermissions(parent, PosixFilePermissions.fromString("rwxr-xr-x"));
        Files.writeString(parent.resolve("unrelated"), "unchanged");
        Path file = parent.resolve("api-key");

        assertThrows(IOException.class, () -> ApiKeyFile.publish(file, KEY));

        assertFalse(Files.exists(file, LinkOption.NOFOLLOW_LINKS));
        assertEquals(PosixFilePermissions.fromString("rwxr-xr-x"), Files.getPosixFilePermissions(parent));
        assertEquals("unchanged", Files.readString(parent.resolve("unrelated")));
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void rejectsFileSymlinksIncludingDanglingOnes(boolean dangling) throws IOException {
        Path file = root.resolve("credentials/api-key");
        Files.createDirectory(file.getParent(), PosixFilePermissions.asFileAttribute(
                PosixFilePermissions.fromString("rwx------")));
        Path target = root.resolve("unrelated");
        if (!dangling) Files.writeString(target, "unchanged");
        Files.createSymbolicLink(file, target);

        assertThrows(IOException.class, () -> ApiKeyFile.publish(file, KEY));
        assertThrows(IOException.class, () -> ApiKeyFile.read(file));
        assertTrue(Files.isSymbolicLink(file));
        if (dangling) assertFalse(Files.exists(target, LinkOption.NOFOLLOW_LINKS));
        else assertEquals("unchanged", Files.readString(target));
    }

    @Test
    void rejectsSymlinkParentWithoutChangingTheActualKey() throws IOException {
        Path file = publish();
        Path alias = Files.createSymbolicLink(root.resolve("alias"), file.getParent()).resolve("api-key");

        assertThrows(IOException.class, () -> ApiKeyFile.publish(alias, "replacement-test-key"));
        assertThrows(IOException.class, () -> ApiKeyFile.read(alias));
        assertEquals(KEY, ApiKeyFile.read(file));
    }

    @Test
    void rejectsSymlinksInEarlierPathComponents() throws IOException {
        Path ancestor = Files.createDirectory(root.resolve("ancestor"));
        Path file = ancestor.resolve("credentials/api-key");
        ApiKeyFile.publish(file, KEY);
        Path alias = Files.createSymbolicLink(root.resolve("alias"), ancestor).resolve("credentials/api-key");

        assertThrows(IOException.class, () -> ApiKeyFile.publish(alias, "replacement-test-key"));
        assertThrows(IOException.class, () -> ApiKeyFile.read(alias));
        assertEquals(KEY, ApiKeyFile.read(file));
    }

    @Test
    void rejectsNonRegularCredentialFiles() throws IOException {
        Path file = publish();
        Files.delete(file);
        Files.createDirectory(file);

        assertThrows(IOException.class, () -> ApiKeyFile.publish(file, KEY));
        assertThrows(IOException.class, () -> ApiKeyFile.read(file));
        assertTrue(Files.isDirectory(file, LinkOption.NOFOLLOW_LINKS));
    }

    @ParameterizedTest
    @ValueSource(strings = {"rw-r--r--", "rw-rw----", "rwx------", "r--------"})
    void readRejectsIncorrectFilePermissionsWithoutRepairingThem(String permissions) throws IOException {
        Path file = publish();
        var expected = PosixFilePermissions.fromString(permissions);
        Files.setPosixFilePermissions(file, expected);

        IOException failure = assertThrows(IOException.class, () -> ApiKeyFile.read(file));

        assertEquals(expected, Files.getPosixFilePermissions(file));
        assertNoKeyInDiagnostics(failure, KEY);
    }

    @ParameterizedTest
    @ValueSource(strings = {"rwxr-xr-x", "rwx--x---", "r-x------"})
    void readRejectsIncorrectDirectoryPermissionsWithoutRepairingThem(String permissions) throws IOException {
        Path file = publish();
        var expected = PosixFilePermissions.fromString(permissions);
        Files.setPosixFilePermissions(file.getParent(), expected);
        try {
            assertThrows(IOException.class, () -> ApiKeyFile.read(file));
            assertEquals(expected, Files.getPosixFilePermissions(file.getParent()));
        } finally {
            Files.setPosixFilePermissions(file.getParent(), PosixFilePermissions.fromString("rwx------"));
        }
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {" ", "\t", " leading", "trailing ", "embedded space", "line\nbreak",
            "carriage\rreturn", "tab\tkey", "nonbreaking\u00a0space", "control\u0000character"})
    void publishRejectsInvalidKeysBeforeTouchingTheFilesystem(String key) {
        Path parent = root.resolve("credentials");
        assertThrows(IOException.class, () -> ApiKeyFile.publish(parent.resolve("api-key"), key));
        assertFalse(Files.exists(parent, LinkOption.NOFOLLOW_LINKS));
    }

    @ParameterizedTest
    @ValueSource(strings = {"", " ", " leading", "trailing ", "embedded space", "key\n", "key\r\n",
            "nonbreaking\u00a0space", "control\u0000character"})
    void readRejectsInvalidContentsInsteadOfTrimmingThem(String key) throws IOException {
        Path file = publish();
        Files.writeString(file, key);
        assertThrows(IOException.class, () -> ApiKeyFile.read(file));
        assertEquals(key, Files.readString(file));
    }

    @Test
    void readRejectsMalformedUtf8() throws IOException {
        Path file = publish();
        Files.write(file, new byte[] {(byte) 0xc3, 0x28});
        assertThrows(IOException.class, () -> ApiKeyFile.read(file));
    }

    @Test
    void diagnosticsNeverIncludeCredentialContents() throws IOException {
        Path file = publish();
        String invalid = KEY + "\n";
        assertNoKeyInDiagnostics(assertThrows(IOException.class, () -> ApiKeyFile.publish(file, invalid)), KEY);
        Files.writeString(file, invalid);
        assertNoKeyInDiagnostics(assertThrows(IOException.class, () -> ApiKeyFile.read(file)), KEY);
    }

    @Test
    void pathsMustNameAFileWithoutParentTraversal() throws IOException {
        Path file = publish();
        for (Path invalid : List.of(Path.of(""), root.getRoot(), root.resolve("."),
                root.resolve("credentials/../credentials/api-key"))) {
            assertThrows(IOException.class, () -> ApiKeyFile.publish(invalid, KEY));
            assertThrows(IOException.class, () -> ApiKeyFile.read(invalid));
        }
        assertThrows(IOException.class, () -> ApiKeyFile.publish(null, KEY));
        assertThrows(IOException.class, () -> ApiKeyFile.read(null));
        assertEquals(KEY, ApiKeyFile.read(file));
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {" ", "\t"})
    void unconfiguredPublicationLeavesExistingDefaultGenerationUnchanged(String path) {
        VigilProperties properties = new VigilProperties();
        properties.setApiKeyFile(path);

        initialize(properties);

        assertNotNull(UUID.fromString(properties.getApiKey()));
        assertNotNull(UUID.fromString(properties.getIngestionKey()));
        assertFalse(properties.getJwtSecret().isBlank());
        assertEquals("http://localhost:3000", properties.getFrontEndUrl());
    }

    @Test
    void initializationPublishesTheConfiguredKeyUnchanged() throws IOException {
        Path file = root.resolve("credentials/api-key");
        VigilProperties properties = new VigilProperties();
        properties.setApiKey(KEY);
        properties.setApiKeyFile(file.toString());

        initialize(properties);

        assertEquals(KEY, properties.getApiKey());
        assertEquals(KEY, ApiKeyFile.read(file));
        assertEquals("http://localhost:3000", properties.getFrontEndUrl());
        assertEquals(properties.getFrontEndUrl(), properties.getFrontendBaseUrl());
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void frontendUrlAliasesRemainCompatibleWhenPublishingTheApiKey(boolean useBaseUrl) throws IOException {
        Path file = root.resolve("credentials/api-key");
        VigilProperties properties = new VigilProperties();
        properties.setApiKey(KEY);
        properties.setApiKeyFile(file.toString());
        String frontend = "https://vigil.example.test";
        if (useBaseUrl) properties.setFrontendBaseUrl(frontend);
        else properties.setFrontEndUrl(frontend);

        initialize(properties);

        assertEquals(frontend, properties.getFrontEndUrl());
        assertEquals(frontend, properties.getFrontendBaseUrl());
        assertEquals(KEY, ApiKeyFile.read(file));
    }

    @Test
    void eachStartupPublishesNewlyGeneratedKeyRatherThanUsingTheStaleFileAsASource() throws IOException {
        Path file = publish();
        VigilProperties first = new VigilProperties();
        first.setApiKeyFile(file.toString());
        initialize(first);
        assertNotEquals(KEY, first.getApiKey());
        assertNotNull(UUID.fromString(first.getApiKey()));
        assertEquals(first.getApiKey(), ApiKeyFile.read(file));

        VigilProperties second = new VigilProperties();
        second.setApiKeyFile(file.toString());
        initialize(second);
        assertNotEquals(first.getApiKey(), second.getApiKey());
        assertEquals(second.getApiKey(), ApiKeyFile.read(file));
    }

    @Test
    void publicationFailureAbortsInitializationWithoutExposingTheKey() throws IOException {
        Path file = publish();
        Files.delete(file);
        Files.createSymbolicLink(file, root.resolve("missing"));
        VigilProperties properties = new VigilProperties();
        properties.setApiKey(KEY);
        properties.setApiKeyFile(file.toString());

        IllegalStateException failure = assertThrows(IllegalStateException.class, () -> initialize(properties));

        assertInstanceOf(IOException.class, failure.getCause());
        assertEquals(KEY, properties.getApiKey());
        assertNoKeyInDiagnostics(failure, KEY);
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void springBindsThePropertyAndExplicitEnvironmentVariable(boolean environmentVariable) throws IOException {
        Path file = root.resolve("credentials/api-key");
        MockEnvironment environment = new MockEnvironment();
        if (environmentVariable) {
            environment.getPropertySources().addFirst(new SystemEnvironmentPropertySource("test-env",
                    Map.of("VIGIL_API_KEY_FILE", file.toString())));
        } else {
            environment.getPropertySources().addFirst(new MapPropertySource("test-properties",
                    Map.of("vigil.api-key-file", file.toString())));
        }
        VigilProperties properties = Binder.get(environment).bind("vigil", VigilProperties.class).get();

        assertEquals(file.toString(), properties.getApiKeyFile());
        initialize(properties);
        assertEquals(properties.getApiKey(), ApiKeyFile.read(file));
    }

    private Path publish() throws IOException {
        Path file = root.resolve("credentials/api-key");
        ApiKeyFile.publish(file, KEY);
        return file;
    }

    private static void initialize(VigilProperties properties) {
        ReflectionTestUtils.invokeMethod(properties, "init");
    }

    private static void assertNoKeyInDiagnostics(Throwable failure, String key) {
        StringWriter diagnostics = new StringWriter();
        failure.printStackTrace(new PrintWriter(diagnostics));
        assertFalse(diagnostics.toString().contains(key), "Credential contents leaked into exception diagnostics");
    }
}
