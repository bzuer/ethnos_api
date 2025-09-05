-- Simple Sphinx Triggers for Works Table
-- Simplified version focusing only on existing columns

-- Create sphinx_queue table
CREATE TABLE IF NOT EXISTS sphinx_queue (
    id INT AUTO_INCREMENT PRIMARY KEY,
    operation ENUM('INSERT', 'UPDATE', 'DELETE') NOT NULL,
    work_id INT NOT NULL,
    title TEXT,
    subtitle TEXT, 
    abstract TEXT,
    work_type VARCHAR(50),
    language VARCHAR(10),
    queued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP NULL,
    status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
    retry_count INT DEFAULT 0,
    error_message TEXT NULL,
    
    INDEX idx_status_queued (status, queued_at),
    INDEX idx_work_id (work_id),
    INDEX idx_operation (operation)
) ENGINE=InnoDB;

-- Drop existing triggers
DROP TRIGGER IF EXISTS works_sphinx_insert;
DROP TRIGGER IF EXISTS works_sphinx_update;
DROP TRIGGER IF EXISTS works_sphinx_delete;

-- INSERT trigger
DELIMITER //
CREATE TRIGGER works_sphinx_insert 
AFTER INSERT ON works 
FOR EACH ROW 
BEGIN
    IF NEW.title IS NOT NULL AND NEW.title != '' THEN
        INSERT INTO sphinx_queue (
            operation, work_id, title, subtitle, abstract, work_type, language
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
END//

-- UPDATE trigger  
CREATE TRIGGER works_sphinx_update
AFTER UPDATE ON works
FOR EACH ROW
BEGIN
    IF OLD.title != NEW.title OR 
       COALESCE(OLD.subtitle, '') != COALESCE(NEW.subtitle, '') OR
       COALESCE(OLD.abstract, '') != COALESCE(NEW.abstract, '') OR
       COALESCE(OLD.work_type, '') != COALESCE(NEW.work_type, '') OR
       COALESCE(OLD.language, '') != COALESCE(NEW.language, '')
    THEN
        INSERT INTO sphinx_queue (
            operation, work_id, title, subtitle, abstract, work_type, language
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
END//

-- DELETE trigger
CREATE TRIGGER works_sphinx_delete
AFTER DELETE ON works  
FOR EACH ROW
BEGIN
    INSERT INTO sphinx_queue (operation, work_id, queued_at)
    VALUES ('DELETE', OLD.id, NOW());
END//

DELIMITER ;

-- Test the triggers
SELECT 'Sphinx triggers created successfully' as message;