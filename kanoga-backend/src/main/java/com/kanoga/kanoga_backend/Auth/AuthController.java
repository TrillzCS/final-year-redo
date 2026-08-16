package com.kanoga.kanoga_backend.Auth;

import org.springframework.security.authentication.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

record LoginRequest(String email, String password) {}
record LoginResponse(String email, String role) {}

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:5173") // or 8081 if needed
public class AuthController {

    private final AuthenticationManager authManager;
    private final UserRepository users;

    public AuthController(AuthenticationManager authManager, UserRepository users) {
        this.authManager = authManager;
        this.users = users;
    }

    @PostMapping("/login")
    public LoginResponse login(@RequestBody LoginRequest req) {
        Authentication auth = authManager.authenticate(
                new UsernamePasswordAuthenticationToken(req.email(), req.password())
        );

        UserEntity u = users.findByEmail(req.email()).orElseThrow();
        return new LoginResponse(u.getEmail(), u.getRole());
    }
}
