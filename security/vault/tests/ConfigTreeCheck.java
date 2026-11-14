import java.nio.file.Path;
import java.util.Properties;
import org.springframework.boot.context.properties.source.ConfigurationPropertySources;
import org.springframework.boot.env.ConfigTreePropertySource;
import org.springframework.core.env.PropertiesPropertySource;
import org.springframework.core.env.StandardEnvironment;

/** Exercises the real API property placeholders against rendered synthetic secrets. */
public class ConfigTreeCheck {
    public static void main(String[] args) throws Exception {
        var environment = new StandardEnvironment();
        var properties = new Properties();
        try (var input = java.nio.file.Files.newInputStream(Path.of(args[1]))) {
            properties.load(input);
        }
        environment.getPropertySources().addLast(new PropertiesPropertySource("application", properties));
        environment.getPropertySources().addFirst(new ConfigTreePropertySource(
                "vault", Path.of(args[0]), ConfigTreePropertySource.Option.AUTO_TRIM_TRAILING_NEW_LINE));
        ConfigurationPropertySources.attach(environment);
        String[][] mappings = {
                {"JWT_SECRET", "vigil.jwt-secret"},
                {"VIGIL_INGESTION_KEY", "vigil.ingestion-key"},
                {"SPRING_DATASOURCE_PASSWORD", "spring.datasource.password"},
                {"CLICKHOUSE_PASSWORD", "clickhouse.password"}
        };
        for (var mapping : mappings) {
            String expected = java.nio.file.Files.readString(Path.of(args[0], mapping[0])).stripTrailing();
            if (expected.isEmpty() || !expected.equals(environment.getProperty(mapping[1]))) {
                throw new AssertionError("Configtree resolution failed for " + mapping[1]);
            }
            System.out.println("PASS: configtree " + mapping[0] + " -> " + mapping[1]);
        }
    }
}
