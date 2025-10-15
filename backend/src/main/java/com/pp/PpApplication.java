package com.pp;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableJpaRepositories(basePackages = "com.pp.taskmanagementbackend.repository")
// ✅ KORREKTUR: Muss auf das Paket .model zeigen, da dort die Entity liegt.
@EntityScan(basePackages = "com.pp.taskmanagementbackend.model")
@org.springframework.boot.context.properties.ConfigurationPropertiesScan("com.pp.taskmanagementbackend.config")
public class PpApplication {

	public static void main(String[] args) {
		SpringApplication.run(PpApplication.class, args);
	}

}