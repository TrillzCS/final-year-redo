package com.kanoga.kanoga_backend.verification;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "http://localhost:5173")
public class VerificationController {

    private final VerificationService verificationService;

    public VerificationController(VerificationService verificationService) {
        this.verificationService = verificationService;
    }

    @GetMapping("/verify")
    public VerificationResultDto verify(@RequestParam("code") String code) {
        return verificationService.verify(code);
    }
}
