package com.kanoga.kanoga_backend.catalogue;

import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Product and supplier maintenance. */
@RestController
@RequestMapping("/api/catalogue")
public class CatalogueController {

    private final CatalogueService catalogue;

    public CatalogueController(CatalogueService catalogue) {
        this.catalogue = catalogue;
    }

    @GetMapping("/products")
    public List<ProductDto> products(
            @RequestParam(defaultValue = "false") boolean includeInactive) {
        return catalogue.listProducts(includeInactive);
    }

    @PostMapping("/products")
    public ProductDto createProduct(@RequestBody ProductUpsertRequest request) {
        return catalogue.createProduct(request);
    }

    @PutMapping("/products/{productId}")
    public ProductDto updateProduct(@PathVariable String productId,
                                    @RequestBody ProductUpsertRequest request) {
        return catalogue.updateProduct(productId, request);
    }

    /** Resolves a scanned barcode, a SKU or a name to a catalogue product. */
    @GetMapping("/products/lookup")
    public ProductDto lookup(@RequestParam String code) {
        return catalogue.findByCode(code);
    }

    @GetMapping("/suppliers")
    public List<SupplierDto> suppliers(
            @RequestParam(defaultValue = "false") boolean includeInactive) {
        return catalogue.listSuppliers(includeInactive);
    }

    @PostMapping("/suppliers")
    public SupplierDto createSupplier(@RequestBody SupplierUpsertRequest request) {
        return catalogue.createSupplier(request);
    }

    @PutMapping("/suppliers/{supplierId}")
    public SupplierDto updateSupplier(@PathVariable String supplierId,
                                      @RequestBody SupplierUpsertRequest request) {
        return catalogue.updateSupplier(supplierId, request);
    }
}
