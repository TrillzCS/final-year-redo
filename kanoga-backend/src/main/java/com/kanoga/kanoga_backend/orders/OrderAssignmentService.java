package com.kanoga.kanoga_backend.orders;

import com.kanoga.kanoga_backend.label.Label;
import com.kanoga.kanoga_backend.label.LabelRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

@Service
public class OrderAssignmentService {

    private final JdbcTemplate jdbc;
    private final OrderRepository orders;
    private final AssignedUnitRepository assignedUnitRepository;
    private final LabelRepository labelRepository;

    public OrderAssignmentService(
            JdbcTemplate jdbc,
            OrderRepository orders,
            AssignedUnitRepository assignedUnitRepository,
            LabelRepository labelRepository
    ) {
        this.jdbc = jdbc;
        this.orders = orders;
        this.assignedUnitRepository = assignedUnitRepository;
        this.labelRepository = labelRepository;
    }

    @Transactional
    public List<AssignedLabelDto> assignUnits(Long orderId, AssignRequest req) {
        orders.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found"));

        if (req == null || req.subBatchId() == null || req.quantity() == null || req.quantity() <= 0) {
            throw new IllegalArgumentException("subBatchId and quantity are required");
        }

        String sql = """
            select l.id, l.serial_no, l.sub_batch_id
            from labels l
            left join assigned_units au on au.label_id = l.id
            where l.sub_batch_id = ?
              and au.id is null
            order by l.serial_no asc
            limit ?
            """;

        List<AssignedLabelDto> labelsToAssign = jdbc.query(
                sql,
                (rs, rowNum) -> new AssignedLabelDto(
                        rs.getLong("id"),
                        rs.getInt("serial_no"),
                        rs.getLong("sub_batch_id")
                ),
                req.subBatchId(),
                req.quantity()
        );

        if (labelsToAssign.size() < req.quantity()) {
            throw new IllegalArgumentException("Not enough unassigned units available in this sub-batch");
        }

        OffsetDateTime now = OffsetDateTime.now();

        for (AssignedLabelDto label : labelsToAssign) {
            AssignedUnits au = new AssignedUnits();
            au.setOrderId(orderId);
            au.setLabelId(label.labelId());
            au.setAssignedAt(now);
            assignedUnitRepository.save(au);
        }

        return labelsToAssign;
    }

    @Transactional
    public AssignByQrResponse assignByQr(Long orderId, AssignByQrRequest req) {
        orders.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found"));

        if (req == null || req.qrPayload() == null || req.qrPayload().trim().isEmpty()) {
            throw new IllegalArgumentException("qrPayload is required");
        }

        String payload = req.qrPayload().trim();

        Label label = labelRepository.findByQrPayload(payload)
                .orElseThrow(() -> new IllegalArgumentException("Label not found for this QR payload"));

        boolean alreadyAssigned = assignedUnitRepository.existsByLabelId(label.getId());
        if (alreadyAssigned) {
            throw new IllegalArgumentException("This unit is already assigned");
        }

        OffsetDateTime now = OffsetDateTime.now();

        AssignedUnits au = new AssignedUnits();
        au.setOrderId(orderId);
        au.setLabelId(label.getId());
        au.setAssignedAt(now);
        assignedUnitRepository.save(au);

        return new AssignByQrResponse(
                orderId,
                label.getId(),
                label.getSerialNo(),
                label.getSubBatchId(),
                now
        );
    }

    @Transactional(readOnly = true)
    public List<OrderAssignedUnitDto> listAssignedUnits(Long orderId) {
        orders.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found"));

        String sql = """
            select
              au.id as assigned_id,
              au.order_id,
              au.label_id,
              au.assigned_at,
              l.serial_no,
              l.sub_batch_id
            from assigned_units au
            join labels l on l.id = au.label_id
            where au.order_id = ?
            order by au.assigned_at nulls last, l.serial_no
            """;

        return jdbc.query(
                sql,
                (rs, rowNum) -> new OrderAssignedUnitDto(
                        rs.getLong("assigned_id"),
                        rs.getLong("order_id"),
                        rs.getLong("label_id"),
                        rs.getObject("assigned_at", OffsetDateTime.class),
                        rs.getInt("serial_no"),
                        rs.getLong("sub_batch_id")
                ),
                orderId
        );
    }
}