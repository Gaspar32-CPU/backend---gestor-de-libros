require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { verificarToken, verificarAdmin, verificarSuperAdmin } = require('./middlewares/auth');

const app = express();
app.use(cors());
app.use(express.json());

const buscarPorId = (array, id) => {
  const idNum = parseInt(id);
  if (isNaN(idNum)) return undefined;
  return array.find(item => item.id === idNum);
};

/* ============================================================
   PAGOS
   ============================================================ */

// POST /pagos/checkout - Iniciar el pago de un plan (público, sin cuenta)
app.post('/pagos/checkout', (req, res) => {

})

// POST /pagos/webhook - Confirmar pago y crear organización + user admin
// Nota: los webhooks no se protegen con JWT de usuario, sino verificando
// la firma que manda el proveedor de pagos (ej: header Stripe-Signature).
app.post('/pagos/webhook', (req, res) => {

})

/* ============================================================
   PLANES
   ============================================================ */

// GET /planes - Listar todos los planes (público)
app.get('/planes', (req, res) => {
  res.json(planes);
})

// GET /planes/:id - Ver un plan específico (público)
app.get('/planes/:id', (req, res) => {
  const plan = buscarPorId(planes, req.params.id);

  if (!plan) {
    return res.status(404).json({ error: 'Plan no encontrado' });
  }

  res.json(plan);
})

// POST /planes - Crear un nuevo plan (solo super-admin)
app.post('/planes', verificarToken, verificarSuperAdmin, (req, res) => {

})

// PUT /planes/:id - Editar valores de un plan (solo super-admin)
app.put('/planes/:id', verificarToken, verificarSuperAdmin, (req, res) => {

})

// DELETE /planes/:id - Eliminar un plan específico (solo super-admin)
app.delete('/planes/:id', verificarToken, verificarSuperAdmin, (req, res) => {

})

/* ============================================================
   ADMINISTRADORES DE PLATAFORMA
   ============================================================ */

// GET /admin/usuarios - Listar usuarios de todas las organizaciones (solo super-admin)
app.get('/admin/usuarios', verificarToken, verificarSuperAdmin, (req, res) => {
  // Nota: esto lista TODOS los usuarios, no busca uno por id.
  // buscarPorId no aplica acá (se usaba mal antes, sobre una variable
  // que todavía no existía). Reemplazar por la fuente real de datos:
  res.json(usuariosDB);
})

/* ============================================================
   ORGANIZACIONES
   ============================================================ */

// POST /organizaciones - Crear una nueva organización (uso interno / super-admin)
app.post('/organizaciones', verificarToken, verificarSuperAdmin, (req, res) => {

})

// GET /organizaciones - Listar todas las organizaciones (solo super-admin)
app.get('/organizaciones', verificarToken, verificarSuperAdmin, (req, res) => {

})

// GET /organizaciones/:id - Obtener datos de la organización (admin de esa organización)
app.get('/organizaciones/:id', verificarToken, verificarAdmin, (req, res) => {
  const organizacion = buscarPorId(organizacionesDB, req.params.id);

  if (!organizacion) {
    return res.status(404).json({ error: 'Organizacion no encontrada' });
  }

  res.json(organizacion);
})

// PUT /organizaciones/:id - Editar valores de una organización (admin)
app.put('/organizaciones/:id', verificarToken, verificarAdmin, (req, res) => {

})

// DELETE /organizaciones/:id - Eliminar organización (admin)
app.delete('/organizaciones/:id', verificarToken, verificarAdmin, (req, res) => {

})

/* ============================================================
   CONFIGURACIÓN DE ORGANIZACIONES (anidada)
   ============================================================ */

// POST /organizaciones/:id/configuracion - Crear una nueva configuración (admin)
app.post('/organizaciones/:id/configuracion', verificarToken, verificarAdmin, (req, res) => {

})

// GET /organizaciones/:id/configuracion - Obtener configuración de una organización (admin)
app.get('/organizaciones/:id/configuracion', verificarToken, verificarAdmin, (req, res) => {
  const configuracion = buscarPorId(configuracionesDB, req.params.id);

  if (!configuracion) {
    return res.status(404).json({ error: 'Configuracion no encontrada' });
  }

  res.json(configuracion);
})

// PUT /organizaciones/:id/configuracion - Editar una configuración de organización (admin)
app.put('/organizaciones/:id/configuracion', verificarToken, verificarAdmin, (req, res) => {

})

// DELETE /organizaciones/:id/configuracion - Borrar una configuración de organización (admin)
app.delete('/organizaciones/:id/configuracion', verificarToken, verificarAdmin, (req, res) => {

})

/* ============================================================
   USUARIOS
   ============================================================ */

// POST /usuarios - Crear un nuevo usuario (público, con mail de dominio asociado)
app.post('/usuarios', (req, res) => {

})

