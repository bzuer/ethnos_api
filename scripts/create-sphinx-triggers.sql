-- Sphinx Real-Time Indexing Database Triggers
-- Creates automatic synchronization between MariaDB and Sphinx Search

-- Create queue table for trigger operations
CREATE TABLE IF NOT EXISTS sphinx_queue (
    id INT AUTO_INCREMENT PRIMARY KEY,
    operation ENUM('INSERT', 'UPDATE', 'DELETE') NOT NULL,
    work_id INT NOT NULL,
    title TEXT,
    subtitle TEXT, 
    abstract TEXT,
    author_string TEXT,
    venue_name VARCHAR(500),
    doi VARCHAR(200),
    year INT,
    work_type VARCHAR(50),
    language VARCHAR(10),
    open_access TINYINT(1),
    peer_reviewed TINYINT(1),
    queued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP NULL,
    status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
    retry_count INT DEFAULT 0,
    error_message TEXT NULL,
    
    INDEX idx_status_queued (status, queued_at),
    INDEX idx_work_id (work_id),
    INDEX idx_operation (operation)
) ENGINE=InnoDB;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS works_sphinx_insert;
DROP TRIGGER IF EXISTS works_sphinx_update;
DROP TRIGGER IF EXISTS works_sphinx_delete;

-- Trigger for INSERT operations
DELIMITER $$
CREATE TRIGGER works_sphinx_insert 
AFTER INSERT ON works 
FOR EACH ROW 
BEGIN
    -- Only queue if the work has essential data for indexing
    IF NEW.title IS NOT NULL AND NEW.title != '' THEN
        INSERT INTO sphinx_queue (
            operation, work_id, title, subtitle, abstract, 
            work_type, language
        ) VALUES (
            'INSERT', 
            NEW.id, 
            NEW.title, 
            COALESCE(NEW.subtitle, ''),
            COALESCE(NEW.abstract, ''),
            COALESCE(NEW.work_type, 'ARTICLE'),
            COALESCE(NEW.language, 'unknown')
        );
    END IF;
END$$

-- Trigger for UPDATE operations  
CREATE TRIGGER works_sphinx_update
AFTER UPDATE ON works
FOR EACH ROW
BEGIN
    -- Only queue if searchable fields were changed
    IF OLD.title != NEW.title OR 
       COALESCE(OLD.subtitle, '') != COALESCE(NEW.subtitle, '') OR
       COALESCE(OLD.abstract, '') != COALESCE(NEW.abstract, '') OR
       COALESCE(OLD.work_type, '') != COALESCE(NEW.work_type, '') OR
       COALESCE(OLD.language, '') != COALESCE(NEW.language, '')
    THEN
        INSERT INTO sphinx_queue (
            operation, work_id, title, subtitle, abstract,
            work_type, language
        ) VALUES (
            'UPDATE', 
            NEW.id, 
            NEW.title,
            COALESCE(NEW.subtitle, ''),
            COALESCE(NEW.abstract, ''),
            COALESCE(NEW.work_type, 'ARTICLE'),
            COALESCE(NEW.language, 'unknown')
        );
    END IF;
END$$

-- Trigger for DELETE operations
CREATE TRIGGER works_sphinx_delete
AFTER DELETE ON works  
FOR EACH ROW
BEGIN
    INSERT INTO sphinx_queue (operation, work_id, queued_at)
    VALUES ('DELETE', OLD.id, NOW());
END$$
DELIMITER ;

-- Create indexes on works table for trigger performance
CREATE INDEX IF NOT EXISTS idx_works_title ON works(title(100));
CREATE INDEX IF NOT EXISTS idx_works_updated ON works(updated_at);

-- Create status view for monitoring
CREATE OR REPLACE VIEW v_sphinx_queue_status AS
SELECT 
    status,
    operation,
    COUNT(*) as count,
    MIN(queued_at) as oldest_item,
    MAX(queued_at) as newest_item,
    AVG(retry_count) as avg_retries
FROM sphinx_queue 
WHERE status != 'completed' OR queued_at > DATE_SUB(NOW(), INTERVAL 1 DAY)
GROUP BY status, operation
ORDER BY status, operation;

-- Insert test record to validate triggers
-- INSERT INTO works (title, subtitle, work_type, year) VALUES ('Test Trigger Work', 'Validation', 'ARTICLE', 2025);

SELECT 'Sphinx triggers created successfully' as message;
SELECT COUNT(*) as queue_items FROM sphinx_queue;
SELECT * FROM v_sphinx_queue_status;