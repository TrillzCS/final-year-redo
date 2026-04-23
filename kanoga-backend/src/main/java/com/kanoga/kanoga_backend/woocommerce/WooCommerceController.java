package com.kanoga.kanoga_backend.woocommerce;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/woo")
public class WooCommerceController {

    private final WooCommerceService wooCommerceService;

    public WooCommerceController(WooCommerceService wooCommerceService) {
        this.wooCommerceService = wooCommerceService;
    }

    @PostMapping(value = "/webhook", consumes = {"application/json", "application/x-www-form-urlencoded", "*/*"})
    public ResponseEntity<Map<String, String>> webhook(
            @RequestHeader(value = "X-WC-Webhook-Signature", required = false) String signature,
            @RequestHeader(value = "X-WC-Webhook-Topic", required = false) String topic,
            @RequestHeader(value = "User-Agent", required = false) String userAgent,
            @RequestBody(required = false) String rawBody
    ) {
        try {

            if (topic == null || topic.isEmpty() || "ping".equals(topic)) {
                return ResponseEntity.ok(Map.of("status", "pong"));
            }

            wooCommerceService.handleWebhook(topic, signature, rawBody);
            return ResponseEntity.ok(Map.of("status", "received"));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid signature"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }
}