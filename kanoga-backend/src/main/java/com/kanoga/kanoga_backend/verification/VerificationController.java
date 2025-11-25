package com.kanoga.kanoga_backend.verification;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/verify")
@CrossOrigin(origins = "http://localhost:5173")
public class VerificationController {

    private final VerificationService verificationService;

    public VerificationController(VerificationService verificationService) {
        this.verificationService = verificationService;
    }

    @GetMapping
    public ResponseEntity<VerificationResultDto> verify(@RequestParam("code") String code) {
        try {
            VerificationResultDto dto = verificationService.verify(code);
            return ResponseEntity.ok(dto);
        } catch (Exception e) {

            VerificationResultDto dto = new VerificationResultDto();
            dto.setValid(false);
            dto.setMessage("Server error during verification: " + e.getClass().getSimpleName() + " - " + e.getMessage());
            dto.setExpired(false);
            return ResponseEntity.ok(dto);
        }
    }
}
