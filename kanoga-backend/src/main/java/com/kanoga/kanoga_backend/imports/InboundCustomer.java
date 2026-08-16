package com.kanoga.kanoga_backend.imports;

/** Customer details as supplied by the source system. */
public record InboundCustomer(
        String name,
        String email,
        String phone,
        String address1,
        String address2,
        String city,
        String country,
        String postcode
) {
    public static InboundCustomer of(String name, String email) {
        return new InboundCustomer(name, email, null, null, null, null, null, null);
    }
}
