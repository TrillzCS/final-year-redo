package com.kanoga.kanoga_backend;

import org.springframework.boot.SpringApplication;
import com.kanoga.kanoga_backend.config.AppProperties;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@EnableConfigurationProperties(AppProperties.class)
public class KanogaBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(KanogaBackendApplication.class, args);
    }
}
