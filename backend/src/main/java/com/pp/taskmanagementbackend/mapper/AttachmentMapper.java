package com.pp.taskmanagementbackend.mapper;

import com.pp.taskmanagementbackend.api.dto.AttachmentDto;
import com.pp.taskmanagementbackend.model.Attachment;

public class AttachmentMapper {
    public static AttachmentDto toDto(Attachment a) {
        AttachmentDto dto = new AttachmentDto();
        dto.id = a.getId();
        dto.filename = a.getFilename();
        dto.mime = a.getMime();
        dto.size = a.getSize();
        // Wichtig: relative URL, damit Nginx sie proxyt (same-origin)
        dto.downloadUrl = "/api/tasks/" + a.getTask().getId() + "/attachments/" + a.getId();
        return dto;
    }
}