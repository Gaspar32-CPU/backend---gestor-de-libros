-- Días y horarios de atención de la organización. Arreglo JSON con un
-- elemento por día de la semana (0 = domingo ... 6 = sábado):
--   [{ "dia": 1, "abierto": true, "apertura": "08:00", "cierre": "17:00" }, ...]
-- NULL = todavía no se configuró (el front muestra un horario por defecto).
ALTER TABLE configuraciones
    ADD COLUMN horarios JSON NULL AFTER lugar_devolucion;
