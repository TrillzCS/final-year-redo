package com.kanoga.kanoga_backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Deployment-specific settings that were previously hard-coded to one business. */
@ConfigurationProperties(prefix = "app")
public class AppProperties {

    private final Branding branding = new Branding();
    private final Defaults defaults = new Defaults();

    public Branding getBranding() { return branding; }
    public Defaults getDefaults() { return defaults; }

    public static class Branding {
        /** Shown in the sidebar and page headers. */
        private String companyName = "Kanoga";
        /** Shown beneath the company name. */
        private String productName = "Traceability System";
        /** Prefix applied to generated batch codes, e.g. */
        private String codePrefix = "KPG";

        public String getCompanyName() { return companyName; }
        public void setCompanyName(String v) { this.companyName = v; }
        public String getProductName() { return productName; }
        public void setProductName(String v) { this.productName = v; }
        public String getCodePrefix() { return codePrefix; }
        public void setCodePrefix(String v) { this.codePrefix = v; }
    }

    public static class Defaults {
        /** Fallback shelf life when a product does not define its own. */
        private int shelfLifeMonths = 18;
        /** Unit for incoming batch quantities: kg, litres, units, boxes. */
        private String batchUnit = "kg";
        /** Unit for the size of an individual packed item. */
        private String productUnit = "g";
        /** Days before expiry at which the scheduler raises an alert. */
        private int expiryAlertDays = 30;
        /** Days before expiry at which an alert is raised as CRITICAL rather than HIGH. */
        private int expiryCriticalDays = 7;

        public int getShelfLifeMonths() { return shelfLifeMonths; }
        public void setShelfLifeMonths(int v) { this.shelfLifeMonths = v; }
        public String getBatchUnit() { return batchUnit; }
        public void setBatchUnit(String v) { this.batchUnit = v; }
        public String getProductUnit() { return productUnit; }
        public void setProductUnit(String v) { this.productUnit = v; }
        public int getExpiryAlertDays() { return expiryAlertDays; }
        public void setExpiryAlertDays(int v) { this.expiryAlertDays = v; }
        public int getExpiryCriticalDays() { return expiryCriticalDays; }
        public void setExpiryCriticalDays(int v) { this.expiryCriticalDays = v; }
    }
}
