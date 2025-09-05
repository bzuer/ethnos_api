*************************** 1. row ***************************
           Procedure: sp_update_work_author_summary
            sql_mode: STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION
    Create Procedure: CREATE DEFINER=`pc`@`%` PROCEDURE `sp_update_work_author_summary`(
    IN p_work_id INT
)
BEGIN
    DECLARE v_author_string TEXT;
    DECLARE v_first_author_id INT;

    SELECT GROUP_CONCAT(p.preferred_name ORDER BY a.position SEPARATOR '; '),
           MIN(CASE WHEN a.position = 1 THEN a.person_id END)
    INTO v_author_string, v_first_author_id
    FROM authorships a
    JOIN persons p ON a.person_id = p.id
    WHERE a.work_id = p_work_id AND a.role = 'AUTHOR';

    INSERT INTO work_author_summary (work_id, author_string, first_author_id)
    VALUES (p_work_id, v_author_string, v_first_author_id)
    ON DUPLICATE KEY UPDATE
        author_string = v_author_string,
        first_author_id = v_first_author_id;
END
character_set_client: utf8mb3
collation_connection: utf8mb3_general_ci
  Database Collation: utf8mb4_unicode_ci
