package com.kanoga.kanoga_backend.orders;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AssignedUnitRepository extends JpaRepository<AssignedUnits, Long> {

    List<AssignedUnits> findByOrderId(Long orderId);

    List<AssignedUnits> findByLabelId(Long labelId);

    boolean existsByLabelId(Long labelId);
}

