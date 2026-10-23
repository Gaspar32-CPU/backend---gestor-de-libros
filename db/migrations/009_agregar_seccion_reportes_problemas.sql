-- Cada reporte guarda en qué sección del sistema pasó el problema.
-- Es NULL solo para los reportes anteriores a esta migración: la API
-- (POST /api/reportes) exige la sección en todos los reportes nuevos.
ALTER TABLE reportes_problemas
    ADD COLUMN id_seccion INT UNSIGNED NULL AFTER id_organizacion,
    ADD KEY idx_reportes_seccion (id_seccion),
    ADD CONSTRAINT fk_reportes_seccion FOREIGN KEY (id_seccion)
        REFERENCES secciones(id) ON DELETE RESTRICT;
