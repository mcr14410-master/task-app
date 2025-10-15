package com.pp.taskmanagementbackend.config;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;

@Configuration
public class PathLoggingConfig {
  private static final Logger log = LoggerFactory.getLogger(PathLoggingConfig.class);

  private final StorageProperties props;
  private final Environment env;

  public PathLoggingConfig(StorageProperties props, Environment env) {
    this.props = props;
    this.env = env;
  }

  @PostConstruct
  public void logConfig() {
    var folder = props.getFolderpicker().getBasePath();
    var attach = props.getAttachments().getBasePath();
    log.info("FolderPicker base: {}", folder != null ? folder.toAbsolutePath() : "<null>");
    log.info("Attachments base: {}", attach != null ? attach.toAbsolutePath() : "<null>");
    log.info("Active profiles: {}", String.join(",", env.getActiveProfiles()));
  }
}
