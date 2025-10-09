// backend/src/main/java/com/pp/taskmanagementbackend/config/AppCorsProperties.java
package com.pp.taskmanagementbackend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

@ConfigurationProperties(prefix = "app.cors")
public class AppCorsProperties {

  /** Komma-separierte Liste erlaubter Origins; "*" erlaubt alles (mit Patterns). */
  private String allowedOrigins = "*";

  public String getAllowedOrigins() { return allowedOrigins; }
  public void setAllowedOrigins(String allowedOrigins) { this.allowedOrigins = allowedOrigins; }

  public List<String> allowedOriginsList() {
    if (allowedOrigins == null || allowedOrigins.isBlank()) return List.of();
    return List.of(allowedOrigins.split("\\s*,\\s*"));
  }
}

