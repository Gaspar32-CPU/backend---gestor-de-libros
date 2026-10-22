-- El catálogo filtra por idioma, pero la tabla libros no tenía la columna y el
-- backend nunca la leía ni la guardaba, así que el filtro de idioma quedaba
-- sin opciones.
ALTER TABLE libros
    ADD COLUMN idioma VARCHAR(50) NULL AFTER editorial;
