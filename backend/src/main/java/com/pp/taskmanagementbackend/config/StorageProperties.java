package com.pp.taskmanagementbackend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.boot.context.properties.NestedConfigurationProperty;

@Component
@ConfigurationProperties // ohne prefix: liest Top-Level-Keys (folderpicker.*, attachments.*)
public class StorageProperties {

  @NestedConfigurationProperty
  private final Folderpicker folderpicker = new Folderpicker();

  @NestedConfigurationProperty
  private final Attachments attachments = new Attachments();

  public Folderpicker getFolderpicker() { return folderpicker; }
  public Attachments getAttachments() { return attachments; }

  public static class Folderpicker {
    /**
     * YAML: folderpicker.base-path
     */
    private String basePath;

    public String getBasePath() { return basePath; }
    public void setBasePath(String basePath) { this.basePath = basePath; }
  }

  public static class Attachments {
    /**
     * YAML: attachments.base-path
     */
    private String basePath;

    public String getBasePath() { return basePath; }
    public void setBasePath(String basePath) { this.basePath = basePath; }
  }
}
