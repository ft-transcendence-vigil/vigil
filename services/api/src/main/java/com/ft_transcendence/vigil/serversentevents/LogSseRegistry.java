package com.ft_transcendence.vigil.serversentevents;
import com.ft_transcendence.vigil.domain.dtos.telemetry.Log;
import com.ft_transcendence.vigil.repositories.clickhouse.LogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

    @Slf4j
    @RequiredArgsConstructor
    @Component
    public class LogSseRegistry {
        private record SseData(String severity, String service, SseEmitter emitter) {

        }

        private List<SseData> sseDataList = new CopyOnWriteArrayList<>();

        public SseEmitter addSseEmitter(String severity, String service) {
            SseEmitter emitter = new SseEmitter(Long.MAX_VALUE);
            SseData sseData = new SseData(severity, service, emitter);
            emitter.onTimeout(() -> sseDataList.remove(sseData));
            emitter.onError((e) -> sseDataList.remove(sseData));
            emitter.onCompletion(() -> sseDataList.remove(sseData));
            sseDataList.add(sseData);
            return emitter;
        }

        public void broadCastLog(Log ourlog) {
            for (SseData data : sseDataList) {
                if (data.severity == null || data.severity.equals(ourlog.getSeverity())) {
                    if (data.service == null || data.service.equals(ourlog.getService())) {
                        {
                            try {
                                data.emitter.send(ourlog);
                            } catch (Exception e) {
                                log.error(e.getMessage());
                                data.emitter.completeWithError(e);
                            }
                        }
                    }
                }

            }


        }

    }