-- Foto de perfil del usuario. Guarda la ruta relativa servida desde
-- /uploads (ver multer en index.js), no la imagen en sí. NULL = sin foto,
-- se muestran las iniciales (ver obtenerIniciales en el frontend).
ALTER TABLE usuarios
    ADD COLUMN foto VARCHAR(255) NULL AFTER telefono;
