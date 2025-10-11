package com.pp.taskmanagementbackend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Typed configuration for attachment storage.
 * Property prefix: attachments
 *
 * Example:
 * attachments.base-path=C:/Users/Master/task-app/attachments
 * attachments.base-path=/data/attachments
 */
@ConfigurationProperties(prefix = "attachments")
public class AttachmentsProperties {
    /**
     * Base directory for storing attachments.
     * Defaults to a relative folder named 'attachments' under the app working directory.
     */
    private String basePath = "attachments";

    public String getBasePath() {
        return basePath;
    }

    public void setBasePath(String basePath) {
        this.basePath = basePath;
    }
}
