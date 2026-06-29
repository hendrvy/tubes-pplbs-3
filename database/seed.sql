DELIMITER $$

DROP PROCEDURE IF EXISTS seed_crowd_readings$$

CREATE PROCEDURE seed_crowd_readings()
BEGIN
    DECLARE i INT DEFAULT 1;

    WHILE i <= 200 DO

        INSERT INTO crowd_readings
        (
            zone_id,
            density_count,
            risk_level,
            source
        )
        VALUES
        (
            FLOOR(1 + RAND()*4),

            FLOOR(20 + RAND()*280),

            ELT(
                FLOOR(1 + RAND()*4),
                'Aman',
                'Waspada',
                'Bahaya',
                'Kritis'
            ),

            ELT(
                FLOOR(1 + RAND()*2),
                'iot',
                'manual'
            )
        );

        SET i = i + 1;

    END WHILE;

END$$

DELIMITER ;

CALL seed_crowd_readings();

DROP PROCEDURE seed_crowd_readings;