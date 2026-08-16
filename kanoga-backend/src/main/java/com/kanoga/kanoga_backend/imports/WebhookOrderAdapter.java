package com.kanoga.kanoga_backend.imports;

import java.util.Map;

/** An adapter for a platform that pushes orders in over a signed webhook. */
public interface WebhookOrderAdapter extends StoreOrderAdapter {

    /** Authenticates a webhook body against the secret held for one connection. */
    void verifyWebhook(String rawBody, Map<String, String> headers, String secret);

    /** Setup guidance shown next to the generated webhook URL in the interface. */
    String setupInstructions();
}
