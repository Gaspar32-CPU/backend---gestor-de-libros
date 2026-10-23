SET NAMES utf8mb4;

-- Cada rol elige entre las secciones que realmente ve en su menú:
-- el lector no tiene "Panel", y el admin tiene sus propias pantallas
-- (Gestión catálogo, Préstamos, Usuarios, etc.). El super-admin ve
-- todas para poder filtrar los reportes en Soporte.
ALTER TABLE secciones
    ADD COLUMN para_lector TINYINT(1) NOT NULL DEFAULT 0 AFTER orden,
    ADD COLUMN para_admin  TINYINT(1) NOT NULL DEFAULT 0 AFTER para_lector;

-- Se renombra (no se borra) para que los reportes que ya la usan la conserven.
UPDATE secciones SET nombre = 'Panel', orden = 5, para_admin = 1
    WHERE nombre = 'Panel de administración';

UPDATE secciones SET para_lector = 1
    WHERE nombre IN ('Catálogo', 'Mis préstamos', 'Reservas', 'Perfil');

UPDATE secciones SET para_admin = 1
    WHERE nombre IN ('Catálogo', 'Perfil');

INSERT INTO secciones (nombre, orden, para_lector, para_admin) VALUES
    ('Gestión catálogo', 6, 0, 1),
    ('Préstamos', 7, 0, 1),
    ('Usuarios', 8, 0, 1),
    ('Configuración', 9, 0, 1);
