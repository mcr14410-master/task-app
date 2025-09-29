package com.pp;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**") // Wenden Sie CORS auf alle Endpunkte an
                .allowedOrigins("http://localhost:5173") // 🚨 Erlaubter Frontend-Port
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS") // Erlaubte HTTP-Methoden
                .allowedHeaders("*") // Erlaubt alle Header
                .allowCredentials(true); // Erlaubt Cookies und Authentifizierungs-Header
    }
}