package com.kanoga.kanoga_backend.stock;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/stock")
public class StockController {

    private final StockService stock;
    private final WriteOffService writeOffs;

    public StockController(StockService stock, WriteOffService writeOffs) {
        this.stock = stock;
        this.writeOffs = writeOffs;
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

    @PostMapping("/write-off")
    public java.util.Map<String, Object> writeOff(@RequestBody WriteOffRequest request) {
        int written = writeOffs.writeOff(request);
        return java.util.Map.of("unitsWrittenOff", written);
    }

    @GetMapping("/write-offs")
    public List<WriteOffService.WrittenOffUnit> writeOffs(
            @RequestParam(defaultValue = "25") int limit) {
        return writeOffs.recent(limit);
    }
}
