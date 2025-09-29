package com.pp.taskmanagementbackend.exception;

/**
 * Wird geworfen, wenn eine Arbeitsstation mit einer bestimmten ID oder einem Namen nicht gefunden wurde.
 * Diese Exception wird vom GlobalExceptionHandler abgefangen und als HTTP 404 zurückgegeben.
 */
public class StationNotFoundException extends RuntimeException {
    private static final long serialVersionUID = 1L;

    public StationNotFoundException(String message) {
        super(message);
    }

    public StationNotFoundException(Long id) {
        super("Arbeitsstation mit ID " + id + " nicht gefunden.");
    }

    public StationNotFoundException(String name, boolean byName) {
        super("Arbeitsstation mit Name \"" + name + "\" nicht gefunden.");
    }
}
