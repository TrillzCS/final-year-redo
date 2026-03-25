package com.kanoga.kanoga_backend.orders;

import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/orders")
@CrossOrigin(origins = "http://localhost:5173")
public class OrderController {

    private final OrderRepository orderRepository;
    private final OrderAssignmentService assignmentService;

    public OrderController(OrderRepository orderRepository, OrderAssignmentService assignmentService) {
        this.orderRepository = orderRepository;
        this.assignmentService = assignmentService;
    }

    @GetMapping
    public List<OrderEntity> all() {
        return orderRepository.findAll();
    }

    @PostMapping
    public OrderEntity create(@RequestBody CreateOrderRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Request body is required");
        }

        String orderNumber = request.orderNumber() != null ? request.orderNumber().trim() : "";
        String customerName = request.customerName() != null ? request.customerName().trim() : "";
        String customerEmail = request.customerEmail() != null ? request.customerEmail().trim() : "";

        if (orderNumber.isEmpty()) {
            throw new IllegalArgumentException("orderNumber is required");
        }

        OrderEntity order = new OrderEntity();
        order.setOrderNumber(orderNumber);
        order.setCustomerName(customerName.isEmpty() ? null : customerName);
        order.setCustomerEmail(customerEmail.isEmpty() ? null : customerEmail);
        order.setCreatedAt(OffsetDateTime.now());

        return orderRepository.save(order);
    }

    @PostMapping("/{orderId}/assign")
    public List<AssignedLabelDto> assign(
            @PathVariable Long orderId,
            @RequestBody AssignRequest request
    ) {
        return assignmentService.assignUnits(orderId, request);
    }

    @PostMapping("/{orderId}/assign-by-qr")
    public AssignByQrResponse assignByQr(
            @PathVariable Long orderId,
            @RequestBody AssignByQrRequest request
    ) {
        return assignmentService.assignByQr(orderId, request);
    }

    @GetMapping("/{orderId}/assigned-units")
    public List<OrderAssignedUnitDto> assignedUnits(@PathVariable Long orderId) {
        return assignmentService.listAssignedUnits(orderId);
    }
}