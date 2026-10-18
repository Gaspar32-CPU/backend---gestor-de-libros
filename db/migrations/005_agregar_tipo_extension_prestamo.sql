-- Los flujos de extensión, retiro y devolución de préstamos insertan
-- notificaciones con tipo = 'extension_prestamo', 'retiro_libro' y
-- 'devolucion_libro' respectivamente, pero esos valores no existían en el
-- ENUM de notificaciones.tipo. Como el servidor no corre en modo estricto,
-- MySQL truncaba el valor en vez de rechazarlo (WARN_DATA_TRUNCATED), lo que
-- mysql2 reporta como error.
ALTER TABLE notificaciones
    MODIFY COLUMN tipo ENUM('nuevo_prestamo','listo_para_retiro','vencimiento_10_dias',
                             'vencimiento_1_dia','limite_alcanzado','recomendacion',
                             'nuevo_libro','extension_prestamo','retiro_libro',
                             'devolucion_libro') NOT NULL;
