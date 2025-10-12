package com.pp.taskmanagementbackend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.*;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
public class FilePickerService {

    private final Path base;

    public FilePickerService(@Value("${filepicker.base-path}") String basePath) {
        if (basePath == null || basePath.isBlank()) {
            throw new IllegalStateException("filepicker.base-path ist nicht gesetzt");
        }
        Path candidate = Paths.get(basePath).toAbsolutePath().normalize();
        if (!Files.exists(candidate) || !Files.isDirectory(candidate)) {
            throw new IllegalStateException("FilePicker base path existiert nicht oder ist kein Ordner: " + candidate);
        }
        this.base = candidate;
    }

    /** Gibt den Basisordner zurück (nur für Logs/Tests). */
    public Path getBase() {
        return base;
    }

    /** Base + sub (optional) sicher auflösen, Traversal-Guard inklusive. */
    public Path resolveSub(String sub) {
        if (sub == null || sub.isBlank()) return base;
        // Nur Vorwärtsslashes intern verwenden
        String cleaned = sub.replace("\\", "/");
        Path resolved = base.resolve(cleaned).normalize();
        if (!resolved.startsWith(base)) {
            throw new SecurityException("Pfad außerhalb der Basis nicht erlaubt");
        }
        return resolved;
    }

    /** Ordner existiert? */
    public boolean exists(String sub) {
        Path p = resolveSub(sub);
        return Files.exists(p) && Files.isDirectory(p);
    }

    /** Liste der Unterordner als relative Pfade (relativ zur Base). */
    public List<String> listSubfolders(String sub) throws IOException {
        Path root = resolveSub(sub);
        if (!Files.exists(root) || !Files.isDirectory(root)) {
            return List.of();
        }
        List<String> out = new ArrayList<>();
        try (DirectoryStream<Path> stream = Files.newDirectoryStream(root)) {
            for (Path child : stream) {
                if (Files.isDirectory(child)) {
                    // relativer Pfad (mit / statt \)
                    String rel = base.relativize(child).toString().replace("\\", "/");
                    out.add(rel);
                }
            }
        }
        out.sort(Comparator.naturalOrder());
        return out;
    }

    /** Unterordner anlegen (unterhalb von sub). */
    public void mkdir(String sub, String name) throws IOException {
        String n = (name == null) ? "" : name.trim();
        if (n.isEmpty()) {
            throw new IllegalArgumentException("Ordnername darf nicht leer sein.");
        }
        if (n.equals(".") || n.equals("..")) {
            throw new IllegalArgumentException("Ungültiger Ordnername.");
        }
        if (n.contains("/") || n.contains("\\")) {
            throw new IllegalArgumentException("Ordnername darf keine Pfadtrenner enthalten.");
        }

        Path parent = resolveSub(sub);
        if (!Files.exists(parent) || !Files.isDirectory(parent)) {
            throw new IllegalArgumentException("Elternordner existiert nicht: " + parent);
        }

        Path target = parent.resolve(n).normalize();
        if (!target.startsWith(base)) {
            throw new SecurityException("Pfad außerhalb der Basis nicht erlaubt.");
        }

        Files.createDirectories(target);
    }
}
