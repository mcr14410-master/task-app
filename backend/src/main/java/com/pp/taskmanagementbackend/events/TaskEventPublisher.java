package com.pp.taskmanagementbackend.events;

import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

@Component
public class TaskEventPublisher {
    private final List<SseEmitter> emitters = new CopyOnWriteArrayList<>();

    public SseEmitter register() {
        SseEmitter emitter = new SseEmitter(0L); // no timeout
        emitters.add(emitter);
        emitter.onCompletion(() -> emitters.remove(emitter));
        emitter.onTimeout(() -> emitters.remove(emitter));
        emitter.onError(e -> emitters.remove(emitter));
        try { emitter.send(SseEmitter.event().name("ping").data("ok")); } catch (IOException ignored) {}
        return emitter;
    }

    private void broadcast(String name) {
        for (SseEmitter emitter : emitters) {
            try { emitter.send(SseEmitter.event().name(name).data("1")); }
            catch (IOException e) { emitter.complete(); emitters.remove(emitter); }
        }
    }

    public void onTaskCreated() { broadcast("task-created"); }
    public void onTaskUpdated() { broadcast("task-updated"); }
    public void onTaskDeleted() { broadcast("task-deleted"); }
}
