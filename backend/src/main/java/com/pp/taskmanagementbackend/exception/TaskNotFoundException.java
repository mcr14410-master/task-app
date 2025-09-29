package com.pp.taskmanagementbackend.exception;

/**
 * Wird geworfen, wenn eine Task mit einer bestimmten ID nicht gefunden wurde.
 * Diese Exception wird vom GlobalExceptionHandler abgefangen und als HTTP 404 zurückgegeben.
 */
public class TaskNotFoundException extends RuntimeException {
    private static final long serialVersionUID = 1L;

    public TaskNotFoundException(String message) {
        super(message);
    }

    public TaskNotFoundException(Long id) {
        super("Task mit ID " + id + " nicht gefunden.");
    }
}
