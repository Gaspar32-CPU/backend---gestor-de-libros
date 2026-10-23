SET NAMES utf8mb4;

-- Secciones del sistema que el usuario elige al reportar un problema.
-- Viven en la base (y no fijas en el frontend) para poder agregar,
-- reordenar o desactivar secciones sin tocar el código.
CREATE TABLE secciones (
    id      INT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre  VARCHAR(100) NOT NULL,
    orden   SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    activo  TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (id),
    UNIQUE KEY uq_secciones_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO secciones (nombre, orden) VALUES
    ('Catálogo', 1),
    ('Mis préstamos', 2),
    ('Reservas', 3),
    ('Perfil', 4),
    ('Panel de administración', 5);
