import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { pool } from './db.js';
import {
  verificarToken,
  verificarAdmin,
  verificarSuperAdmin,
} from './middlewares/auth.js';
import { planes as planesMock, planesComparativa } from './mockData.js';
import {
  buscarUsuarioPorCorreo,
  buscarUsuarioPorId,
  listarUsuarios,
  listarUsuariosPorOrganizacion,
  crearUsuario,
  buscarOrganizacionPorId,
  buscarOrganizacionPorDominio,
  crearOrganizacion,
  listarPlanes,
  buscarPlanPorId,
  buscarDatosOrganizacionPorId,
} from './repos.js';

import isbnRoutes from './routes/isbn.routes.js';
import { notificarNuevoPrestamo, notificarInvitacion } from './services/notificaciones.js';

const app = express();
const PUERTO = process.env.PORT || 3001;

// Si falta el secreto, el login falla con un error confuso en tiempo de
// ejecución. Mejor no arrancar y decir exactamente qué falta.
if (!process.env.JWT_SECRET) {
  console.error('Falta JWT_SECRET en el .env. El servidor no puede arrancar.');
  process.exit(1);
}

app.use(cors());

// Guardamos el body crudo además del parseado: el webhook de pagos necesita
// el texto original para verificar la firma del proveedor.
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);

/* ============================================================
   DATOS EN MEMORIA (temporal, hasta conectar MySQL)
   ============================================================ */

const organizacionesDB = [];
const configuracionesDB = [];

/* ============================================================
   HELPERS
   ============================================================ */

const buscarPorId = (array, id) => {
  const idNum = parseInt(id);
  if (isNaN(idNum)) return undefined;
  return array.find((item) => item.id === idNum);
};

/**
 * verificarAdmin confirma que sos admin, pero no de CUÁL organización.
 * Sin este chequeo, el admin del liceo A puede leer los datos del liceo B
 * cambiando el :id en la URL. Como el sistema se vende a varias
 * instituciones, eso sería una fuga de datos entre clientes.
 */
const esDeMiOrganizacion = (req, idOrganizacion) => {
  if (req.usuario.rol === 'super-admin') return true;
  return req.usuario.organizacionId === parseInt(idOrganizacion);
};

// Placeholder para los endpoints que todavía no tienen lógica.
// Sin esto, la petición queda colgada hasta el timeout y parece que el
// servidor se murió, cuando en realidad nunca respondió.
const sinImplementar = (req, res) =>
  res.status(501).json({
    error: 'no_implementado',
    mensaje: `${req.method} ${req.originalUrl} todavía no está implementado.`,
  });

/* ============================================================
   ISBN — autocompletado de libros
   ============================================================ */

// Monta GET /api/libros/isbn/:isbn (ver routes/isbn.routes.js). Antes se
// importaba pero nunca se montaba, así que la búsqueda por ISBN caía
// siempre en el 404 genérico del final del archivo.
app.use('/api/libros', isbnRoutes);

/* ============================================================
   SALUD
   ============================================================ */

app.get('/api/salud', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT COUNT(*) AS libros FROM libros');
    res.json({ ok: true, db: 'conectada', libros: rows[0].libros });
  } catch (err) {
    console.error('[salud]', err.message);
    res.status(503).json({ ok: false, db: 'sin conexión' });
  }
});

/* ============================================================
   PAGOS
   ============================================================ */

// POST /api/pagos/checkout - Iniciar el pago de un plan (público, sin cuenta)
app.post('/api/pagos/checkout', sinImplementar);

// POST /api/pagos/webhook - Confirmar pago y crear organización + usuario admin
// Los webhooks no se protegen con JWT de usuario, sino verificando la firma
// que manda el proveedor de pagos (ej: header Stripe-Signature) contra req.rawBody.
app.post('/api/pagos/webhook', sinImplementar);

/* ============================================================
   PLANES
   ============================================================ */

