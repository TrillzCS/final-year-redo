package com.kanoga.kanoga_backend.config;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/config")
public class ConfigController {

    private final AppProperties app;

    public ConfigController(AppProperties app) {
        this.app = app;
    }

    @GetMapping
    public Map<String, Object> config() {
        return Map.of(
                "companyName", app.getBranding().getCompanyName(),
                "productName", app.getBranding().getProductName(),
                "codePrefix", app.getBranding().getCodePrefix(),
                "defaultShelfLifeMonths", app.getDefaults().getShelfLifeMonths(),
                "batchUnit", app.getDefaults().getBatchUnit(),
                "productUnit", app.getDefaults().getProductUnit(),
                "expiryAlertDays", app.getDefaults().getExpiryAlertDays()
        );
    }
}
