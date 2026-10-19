-- Las reseñas quedaban atadas solo a usuario y libro, sin organización.
-- Como "libros" y "reservas" ya guardan id_organizacion (y el catálogo es
-- por organización), resenas necesita la misma columna para poder filtrar
-- y, sobre todo, para la FK compuesta contra usuarios(id, id_organizacion)
-- que ya usan reservas y prestamos.
--
-- No hay UPDATE para filas existentes: id_organizacion sale de libros
-- (toda reseña es de un libro, y el libro ya sabe de qué organización es).
ALTER TABLE resenas
    ADD COLUMN id_organizacion INT UNSIGNED NOT NULL AFTER id_libro;

UPDATE resenas r
    JOIN libros l ON l.id = r.id_libro
    SET r.id_organizacion = l.id_organizacion;

ALTER TABLE resenas
    ADD KEY idx_resenas_org (id_organizacion),
    ADD CONSTRAINT fk_resenas_usuario_org FOREIGN KEY (id_usuario, id_organizacion)
        REFERENCES usuarios(id, id_organizacion) ON DELETE CASCADE,
    DROP FOREIGN KEY fk_resenas_usuario;