// GET /api/planes - Listar todos los planes (público)
app.get('/api/planes', async (req, res) => {
  res.json(await listarPlanes());
});

// GET /api/planes/comparativa - Tabla comparativa de funcionalidades (público)
// Nota de orden: va ANTES de /api/planes/:id para que Express no interprete
// "comparativa" como un valor de :id (mismo patrón que /prestamos/mis-prestamos).
// La comparativa es contenido de marketing fijo: no tiene tabla propia en la
// DB, así que se sirve directo del mock.
app.get('/api/planes/comparativa', (req, res) => {
  res.json(planesComparativa);
});

// GET /api/planes/:id - Ver un plan específico (público)
app.get('/api/planes/:id', async (req, res) => {
  const plan = await buscarPlanPorId(req.params.id);

  if (!plan) {
    return res.status(404).json({ error: 'Plan no encontrado' });
  }

  res.json(plan);
});

// POST /api/planes - Crear un nuevo plan (solo super-admin)
app.post('/api/planes', verificarToken, verificarSuperAdmin, (req, res) => {
  const { codigo, nombre, precioMensual, precioAnual } = req.body ?? {};

  if (!codigo || !nombre || !precioMensual || !precioAnual) {
    return res.status(400).json({
      error: 'Faltan campos obligatorios: codigo, nombre, precioMensual, precioAnual',
    });
  }

  if (planesMock.some((p) => p.codigo === codigo)) {
    return res.status(409).json({ error: 'Ya existe un plan con ese código' });
  }

  const idNuevo = planesMock.reduce((max, p) => Math.max(max, p.id), 0) + 1;

  const planNuevo = {
    id: idNuevo,
    codigo,
    nombre,
    tagline: req.body.tagline ?? '',
    descripcion: req.body.descripcion ?? '',
    icono: req.body.icono ?? '',
    destacado: req.body.destacado ?? false,
    ...(req.body.etiquetaDestacado && { etiquetaDestacado: req.body.etiquetaDestacado }),
    precioMensual,
    precioAnual,
    limites: req.body.limites ?? {},
    caracteristicas: req.body.caracteristicas ?? [],
  };

  planesMock.push(planNuevo);

  res.status(201).json(planNuevo);
});

// PUT /api/planes/:id - Editar valores de un plan (solo super-admin)
app.put('/api/planes/:id', verificarToken, verificarSuperAdmin, (req, res) => {
  const plan = buscarPorId(planesMock, req.params.id);

  if (!plan) {
    return res.status(404).json({ error: 'Plan no encontrado' });
  }

  const { id, ...camposEditables } = req.body ?? {};
  Object.assign(plan, camposEditables);

  res.json(plan);
});

// DELETE /api/planes/:id - Eliminar un plan específico (solo super-admin)
app.delete('/api/planes/:id', verificarToken, verificarSuperAdmin, (req, res) => {
  const indice = planesMock.findIndex((p) => p.id === parseInt(req.params.id, 10));

  if (indice === -1) {
    return res.status(404).json({ error: 'Plan no encontrado' });
  }

  planesMock.splice(indice, 1);

  res.status(200).json({ mensaje: 'Plan eliminado' });
});

/* ============================================================
   ADMINISTRADORES DE PLATAFORMA
   ============================================================ */

// GET /api/admin/usuarios - Listar usuarios de todas las organizaciones (super-admin)
app.get('/api/admin/usuarios', verificarToken, verificarSuperAdmin, async (req, res) => {
  res.json(await listarUsuarios());
});

/* ============================================================
   ORGANIZACIONES
   ============================================================ */

// POST /api/organizaciones - Crear una nueva organización (super-admin)
app.post('/api/organizaciones', verificarToken, verificarSuperAdmin, sinImplementar);

// GET /api/organizaciones - Listar todas las organizaciones (super-admin)
app.get('/api/organizaciones', verificarToken, verificarSuperAdmin, sinImplementar);

