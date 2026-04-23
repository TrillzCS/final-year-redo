package com.kanoga.kanoga_backend.orders;

import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @GetMapping
    public List<OrderResponseDto> all() {
        return orderService.getAllOrders();
    }

    @PostMapping
    public OrderResponseDto create(@RequestBody CreateOrderRequest request) {
        return orderService.createOrder(request);
    }

    @PostMapping("/{orderId}/assign")
    public List<AssignedLabelDto> assign(
            @PathVariable String orderId,
            @RequestBody AssignRequest request
    ) {
        return orderService.assignUnits(orderId, request);
    }

    @PostMapping("/{orderId}/assign-by-qr")
    public AssignByQrResponse assignByQr(
            @PathVariable String orderId,
            @RequestBody AssignByQrRequest request
    ) {
        return orderService.assignByQr(orderId, request);
    }

    @GetMapping("/{orderId}/assigned-units")
    public List<OrderAssignedUnitDto> assignedUnits(@PathVariable String orderId) {
        return orderService.listAssignedUnits(orderId);
    }
}