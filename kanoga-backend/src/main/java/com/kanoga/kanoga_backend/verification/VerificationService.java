package com.kanoga.kanoga_backend.verification;

import com.kanoga.kanoga_backend.label.Label;
import com.kanoga.kanoga_backend.label.LabelRepository;
import com.kanoga.kanoga_backend.subbatch.SubBatch;
import com.kanoga.kanoga_backend.subbatch.SubBatchRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.Optional;

@Service
public class VerificationService {

    private final LabelRepository labelRepository;
    private final SubBatchRepository subBatchRepository;

    public VerificationService(LabelRepository labelRepository,
                               SubBatchRepository subBatchRepository) {
        this.labelRepository = labelRepository;
        this.subBatchRepository = subBatchRepository;
    }

    public VerificationResultDto verify(String code) {
        VerificationResultDto dto = new VerificationResultDto();


        Optional<Label> labelOpt = labelRepository.findByQrPayload(code);
        if (labelOpt.isEmpty()) {
            dto.setValid(false);
            dto.setMessage("Code not found. This product may not be genuine.");
            dto.setExpired(false);
            return dto;
        }

        Label label = labelOpt.get();


        Optional<SubBatch> subOpt = subBatchRepository.findById(label.getSubBatchId());
        if (subOpt.isEmpty()) {
            dto.setValid(false);
            dto.setMessage("Sub-batch not found for this code.");
            dto.setExpired(false);
            return dto;
        }

        SubBatch sub = subOpt.get();

        // 3) Build response
        dto.setValid(true);
        dto.setMessage("Product verified.");
        dto.setSubBatchCode(sub.getCode());

        if (sub.getExpiry() != null) {
            LocalDate bb = sub.getExpiry();
            dto.setBestBefore(bb.toString());
            dto.setExpired(bb.isBefore(LocalDate.now()));
        } else {
            dto.setBestBefore(null);
            dto.setExpired(false);
        }


        dto.setProductName(null);
        dto.setBatchCode(null);
        dto.setSupplierName(null);

        return dto;
    }
}