// GET /api/organizaciones/:id - Obtener datos de la organización (admin de esa organización)
app.get('/api/organizaciones/:id', verificarToken, async (req, res) => {
  if (!esDeMiOrganizacion(req, req.params.id)) {
    return res.status(403).json({ error: 'No autorizado' });
  }

  const organizacion = await buscarOrganizacionPorId(req.params.id);
  const configuracion = await buscarDatosOrganizacionPorId(req.params.id);

  if (!organizacion) {
    return res.status(404).json({ error: 'Organizacion no encontrada' });
  }

  res.json({ organizacion, configuracion });
});

// PUT /api/organizaciones/:id - Editar valores de una organización (admin)
app.put('/api/organizaciones/:id', verificarToken, verificarAdmin, (req, res) => {
  if (!esDeMiOrganizacion(req, req.params.id)) {
    return res.status(403).json({ error: 'No autorizado' });
  }
  sinImplementar(req, res);
});

// DELETE /api/organizaciones/:id - Eliminar organización (admin)
app.delete('/api/organizaciones/:id', verificarToken, verificarAdmin, (req, res) => {
  if (!esDeMiOrganizacion(req, req.params.id)) {
    return res.status(403).json({ error: 'No autorizado' });
  }
  sinImplementar(req, res);
});

/* ============================================================
   CONFIGURACIÓN DE ORGANIZACIONES (anidada)
   Ojo: el :id de estas rutas es el de la ORGANIZACIÓN,
   no el de la configuración.
   ============================================================ */

// POST /api/organizaciones/:id/configuracion - Crear configuración (admin)
app.post('/api/organizaciones/:id/configuracion', verificarToken, verificarAdmin, (req, res) => {
  if (!esDeMiOrganizacion(req, req.params.id)) {
    return res.status(403).json({ error: 'No autorizado' });
  }
  sinImplementar(req, res);
});

// GET /api/organizaciones/:id/configuracion - Obtener configuración (admin)
app.get('/api/organizaciones/:id/configuracion', verificarToken, verificarAdmin, (req, res) => {
  if (!esDeMiOrganizacion(req, req.params.id)) {
    return res.status(403).json({ error: 'No autorizado' });
  }

  const configuracion = configuracionesDB.find(
    (c) => c.organizacionId === parseInt(req.params.id)
  );

  if (!configuracion) {
    return res.status(404).json({ error: 'Configuracion no encontrada' });
  }

  res.json(configuracion);
});

// PUT /api/organizaciones/:id/configuracion - Editar configuración (admin)
app.put('/api/organizaciones/:id/configuracion', verificarToken, verificarAdmin, (req, res) => {
  if (!esDeMiOrganizacion(req, req.params.id)) {
    return res.status(403).json({ error: 'No autorizado' });
  }
  sinImplementar(req, res);
});

// DELETE /api/organizaciones/:id/configuracion - Borrar configuración (admin)
app.delete('/api/organizaciones/:id/configuracion', verificarToken, verificarAdmin, (req, res) => {
  if (!esDeMiOrganizacion(req, req.params.id)) {
    return res.status(403).json({ error: 'No autorizado' });
  }
  sinImplementar(req, res);
});

/* ============================================================
   USUARIOS
   ============================================================ */

