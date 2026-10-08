-- Momento en que el usuario validó su correo. NULL = todavía no lo validó.
ALTER TABLE usuarios
    ADD COLUMN email_verificado_en DATETIME NULL;

-- Los usuarios que ya existían se dan por validados: si no, no podrían
-- volver a entrar cuando el login empiece a exigir la validación.
UPDATE usuarios SET email_verificado_en = NOW();
