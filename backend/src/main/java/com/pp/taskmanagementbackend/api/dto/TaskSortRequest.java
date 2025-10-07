package com.pp.taskmanagementbackend.api.dto;

public class TaskSortRequest {
    private Long taskId;
    private Integer toIndex;
    private String from; // station name (optional)
    private String to;   // station name (preferred)

    public Long getTaskId() { return taskId; }
    public void setTaskId(Long taskId) { this.taskId = taskId; }

    public Integer getToIndex() { return toIndex; }
    public void setToIndex(Integer toIndex) { this.toIndex = toIndex; }

    public String getFrom() { return from; }
    public void setFrom(String from) { this.from = from; }

    public String getTo() { return to; }
    public void setTo(String to) { this.to = to; }
}