// GET /usuarios - Listar usuarios de mi organización (admin)
app.get('/usuarios', verificarToken, verificarAdmin, (req, res) => {
  // Antes buscaba en "planes" por error (copy-paste de otro endpoint).
  // Esto debería filtrar usuariosDB por la organización del admin logueado:
  const usuariosDeMiOrg = usuariosDB.filter(u => u.organizacionId === req.usuario.organizacionId);
  res.json(usuariosDeMiOrg);
})

// GET /usuarios/:id - Ver un usuario específico (el propio usuario, o admin de su organización)
app.get('/usuarios/:id', verificarToken, (req, res) => {
  // Chequeo de "es el propio usuario o admin de la misma organización"
  // se hace acá adentro, porque depende del :id de la ruta:
  // if (req.usuario.id !== parseInt(req.params.id) && req.usuario.rol !== 'admin') {
  //   return res.status(403).json({ error: 'No autorizado' });
  // }
})

// PUT /usuarios/:id - Editar valores de un usuario (el propio usuario, o admin de su organización)
app.put('/usuarios/:id', verificarToken, (req, res) => {

})

// DELETE /usuarios/:id - Eliminar un usuario específico (el propio usuario, o admin de su organización)
app.delete('/usuarios/:id', verificarToken, (req, res) => {

})

/* ============================================================
   AUTENTICACIÓN
   ============================================================ */

// POST /auth/login - Iniciar sesión
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;

  // Usuario de prueba, hasta que conectemos la base de datos real
  const usuarioMock = {
    id: 1,
    email: 'admin@anima.edu.uy',
    password: '12345678',
    rol: 'admin',
    organizacionId: 1,
  };

  if (email !== usuarioMock.email || password !== usuarioMock.password) {
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }

  const token = jwt.sign(
    {
      id: usuarioMock.id,
      email: usuarioMock.email,
      rol: usuarioMock.rol,
      organizacionId: usuarioMock.organizacionId,
    },
    process.env.JWT_SECRET,
    { expiresIn: '2h' }
  );

  res.json({ token });
})

// POST /auth/logout - Cerrar sesión
// Con JWT stateless no hay nada que invalidar en el servidor;
// el frontend simplemente borra el token guardado.
app.post('/auth/logout', (req, res) => {
  res.status(200).json({ mensaje: 'Sesión cerrada' });
})

// POST /auth/recuperar - Recuperar contraseña
app.post('/auth/recuperar', (req, res) => {

})

/* ============================================================
   LIBROS
   ============================================================ */

// POST /libros - Crear un nuevo libro (admin)
app.post('/libros', verificarToken, verificarAdmin, (req, res) => {

})

// GET /libros - Listar todos los libros (cualquier usuario autenticado)
app.get('/libros', verificarToken, (req, res) => {

})

// GET /libros/:id - Ver un libro específico (cualquier usuario autenticado)
app.get('/libros/:id', verificarToken, (req, res) => {

})

// PUT /libros/:id - Editar valores de un libro (admin)
app.put('/libros/:id', verificarToken, verificarAdmin, (req, res) => {

})

// DELETE /libros/:id - Eliminar un libro específico (admin)
app.delete('/libros/:id', verificarToken, verificarAdmin, (req, res) => {

})

/* ============================================================
   PRÉSTAMOS
   Nota de orden: las rutas /prestamos/mis-prestamos van ANTES de
   /prestamos/:id para que Express no interprete "mis-prestamos"
   como un valor de :id.
   ============================================================ */

// GET /prestamos/mis-prestamos - Listar los préstamos del usuario autenticado
//    admite ?estado=vencido para filtrar
app.get('/prestamos/mis-prestamos', verificarToken, (req, res) => {

})

// GET /prestamos/mis-prestamos/:id - Ver un préstamo específico (cualquier usuario autenticado)
app.get('/prestamos/mis-prestamos/:id', verificarToken, (req, res) => {

})

// PATCH /prestamos/mis-prestamos/:id/extender - Extender plazo del préstamo
app.patch('/prestamos/mis-prestamos/:id/extender', verificarToken, (req, res) => {

})

// POST /prestamos - Crear un nuevo préstamo (cualquier usuario autenticado)
app.post('/prestamos', verificarToken, (req, res) => {

})

// GET /prestamos - Listar todos los préstamos (admin), admite ?estado=vencido
app.get('/prestamos', verificarToken, verificarAdmin, (req, res) => {

})

// GET /prestamos/:id - Ver un préstamo específico (admin)
app.get('/prestamos/:id', verificarToken, verificarAdmin, (req, res) => {

})

// PATCH /prestamos/:id/devolver - Marcar préstamo como devuelto (admin)
app.patch('/prestamos/:id/devolver', verificarToken, verificarAdmin, (req, res) => {

})

// DELETE /prestamos/:id - Eliminar un préstamo (admin)
app.delete('/prestamos/:id', verificarToken, verificarAdmin, (req, res) => {

})

/* ============================================================ */

app.listen(3001, () => {
  console.log('Servidor en http://localhost:3001')
})