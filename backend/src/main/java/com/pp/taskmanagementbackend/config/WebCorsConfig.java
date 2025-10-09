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
    String[] origins = Arrays.stream(allowedOriginsProp.split("\\s*,\\s*"))
                             .filter(s -> !s.isBlank())
                             .toArray(String[]::new);

    registry.addMapping("/**")
        .allowedOrigins(origins)                // konkrete Origins (siehe application.yml)
        .allowedMethods("GET","POST","PUT","PATCH","DELETE","OPTIONS")
        .allowedHeaders("*")
        .allowCredentials(true)
        .maxAge(1800);
  }
}
