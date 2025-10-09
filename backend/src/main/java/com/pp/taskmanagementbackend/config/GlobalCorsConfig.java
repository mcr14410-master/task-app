// backend/src/main/java/com/pp/taskmanagementbackend/config/GlobalCorsConfig.java
package com.pp.taskmanagementbackend.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;  // << wichtig
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.List;

@Configuration
@EnableConfigurationProperties(AppCorsProperties.class) // << bindet app.cors.* aus application.yml/ENV
public class GlobalCorsConfig {

  private final AppCorsProperties props;

  public GlobalCorsConfig(AppCorsProperties props) {
    this.props = props;
  }

  @Bean
  public FilterRegistrationBean<CorsFilter> corsFilter() {
    System.out.println("[CORS] allowed-origins property = " + props.getAllowedOrigins());

    CorsConfiguration cfg = new CorsConfiguration();
    cfg.setAllowCredentials(true);

    List<String> origins = props.allowedOriginsList();
    if (origins.isEmpty() || (origins.size() == 1 && "*".equals(origins.get(0)))) {
      // Wildcard + Credentials → Patterns verwenden
      cfg.addAllowedOriginPattern("*");
    } else {
      origins.forEach(cfg::addAllowedOrigin);
    }

    cfg.addAllowedHeader(CorsConfiguration.ALL);
    cfg.addAllowedMethod(CorsConfiguration.ALL);
    cfg.setMaxAge(1800L);

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", cfg);

    FilterRegistrationBean<CorsFilter> bean = new FilterRegistrationBean<>(new CorsFilter(source));
    bean.setOrder(Ordered.HIGHEST_PRECEDENCE); // ganz nach vorne
    return bean;
  }
}
