const express = require('express')
const cors = require('cors')

const app = express()
app.use(cors())
app.use(express.json())

/* ============================================================
   PAGOS
   ============================================================ */

// POST /pagos/checkout - Iniciar el pago de un plan (público, sin cuenta)
app.post('/pagos/checkout', (req, res) => {

})

// POST /pagos/webhook - Confirmar pago y crear organización + user admin
app.post('/pagos/webhook', (req, res) => {

})

/* ============================================================
   PLANES
   ============================================================ */

// GET /planes - Listar todos los planes (público)
app.get('/planes', (req, res) => {

})

// GET /planes/:id - Ver un plan específico (público)
app.get('/planes/:id', (req, res) => {

})

// POST /planes - Crear un nuevo plan (solo super-admin)
app.post('/planes', (req, res) => {

})

// PUT /planes/:id - Editar valores de un plan (solo super-admin)
app.put('/planes/:id', (req, res) => {

})

// DELETE /planes/:id - Eliminar un plan específico (solo super-admin)
app.delete('/planes/:id', (req, res) => {

})

/* ============================================================
   ADMINISTRADORES DE PLATAFORMA
   ============================================================ */

// GET /admin/usuarios - Listar usuarios de todas las organizaciones (solo super-admin)
app.get('/admin/usuarios', (req, res) => {

})

/* ============================================================
   ORGANIZACIONES
   ============================================================ */

// POST /organizaciones - Crear una nueva organización (uso interno / super-admin)
app.post('/organizaciones', (req, res) => {

})

// GET /organizaciones - Listar todas las organizaciones (solo super-admin)
app.get('/organizaciones', (req, res) => {

})

// GET /organizaciones/:id - Obtener datos de la organización
app.get('/organizaciones/:id', (req, res) => {

})

// PUT /organizaciones/:id - Editar valores de una organización (admin)
app.put('/organizaciones/:id', (req, res) => {

})

// DELETE /organizaciones/:id - Eliminar organización (admin)
app.delete('/organizaciones/:id', (req, res) => {

})

/* ============================================================
   CONFIGURACIÓN DE ORGANIZACIONES (anidada)
   ============================================================ */

// POST /organizaciones/:id/configuracion - Crear una nueva configuración (admin)
app.post('/organizaciones/:id/configuracion', (req, res) => {

})

// GET /organizaciones/:id/configuracion - Obtener configuración de una organización
app.get('/organizaciones/:id/configuracion', (req, res) => {

})

// PUT /organizaciones/:id/configuracion - Editar una configuración de organización (admin)
app.put('/organizaciones/:id/configuracion', (req, res) => {

})

// DELETE /organizaciones/:id/configuracion - Borrar una configuración de organización (admin)
app.delete('/organizaciones/:id/configuracion', (req, res) => {

})

/* ============================================================
   USUARIOS
   ============================================================ */

// POST /usuarios - Crear un nuevo usuario (público, con mail de dominio asociado)
app.post('/usuarios', (req, res) => {

})

// GET /usuarios - Listar usuarios de mi organización (admin)
app.get('/usuarios', (req, res) => {

})

// GET /usuarios/:id - Ver un usuario específico (el propio usuario, o admin de su organización)
app.get('/usuarios/:id', (req, res) => {

})

// PUT /usuarios/:id - Editar valores de un usuario (el propio usuario, o admin de su organización)
app.put('/usuarios/:id', (req, res) => {

})

// DELETE /usuarios/:id - Eliminar un usuario específico (el propio usuario, o admin de su organización)
app.delete('/usuarios/:id', (req, res) => {

})

/* ============================================================
   AUTENTICACIÓN
   ============================================================ */

// POST /auth/login - Iniciar sesión
app.post('/auth/login', (req, res) => {

})

// POST /auth/logout - Cerrar sesión
app.post('/auth/logout', (req, res) => {

})

// POST /auth/recuperar - Recuperar contraseña
app.post('/auth/recuperar', (req, res) => {

})

/* ============================================================
   LIBROS
   ============================================================ */

// POST /libros - Crear un nuevo libro (admin)
app.post('/libros', (req, res) => {

})

// GET /libros - Listar todos los libros (cualquier usuario autenticado)
app.get('/libros', (req, res) => {

})

// GET /libros/:id - Ver un libro específico (cualquier usuario autenticado)
app.get('/libros/:id', (req, res) => {

})

// PUT /libros/:id - Editar valores de un libro (admin)
app.put('/libros/:id', (req, res) => {

})

// DELETE /libros/:id - Eliminar un libro específico (admin)
app.delete('/libros/:id', (req, res) => {

})

/* ============================================================
   PRÉSTAMOS
   Nota de orden: las rutas /prestamos/mis-prestamos van ANTES de
   /prestamos/:id para que Express no interprete "mis-prestamos"
   como un valor de :id.
   ============================================================ */

// GET /prestamos/mis-prestamos - Listar los préstamos del usuario autenticado
//    admite ?estado=vencido para filtrar
app.get('/prestamos/mis-prestamos', (req, res) => {

})

// GET /prestamos/mis-prestamos/:id - Ver un préstamo específico (cualquier usuario autenticado)
app.get('/prestamos/mis-prestamos/:id', (req, res) => {

})

// PATCH /prestamos/mis-prestamos/:id/extender - Extender plazo del préstamo
app.patch('/prestamos/mis-prestamos/:id/extender', (req, res) => {

})

// POST /prestamos - Crear un nuevo préstamo (cualquier usuario autenticado)
app.post('/prestamos', (req, res) => {

})

// GET /prestamos - Listar todos los préstamos (admin), admite ?estado=vencido
app.get('/prestamos', (req, res) => {

})

// GET /prestamos/:id - Ver un préstamo específico (admin)
app.get('/prestamos/:id', (req, res) => {

})

// PATCH /prestamos/:id/devolver - Marcar préstamo como devuelto (admin)
app.patch('/prestamos/:id/devolver', (req, res) => {

})

// DELETE /prestamos/:id - Eliminar un préstamo (admin)
app.delete('/prestamos/:id', (req, res) => {

})

/* ============================================================ */

app.listen(3001, () => {
  console.log('Servidor en http://localhost:3001')
})