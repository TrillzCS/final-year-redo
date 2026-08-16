package com.kanoga.kanoga_backend.connections;

import com.kanoga.kanoga_backend.imports.ImportResultDto;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Managing connected storefronts, and receiving their webhooks. */
@RestController
@RequestMapping("/api/connections")
public class StoreConnectionController {

    private final StoreConnectionService connections;

    public StoreConnectionController(StoreConnectionService connections) {
        this.connections = connections;
    }

    @GetMapping
    public List<StoreConnectionDto> list() {
        return connections.list();
    }

    @PostMapping
    public StoreConnectionDto create(@RequestBody CreateConnectionRequest request) {
        return connections.create(request);
    }

    @PatchMapping("/{connectionId}/active")
    public StoreConnectionDto setActive(@PathVariable String connectionId,
                                        @RequestParam boolean active) {
        return connections.setActive(connectionId, active);
    }

    @PostMapping("/{connectionId}/rotate-secret")
    public StoreConnectionDto rotateSecret(@PathVariable String connectionId) {
        return connections.rotateSecret(connectionId);
    }

    @PostMapping(value = "/{connectionId}/webhook", consumes = {"application/json", "*/*"})
    public ImportResultDto webhook(@PathVariable String connectionId,
                                   @RequestBody(required = false) String rawBody,
                                   @RequestHeader Map<String, String> headers) {
        return connections.handleWebhook(connectionId, rawBody, headers);
    }
}
