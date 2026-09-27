package com.ft_transcendence.vigil.configuration;
import com.ft_transcendence.vigil.exceptions.UnauthorizedException;
import com.ft_transcendence.vigil.ratelimiter.RateLimiter;
import com.ft_transcendence.vigil.security.JjwtAuthFilter;
import lombok.AllArgsConstructor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.LogoutConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.servlet.HandlerExceptionResolver;
@AllArgsConstructor
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
class SecurityConfig {
    private JjwtAuthFilter jjwtAuthFilter;
    private RateLimiter rateLimiter;

    @Bean
    SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            @Qualifier("handlerExceptionResolver") HandlerExceptionResolver exceptionResolver) {
        http.addFilterBefore(jjwtAuthFilter, UsernamePasswordAuthenticationFilter.class)

                .addFilterBefore(rateLimiter, JjwtAuthFilter.class)
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((request, response, authException) ->
                                exceptionResolver.resolveException(
                                        request, response, null,
                                        new UnauthorizedException("Authentication required")
                                )
                        )
                )
                .authorizeHttpRequests((requests) -> requests
                        .requestMatchers(
                                "/api/setup",
                                "/api/auth/login",
                                "/api/auth/refresh",
                                "/api/auth/logout",
                                "/api/auth/sessions",
                                "/api/auth/sessions/*",
                                "/api/alerts/ws").permitAll()
                        .anyRequest().authenticated()
                )
                .csrf(c->c.disable())
                .sessionManagement(s->s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .logout(LogoutConfigurer::permitAll);

        return http.build();
    }

    @Bean
    FilterRegistrationBean<RateLimiter> rateLimiterRegistration(RateLimiter rateLimiter) {
        FilterRegistrationBean<RateLimiter> registration = new FilterRegistrationBean<>(rateLimiter);
        registration.setEnabled(false);
        return registration;
    }


}
