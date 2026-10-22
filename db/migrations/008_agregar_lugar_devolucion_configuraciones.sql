-- Lugar donde se devuelven los libros. NULL = se devuelven en el mismo
-- lugar donde se retiran (lugar_retiro).
ALTER TABLE configuraciones
    ADD COLUMN lugar_devolucion VARCHAR(150) NULL AFTER lugar_retiro;
