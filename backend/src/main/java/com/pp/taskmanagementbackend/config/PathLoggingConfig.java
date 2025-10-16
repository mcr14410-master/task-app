package com.pp.taskmanagementbackend.config;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import java.nio.file.Path;
import java.nio.file.Paths;

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
	  String folderRaw = props.getFolderpicker().getBasePath();
	  String attachRaw = props.getAttachments().getBasePath();

	  String folderPretty = toPrettyPath(folderRaw);
	  String attachPretty = toPrettyPath(attachRaw);

	  log.info("FolderPicker base: {}", folderPretty);
	  log.info("Attachments base: {}", attachPretty);
	  log.info("Active profiles: {}", String.join(",", env.getActiveProfiles()));
	}

	/** String → absolut/normalisiert; null/leer sicher behandeln. */
	private static String toPrettyPath(String raw) {
	  if (raw == null || raw.isBlank()) return "<null>";
	  try {
	    Path p = Paths.get(raw).toAbsolutePath().normalize();
	    return p.toString();
	  } catch (Exception e) {
	    return raw + "  (INVALID PATH STRING)";
	  }
	}
}
