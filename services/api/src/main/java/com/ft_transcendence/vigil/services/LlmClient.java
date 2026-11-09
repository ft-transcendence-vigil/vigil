package com.ft_transcendence.vigil.services;

import com.ft_transcendence.vigil.configuration.VigilProperties;
import com.ft_transcendence.vigil.domain.dtos.llm.LlmRequestDto;
import jakarta.annotation.PreDestroy;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.UUID;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;

@Component
public class LlmClient {
    private final ObjectMapper objectMapper;
    private final VigilProperties vigilProperties;
    private final RestClient restClient;
    private final ScheduledExecutorService timeouts = Executors.newSingleThreadScheduledExecutor();

    public LlmClient(ObjectMapper objectMapper, VigilProperties vigilProperties)
    {
        this.objectMapper = objectMapper;
        this.vigilProperties = vigilProperties;
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(5));
        requestFactory.setReadTimeout(Duration.ofSeconds(vigilProperties.getLlmTimeoutSeconds()));
        this.restClient = RestClient.builder().requestFactory(requestFactory).build();
    }

    public String stream(String path, LlmRequestDto llmRequestDto, UUID userId, Consumer<String> onToken)
    {
        Duration timeout = Duration.ofSeconds(vigilProperties.getLlmTimeoutSeconds());
        long deadline = System.nanoTime() + timeout.toNanos();
        RestClient.RequestBodySpec request = restClient.post()
                .uri(URI.create(vigilProperties.getLlmBaseUrl()).resolve(path))
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.TEXT_EVENT_STREAM);
        if (userId != null)
            request.header("X-Vigil-User-Id", userId.toString());

        return request.body(objectMapper.writeValueAsString(llmRequestDto)).exchange((outgoing, response) ->
        {
            try (InputStream input = response.getBody())
            {
                ScheduledFuture<?> cancellation = timeouts.schedule(() -> close(input),
                        Math.max(0, deadline - System.nanoTime()), TimeUnit.NANOSECONDS);
                try
                {
                    int status = response.getStatusCode().value();
                    if (status != 200)
                    {
                        String message = readErrorMessage(input);
                        throw new RestClientResponseException(message, status, response.getStatusText(),
                                response.getHeaders(), null, null);
                    }
                    MediaType contentType = response.getHeaders().getContentType();
                    if (contentType == null || !MediaType.TEXT_EVENT_STREAM.isCompatibleWith(contentType))
                        throw new IOException("LLM did not return an SSE stream");
                    return readEvents(input, onToken);
                }
                finally
                {
                    cancellation.cancel(false);
                }
            }
        });
    }

    private String readErrorMessage(InputStream input)
    {
        try
        {
            JsonNode message = objectMapper.readTree(input).path("message");
            if (!message.isString())
                return "";
            return message.asString();
        }
        catch (JacksonException ex)
        {
            return "";
        }
    }

    private String readEvents(InputStream input, Consumer<String> onToken) throws IOException
    {
        BufferedReader reader = new BufferedReader(new InputStreamReader(input, StandardCharsets.UTF_8));
        String event = "";
        StringBuilder data = new StringBuilder();
        StringBuilder analysis = new StringBuilder();
        String line;
        while ((line = reader.readLine()) != null)
        {
            if (line.isEmpty())
            {
                if (!data.isEmpty())
                {
                    JsonNode payload = objectMapper.readTree(data.toString());
                    switch (event)
                    {
                        case "token" ->
                        {
                            JsonNode token = payload.get("token");
                            if (token == null || !token.isString())
                                throw new IOException("Invalid LLM token");
                            analysis.append(token.asString());
                            onToken.accept(token.asString());
                        }
                        case "done" ->
                        {
                            if (analysis.isEmpty())
                                throw new IOException("LLM returned an empty analysis");
                            return analysis.toString();
                        }
                        case "error" -> throw new IOException("LLM stream failed");
                    }
                }
                event = "";
                data.setLength(0);
            }
            else if (!line.startsWith(":"))
            {
                int colon = line.indexOf(':');
                String field = colon < 0 ? line : line.substring(0, colon);
                String value = colon < 0 ? "" : line.substring(colon + 1);
                if (value.startsWith(" "))
                    value = value.substring(1);
                if (field.equals("event"))
                {
                    event = value;
                }
                else if (field.equals("data"))
                {
                    if (!data.isEmpty())
                        data.append('\n');
                    data.append(value);
                }
            }
        }
        throw new IOException("LLM stream ended before done");
    }

    private void close(InputStream input)
    {
        try
        {
            input.close();
        }
        catch (IOException ignored)
        {
        }
    }

    @PreDestroy
    public void close()
    {
        timeouts.shutdownNow();
    }
}