// POST /api/usuarios - Crear un nuevo usuario (público, con mail de dominio asociado)
// Si vienen "organizacion" y "dominio", este registro no es un lector
// sumándose a una organización existente: es el alta de una organización
// nueva, y quien se registra queda como su admin_organizacion.
app.post('/api/auth/register', async (req, res) => {
  const {
    nombre,
    apellido,
    cedula,
    correo,
    telefono,
    contrasena,
    confirmarContrasena,
    organizacion,
    dominio,
    planId,
    ciclo,
  } = req.body ?? {};

  if (!nombre || !apellido || !cedula || !correo || !telefono || !contrasena || !confirmarContrasena) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  if (contrasena !== confirmarContrasena) {
    return res.status(400).json({ error: 'Las contraseñas no coinciden' });
  }

  if (await buscarUsuarioPorCorreo(correo)) {
    return res.status(409).json({ code: 'CORREO_YA_REGISTRADO', message: 'Ese correo ya está registrado' });
  }

  const [, correoDominio] = correo.split('@');

  const creaOrganizacionNueva = Boolean(organizacion && dominio);

  let organizacionId;
  let rol = 'lector';

  if (creaOrganizacionNueva) {
    if (!planId) {
      return res.status(400).json({ error: 'Falta el plan seleccionado' });
    }

    if (await buscarOrganizacionPorDominio(dominio)) {
      return res.status(409).json({ code: 'DOMINIO_YA_REGISTRADO', message: 'Ya existe una organización con ese dominio' });
    }

    const mesesSuscripcion = ciclo === 'anual' ? 12 : 1;
    const expiracion = new Date();
    expiracion.setMonth(expiracion.getMonth() + mesesSuscripcion);

    const organizacionNueva = await crearOrganizacion({
      nombre: organizacion,
      idPlan: planId,
      dominio,
      expiracion,
    });

    organizacionId = organizacionNueva.id;
    rol = 'admin_organizacion';
  } else {
    const organizacionExistente = await buscarOrganizacionPorDominio(correoDominio);

    if (!organizacionExistente) {
      return res.status(400).json({ error: 'No existe una organización para ese dominio de correo' });
    }

    organizacionId = organizacionExistente.id;
  }

  const contrasenaHasheada = await bcrypt.hash(contrasena, 10);

  await crearUsuario({
    nombre,
    ci: cedula,
    correo,
    telefono,
    contrasena: contrasenaHasheada,
    organizacionId,
    rol,
  });

  res.status(200).json({ message: 'Usuario creado' });
});

