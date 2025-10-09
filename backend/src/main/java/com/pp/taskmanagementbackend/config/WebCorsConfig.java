package com.pp.taskmanagementbackend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.Arrays;

@Configuration
public class WebCorsConfig implements WebMvcConfigurer {

  @Value("${app.cors.allowed-origins:*}")
  private String allowedOriginsProp;

  @Override
  public void addCorsMappings(CorsRegistry registry) {
    String prop = allowedOriginsProp == null ? "" : allowedOriginsProp.trim();

    // Wenn "*" (oder leer) -> Patterns benutzen (kompatibel mit allowCredentials)
    if (prop.isEmpty() || "*".equals(prop)) {
      registry.addMapping("/**")
          .allowedOriginPatterns("*")
          .allowedMethods("GET","POST","PUT","PATCH","DELETE","OPTIONS")
          .allowedHeaders("*")
          .allowCredentials(true)
          .maxAge(1800);
      return;
    }

    // Sonst exakte Origins
    String[] origins = Arrays.stream(prop.split("\\s*,\\s*"))
        .filter(s -> !s.isBlank())
        .toArray(String[]::new);

    registry.addMapping("/**")
        .allowedOrigins(origins)
        .allowedMethods("GET","POST","PUT","PATCH","DELETE","OPTIONS")
        .allowedHeaders("*")
        .allowCredentials(true)
        .maxAge(1800);
  }
}

