package com.ft_transcendence.vigil.configuration;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;

import javax.sql.DataSource;

@Configuration
class DataSourceConfig {

    @Primary
    @Bean
    DataSource dataSource(
            @Value("${spring.datasource.url}") String url,
            @Value("${spring.datasource.username}") String username,
            @Value("${spring.datasource.password}") String password) {
        return pool("vigil-postgres", url, username, password, null);
    }

    @Bean
    DataSource clickHouseDataSource(
            @Value("${clickhouse.url}") String url,
            @Value("${clickhouse.username}") String username,
            @Value("${clickhouse.password}") String password,
            @Value("${clickhouse.driver-class-name}") String driverClassName) {

        HikariDataSource dataSource =
                (HikariDataSource) pool("vigil-clickhouse", url, username, password, driverClassName);

        dataSource.setInitializationFailTimeout(-1);

        return dataSource;
    }

    @Bean
    JdbcTemplate clickHouseJdbcTemplate(@Qualifier("clickHouseDataSource") DataSource clickHouseDataSource) {
        return new JdbcTemplate(clickHouseDataSource);
    }

    private DataSource pool(String poolName, String url, String username, String password, String driverClassName) {
        HikariConfig config = new HikariConfig();

        config.setPoolName(poolName);
        config.setJdbcUrl(url);
        config.setUsername(username);
        config.setPassword(password);

        if (driverClassName != null && !driverClassName.isBlank())
            config.setDriverClassName(driverClassName);

        return new HikariDataSource(config);
    }
}
