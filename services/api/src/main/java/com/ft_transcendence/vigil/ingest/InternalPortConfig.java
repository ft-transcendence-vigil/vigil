package com.ft_transcendence.vigil.ingest;

import org.apache.catalina.connector.Connector;
import org.springframework.boot.tomcat.servlet.TomcatServletWebServerFactory;
import org.springframework.boot.web.server.WebServerFactoryCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class InternalPortConfig {
    public static final int PORT = 8081;
    //here we add the port 8081 to work alongside the port 8080, 8080 is public 8081 is for the ingest
    @Bean
    WebServerFactoryCustomizer<TomcatServletWebServerFactory> internalPort() {
        return factory -> {
            Connector connector = new Connector();
            connector.setPort(PORT);
            factory.addAdditionalConnectors(connector);
        };
    }
}
