package com.kanoga.kanoga_backend.label;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface LabelRepository extends JpaRepository<Label, Long> {

    Optional<Label> findByQrPayload(String qrPayload);
}
