package com.kanoga.kanoga_backend.picking;

import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/picking")
public class PickingController {

    private final PickingService picking;

    public PickingController(PickingService picking) {
        this.picking = picking;
    }

    @GetMapping("/outstanding")
    public List<PickingDtos.OutstandingOrder> outstanding() {
        return picking.outstanding();
    }

    @PostMapping("/list")
    public PickingDtos.PickingList build(@RequestBody List<String> orderIds) {
        return picking.build(orderIds);
    }

    /** Closes out a packed run without visiting each order on the fulfilment screen. */
    @PostMapping("/dispatch")
    public PickingDtos.DispatchResult dispatch(@RequestBody List<String> orderIds) {
        return picking.dispatch(orderIds);
    }
}
