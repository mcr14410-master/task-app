package com.pp.taskmanagementbackend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.nio.file.Path;

@Component
@ConfigurationProperties // Prefix frei; wir mappen verschachtelt (folderpicker.*, attachments.*)
public class StorageProperties {

  private final Folderpicker folderpicker = new Folderpicker();
  private final Attachments attachments = new Attachments();

  public Folderpicker getFolderpicker() { return folderpicker; }
  public Attachments getAttachments() { return attachments; }

  public static class Folderpicker {
    /**
     * Root-Pfad des FolderPickers (entspricht YAML: folderpicker.base-path)
     */
    private Path basePath;

    public Path getBasePath() { return basePath; }
    public void setBasePath(Path basePath) { this.basePath = basePath; }
  }

  public static class Attachments {
    /**
     * Root-Pfad für Anhänge (entspricht YAML: attachments.base-path)
     */
    private Path basePath;

    public Path getBasePath() { return basePath; }
    public void setBasePath(Path basePath) { this.basePath = basePath; }
  }
}
