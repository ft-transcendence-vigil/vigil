package com.ft_transcendence.vigil.security;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.CharBuffer;
import java.nio.channels.Channels;
import java.nio.channels.FileChannel;
import java.nio.channels.FileLock;
import java.nio.channels.SeekableByteChannel;
import java.nio.charset.StandardCharsets;
import java.nio.file.DirectoryIteratorException;
import java.nio.file.DirectoryStream;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.NoSuchFileException;
import java.nio.file.Path;
import java.nio.file.SecureDirectoryStream;
import java.nio.file.StandardOpenOption;
import java.nio.file.attribute.PosixFileAttributeView;
import java.nio.file.attribute.PosixFileAttributes;
import java.nio.file.attribute.PosixFilePermission;
import java.nio.file.attribute.PosixFilePermissions;
import java.nio.file.attribute.UserPrincipal;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Set;
import java.util.UUID;

/** Persists the API credential and shares it with local administration commands. */
public final class ApiKeyFile {
    private static final Set<PosixFilePermission> DIRECTORY_PERMISSIONS =
            PosixFilePermissions.fromString("rwx------");
    private static final Set<PosixFilePermission> FILE_PERMISSIONS =
            PosixFilePermissions.fromString("rw-------");

    private static final String LOCK_FILE = ".api-key.lock";

    private ApiKeyFile() {}

    /** Reuses the persisted key; only a missing file permits generation of a new credential. */
    public static synchronized String loadOrCreate(Path path) throws IOException {
        try {
            Path file = filePath(path);
            UserPrincipal owner = currentUser(file);
            try (SecureDirectoryStream<Path> directory = openParent(file, owner, true)) {
                Path lockName = file.getFileSystem().getPath(LOCK_FILE);
                try (SeekableByteChannel channel = directory.newByteChannel(lockName,
                        Set.of(StandardOpenOption.CREATE, StandardOpenOption.WRITE, LinkOption.NOFOLLOW_LINKS),
                        PosixFilePermissions.asFileAttribute(FILE_PERMISSIONS))) {
                    PosixFileAttributes lockAttributes = verifyFile(directory, lockName, owner, true);
                    if (!(channel instanceof FileChannel lockChannel)) {
                        throw new IOException("File locking is required for API key initialization.");
                    }
                    // Keep the lock inode permanently: deleting it could let two startups lock different files.
                    try (FileLock ignored = lockChannel.lock()) {
                        verifyIdentity(lockAttributes, verifyFile(directory, lockName, owner, true));
                        try {
                            return read(file);
                        } catch (NoSuchFileException missing) {
                            byte[] bytes = new byte[32];
                            new SecureRandom().nextBytes(bytes);
                            String key = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
                            publish(file, key);
                            return key;
                        }
                    }
                }
            }
        } catch (UnsupportedOperationException | SecurityException exception) {
            throw new IOException("Secure API key initialization is unavailable.", exception);
        }
    }

    /** Publishes exact UTF-8 bytes without a newline, atomically replacing any stale key. */
    public static void publish(Path path, String key) throws IOException {
        validateKey(key);
        try {
            Path file = filePath(path);
            UserPrincipal owner = currentUser(file);
            ByteBuffer bytes = StandardCharsets.UTF_8.newEncoder().encode(CharBuffer.wrap(key));
            try (SecureDirectoryStream<Path> directory = openParent(file, owner, true)) {
                verifyReplacementTarget(directory, file.getFileName(), owner);
                Path temporary = file.getFileSystem().getPath(".api-key-" + UUID.randomUUID() + ".tmp");
                boolean created = false;
                boolean moved = false;
                try {
                    try (SeekableByteChannel channel = directory.newByteChannel(temporary,
                            Set.of(StandardOpenOption.CREATE_NEW, StandardOpenOption.WRITE, LinkOption.NOFOLLOW_LINKS),
                            PosixFilePermissions.asFileAttribute(FILE_PERMISSIONS))) {
                        created = true;
                        verifyFile(directory, temporary, owner, true);
                        while (bytes.hasRemaining()) channel.write(bytes);
                        if (channel instanceof FileChannel fileChannel) fileChannel.force(true);
                    }
                    verifyFile(directory, temporary, owner, true);
                    verifyReplacementTarget(directory, file.getFileName(), owner);
                    // SecureDirectoryStream.move has ATOMIC_MOVE semantics; never fall back to a copy.
                    directory.move(temporary, directory, file.getFileName());
                    moved = true;
                    verifyFile(directory, file.getFileName(), owner, true);
                } finally {
                    if (created && !moved) directory.deleteFile(temporary);
                }
            }
        } catch (UnsupportedOperationException | SecurityException exception) {
            throw new IOException("Secure POSIX API key publication is unavailable.", exception);
        }
    }

