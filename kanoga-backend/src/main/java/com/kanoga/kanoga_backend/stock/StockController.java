package com.kanoga.kanoga_backend.stock;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/stock")
public class StockController {

    private final StockService stock;

    public StockController(StockService stock) {
        this.stock = stock;
    }

    @GetMapping("/products")
    public List<StockDtos.ProductStock> byProduct() {
        return stock.byProduct();
    }

    @GetMapping("/batches")
    public List<StockDtos.BatchStock> byBatch() {
        return stock.byBatch();
    }

    @GetMapping("/dashboard")
    public StockDtos.DashboardSummary dashboard() {
        return stock.dashboard();
    }
}
