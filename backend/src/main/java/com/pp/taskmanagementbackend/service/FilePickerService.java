package com.pp.taskmanagementbackend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.*;
import java.util.Objects;

@Service
public class FilePickerService {

    private final Path base;

    public FilePickerService(
            @Value("${filepicker.base:}") String baseDirFallback,
            @Value("${attachments.base-path:}") String attachmentsBase // falls du das als Fallback willst
    ) {
        String root = (baseDirFallback != null && !baseDirFallback.isBlank())
                ? baseDirFallback
                : System.getProperty("user.dir");
        this.base = Paths.get(root).toAbsolutePath().normalize();
    }

    public Path getBase() { return base; }

    // --- Guards/Utils ---

    private String validateName(String name) {
        Objects.requireNonNull(name, "name required");
        String n = name.trim();
        if (n.isEmpty()) throw new IllegalArgumentException("Leerer Name");
        if (n.equals(".") || n.equals("..")) throw new IllegalArgumentException("Ungültiger Name");
        if (n.contains("/") || n.contains("\\"))
            throw new IllegalArgumentException("Name darf keine Pfadtrenner enthalten");
        return n;
    }

    private Path resolveSub(String sub) {
        Path p = (sub == null || sub.isBlank()) ? base : base.resolve(sub.replace("\\","/"));
        Path norm = p.normalize().toAbsolutePath();
        if (!norm.startsWith(base)) throw new SecurityException("Pfad außerhalb der Basis nicht erlaubt.");
        return norm;
    }

    // --- API-Methoden, die es schon gab (Auszug) ---

    public boolean exists(String sub) {
        Path p = resolveSub(sub);
        return Files.exists(p) && Files.isDirectory(p) && !Files.isSymbolicLink(p);
    }

    public java.util.List<String> listSubfolders(String sub) throws IOException {
        Path p = resolveSub(sub);
        if (!Files.exists(p)) return java.util.List.of();
        try (DirectoryStream<Path> ds = Files.newDirectoryStream(p, Files::isDirectory)) {
            java.util.ArrayList<String> out = new java.util.ArrayList<>();
            for (Path child : ds) {
                if (Files.isSymbolicLink(child)) continue;
                out.add(base.relativize(child).toString().replace("\\","/"));
            }
            return out;
        }
    }

    public void mkdir(String sub, String name) throws IOException {
        String n = validateName(name);
        Path parent = resolveSub(sub);
        Path target = parent.resolve(n).normalize();
        if (!target.startsWith(base)) throw new SecurityException("Pfad außerhalb der Basis nicht erlaubt.");
        if (Files.exists(target)) throw new IllegalStateException("Ordner existiert bereits.");
        Files.createDirectory(target);
    }

    public void rename(String sub, String from, String to) throws IOException {
        String f = validateName(from);
        String t = validateName(to);
        Path parent = resolveSub(sub);
        Path src = parent.resolve(f).normalize();
        Path dst = parent.resolve(t).normalize();
        if (!src.startsWith(base) || !dst.startsWith(base))
            throw new SecurityException("Pfad außerhalb der Basis nicht erlaubt.");
        if (!Files.exists(src) || !Files.isDirectory(src))
            throw new IllegalArgumentException("Quelle existiert nicht.");
        if (Files.exists(dst)) throw new IllegalStateException("Ziel existiert bereits.");
        Files.move(src, dst);
    }

    // --- NEU: Empty-Check & Nur-leer-Löschen ---

    public boolean isEmpty(String sub, String name) throws IOException {
        String n = validateName(name);
        Path parent = resolveSub(sub);
        Path target = parent.resolve(n).normalize();
        if (!target.startsWith(base)) throw new SecurityException("Pfad außerhalb der Basis nicht erlaubt.");
        if (!Files.exists(target) || !Files.isDirectory(target))
            throw new IllegalArgumentException("Ordner existiert nicht.");
        if (Files.isSymbolicLink(target))
            throw new SecurityException("Symlink wird nicht unterstützt.");
        try (DirectoryStream<Path> ds = Files.newDirectoryStream(target)) {
            return !ds.iterator().hasNext();
        }
    }

    public void rmdirEmpty(String sub, String name) throws IOException {
        if (!isEmpty(sub, name))
            throw new IllegalStateException("Ordner ist nicht leer.");
        String n = validateName(name);
        Path parent = resolveSub(sub);
        Path target = parent.resolve(n).normalize();
        Files.delete(target);
    }
}