    /** Reads only an owner-private, regular credential file through a symlink-free path. */
    public static String read(Path path) throws IOException {
        try {
            Path file = filePath(path);
            UserPrincipal owner = currentUser(file);
            try (SecureDirectoryStream<Path> directory = openParent(file, owner, false)) {
                PosixFileAttributes before = verifyFile(directory, file.getFileName(), owner, true);
                String key;
                try (SeekableByteChannel channel = directory.newByteChannel(file.getFileName(),
                        Set.of(StandardOpenOption.READ, LinkOption.NOFOLLOW_LINKS))) {
                    verifyIdentity(before, verifyFile(directory, file.getFileName(), owner, true));
                    byte[] bytes = Channels.newInputStream(channel).readAllBytes();
                    key = StandardCharsets.UTF_8.newDecoder().decode(ByteBuffer.wrap(bytes)).toString();
                    verifyIdentity(before, verifyFile(directory, file.getFileName(), owner, true));
                }
                validateKey(key);
                return key;
            }
        } catch (UnsupportedOperationException | SecurityException exception) {
            throw new IOException("Secure POSIX API key reading is unavailable.", exception);
        }
    }

    private static Path filePath(Path path) throws IOException {
        if (path == null || path.getFileName() == null || path.getFileName().toString().isBlank()
                || path.getFileName().toString().equals(".")) {
            throw new IOException("An API key file name is required.");
        }
        for (Path component : path) {
            if (component.toString().equals("..")) {
                throw new IOException("API key paths must not contain parent-directory traversal.");
            }
        }
        Path file = path.toAbsolutePath().normalize();
        if (file.getParent() == null || file.getParent().getParent() == null) {
            throw new IOException("A dedicated API key directory is required.");
        }
        return file;
    }

    private static UserPrincipal currentUser(Path file) throws IOException {
        String user = System.getProperty("user.name");
        if (user == null || user.isBlank()) throw new IOException("The current file owner cannot be determined.");
        return file.getFileSystem().getUserPrincipalLookupService().lookupPrincipalByName(user);
    }

    private static SecureDirectoryStream<Path> openParent(Path file, UserPrincipal owner, boolean publish)
            throws IOException {
        DirectoryStream<Path> root = Files.newDirectoryStream(file.getRoot());
        if (!(root instanceof SecureDirectoryStream<Path>)) {
            root.close();
            throw new IOException("Secure directory operations are required for API key files.");
        }
        SecureDirectoryStream<Path> directory = (SecureDirectoryStream<Path>) root;
        try {
            Path traversed = file.getRoot();
            for (Path component : file.getParent()) {
                traversed = traversed.resolve(component);
                SecureDirectoryStream<Path> child;
                try {
                    child = directory.newDirectoryStream(component, LinkOption.NOFOLLOW_LINKS);
                } catch (NoSuchFileException exception) {
                    if (!publish || !traversed.equals(file.getParent())) throw exception;
                    // Only the private leaf may be created; existing ancestors are never chmodded.
                    Files.createDirectory(traversed, PosixFilePermissions.asFileAttribute(DIRECTORY_PERMISSIONS));
                    child = directory.newDirectoryStream(component, LinkOption.NOFOLLOW_LINKS);
                }
                SecureDirectoryStream<Path> previous = directory;
                directory = child;
                previous.close();
            }
            verifyDirectory(directory, file, owner, publish);
            return directory;
        } catch (IOException | RuntimeException | Error exception) {
            try {
                directory.close();
            } catch (IOException cleanup) {
                exception.addSuppressed(cleanup);
            }
            throw exception;
        }
    }