// POST /api/usuarios - Invitar un usuario a mi organización (admin)
// A diferencia de POST /auth/register (alta pública, con contraseña propia),
// acá el admin carga los datos de la persona y el sistema la invita: se crea
// sin contraseña (columna NULL) y se le manda un email con el link para que
// la cree ella misma. Se asume rol "lector": invitar a otro admin no está
// contemplado por este endpoint.
app.post('/api/usuarios', verificarToken, verificarAdmin, async (req, res, next) => {
  const { nombre, cedula, correo, telefono } = req.body ?? {};

  if (!nombre || !cedula || !correo || !telefono) {
    return res.status(400).json({
      error: 'faltan_campos',
      mensaje: 'Faltan campos obligatorios: nombre, cedula, correo, telefono',
    });
  }

  if (await buscarUsuarioPorCorreo(correo)) {
    return res.status(409).json({ code: 'CORREO_YA_REGISTRADO', message: 'Ese correo ya está registrado' });
  }

  try {
    const usuarioInvitado = await crearUsuario({
      nombre,
      ci: cedula,
      correo,
      telefono,
      contrasena: null,
      organizacionId: req.usuario.organizacionId,
      rol: 'lector',
    });

    const tokenInvitacion = jwt.sign(
      { id: usuarioInvitado.id, proposito: 'crear_contrasena' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    await notificarInvitacion({ nombre, correo, tokenInvitacion });

    res.status(201).json({ id: usuarioInvitado.id, nombre, correo });
  } catch (err) {
    next(err);
  }
});

// GET /api/usuarios - Listar usuarios de mi organización (admin)
app.get('/api/usuarios', verificarToken, verificarAdmin, async (req, res) => {
  res.json(await listarUsuariosPorOrganizacion(req.usuario.organizacionId));
});

// GET /api/usuarios/:id - Ver un usuario (el propio usuario, o admin de su organización)
app.get('/api/usuarios/:id', verificarToken, async (req, res) => {
  const usuario = await buscarUsuarioPorId(req.params.id);

  if (!usuario) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  const esElPropio = req.usuario.id === usuario.id;
  const esAdminDeSuOrg =
    ['admin', 'super-admin'].includes(req.usuario.rol) &&
    esDeMiOrganizacion(req, usuario.organizacionId);

  if (!esElPropio && !esAdminDeSuOrg) {
    return res.status(403).json({ error: 'No autorizado' });
  }

  // Nunca devolver el hash de la contraseña, ni siquiera al propio usuario.
  const { contrasena, ...usuarioSinContrasena } = usuario;
  res.json(usuarioSinContrasena);
});

// PUT /api/usuarios/:id - Editar un usuario (el propio usuario, o admin de su organización)
app.put('/api/usuarios/:id', verificarToken, sinImplementar);

// DELETE /api/usuarios/:id - Eliminar un usuario (el propio usuario, o admin de su organización)
app.delete('/api/usuarios/:id', verificarToken, sinImplementar);

/* ============================================================
   AUTENTICACIÓN
   ============================================================ */

// POST /api/auth/login - Iniciar sesión
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body ?? {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Faltan email o contraseña' });
  }

  const usuarioElegido = await buscarUsuarioPorCorreo(email);

  if (!usuarioElegido) {
  return res.status(401).json({ code: 'CREDENCIALES_INVALIDAS', message: 'Credenciales incorrectas' });  }

  // Cuenta invitada por un admin que todavía no pasó por
  // /auth/crear-contrasena: no hay hash contra el cual comparar.
  if (!usuarioElegido.contrasena) {
    return res.status(401).json({
      code: 'CUENTA_SIN_CONTRASENA',
      message: 'Todavía no creaste tu contraseña. Revisá el email de invitación.',
    });
  }

  const passwordCorrecta = await bcrypt.compare(password, usuarioElegido.contrasena);

  if (!passwordCorrecta) {
    return res.status(401).json({ code: 'CREDENCIALES_INVALIDAS', message: 'Credenciales incorrectas' });
  }

  const token = jwt.sign(
    {
      id: usuarioElegido.id,
      email: usuarioElegido.correo,
      nombre: usuarioElegido.nombre,
      rol: usuarioElegido.rol,
      organizacionId: usuarioElegido.organizacionId,
    },
    process.env.JWT_SECRET,
    { expiresIn: '2h' }
  );

  res.json({ token });
});

// POST /api/auth/logout - Cerrar sesión
// Con JWT stateless no hay nada que invalidar en el servidor;
// el frontend borra el token guardado.
app.post('/api/auth/logout', (req, res) => {
  res.status(200).json({ mensaje: 'Sesión cerrada' });
});

// POST /api/auth/recuperar - Recuperar contraseña
app.post('/api/auth/recuperar', sinImplementar);

// POST /api/auth/crear-contrasena - Primera contraseña de una cuenta invitada
// El token viene del link que se manda por email en POST /api/usuarios (ver
// notificarInvitacion). No requiere sesión: quien invitaron todavía no tiene
// contraseña, así que no puede loguearse para obtener un JWT normal.
app.post('/api/auth/crear-contrasena', async (req, res, next) => {
  const { token, contrasena, confirmarContrasena } = req.body ?? {};

  if (!token || !contrasena || !confirmarContrasena) {
    return res.status(400).json({ error: 'Faltan token o contraseña' });
  }

  if (contrasena !== confirmarContrasena) {
    return res.status(400).json({ error: 'Las contraseñas no coinciden' });
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'El link es inválido o ya venció' });
  }

  if (payload.proposito !== 'crear_contrasena') {
    return res.status(400).json({ error: 'Este link no es para crear una contraseña' });
  }

  try {
    const [[usuario]] = await pool.query('SELECT contrasena FROM usuarios WHERE id = ?', [payload.id]);

    if (!usuario) {
      return res.status(404).json({ error: 'La cuenta ya no existe' });
    }

    // Que la cuenta ya tenga contraseña es lo que hace que el link no sirva
    // dos veces: no hace falta guardar el token como "usado" en ningún lado.
    if (usuario.contrasena !== null) {
      return res.status(409).json({ error: 'Esta cuenta ya tiene una contraseña. Iniciá sesión normalmente.' });
    }

    const contrasenaHasheada = await bcrypt.hash(contrasena, 10);
    await pool.query('UPDATE usuarios SET contrasena = ? WHERE id = ?', [contrasenaHasheada, payload.id]);

    res.status(200).json({ mensaje: 'Contraseña creada' });
  } catch (err) {
    next(err);
  }
});

