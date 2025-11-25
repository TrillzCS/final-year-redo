package com.kanoga.kanoga_backend.api;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "http://localhost:5173")
public class HelloController {

    @GetMapping("/hello")
    public String hello() {
        return "Hello from Kanoga Spring Boot 👋";
    }
}