    private static void verifyDirectory(SecureDirectoryStream<Path> directory, Path file,
                                        UserPrincipal owner, boolean publish) throws IOException {
        PosixFileAttributeView view = directory.getFileAttributeView(PosixFileAttributeView.class);
        if (view == null) throw new IOException("POSIX API key directory permissions are required.");
        PosixFileAttributes attributes = view.readAttributes();
        if (!attributes.isDirectory() || !attributes.owner().equals(owner)) {
            throw new IOException("The API key directory must be owned by the current user.");
        }
        if (publish && !attributes.permissions().equals(DIRECTORY_PERMISSIONS)) {
            verifyDedicatedDirectory(directory, file);
            view.setPermissions(DIRECTORY_PERMISSIONS);
            attributes = view.readAttributes();
        }
        if (!attributes.owner().equals(owner) || !attributes.permissions().equals(DIRECTORY_PERMISSIONS)) {
            throw new IOException("The API key directory must have owner-only permissions (0700).");
        }
    }

    private static void verifyDedicatedDirectory(SecureDirectoryStream<Path> directory, Path file)
            throws IOException {
        String home = System.getProperty("user.home");
        if (home != null && file.getParent().equals(Path.of(home).toAbsolutePath().normalize())) {
            throw new IOException("Refusing to change home-directory permissions for an API key file.");
        }
        try {
            for (Path entry : directory) {
                if (!entry.getFileName().equals(file.getFileName())
                                        && !entry.getFileName().toString().equals(LOCK_FILE)) {
                    throw new IOException("Refusing to change permissions of a non-dedicated API key directory.");
                }
            }
        } catch (DirectoryIteratorException exception) {
            throw exception.getCause();
        }
    }

    private static void verifyReplacementTarget(SecureDirectoryStream<Path> directory, Path name,
                                                UserPrincipal owner) throws IOException {
        try {
            verifyFile(directory, name, owner, false);
        } catch (NoSuchFileException ignored) {
            // First startup has no published key yet.
        }
    }

    private static PosixFileAttributes verifyFile(SecureDirectoryStream<Path> directory, Path name,
                                                  UserPrincipal owner, boolean requirePrivate) throws IOException {
        PosixFileAttributeView view = directory.getFileAttributeView(name, PosixFileAttributeView.class,
                LinkOption.NOFOLLOW_LINKS);
        if (view == null) throw new IOException("POSIX API key file permissions are required.");
        PosixFileAttributes attributes = view.readAttributes();
        if (!attributes.isRegularFile() || !attributes.owner().equals(owner)) {
            throw new IOException("The API key file must be a regular file owned by the current user.");
        }
        if (requirePrivate && !attributes.permissions().equals(FILE_PERMISSIONS)) {
            throw new IOException("The API key file must have owner-only permissions (0600).");
        }
        return attributes;
    }

    private static void verifyIdentity(PosixFileAttributes before, PosixFileAttributes after) throws IOException {
        if (before.fileKey() == null || !before.fileKey().equals(after.fileKey())) {
            throw new IOException("The API key file changed while it was being read.");
        }
    }

    private static void validateKey(String key) throws IOException {
        if (key == null || key.isEmpty() || key.codePoints().anyMatch(character ->
                Character.isWhitespace(character) || Character.isSpaceChar(character)
                        || Character.isISOControl(character))) {
            throw new IOException("The API key must be nonempty and contain no whitespace or control characters.");
        }
    }
}
