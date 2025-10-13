package com.pp.taskmanagementbackend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.DirectoryNotEmptyException;
import java.nio.file.Files;
import java.nio.file.NoSuchFileException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class FolderPickerService {
	  private static final Logger log = LoggerFactory.getLogger(FolderPickerService.class);

    private final Path base;

    public FolderPickerService(@Value("${filepicker.base-path}") String basePath) {
        if (basePath == null || basePath.isBlank()) {
            throw new IllegalStateException("Konfiguration fehlt: 'filepicker.base-path' ist leer.");
        }
        Path p = Paths.get(basePath).toAbsolutePath().normalize();
        if (!Files.exists(p)) throw new IllegalStateException("Basisordner existiert nicht: " + p);
        if (!Files.isDirectory(p)) throw new IllegalStateException("Basis ist kein Verzeichnis: " + p);
        if (!Files.isReadable(p)) throw new IllegalStateException("Basisordner nicht lesbar: " + p);
        if (!Files.isWritable(p)) throw new IllegalStateException("Basisordner nicht schreibbar: " + p);
        this.base = p;
        log.info("[FolderPicker] Base initialisiert: {}", this.base);
    }

    public Path getBase() {
        return base;
    }

    /* --------------------------------- Helpers --------------------------------- */

    /** Sicheres Auflösen eines optionalen Unterpfads relativ zur Basis (Traversal-Schutz). */
    private Path resolveSub(String sub) {
        Path target = (sub == null || sub.isBlank())
                ? base
                : base.resolve(sub.replace("\\", "/")).normalize();
        if (!target.startsWith(base)) {
            throw new IllegalArgumentException("Ungültiger Pfad (Path Traversal): " + sub);
        }
        return target;
    }

    /** Einfache Validierung von Ordnernamen (kein Slash, kein '.' oder '..'). */
    private static void validateName(String name) {
        if (name == null || name.isBlank())
            throw new IllegalArgumentException("Name leer.");
        if (".".equals(name) || "..".equals(name))
            throw new IllegalArgumentException("Ungültiger Name: " + name);
        if (name.contains("/") || name.contains("\\"))
            throw new IllegalArgumentException("Ungültiger Name (Slash gefunden): " + name);
    }

    /* ---------------------------------- API ------------------------------------ */

    /** Prüft, ob der (relative) Ordner existiert. */
    public boolean exists(String sub) {
        return Files.isDirectory(resolveSub(sub));
    }

    /** Listet nur direkte Unterordner relativ zu 'sub'. */
    public List<String> subfolders(String sub) throws IOException {
        Path dir = resolveSub(sub);
        if (!Files.isDirectory(dir)) return List.of();
        try (Stream<Path> s = Files.list(dir)) {
            return s.filter(Files::isDirectory)
                    .map(p -> dir.relativize(p).toString().replace("\\", "/"))
                    .sorted(String::compareToIgnoreCase)
                    .collect(Collectors.toList());
        }
    }

    /** Legt unterhalb von 'sub' einen neuen Ordner 'name' an. */
    public void mkdir(String sub, String name) throws IOException {
        validateName(name);
        Path parent = resolveSub(sub);
        if (!Files.isDirectory(parent)) {
            throw new NoSuchFileException("Elternordner existiert nicht: " + parent);
        }
        Path target = parent.resolve(name).normalize();
        if (!target.startsWith(base)) {
            throw new IllegalArgumentException("Ungültiger Pfad (Path Traversal).");
        }
        Files.createDirectory(target);
    }

    /** Prüft, ob der Ordner <sub>/<name> existiert und leer ist. */
    public boolean isEmpty(String sub, String name) throws IOException {
        validateName(name);
        Path dir = resolveSub(sub).resolve(name).normalize();
        if (!dir.startsWith(base)) throw new IllegalArgumentException("Ungültiger Pfad.");
        if (!Files.isDirectory(dir)) return false;
        try (Stream<Path> s = Files.list(dir)) {
            return s.findFirst().isEmpty();
        }
    }

    /** Löscht den Ordner <sub>/<name>, aber nur wenn leer. */
    public void rmdir(String sub, String name) throws IOException {
        validateName(name);
        Path dir = resolveSub(sub).resolve(name).normalize();
        if (!dir.startsWith(base)) throw new IllegalArgumentException("Ungültiger Pfad.");
        if (!Files.isDirectory(dir)) throw new NoSuchFileException("Kein Ordner: " + dir);
        try (Stream<Path> s = Files.list(dir)) {
            if (s.findFirst().isPresent()) throw new DirectoryNotEmptyException(dir.toString());
        }
        Files.delete(dir);
    }

    /** Bennent einen Ordner unterhalb von 'sub' von 'from' nach 'to' um. */
    public void rename(String sub, String from, String to) throws IOException {
        validateName(from);
        validateName(to);

        Path parent = resolveSub(sub);
        if (!Files.isDirectory(parent)) {
            throw new NoSuchFileException("Elternordner existiert nicht: " + parent);
        }

        Path src = parent.resolve(from).normalize();
        Path dst = parent.resolve(to).normalize();

        if (!src.startsWith(base) || !dst.startsWith(base)) {
            throw new IllegalArgumentException("Path Traversal");
        }
        if (!Files.exists(src)) {
            throw new NoSuchFileException(src.toString());
        }
        if (Files.exists(dst)) {
            throw new IllegalArgumentException("Ziel existiert bereits: " + dst);
        }

        Files.move(src, dst);
    }
}
