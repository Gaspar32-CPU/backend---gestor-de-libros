-- Un usuario podía dejar una sola reseña por libro (uq_resena_usuario_libro).
-- Según los documentos del proyecto no hay tal límite: se puede reseñar
-- cada vez que se termina un préstamo del mismo libro.
ALTER TABLE resenas
    DROP INDEX uq_resena_usuario_libro;
