-- ENVIOS DE EMAIL (auditoría de los mails de cuenta: registro, invitación)
CREATE TABLE envios_email (
    id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
    correo      VARCHAR(150) NOT NULL,
    tipo        ENUM('registro','invitacion') NOT NULL,
    estado      ENUM('enviado','error') NOT NULL,
    error       TEXT NULL,
    fecha       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_envios_correo (correo),
    KEY idx_envios_tipo_fecha (tipo, fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
