package com.pp.taskmanagementbackend.repository;

import com.pp.taskmanagementbackend.model.DueDateBucket;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface DueDateBucketRepository extends JpaRepository<DueDateBucket, String> {
    List<DueDateBucket> findAllByOrderBySortOrderAsc();
}
