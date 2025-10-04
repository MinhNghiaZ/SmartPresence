-- Auto-complete expired ClassSession records
-- This event runs every 5 minutes to check for expired ACTIVE sessions

DELIMITER $$

CREATE EVENT IF NOT EXISTS auto_complete_expired_sessions
ON SCHEDULE EVERY 5 MINUTE
STARTS CURRENT_TIMESTAMP
DO
BEGIN
    UPDATE ClassSession cs
    INNER JOIN TimeSlot ts ON cs.timeSlotId = ts.timeSlotId
    SET cs.session_status = 'COMPLETED',
        cs.ended_at = NOW()
    WHERE cs.session_status = 'ACTIVE'
      AND cs.session_date = CURDATE()
      AND CURTIME() > ts.end_time
      AND cs.ended_at IS NULL;
      
    -- Log the update
    IF ROW_COUNT() > 0 THEN
        INSERT INTO system_logs (log_level, message, created_at) 
        VALUES ('INFO', CONCAT('Auto-completed ', ROW_COUNT(), ' expired sessions'), NOW());
    END IF;
END$$

DELIMITER ;

-- Enable event scheduler if not already enabled
SET GLOBAL event_scheduler = ON;