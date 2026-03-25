package com.kanoga.kanoga_backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.security.crypto.password.PasswordEncoder;

@SpringBootApplication
@EnableScheduling
public class KanogaBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(KanogaBackendApplication.class, args);
    }
    @Bean
    CommandLineRunner printPasswordHash(PasswordEncoder passwordEncoder) {
        return args -> {
            String raw = "Admin123!";
            String hash = passwordEncoder.encode(raw);
            System.out.println("BCrypt hash for " + raw + ":");
            System.out.println(hash);
        };
    }
}


