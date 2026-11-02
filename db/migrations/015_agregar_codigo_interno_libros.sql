-- Código interno del libro: identificador propio de cada biblioteca (ej. NOV-014).
-- El formulario de alta/edición ya lo pide y lo manda como codigo_interno.
ALTER TABLE libros
    ADD COLUMN codigo_interno VARCHAR(50) NULL AFTER isbn;
