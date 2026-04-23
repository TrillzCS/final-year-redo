package com.kanoga.kanoga_backend.woocommerce;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "woocommerce")
public class WooCommerceProperties {

    private String baseUrl;
    private String consumerKey;
    private String consumerSecret;

    public String getBaseUrl() {
        return baseUrl;
    }

    public void setBaseUrl(String baseUrl) {
        this.baseUrl = baseUrl;
    }

    public String getConsumerKey() {
        return consumerKey;
    }

    public void setConsumerKey(String consumerKey) {
        this.consumerKey = consumerKey;
    }

    public String getConsumerSecret() {
        return consumerSecret;
    }

    public void setConsumerSecret(String consumerSecret) {
        this.consumerSecret = consumerSecret;
    }
}