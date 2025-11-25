package com.kanoga.kanoga_backend.demo;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
public class TestScheduler {

    // Runs every 10 seconds
    @Scheduled(fixedRate = 10_000)
    public void sayHello() {
        System.out.println("Scheduler is working: " + System.currentTimeMillis());
    }
}
