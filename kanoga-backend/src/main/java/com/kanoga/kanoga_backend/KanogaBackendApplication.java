package com.kanoga.kanoga_backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class KanogaBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(KanogaBackendApplication.class, args);
    }
}

