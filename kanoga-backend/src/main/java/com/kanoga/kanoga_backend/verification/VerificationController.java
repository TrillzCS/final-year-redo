package com.kanoga.kanoga_backend.verification;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
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