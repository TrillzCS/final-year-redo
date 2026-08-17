package com.kanoga.kanoga_backend.imports;

import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Store-agnostic order intake. */
@RestController
@RequestMapping("/api/imports")
public class OrderImportController {

    private final OrderImportService importService;

    public OrderImportController(OrderImportService importService) {
        this.importService = importService;
    }

    public record ImportSourceDto(String source, String description, boolean manualUpload) {}

    @GetMapping("/sources")
    public List<ImportSourceDto> sources() {
        return importService.availableAdapters().stream()
                .map(a -> new ImportSourceDto(a.source(), a.description(),
                        !(a instanceof WebhookOrderAdapter)))
                .toList();
    }

    @PostMapping(value = "/{source}", consumes = {"text/csv", "text/plain", "application/json", "*/*"})
    public ImportResultDto importOrders(
            @PathVariable String source,
            @RequestBody(required = false) String rawBody,
            @RequestHeader Map<String, String> headers
    ) {
        return importService.importFrom(source, rawBody, headers);
    }
}
