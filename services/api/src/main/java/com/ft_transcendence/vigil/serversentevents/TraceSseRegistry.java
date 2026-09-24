package com.ft_transcendence.vigil.serversentevents;
import com.ft_transcendence.vigil.domain.dtos.telemetry.Trace;
import com.ft_transcendence.vigil.repositories.clickhouse.TraceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

@Slf4j
@RequiredArgsConstructor
@Component
public class TraceSseRegistry {
    private record SseData(String service,SseEmitter emitter) {

    }

    private List<SseData> sseDataList = new CopyOnWriteArrayList<>();

    public SseEmitter addSseEmitter(String service) {
        SseEmitter emitter = new SseEmitter(Long.MAX_VALUE);
        SseData sseData = new SseData(service, emitter);
        emitter.onTimeout(() -> sseDataList.remove(sseData));
        emitter.onError((e) -> sseDataList.remove(sseData));
        emitter.onCompletion(() -> sseDataList.remove(sseData));
        sseDataList.add(sseData);
        return emitter;
    }

    public void broadCastTrace(Trace ourTrace) {
        for (SseData data : sseDataList) {
                if (data.service == null || data.service.equals(ourTrace.getService())) {
                    {
                        try {
                            data.emitter.send(ourTrace);
                        } catch (Exception e) {
                            log.error(e.getMessage());
                            data.emitter.completeWithError(e);
                        }
                    }
                }

        }


    }

}