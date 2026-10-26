-- Preferencia del usuario para recibir notificaciones. Arranca activada
-- (también para los usuarios que ya existían), así nadie deja de recibir
-- avisos hasta que lo desactive.
ALTER TABLE usuarios
    ADD COLUMN notificaciones_activadas TINYINT(1) NOT NULL DEFAULT 1 AFTER foto;

-- Los usuarios que ya existían quedan con las notificaciones activadas.
-- El DEFAULT de arriba ya lo hace al agregar la columna; esto lo deja
-- explícito por si se cambia el DEFAULT más adelante.
UPDATE usuarios SET notificaciones_activadas = 1;