/* ============================================================
   LIBROS
   ============================================================ */

// POST /api/libros - Crear un nuevo libro (admin)
app.post('/api/libros', verificarToken, verificarAdmin, async (req, res, next) => {
  const { titulo, autor, genero, editorial, isbn, fecha_pub, resumen, portada, stock } =
    req.body ?? {};

  if (!titulo || !autor || !genero) {
    return res.status(400).json({
      error: 'faltan_campos',
      mensaje: 'Faltan campos obligatorios: titulo, autor, genero',
    });
  }

  try {
    const [resultado] = await pool.query(
      `INSERT INTO libros
         (id_organizacion, titulo, autor, genero, editorial, isbn, fecha_pub, resumen, portada, stock)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.usuario.organizacionId,
        titulo,
        autor,
        genero,
        editorial ?? null,
        isbn ?? null,
        fecha_pub ?? null,
        resumen ?? null,
        portada ?? null,
        stock ?? 1,
      ]
    );

    const [rows] = await pool.query('SELECT * FROM libros WHERE id = ?', [
      resultado.insertId,
    ]);
    const libroCreado = rows[0];

    if (!libroCreado) {
      return res.status(404).json({ error: 'no_encontrado', mensaje: 'Libro no encontrado' });
    }

    res.status(201).json(libroCreado);
  } catch (err) {
    next(err);
  }
});

// GET /api/libros - Listar todos los libros (cualquier usuario autenticado)
app.get('/api/libros', verificarToken, async (req, res, next) => {
  try {
    const { busqueda, genero } = req.query;
    let sql = `
      SELECT l.id, l.titulo, l.autor, l.genero, l.editorial, l.isbn, l.fecha_pub,
             l.resumen, l.portada, l.stock,
             l.stock - COALESCE(p.activos, 0) AS disponibles,
             ROUND(COALESCE(r.promedio, 0), 2) AS promedio_estrellas
      FROM libros l
      LEFT JOIN (SELECT id_libro, COUNT(*) AS activos FROM prestamos
                 WHERE estado IN ('pendiente_retiro','activo','atrasado')
                 GROUP BY id_libro) p ON p.id_libro = l.id
      LEFT JOIN (SELECT id_libro, AVG(calificacion) AS promedio FROM resenas
                 GROUP BY id_libro) r ON r.id_libro = l.id
      WHERE l.id_organizacion = ?`;
    const params = [req.usuario.organizacionId];

    if (busqueda) {
      sql += ' AND (l.titulo LIKE ? OR l.autor LIKE ?)';
      params.push(`%${busqueda}%`, `%${busqueda}%`);
    }
    if (genero) {
      sql += ' AND l.genero = ?';
      params.push(genero);
    }

    const [libros] = await pool.query(sql, params);
    res.json(libros);
  } catch (err) {
    next(err);
  }
});

// GET /api/libros/:id - Ver un libro específico (cualquier usuario autenticado)
app.get('/api/libros/:id', verificarToken, async (req, res, next) => {
  try {
    const [[libro]] = await pool.query(
      `SELECT l.id, l.titulo, l.autor, l.genero, l.editorial, l.isbn, l.fecha_pub,
              l.resumen, l.portada, l.stock,
              l.stock - COALESCE(p.activos, 0) AS disponibles,
              ROUND(COALESCE(r.promedio, 0), 2) AS promedio_estrellas
       FROM libros l
       LEFT JOIN (SELECT id_libro, COUNT(*) AS activos FROM prestamos
                  WHERE estado IN ('pendiente_retiro','activo','atrasado')
                  GROUP BY id_libro) p ON p.id_libro = l.id
       LEFT JOIN (SELECT id_libro, AVG(calificacion) AS promedio FROM resenas
                  GROUP BY id_libro) r ON r.id_libro = l.id
       WHERE l.id = ? AND l.id_organizacion = ?`,
      [req.params.id, req.usuario.organizacionId]
    );

    if (!libro) {
      return res.status(404).json({ error: 'no_encontrado', mensaje: 'Libro no encontrado' });
    }

    res.json(libro);
  } catch (err) {
    next(err);
  }
});

// PUT /api/libros/:id - Editar valores de un libro (admin)
app.put('/api/libros/:id', verificarToken, verificarAdmin, async (req, res, next) => {
  const { titulo, autor, genero, editorial, isbn, fecha_pub, resumen, portada, stock } =
    req.body ?? {};

  if (!titulo || !autor || !genero) {
    return res.status(400).json({
      error: 'faltan_campos',
      mensaje: 'Faltan campos obligatorios: titulo, autor, genero',
    });
  }

  try {
    const [resultado] = await pool.query(
      `UPDATE libros
       SET titulo = ?, autor = ?, genero = ?, editorial = ?, isbn = ?, fecha_pub = ?,
           resumen = ?, portada = ?, stock = ?
       WHERE id = ? AND id_organizacion = ?`,
      [
        titulo,
        autor,
        genero,
        editorial ?? null,
        isbn ?? null,
        fecha_pub ?? null,
        resumen ?? null,
        portada ?? null,
        stock ?? 1,
        req.params.id,
        req.usuario.organizacionId,
      ]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ error: 'no_encontrado', mensaje: 'Libro no encontrado' });
    }

    const [[libroActualizado]] = await pool.query('SELECT * FROM libros WHERE id = ?', [
      req.params.id,
    ]);

    res.json(libroActualizado);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/libros/:id - Eliminar un libro específico (admin)
app.delete('/api/libros/:id', verificarToken, verificarAdmin, async (req, res, next) => {
  try {
    const [resultado] = await pool.query(
      'DELETE FROM libros WHERE id = ? AND id_organizacion = ?',
      [req.params.id, req.usuario.organizacionId]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ error: 'no_encontrado', mensaje: 'Libro no encontrado' });
    }

    res.status(200).json({ mensaje: 'Libro eliminado' });
  } catch (err) {
    // El libro tiene préstamos asociados (ON DELETE RESTRICT): no se puede
    // borrar sin perder el historial, hay que avisarle al admin por qué.
    if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.errno === 1451) {
      return res.status(409).json({
        error: 'libro_con_prestamos',
        mensaje: 'No se puede eliminar: el libro tiene préstamos asociados.',
      });
    }
    next(err);
  }
});

/* ============================================================
   PRÉSTAMOS
   Nota de orden: las rutas /prestamos/mis-prestamos van ANTES de
   /prestamos/:id para que Express no interprete "mis-prestamos"
   como un valor de :id.
   ============================================================ */

// GET /api/prestamos/mis-prestamos - Préstamos del usuario autenticado
//     admite ?estado=atrasado (u otro valor del ENUM) para filtrar
app.get('/api/prestamos/mis-prestamos', verificarToken, async (req, res, next) => {
  try {
    const { estado } = req.query;

    let sql = `
      SELECT p.id, p.fecha_prestamo, p.fecha_devolucion_esperada, p.fecha_devolucion_real,
             p.extensiones_realizadas, p.lugar_retiro, p.estado,
             l.titulo, l.autor, l.portada
      FROM prestamos p
      JOIN libros l ON l.id = p.id_libro
      WHERE p.id_usuario = ? AND p.id_organizacion = ?`;
    const params = [req.usuario.id, req.usuario.organizacionId];

    if (estado) {
      sql += ' AND p.estado = ?';
      params.push(estado);
    }

    sql += ' ORDER BY p.fecha_prestamo DESC';

    const [prestamos] = await pool.query(sql, params);
    res.json(prestamos);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/prestamos/mis-prestamos/:id/extender - Extender plazo del préstamo
app.patch('/api/prestamos/mis-prestamos/:id/extender', verificarToken, sinImplementar);

// POST /api/prestamos - Crear un nuevo préstamo (cualquier usuario autenticado)
app.post('/api/prestamos', verificarToken, async (req, res, next) => {
  try {
    const { libroId, usuarioId } = req.body;

    // El plazo y el lugar de retiro son configurables por organización
    // (tabla configuraciones), por eso no se reciben del cliente: se buscan acá.
    const [[configuracion]] = await pool.query(
      'SELECT dias_prestamo, lugar_retiro FROM configuraciones WHERE id_organizacion = ?',
      [req.usuario.organizacionId]
    );
    const diasPrestamo = configuracion?.dias_prestamo ?? 30;
    const lugarRetiro = configuracion?.lugar_retiro ?? null;
    const fechaDevolucionEsperada = new Date(Date.now() + diasPrestamo * 24 * 60 * 60 * 1000);

    // Todo préstamo nuevo arranca pendiente de retiro; el estado lo controla
    // el sistema a partir de acá (retiro, devolución, atraso), no el cliente.
    const [resultado] = await pool.query(
      'INSERT INTO prestamos (id_libro, id_usuario, id_organizacion, fecha_devolucion_esperada, lugar_retiro, estado) VALUES (?, ?, ?, ?, ?, ?)',
      [libroId, usuarioId, req.usuario.organizacionId, fechaDevolucionEsperada, lugarRetiro, 'pendiente_retiro']
    );

    // RF de notificaciones: avisar al admin de la organización que hay un
    // préstamo nuevo pendiente de entrega (ver services/notificaciones.js).
    await notificarNuevoPrestamo({
      idPrestamo: resultado.insertId,
      idLibro: libroId,
      idUsuario: usuarioId,
      idOrganizacion: req.usuario.organizacionId,
    });

    res.status(201).json({ id: resultado.insertId });
  } catch (err) {
    next(err);
  }
});

// GET /api/prestamos - Listar todos los préstamos (admin), admite ?estado=vencido
app.get('/api/prestamos', verificarToken, verificarAdmin, sinImplementar);

// GET /api/prestamos/:id - Ver un préstamo específico (admin)
app.get('/api/prestamos/:id', verificarToken, verificarAdmin, sinImplementar);

// PATCH /api/prestamos/:id/devolver - Marcar préstamo como devuelto (admin)
app.patch('/api/prestamos/:id/devolver', verificarToken, verificarAdmin, sinImplementar);

// DELETE /api/prestamos/:id - Eliminar un préstamo (admin)
app.delete('/api/prestamos/:id', verificarToken, verificarAdmin, sinImplementar);

/* ============================================================
   MANEJO DE ERRORES
   Van al final: Express los evalúa en orden y estos son la red
   que atrapa todo lo que no matcheó antes.
   ============================================================ */

// Ruta inexistente
app.use((req, res) => {
  res.status(404).json({
    error: 'ruta_no_encontrada',
    mensaje: `No existe ${req.method} ${req.originalUrl}`,
  });
});

// Cualquier error no capturado en un handler
app.use((err, req, res, next) => {
  console.error('[error]', err.message);
  res.status(500).json({ error: 'error_interno' });
});

/* ============================================================ */

app.listen(PUERTO, () => {
  console.log(`Servidor en http://localhost:${PUERTO}`);
});