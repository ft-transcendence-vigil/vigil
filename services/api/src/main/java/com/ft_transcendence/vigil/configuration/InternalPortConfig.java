package com.ft_transcendence.vigil.configuration;

import org.apache.catalina.connector.Connector;
import org.springframework.boot.tomcat.servlet.TomcatServletWebServerFactory;
import org.springframework.boot.web.server.WebServerFactoryCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class InternalPortConfig {
    public static final int INGEST_PORT = 8081;
    //here we add the port 8081 to work alongside the port 8080, 8080 is public 8081 is for the ingest
    @Bean
    WebServerFactoryCustomizer<TomcatServletWebServerFactory> ingestPortCustomizer() {
        return factory -> {
            Connector ingestConnector = new Connector();
            ingestConnector.setPort(INGEST_PORT);
            factory.addAdditionalConnectors(ingestConnector);
        };
    }
}
