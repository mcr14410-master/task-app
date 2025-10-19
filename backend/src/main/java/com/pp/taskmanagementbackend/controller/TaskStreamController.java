package com.pp.taskmanagementbackend.controller;

import com.pp.taskmanagementbackend.events.TaskEventPublisher;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/tasks")
public class TaskStreamController {

    private final TaskEventPublisher publisher;

    public TaskStreamController(TaskEventPublisher publisher) {
        this.publisher = publisher;
    }

    @GetMapping(path = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream() {
        return publisher.register();
    }
}
