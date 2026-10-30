-- Borrado lógico de libros: DELETE /api/libros/:id marca eliminado = TRUE en
-- vez de borrar la fila, porque fk_prestamos_libro es ON DELETE RESTRICT y el
-- historial de préstamos (devueltos y cancelados) se tiene que conservar.
-- El catálogo y la ficha del libro filtran los eliminados.
ALTER TABLE libros
    ADD COLUMN eliminado BOOLEAN NOT NULL DEFAULT FALSE AFTER stock;
