-- Un libro puede tener varios géneros: "genero" (texto) pasa a "generos"
-- (JSON array de strings). Antes de borrar la columna vieja se copia su valor
-- como único elemento del array, así no se pierde ningún género cargado.
ALTER TABLE libros
    ADD COLUMN generos JSON NULL AFTER autor;

UPDATE libros SET generos = JSON_ARRAY(genero);

-- El índice sobre "genero" se va con la columna: MySQL no indexa un JSON
-- directamente, así que el filtro por género no puede apoyarse en él.
ALTER TABLE libros
    MODIFY COLUMN generos JSON NOT NULL,
    DROP INDEX idx_libros_org_genero,
    DROP COLUMN genero;
