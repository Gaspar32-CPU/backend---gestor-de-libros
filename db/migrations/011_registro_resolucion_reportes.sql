-- Registro de quién atiende cada reporte en Soporte, para cuando haya
-- varios super admins: quién lo tomó, quién lo resolvió, cuándo, y un
-- comentario obligatorio con lo que se hizo para resolverlo.
-- Solo lo ve el super admin (GET /api/soporte/reportes).
ALTER TABLE reportes_problemas
    ADD COLUMN id_tomado_por          INT UNSIGNED NULL AFTER estado,
    ADD COLUMN fecha_tomado           DATETIME NULL AFTER id_tomado_por,
    ADD COLUMN id_resuelto_por        INT UNSIGNED NULL AFTER fecha_tomado,
    ADD COLUMN fecha_resuelto         DATETIME NULL AFTER id_resuelto_por,
    ADD COLUMN comentario_resolucion  TEXT NULL AFTER fecha_resuelto,
    ADD CONSTRAINT fk_reportes_tomado_por FOREIGN KEY (id_tomado_por)
        REFERENCES usuarios(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_reportes_resuelto_por FOREIGN KEY (id_resuelto_por)
        REFERENCES usuarios(id) ON DELETE SET NULL;
