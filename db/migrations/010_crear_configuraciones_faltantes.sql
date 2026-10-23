-- Toda organización tiene que tener su fila en configuraciones (desde ahora
-- crearOrganizacion la crea junto con la organización). Las que se crearon
-- antes sin configuración la reciben con los valores por defecto de la tabla:
-- el nombre de la app es el de la organización y el lugar de retiro queda
-- vacío para que lo complete el admin.
-- Solo inserta las que faltan, así que se puede correr más de una vez.
INSERT INTO configuraciones (id_organizacion, nombre_app, lugar_retiro)
SELECT o.id, o.nombre, ''
FROM organizaciones o
LEFT JOIN configuraciones c ON c.id_organizacion = o.id
WHERE c.id IS NULL;
