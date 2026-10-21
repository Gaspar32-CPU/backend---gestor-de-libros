-- Los planes ya no limitan la cantidad de libros ni guardan funcionalidades
-- propias: se quitan limite_libros y funcionalidades de la tabla planes.
ALTER TABLE planes
    DROP COLUMN limite_libros,
    DROP COLUMN funcionalidades;
