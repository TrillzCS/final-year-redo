package com.kanoga.kanoga_backend.Auth;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(Customizer.withDefaults())
                .csrf(AbstractHttpConfigurer::disable)
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers(
                                "/api/auth/login",
                                "/api/db/ping",
                                "/api/verify",
                                "/api/orders",
                                "/api/orders/**",
                                "/api/woo/webhook"
                        ).permitAll()
                        .anyRequest().authenticated()
                )
                .httpBasic(basic -> basic
                        .authenticationEntryPoint((request, response, authException) -> {
                            String path = request.getRequestURI();
                            if (path.startsWith("/api/woo/")) {
                                response.setStatus(200);
                            } else {
                                response.setStatus(401);
                                response.setHeader("WWW-Authenticate", "Basic realm=\"Kanoga\"");
                            }
                        })
                );

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration frontendConfig = new CorsConfiguration();
        frontendConfig.setAllowedOrigins(List.of("http://localhost:5173"));
        frontendConfig.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        frontendConfig.setAllowedHeaders(List.of("*"));
        frontendConfig.setExposedHeaders(Arrays.asList("Authorization", "Content-Type"));
        frontendConfig.setAllowCredentials(true);
        frontendConfig.setMaxAge(3600L);


        CorsConfiguration webhookConfig = new CorsConfiguration();
        webhookConfig.setAllowedOriginPatterns(List.of("*"));
        webhookConfig.setAllowedMethods(List.of("POST", "OPTIONS"));
        webhookConfig.setAllowedHeaders(List.of("*"));
        webhookConfig.setAllowCredentials(false);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/woo/**", webhookConfig);
        source.registerCorsConfiguration("/**", frontendConfig);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}