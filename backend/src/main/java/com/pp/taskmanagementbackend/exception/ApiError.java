package com.pp.taskmanagementbackend.exception;

import java.time.OffsetDateTime;
import java.util.List;

public class ApiError {

    private OffsetDateTime timestamp = OffsetDateTime.now();
    private int status;
    private String error;
    private String message;
    private String path;
    private List<FieldErrorItem> fieldErrors;

    public ApiError() {}

    public ApiError(int status, String error, String message, String path) {
        this.status = status;
        this.error = error;
        this.message = message;
        this.path = path;
    }

    public OffsetDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(OffsetDateTime timestamp) { this.timestamp = timestamp; }

    public int getStatus() { return status; }
    public void setStatus(int status) { this.status = status; }

    public String getError() { return error; }
    public void setError(String error) { this.error = error; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getPath() { return path; }
    public void setPath(String path) { this.path = path; }

    public List<FieldErrorItem> getFieldErrors() { return fieldErrors; }
    public void setFieldErrors(List<FieldErrorItem> fieldErrors) { this.fieldErrors = fieldErrors; }

    // nested DTO für Feldfehler
    public static class FieldErrorItem {
        private String field;
        private String message;

        public FieldErrorItem() {}

        public FieldErrorItem(String field, String message) {
            this.field = field;
            this.message = message;
        }

        public String getField() { return field; }
        public void setField(String field) { this.field = field; }

        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }
    }
}
