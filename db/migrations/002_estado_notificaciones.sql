-- Estado real del envío de cada notificación. Hasta ahora se insertaba la
-- fila y se disparaba el email sin esperar el resultado, así que la tabla
-- no permitía saber si el aviso había salido o no.
--   estado:     'pendiente' al insertar, 'enviado' o 'error' cuando termina
--   enviado_en: momento en que el proveedor aceptó el email
--   error:      mensaje del fallo, si lo hubo
ALTER TABLE notificaciones
    ADD COLUMN estado     ENUM('pendiente','enviado','error') NOT NULL DEFAULT 'pendiente',
    ADD COLUMN enviado_en DATETIME NULL,
    ADD COLUMN error      TEXT NULL;
