package com.pp.taskmanagementbackend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;
import java.util.Arrays;

@Configuration
public class CorsConfiguration {

    @Bean
    public CorsFilter corsFilter() {
        // 1. Create a Configuration object
        org.springframework.web.cors.CorsConfiguration corsConfig = new org.springframework.web.cors.CorsConfiguration();
        
        // 2. Define allowed origins, methods, and headers
        corsConfig.setAllowedOrigins(Arrays.asList("http://localhost:5173")); // Your Frontend URL
        corsConfig.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        corsConfig.setAllowedHeaders(Arrays.asList("*")); // Allow all headers
        corsConfig.setAllowCredentials(true); // Important for session/cookie handling
        
        // 3. Map the configuration to your API path
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", corsConfig); // Apply to all /api endpoints
        
        // 4. Return the new filter
        return new CorsFilter(source);
    }
}