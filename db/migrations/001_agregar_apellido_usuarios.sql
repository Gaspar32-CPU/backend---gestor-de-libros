-- Apellido separado del nombre. NULL porque los usuarios existentes no lo
-- tienen: hasta ahora "nombre" guardaba el nombre completo.
ALTER TABLE usuarios
    ADD COLUMN apellido VARCHAR(150) NULL AFTER nombre;
