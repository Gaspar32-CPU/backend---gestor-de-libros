import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import { pool } from './db.js'
import {
  verificarToken,
  verificarAdmin,
  verificarSuperAdmin,
} from './middlewares/auth.js'
import { planesComparativa } from './contenido/planesComparativa.js'
import {
  buscarUsuarioPorCorreo,
  buscarUsuarioPorId,
  listarUsuarios,
  listarUsuariosPorOrganizacion,
  crearUsuario,
  actualizarUsuarioPendiente,
  buscarOrganizacionPorId,
  buscarOrganizacionPorDominio,
  crearOrganizacion,
  listarPlanes,
  buscarPlanPorId,
  crearPlan,
  actualizarPlan,
  eliminarPlan,
  buscarDatosOrganizacionPorId,
  listarUsuariosTodasOrganizaciones,
} from './repos.js'

import isbnRoutes from './routes/isbn.routes.js'
import {
  notificarNuevoPrestamo,
  notificarInvitacion,
  notificarRegistro,
  notificarExtensionPrestamo,
  notificarDevolucionPrestamo,
} from './services/notificaciones.js'
import {
  generarTokenCrearContrasena,
  verificarTokenCrearContrasena,
} from './services/token.js'

const app = express()
const PUERTO = process.env.PORT || 3001

// Si falta el secreto, el login falla con un error confuso en tiempo de
// ejecución. Mejor no arrancar y decir exactamente qué falta.
if (!process.env.JWT_SECRET) {
  console.error('Falta JWT_SECRET en el .env. El servidor no puede arrancar.')
  process.exit(1)
}

app.use(cors())

// Guardamos el body crudo además del parseado: el webhook de pagos necesita
// el texto original para verificar la firma del proveedor.
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf
    },
  }),
)

/* ============================================================
   HELPERS
   ============================================================ */

/**
 * verificarAdmin confirma que sos admin, pero no de CUÁL organización.
 * Sin este chequeo, el admin del liceo A puede leer los datos del liceo B
 * cambiando el :id en la URL. Como el sistema se vende a varias
 * instituciones, eso sería una fuga de datos entre clientes.
 */
const esDeMiOrganizacion = (req, idOrganizacion) => {
  if (req.usuario.rol === 'super-admin') return true
  return req.usuario.organizacionId === parseInt(idOrganizacion)
}

// Placeholder para los endpoints que todavía no tienen lógica.
// Sin esto, la petición queda colgada hasta el timeout y parece que el
// servidor se murió, cuando en realidad nunca respondió.
const sinImplementar = (req, res) =>
  res.status(501).json({
    error: 'no_implementado',
    mensaje: `${req.method} ${req.originalUrl} todavía no está implementado.`,
  })

/* ============================================================
   ISBN — autocompletado de libros
   ============================================================ */

// Monta GET /api/libros/isbn/:isbn (ver routes/isbn.routes.js). Antes se
// importaba pero nunca se montaba, así que la búsqueda por ISBN caía
// siempre en el 404 genérico del final del archivo.
app.use('/api/libros', isbnRoutes)

/* ============================================================
   SALUD
   ============================================================ */

app.get('/api/salud', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT COUNT(*) AS libros FROM libros')
    res.json({ ok: true, db: 'conectada', libros: rows[0].libros })
  } catch (err) {
    console.error('[salud]', err.message)
    res.status(503).json({ ok: false, db: 'sin conexión' })
  }
})

/* ============================================================
   PAGOS
   ============================================================ */

// POST /api/pagos/checkout - Iniciar el pago de un plan (público, sin cuenta)
app.post('/api/pagos/checkout', sinImplementar)

// POST /api/pagos/webhook - Confirmar pago y crear organización + usuario admin
// Los webhooks no se protegen con JWT de usuario, sino verificando la firma
// que manda el proveedor de pagos (ej: header Stripe-Signature) contra req.rawBody.
app.post('/api/pagos/webhook', sinImplementar)

/* ============================================================
   PLANES
   ============================================================ */

// GET /api/planes - Listar todos los planes (público)
app.get('/api/planes', async (req, res) => {
  res.json(await listarPlanes())
})

// GET /api/planes/comparativa - Tabla comparativa de funcionalidades (público)
// Nota de orden: va ANTES de /api/planes/:id para que Express no interprete
// "comparativa" como un valor de :id (mismo patrón que /prestamos/mis-prestamos).
// La comparativa es contenido de marketing fijo: no tiene tabla propia en la
// DB, así que se sirve desde contenido/planesComparativa.js.
app.get('/api/planes/comparativa', (req, res) => {
  res.json(planesComparativa)
})

// GET /api/planes/:id - Ver un plan específico (público)
app.get('/api/planes/:id', async (req, res) => {
  const plan = await buscarPlanPorId(req.params.id)

  if (!plan) {
    return res.status(404).json({ error: 'Plan no encontrado' })
  }

  res.json(plan)
})

// POST /api/planes - Crear un nuevo plan (solo super-admin)
// Los campos son los de la tabla "planes" (ver db/init/01_schema.sql).
app.post(
  '/api/planes',
  verificarToken,
  verificarSuperAdmin,
  async (req, res) => {
    const {
      nombre,
      descripcion,
      precioMensual,
      limiteUsuarios,
      limiteLibros,
      funcionalidades,
    } = req.body ?? {}

    if (
      !nombre ||
      precioMensual == null ||
      limiteUsuarios == null ||
      limiteLibros == null
    ) {
      return res.status(400).json({
        error: 'faltan_campos',
        mensaje:
          'Faltan campos obligatorios: nombre, precioMensual, limiteUsuarios, limiteLibros',
      })
    }

    const planNuevo = await crearPlan({
      nombre,
      descripcion: descripcion ?? null,
      precioMensual,
      limiteUsuarios,
      limiteLibros,
      funcionalidades: funcionalidades ?? {},
    })

    res.status(201).json(planNuevo)
  },
)

// PUT /api/planes/:id - Editar valores de un plan (solo super-admin)
app.put(
  '/api/planes/:id',
  verificarToken,
  verificarSuperAdmin,
  async (req, res) => {
    if (!(await buscarPlanPorId(req.params.id))) {
      return res
        .status(404)
        .json({ error: 'no_encontrado', mensaje: 'Plan no encontrado' })
    }

    res.json(await actualizarPlan(req.params.id, req.body ?? {}))
  },
)

// DELETE /api/planes/:id - Eliminar un plan específico (solo super-admin)
app.delete(
  '/api/planes/:id',
  verificarToken,
  verificarSuperAdmin,
  async (req, res) => {
    try {
      if (!(await eliminarPlan(req.params.id))) {
        return res
          .status(404)
          .json({ error: 'no_encontrado', mensaje: 'Plan no encontrado' })
      }
    } catch (err) {
      // Hay organizaciones con este plan (FK con ON DELETE RESTRICT).
      if (err.code === 'ER_ROW_IS_REFERENCED_2') {
        return res.status(409).json({
          error: 'plan_en_uso',
          mensaje:
            'No se puede eliminar: hay organizaciones usando este plan. Podés desactivarlo con PUT (activo: false).',
        })
      }
      throw err
    }

    res.status(200).json({ mensaje: 'Plan eliminado' })
  },
)

/* ============================================================
   ADMINISTRADORES DE PLATAFORMA
   ============================================================ */

// GET /api/admin/usuarios - Listar usuarios de todas las organizaciones (super-admin)
app.get(
  '/api/admin/usuarios',
  verificarToken,
  verificarSuperAdmin,
  async (req, res) => {
    res.json(await listarUsuariosTodasOrganizaciones())
  },
)

/* ============================================================
   ORGANIZACIONES
   ============================================================ */

// POST /api/organizaciones - Crear una nueva organización (super-admin)
app.post(
  '/api/organizaciones',
  verificarToken,
  verificarSuperAdmin,
  sinImplementar,
)

// GET /api/organizaciones - Listar todas las organizaciones (super-admin)
app.get(
  '/api/organizaciones',
  verificarToken,
  verificarSuperAdmin,
  sinImplementar,
)

// GET /api/organizaciones/:id - Obtener datos de la organización (admin de esa organización)
app.get('/api/organizaciones/:id', verificarToken, async (req, res) => {
  if (!esDeMiOrganizacion(req, req.params.id)) {
    return res.status(403).json({ error: 'No autorizado' })
  }

  const organizacion = await buscarOrganizacionPorId(req.params.id)
  const configuracion = await buscarDatosOrganizacionPorId(req.params.id)

  if (!organizacion) {
    return res.status(404).json({ error: 'Organizacion no encontrada' })
  }

  res.json({ organizacion, configuracion })
})

// PUT /api/organizaciones/:id - Editar valores de una organización (admin)
app.put(
  '/api/organizaciones/:id',
  verificarToken,
  verificarAdmin,
  (req, res) => {
    if (!esDeMiOrganizacion(req, req.params.id)) {
      return res.status(403).json({ error: 'No autorizado' })
    }
    sinImplementar(req, res)
  },
)

// DELETE /api/organizaciones/:id - Eliminar organización (admin)
app.delete(
  '/api/organizaciones/:id',
  verificarToken,
  verificarAdmin,
  (req, res) => {
    if (!esDeMiOrganizacion(req, req.params.id)) {
      return res.status(403).json({ error: 'No autorizado' })
    }
    sinImplementar(req, res)
  },
)

/* ============================================================
   CONFIGURACIÓN DE ORGANIZACIONES (anidada)
   Ojo: el :id de estas rutas es el de la ORGANIZACIÓN,
   no el de la configuración.
   ============================================================ */

// POST /api/organizaciones/:id/configuracion - Crear configuración (admin)
app.post(
  '/api/organizaciones/:id/configuracion',
  verificarToken,
  verificarAdmin,
  (req, res) => {
    if (!esDeMiOrganizacion(req, req.params.id)) {
      return res.status(403).json({ error: 'No autorizado' })
    }
    sinImplementar(req, res)
  },
)

// GET /api/organizaciones/:id/configuracion - Obtener configuración (admin)
app.get(
  '/api/organizaciones/:id/configuracion',
  verificarToken,
  verificarAdmin,
  async (req, res) => {
    if (!esDeMiOrganizacion(req, req.params.id)) {
      return res.status(403).json({ error: 'No autorizado' })
    }

    const configuracion = await buscarDatosOrganizacionPorId(req.params.id)

    if (!configuracion) {
      return res.status(404).json({ error: 'Configuracion no encontrada' })
    }

    res.json(configuracion)
  },
)

// PUT /api/organizaciones/:id/configuracion - Editar configuración (admin)
app.put(
  '/api/organizaciones/:id/configuracion',
  verificarToken,
  verificarAdmin,
  (req, res) => {
    if (!esDeMiOrganizacion(req, req.params.id)) {
      return res.status(403).json({ error: 'No autorizado' })
    }
    sinImplementar(req, res)
  },
)

// DELETE /api/organizaciones/:id/configuracion - Borrar configuración (admin)
app.delete(
  '/api/organizaciones/:id/configuracion',
  verificarToken,
  verificarAdmin,
  (req, res) => {
    if (!esDeMiOrganizacion(req, req.params.id)) {
      return res.status(403).json({ error: 'No autorizado' })
    }
    sinImplementar(req, res)
  },
)

/* ============================================================
   USUARIOS
   ============================================================ */

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const COOLDOWN_REGISTRO_PENDIENTE_MS = 60 * 1000

// POST /api/auth/register - Registrarse (público, con mail de dominio asociado)
// Si vienen "organizacion" y "dominio", este registro no es un lector
// sumándose a una organización existente: es el alta de una organización
// nueva, y quien se registra queda como su admin_organizacion.
//
// En ningún caso se pide contraseña acá: la cuenta se crea sin contraseña
// y se manda un email con el link para crearla (POST /auth/crear-contrasena).
// Abrir ese link es lo que valida que el correo es de quien se registró.
app.post('/api/auth/register', async (req, res) => {
  const {
    nombre,
    apellido,
    cedula,
    correo,
    telefono,
    organizacion,
    dominio,
    planId,
    ciclo,
  } = req.body ?? {}

  if (!nombre || !apellido || !cedula || !correo || !telefono) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' })
  }

  if (!EMAIL_VALIDO.test(correo)) {
    return res.status(400).json({ error: 'El correo no es válido' })
  }

  // Solo rebota si la cuenta ya está activada (creó su contraseña). Si
  // existe pero sigue pendiente, puede ser que alguien haya registrado este
  // correo sin ser su dueño (el link le llegó al dueño, no a quien lo
  // registró) o que el link original se haya perdido o vencido. En ese caso
  // no se bloquea al dueño real: se pisan los datos personales y se manda un
  // link nuevo, más abajo.
  const usuarioPendiente = await buscarUsuarioPorCorreo(correo)
  if (usuarioPendiente && usuarioPendiente.contrasena !== null) {
    return res.status(409).json({
      code: 'CORREO_YA_REGISTRADO',
      message: 'Ese correo ya está registrado',
    })
  }

  if (usuarioPendiente) {
    const msDesdeUltimoIntento =
      Date.now() - new Date(usuarioPendiente.fecha_registro).getTime()
    if (msDesdeUltimoIntento < COOLDOWN_REGISTRO_PENDIENTE_MS) {
      return res.status(429).json({
        code: 'DEMASIADOS_INTENTOS',
        message:
          'Ya enviamos un email a ese correo hace instantes. Esperá un minuto antes de volver a intentar.',
      })
    }
  }

  // Los dominios se guardan y se buscan siempre con "@" adelante
  // ("@anima.edu.uy"), así el registro de lectores y el alta de
  // organizaciones comparan contra el mismo formato.
  const [, correoDominio] = correo.split('@')
  const dominioConArroba = `@${correoDominio}`

  const creaOrganizacionNueva = Boolean(organizacion && dominio)
  // En el alta, quien contrata puede escribir "@anima.edu.uy" o
  // "anima.edu.uy": se normaliza a la forma con "@".
  const dominioOrganizacion = creaOrganizacionNueva
    ? `@${dominio.trim().replace(/^@+/, '')}`
    : null

  // contrasena: null = todavía no la creó
  const datosUsuario = {
    nombre,
    ci: cedula,
    correo,
    telefono,
    contrasena: null,
  }

  // Primero se validan los datos de cada caso; recién después se escribe
  // en la base, todo junto dentro de una transacción. Las tres situaciones
  // posibles son mutuamente excluyentes y se deciden acá, en un solo lugar,
  // para que la validación y la escritura de más abajo nunca se desalineen.
  let organizacionExistente
  let expiracion

  if (usuarioPendiente) {
    if (creaOrganizacionNueva) {
      return res.status(409).json({
        code: 'CORREO_PENDIENTE_EXISTENTE',
        message:
          'Ese correo ya tiene un registro pendiente. Primero completalo o pedí uno nuevo antes de dar de alta una organización.',
      })
    }
  } else if (creaOrganizacionNueva) {
    // Quien da de alta la organización tiene que tener un correo de ese
    // dominio: como el link de validación llega a su correo, eso prueba que
    // pertenece a la institución. Si no, cualquiera podría reclamar el
    // dominio de otra institución con un mail propio.
    if (dominioConArroba.toLowerCase() !== dominioOrganizacion.toLowerCase()) {
      return res.status(400).json({
        code: 'CORREO_FUERA_DEL_DOMINIO',
        message: `Para registrar la organización tenés que usar un correo que termine en ${dominioOrganizacion}`,
      })
    }

    if (!planId) {
      return res.status(400).json({ error: 'Falta el plan seleccionado' })
    }

    if (!(await buscarPlanPorId(planId))) {
      return res.status(400).json({
        code: 'PLAN_INEXISTENTE',
        message: 'El plan seleccionado no existe',
      })
    }

    if (await buscarOrganizacionPorDominio(dominioOrganizacion)) {
      return res.status(409).json({
        code: 'DOMINIO_YA_REGISTRADO',
        message: 'Ya existe una organización con ese dominio',
      })
    }

    const mesesSuscripcion = ciclo === 'anual' ? 12 : 1
    expiracion = new Date()
    expiracion.setMonth(expiracion.getMonth() + mesesSuscripcion)
  } else {
    organizacionExistente = await buscarOrganizacionPorDominio(dominioConArroba)

    if (!organizacionExistente) {
      return res.status(400).json({
        error: 'No existe una organización para ese dominio de correo',
      })
    }
  }

  // Organización, usuario y email van juntos en una transacción:
  // - si falla el usuario (ej: CI repetida), el rollback borra la
  //   organización; si no, quedaría una organización sin admin y el próximo
  //   intento rebotaría con DOMINIO_YA_REGISTRADO.
  // - el email se manda ANTES del commit: si no sale, el rollback deshace
  //   el alta. Si no, quedaría una cuenta sin contraseña y sin link para
  //   crearla, y volver a registrarse rebotaría con CORREO_YA_REGISTRADO.
  const conexion = await pool.getConnection()
  try {
    await conexion.beginTransaction()

    let idUsuario
    if (usuarioPendiente) {
      const actualizado = await actualizarUsuarioPendiente(
        { id: usuarioPendiente.id, nombre, apellido, ci: cedula, telefono },
        conexion,
      )
      if (!actualizado) {
        await conexion.rollback()
        return res.status(409).json({
          code: 'CORREO_YA_REGISTRADO',
          message: 'Ese correo ya está registrado',
        })
      }
      idUsuario = usuarioPendiente.id
    } else {
      let organizacionId
      if (creaOrganizacionNueva) {
        const organizacionNueva = await crearOrganizacion(
          {
            nombre: organizacion,
            idPlan: planId,
            dominio: dominioOrganizacion,
            expiracion,
          },
          conexion,
        )
        organizacionId = organizacionNueva.id
      } else {
        organizacionId = organizacionExistente.id
      }

      const usuarioNuevo = await crearUsuario(
        {
          ...datosUsuario,
          apellido,
          organizacionId,
          rol: creaOrganizacionNueva ? 'admin_organizacion' : 'lector',
        },
        conexion,
      )
      idUsuario = usuarioNuevo.id
    }

    await notificarRegistro({
      nombre,
      correo,
      tokenCrearContrasena: generarTokenCrearContrasena(idUsuario),
    })

    await conexion.commit()
  } catch (err) {
    await conexion.rollback()

    if (err.code === 'EMAIL_NO_ENVIADO') {
      return res.status(502).json({
        code: 'EMAIL_NO_ENVIADO',
        message:
          'No pudimos enviarte el email para validar tu correo. Probá registrarte de nuevo en unos minutos.',
      })
    }
    throw err
  } finally {
    conexion.release()
  }

  res.status(200).json({
    message:
      'Te enviamos un email para validar tu correo y crear tu contraseña',
  })
})

// POST /api/usuarios - Invitar un usuario a mi organización (admin)
// A diferencia de POST /auth/register (alta pública, con contraseña propia),
// acá el admin carga los datos de la persona y el sistema la invita: se crea
// sin contraseña (columna NULL) y se le manda un email con el link para que
// la cree ella misma. Se asume rol "lector": invitar a otro admin no está
// contemplado por este endpoint.
app.post(
  '/api/usuarios',
  verificarToken,
  verificarAdmin,
  async (req, res, next) => {
    const { nombre, apellido, cedula, correo, telefono } = req.body ?? {}

    if (!nombre || !apellido || !cedula || !correo || !telefono) {
      return res.status(400).json({
        error: 'faltan_campos',
        mensaje:
          'Faltan campos obligatorios: nombre, apellido, cedula, correo, telefono',
      })
    }

    if (!EMAIL_VALIDO.test(correo)) {
      return res.status(400).json({ error: 'El correo no es válido' })
    }

    const usuarioExistente = await buscarUsuarioPorCorreo(correo)
    if (usuarioExistente && usuarioExistente.contrasena !== null) {
      return res.status(409).json({
        code: 'CORREO_YA_REGISTRADO',
        message: 'Ese correo ya está registrado',
      })
    }

    try {
      let idUsuario
      if (usuarioExistente) {
        const actualizado = await actualizarUsuarioPendiente({
          id: usuarioExistente.id,
          nombre,
          apellido,
          ci: cedula,
          telefono,
        })
        if (!actualizado) {
          return res.status(409).json({
            code: 'CORREO_YA_REGISTRADO',
            message: 'Ese correo ya está registrado',
          })
        }
        idUsuario = usuarioExistente.id
      } else {
        const usuarioInvitado = await crearUsuario({
          nombre,
          apellido,
          ci: cedula,
          correo,
          telefono,
          contrasena: null,
          organizacionId: req.usuario.organizacionId,
          rol: 'lector',
        })
        idUsuario = usuarioInvitado.id
      }

      const tokenInvitacion = generarTokenCrearContrasena(idUsuario, '7d')

      await notificarInvitacion({ nombre, correo, tokenInvitacion })

      res.status(201).json({ id: idUsuario, nombre, correo })
    } catch (err) {
      next(err)
    }
  },
)

// GET /api/usuarios - Listar usuarios de mi organización (admin)
app.get('/api/usuarios', verificarToken, verificarAdmin, async (req, res) => {
  res.json(await listarUsuariosPorOrganizacion(req.usuario.organizacionId))
})

// GET /api/usuarios/:id - Ver un usuario (el propio usuario, o admin de su organización)
app.get('/api/usuarios/:id', verificarToken, async (req, res) => {
  const usuario = await buscarUsuarioPorId(req.params.id)

  if (!usuario) {
    return res.status(404).json({ error: 'Usuario no encontrado' })
  }

  const esElPropio = req.usuario.id === usuario.id
  const esAdminDeSuOrg =
    ['admin', 'super-admin'].includes(req.usuario.rol) &&
    esDeMiOrganizacion(req, usuario.organizacionId)

  if (!esElPropio && !esAdminDeSuOrg) {
    return res.status(403).json({ error: 'No autorizado' })
  }

  // Nunca devolver el hash de la contraseña, ni siquiera al propio usuario.
  const { contrasena, ...usuarioSinContrasena } = usuario
  res.json(usuarioSinContrasena)
})

// PUT /api/usuarios/:id - Editar un usuario (el propio usuario, o admin de su organización)
app.put('/api/usuarios/:id', verificarToken, sinImplementar)

// DELETE /api/usuarios/:id - Eliminar un usuario (el propio usuario, o admin de su organización)
app.delete('/api/usuarios/:id', verificarToken, sinImplementar)

/* ============================================================
   AUTENTICACIÓN
   ============================================================ */

// POST /api/auth/login - Iniciar sesión
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body ?? {}

  if (!email || !password) {
    return res.status(400).json({ error: 'Faltan email o contraseña' })
  }

  const usuarioElegido = await buscarUsuarioPorCorreo(email)

  if (!usuarioElegido) {
    return res.status(401).json({
      code: 'CREDENCIALES_INVALIDAS',
      message: 'Credenciales incorrectas',
    })
  }

  // Cuenta (registrada o invitada por un admin) que todavía no pasó por
  // /auth/crear-contrasena: no hay hash contra el cual comparar.
  if (!usuarioElegido.contrasena) {
    return res.status(401).json({
      code: 'CUENTA_SIN_CONTRASENA',
      message:
        'Tal vez aún no hayas creado tu contraseña. Revisá el email que te enviamos.',
    })
  }

  const passwordCorrecta = await bcrypt.compare(
    password,
    usuarioElegido.contrasena,
  )

  if (!passwordCorrecta) {
    return res.status(401).json({
      code: 'CREDENCIALES_INVALIDAS',
      message: 'Credenciales incorrectas',
    })
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
    { expiresIn: '2h' },
  )

  res.json({ token })
})

// POST /api/auth/logout - Cerrar sesión
// Con JWT stateless no hay nada que invalidar en el servidor;
// el frontend borra el token guardado.
app.post('/api/auth/logout', (req, res) => {
  res.status(200).json({ mensaje: 'Sesión cerrada' })
})

// POST /api/auth/recuperar - Recuperar contraseña
app.post('/api/auth/recuperar', sinImplementar)

// POST /api/auth/crear-contrasena - Primera contraseña de una cuenta
// El token viene del link que se manda por email al registrarse (POST
// /api/auth/register, ver notificarRegistro) o al ser invitado por un admin
// (POST /api/usuarios, ver notificarInvitacion). No requiere sesión: la
// persona todavía no tiene contraseña, así que no puede loguearse.
app.post('/api/auth/crear-contrasena', async (req, res, next) => {
  const { token, contrasena, confirmarContrasena } = req.body ?? {}

  if (!token || !contrasena || !confirmarContrasena) {
    return res.status(400).json({ error: 'Faltan token o contraseña' })
  }

  if (contrasena !== confirmarContrasena) {
    return res.status(400).json({ error: 'Las contraseñas no coinciden' })
  }

  // null si el token está vencido, mal firmado o es de otro propósito.
  const idUsuario = verificarTokenCrearContrasena(token)
  if (!idUsuario) {
    return res.status(401).json({ error: 'El link es inválido o ya venció' })
  }

  try {
    const [[usuario]] = await pool.query(
      'SELECT contrasena FROM usuarios WHERE id = ?',
      [idUsuario],
    )

    if (!usuario) {
      return res.status(404).json({ error: 'La cuenta ya no existe' })
    }

    // Que la cuenta ya tenga contraseña es lo que hace que el link no sirva
    // dos veces: no hace falta guardar el token como "usado" en ningún lado.
    if (usuario.contrasena !== null) {
      return res.status(409).json({
        error:
          'Esta cuenta ya tiene una contraseña. Iniciá sesión normalmente.',
      })
    }

    // Si llegó hasta acá abrió el link del email, así que el correo es suyo:
    // se marca como validado en el mismo UPDATE que guarda la contraseña.
    const contrasenaHasheada = await bcrypt.hash(contrasena, 10)
    await pool.query(
      'UPDATE usuarios SET contrasena = ?, email_verificado_en = NOW() WHERE id = ?',
      [contrasenaHasheada, idUsuario],
    )

    res.status(200).json({ mensaje: 'Contraseña creada' })
  } catch (err) {
    next(err)
  }
})

/* ============================================================
   LIBROS
   ============================================================ */

// POST /api/libros - Crear un nuevo libro (admin)
app.post(
  '/api/libros',
  verificarToken,
  verificarAdmin,
  async (req, res, next) => {
    const {
      titulo,
      autor,
      genero,
      editorial,
      isbn,
      fecha_pub,
      resumen,
      portada,
      stock,
    } = req.body ?? {}

    if (!titulo || !autor || !genero) {
      return res.status(400).json({
        error: 'faltan_campos',
        mensaje: 'Faltan campos obligatorios: titulo, autor, genero',
      })
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
        ],
      )

      const [rows] = await pool.query('SELECT * FROM libros WHERE id = ?', [
        resultado.insertId,
      ])
      const libroCreado = rows[0]

      if (!libroCreado) {
        return res
          .status(404)
          .json({ error: 'no_encontrado', mensaje: 'Libro no encontrado' })
      }

      res.status(201).json(libroCreado)
    } catch (err) {
      next(err)
    }
  },
)

// GET /api/libros - Listar todos los libros (cualquier usuario autenticado)
app.get('/api/libros', verificarToken, async (req, res, next) => {
  try {
    const { busqueda, genero } = req.query
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
      WHERE l.id_organizacion = ?`
    const params = [req.usuario.organizacionId]

    if (busqueda) {
      sql += ' AND (l.titulo LIKE ? OR l.autor LIKE ?)'
      params.push(`%${busqueda}%`, `%${busqueda}%`)
    }
    if (genero) {
      sql += ' AND l.genero = ?'
      params.push(genero)
    }

    const [libros] = await pool.query(sql, params)
    res.json(libros)
  } catch (err) {
    next(err)
  }
})

// GET /api/libros/:id - Ver un libro específico (cualquier usuario autenticado)
app.get('/api/libros/:id', verificarToken, async (req, res, next) => {
  try {
    const [[libro]] = await pool.query(
      `SELECT l.id, l.titulo, l.autor, l.genero, l.editorial, l.isbn, l.fecha_pub,
              l.resumen, l.portada, l.stock,
              l.stock - COALESCE(p.activos, 0) AS disponibles,
              ROUND(COALESCE(r.promedio, 0), 2) AS promedio_estrellas,
              EXISTS (SELECT 1 FROM prestamos mp
                      WHERE mp.id_libro = l.id AND mp.id_usuario = ?
                        AND mp.estado IN ('pendiente_retiro','activo','atrasado')) AS ya_lo_tiene
       FROM libros l
       LEFT JOIN (SELECT id_libro, COUNT(*) AS activos FROM prestamos
                  WHERE estado IN ('pendiente_retiro','activo','atrasado')
                  GROUP BY id_libro) p ON p.id_libro = l.id
       LEFT JOIN (SELECT id_libro, AVG(calificacion) AS promedio FROM resenas
                  GROUP BY id_libro) r ON r.id_libro = l.id
       WHERE l.id = ? AND l.id_organizacion = ?`,
      [req.usuario.id, req.params.id, req.usuario.organizacionId],
    )

    if (!libro) {
      return res
        .status(404)
        .json({ error: 'no_encontrado', mensaje: 'Libro no encontrado' })
    }

    res.json({ ...libro, ya_lo_tiene: Boolean(libro.ya_lo_tiene) })
  } catch (err) {
    next(err)
  }
})

app.get('/api/libros/:id/resenas', verificarToken, async (req, res, next) => {
  const organizacionId = req.usuario.organizacionId
  const libroId = req.params.id

  try {
    const [resenas] = await pool.query(
      `SELECT r.id, r.id_libro, r.id_organizacion,
              r.calificacion, r.comentario, r.fecha,
              u.nombre AS usuario
       FROM resenas r
       JOIN usuarios u ON u.id = r.id_usuario
       WHERE r.id_organizacion = ?
         AND r.id_libro = ?
       ORDER BY r.fecha DESC`,
      [organizacionId, libroId],
    )

    res.json(resenas)
  } catch (err) {
    next(err)
  }
})

app.post('/api/libros/:id/resenas', verificarToken, async (req, res, next) => {
  const { id: libroId } = req.params
  const usuarioId = req.usuario.id
  const organizacionId = req.usuario.organizacionId
  const { calificacion, comentario } = req.body ?? {}

  if (!comentario || typeof comentario !== 'string' || !comentario.trim()) {
    return res.status(400).json({
      error: 'campos_vacios',
      mensaje: 'El comentario es requerido.',
    })
  }

  if (calificacion == null) {
    return res.status(400).json({
      error: 'campos_vacios',
      mensaje: 'La calificación es requerida',
    })
  }

  if (!Number.isInteger(calificacion) || calificacion > 5 || calificacion < 1) {
    return res.status(400).json({
      error: 'conflicto',
      mensaje: 'La calificación debe ser un número del 1 al 5.',
    })
  }

  if (comentario.trim().length < 100) {
    return res.status(400).json({
      error: 'conflicto',
      mensaje: 'El comentario debe tener al menos 100 caracteres.',
    })
  }

  if (comentario.trim().length > 600) {
    return res.status(400).json({
      error: 'conflicto',
      mensaje: 'El comentario debe ser menor a 600 caracteres.',
    })
  }

  try {
    const [resultado] = await pool.query(
      'INSERT INTO resenas (id_usuario, id_libro, id_organizacion, calificacion, comentario, fecha) VALUES (?, ?, ?, ?, ?, NOW())',
      [usuarioId, libroId, organizacionId, calificacion, comentario.trim()],
    )

    const resenaId = resultado.insertId

    const [[resenaPublicada]] = await pool.query(
      `SELECT r.id, r.calificacion, r.comentario, r.fecha, u.nombre AS usuario
      FROM resenas r
      JOIN usuarios u ON u.id = r.id_usuario
      WHERE r.id = ?`,
      [resenaId],
    )

    if (!resenaPublicada) {
      return res
        .status(404)
        .json({ error: 'no_encontrado', mensaje: 'Reseña no encontrada' })
    }

    res.status(201).json(resenaPublicada)
  } catch (err) {
    next(err)
  }
})

// PUT /api/libros/:id - Editar valores de un libro (admin)
app.put(
  '/api/libros/:id',
  verificarToken,
  verificarAdmin,
  async (req, res, next) => {
    const {
      titulo,
      autor,
      genero,
      editorial,
      isbn,
      fecha_pub,
      resumen,
      portada,
      stock,
    } = req.body ?? {}

    if (!titulo || !autor || !genero) {
      return res.status(400).json({
        error: 'faltan_campos',
        mensaje: 'Faltan campos obligatorios: titulo, autor, genero',
      })
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
        ],
      )

      if (resultado.affectedRows === 0) {
        return res
          .status(404)
          .json({ error: 'no_encontrado', mensaje: 'Libro no encontrado' })
      }

      const [[libroActualizado]] = await pool.query(
        'SELECT * FROM libros WHERE id = ?',
        [req.params.id],
      )

      res.json(libroActualizado)
    } catch (err) {
      next(err)
    }
  },
)

// DELETE /api/libros/:id - Eliminar un libro específico (admin)
app.delete(
  '/api/libros/:id',
  verificarToken,
  verificarAdmin,
  async (req, res, next) => {
    try {
      const [resultado] = await pool.query(
        'DELETE FROM libros WHERE id = ? AND id_organizacion = ?',
        [req.params.id, req.usuario.organizacionId],
      )

      if (resultado.affectedRows === 0) {
        return res
          .status(404)
          .json({ error: 'no_encontrado', mensaje: 'Libro no encontrado' })
      }

      res.status(200).json({ mensaje: 'Libro eliminado' })
    } catch (err) {
      // El libro tiene préstamos asociados (ON DELETE RESTRICT): no se puede
      // borrar sin perder el historial, hay que avisarle al admin por qué.
      if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.errno === 1451) {
        return res.status(409).json({
          error: 'libro_con_prestamos',
          mensaje: 'No se puede eliminar: el libro tiene préstamos asociados.',
        })
      }
      next(err)
    }
  },
)

/* ============================================================
   PRÉSTAMOS
   Nota de orden: las rutas /prestamos/mis-prestamos van ANTES de
   /prestamos/:id para que Express no interprete "mis-prestamos"
   como un valor de :id.
   ============================================================ */

// GET /api/prestamos/mis-prestamos - Préstamos del usuario autenticado
//     admite ?estado=atrasado (u otro valor del ENUM) para filtrar
app.get(
  '/api/prestamos/mis-prestamos',
  verificarToken,
  async (req, res, next) => {
    try {
      const esAdmin = 'admin' === req.usuario.rol
      const esSuperAdmin = 'super-admin' === req.usuario.rol

      const { estado } = req.query

      let sql = `
      SELECT p.id, p.id_usuario, u.nombre AS nombre_usuario, p.fecha_prestamo, p.fecha_devolucion_esperada, p.fecha_devolucion_real,
            p.extensiones_realizadas, p.lugar_retiro, p.estado,
            l.titulo, l.autor, l.portada, c.max_extensiones
      FROM prestamos p
      JOIN libros l ON l.id = p.id_libro
      JOIN usuarios u ON u.id = p.id_usuario
      LEFT JOIN configuraciones c ON c.id_organizacion = p.id_organizacion
      WHERE 1 = 1`
      const params = []

      if (!esSuperAdmin) {
        sql += ' AND p.id_organizacion = ?'
        params.push(req.usuario.organizacionId)
      }

      if (!esAdmin && !esSuperAdmin) {
        sql += ' AND p.id_usuario = ?'
        params.push(req.usuario.id)
      }

      if (estado) {
        sql += ' AND p.estado = ?'
        params.push(estado)
      }

      sql += ' ORDER BY p.fecha_prestamo DESC'

      const [prestamos] = await pool.query(sql, params)
      res.json(prestamos)
    } catch (err) {
      next(err)
    }
  },
)

app.patch(
  '/api/prestamos/:id/retirado',
  verificarToken,
  verificarAdmin,
  async (req, res, next) => {
    try {
      const prestamoId = req.params.id
      const organizacionId = req.usuario.organizacionId
      const inicioDelDia = (d) =>
        new Date(d.getFullYear(), d.getMonth(), d.getDate())
      const atrasado = (fechaEsperada, hoy = new Date()) =>
        inicioDelDia(fechaEsperada) < inicioDelDia(hoy)

      const [[prestamo]] = await pool.query(
        `SELECT id, estado, id_organizacion, id_usuario, fecha_devolucion_esperada, fecha_devolucion_real
       FROM prestamos
       WHERE id = ? 
        AND id_organizacion = ?`,
        [prestamoId, organizacionId],
      )

      if (!prestamo) {
        return res
          .status(404)
          .json({ error: 'no_encontrado', mensaje: 'Préstamo no encontrado' })
      }

      if (prestamo.fecha_devolucion_real) {
        return res.status(409).json({
          error: 'prestamo_finalizado',
          mensaje: 'Préstamo de libro ya finalizado.',
        })
      } else if (atrasado(prestamo.fecha_devolucion_esperada)) {
        return res.status(409).json({
          error: 'prestamo_atrasado',
          mensaje: 'Aún no devolviste el libro y el préstamo ya venció.',
        })
      }

      const nuevoEstado = 'activo'

      const [resultadoRetiro] = await pool.query(
        `UPDATE prestamos
       SET estado = ?
       WHERE id = ? 
        AND id_organizacion = ? 
        AND estado = 'pendiente_retiro'`,
        [nuevoEstado, prestamo.id, organizacionId],
      )

      if (resultadoRetiro.affectedRows === 0) {
        return res.status(409).json({
          error: 'conflicto',
          mensaje: 'El préstamo ya no está pendiente de retiro.',
        })
      }

      const [[prestamoActualizado]] = await pool.query(
        `SELECT p.id, p.id_libro, p.id_usuario, p.fecha_prestamo, p.fecha_devolucion_esperada, p.fecha_devolucion_real,
              p.extensiones_realizadas, p.lugar_retiro, p.estado,
              l.titulo, l.autor, l.portada
      FROM prestamos p
      JOIN libros l ON l.id = p.id_libro
      WHERE p.id = ? 
        AND p.id_organizacion = ?`,
        [prestamoId, organizacionId],
      )

      if (!prestamoActualizado) {
        return res.status(404).json({ error: 'Préstamo no encontrado' })
      }

      try {
        await notificarRetiroLibro({
          idPrestamo: prestamoActualizado.id,
          idLibro: prestamoActualizado.id_libro,
          idUsuario: prestamoActualizado.id_usuario,
          idOrganizacion: organizacionId,
        })
      } catch (errorNotificacion) {
        console.error('Error al notificar retiro del libro:', errorNotificacion)
      }

      res.json({ prestamoActualizado })
    } catch (err) {
      next(err)
    }
  },
)

// PATCH /api/prestamos/mis-prestamos/:id/extender - Extender plazo del préstamo
app.patch(
  '/api/prestamos/mis-prestamos/:id/extender',
  verificarToken,
  async (req, res, next) => {
    try {
      const prestamoId = req.params.id
      const organizacionId = req.usuario.organizacionId
      const usuarioId = req.usuario.id
      const inicioDelDia = (d) =>
        new Date(d.getFullYear(), d.getMonth(), d.getDate())
      const atrasado = (fechaEsperada, hoy = new Date()) =>
        inicioDelDia(fechaEsperada) < inicioDelDia(hoy)

      const [[prestamo]] = await pool.query(
        `SELECT id, estado, id_organizacion, fecha_devolucion_esperada, fecha_devolucion_real, extensiones_realizadas 
       FROM prestamos
       WHERE id = ? 
        AND id_organizacion = ? 
        AND id_usuario = ?`,
        [prestamoId, organizacionId, usuarioId],
      )

      if (!prestamo) {
        return res
          .status(404)
          .json({ error: 'no_encontrado', mensaje: 'Préstamo no encontrado' })
      }

      if (prestamo.fecha_devolucion_real) {
        return res.status(409).json({
          error: 'prestamo_finalizado',
          mensaje: 'Préstamo de libro ya finalizado.',
        })
      } else if (prestamo.estado === 'pendiente_retiro') {
        return res.status(409).json({
          error: 'libro_pendiente_retiro',
          mensaje: 'Préstamo no iniciado, el libro no fue retirado aún.',
        })
      } else if (atrasado(prestamo.fecha_devolucion_esperada)) {
        return res.status(409).json({
          error: 'prestamo_atrasado',
          mensaje:
            'Ya no puedes extender el plazo, aún no lo devolviste y el préstamo ya venció.',
        })
      }

      const [[configuracion]] = await pool.query(
        'SELECT permite_extension, dias_extension, max_extensiones FROM configuraciones WHERE id_organizacion = ?',
        [organizacionId],
      )
      if (!configuracion) {
        return res.status(404).json({
          error: 'configuracion_no_encontrada',
          mensaje: 'La organización no tiene configuración de extensión',
        })
      }

      if (configuracion.permite_extension !== 1) {
        return res.status(409).json({
          error: 'extensiones_no_permitidas',
          mensaje: 'Esta organización no permite extensiones.',
        })
      }

      if (prestamo.extensiones_realizadas >= configuracion.max_extensiones) {
        return res.status(409).json({
          error: 'limite_extensiones',
          mensaje: 'Este préstamo ya no tiene más extensiones disponibles.',
        })
      }

      const diasPrestamo = configuracion.dias_extension
      const maxExtensiones = configuracion.max_extensiones
      const nuevaFechaDevolucion = new Date(prestamo.fecha_devolucion_esperada)
      nuevaFechaDevolucion.setDate(
        nuevaFechaDevolucion.getDate() + diasPrestamo,
      )

      // El incremento y el tope se evalúan atómicamente en el propio UPDATE
      // (no en JS) para que dos extensiones simultáneas no superen max_extensiones.
      const [resultadoExtension] = await pool.query(
        `UPDATE prestamos
       SET fecha_devolucion_esperada = ?, fecha_devolucion_real = null, extensiones_realizadas = extensiones_realizadas + 1
       WHERE id = ? AND id_organizacion = ? AND extensiones_realizadas < ? AND fecha_devolucion_real IS NULL AND estado NOT IN ('devuelto','cancelado', 'pendiente_retiro')`,
        [
          nuevaFechaDevolucion,
          prestamo.id,
          organizacionId,
          configuracion.max_extensiones,
        ],
      )

      if (resultadoExtension.affectedRows === 0) {
        return res.status(409).json({
          error: 'limite_extensiones',
          mensaje: 'Este préstamo ya no tiene más extensiones disponibles.',
        })
      }

      const [[prestamoActualizado]] = await pool.query(
        `SELECT p.id, p.id_libro, p.id_usuario, p.fecha_prestamo, p.fecha_devolucion_esperada, p.fecha_devolucion_real,
              p.extensiones_realizadas, p.lugar_retiro, p.estado,
              l.titulo, l.autor, l.portada
      FROM prestamos p
      JOIN libros l ON l.id = p.id_libro
      WHERE p.id = ? AND p.id_organizacion = ?`,
        [prestamoId, organizacionId],
      )

      if (!prestamoActualizado) {
        return res.status(404).json({ error: 'Préstamo no encontrado' })
      }

      try {
        await notificarExtensionPrestamo({
          idPrestamo: prestamoActualizado.id,
          idLibro: prestamoActualizado.id_libro,
          idUsuario: prestamoActualizado.id_usuario,
          idOrganizacion: organizacionId,
        })
      } catch (errorNotificacion) {
        console.error(
          'Error al notificar extensión de préstamo:',
          errorNotificacion,
        )
      }

      res.json({
        ...prestamoActualizado,
        max_extensiones: maxExtensiones,
      })
    } catch (err) {
      next(err)
    }
  },
)

// POST /api/prestamos - Crear un nuevo préstamo (cualquier usuario autenticado)
app.post('/api/prestamos', verificarToken, async (req, res, next) => {
  try {
    const { libroId } = req.body
    // El usuario sale del token, no del body: si no, cualquiera podría
    // pedir préstamos a nombre de otro.
    const usuarioId = req.usuario.id

    const [[existente]] = await pool.query(
      `SELECT 1 FROM prestamos
       WHERE id_libro = ? AND id_usuario = ?
         AND estado IN ('pendiente_retiro','activo','atrasado')
       LIMIT 1`,
      [libroId, usuarioId],
    )
    if (existente) {
      return res
        .status(409)
        .json({ error: 'ya_prestado', mensaje: 'Ya tenés este libro pedido' })
    }

    // El plazo y el lugar de retiro son configurables por organización
    // (tabla configuraciones), por eso no se reciben del cliente: se buscan acá.
    const [[configuracion]] = await pool.query(
      'SELECT dias_prestamo, lugar_retiro FROM configuraciones WHERE id_organizacion = ?',
      [req.usuario.organizacionId],
    )
    const diasPrestamo = configuracion?.dias_prestamo ?? 30
    const lugarRetiro = configuracion?.lugar_retiro ?? null
    const fechaDevolucionEsperada = new Date(
      Date.now() + diasPrestamo * 24 * 60 * 60 * 1000,
    )

    // Todo préstamo nuevo arranca pendiente de retiro; el estado lo controla
    // el sistema a partir de acá (retiro, devolución, atraso), no el cliente.
    const [resultado] = await pool.query(
      'INSERT INTO prestamos (id_libro, id_usuario, id_organizacion, fecha_devolucion_esperada, lugar_retiro, estado) VALUES (?, ?, ?, ?, ?, ?)',
      [
        libroId,
        usuarioId,
        req.usuario.organizacionId,
        fechaDevolucionEsperada,
        lugarRetiro,
        'pendiente_retiro',
      ],
    )

    // RF de notificaciones: avisar al admin de la organización que hay un
    // préstamo nuevo pendiente de entrega (ver services/notificaciones.js).
    await notificarNuevoPrestamo({
      idPrestamo: resultado.insertId,
      idLibro: libroId,
      idUsuario: usuarioId,
      idOrganizacion: req.usuario.organizacionId,
    })

    res.status(201).json({ id: resultado.insertId })
  } catch (err) {
    next(err)
  }
})

// GET /api/prestamos - Listar todos los préstamos (admin), admite ?estado=vencido
app.get('/api/prestamos', verificarToken, verificarAdmin, sinImplementar)

// GET /api/prestamos/:id - Ver un préstamo específico (admin)
app.get('/api/prestamos/:id', verificarToken, verificarAdmin, sinImplementar)

// PATCH /api/prestamos/:id/devolver - Marcar préstamo como devuelto (admin)
app.patch(
  '/api/prestamos/:id/devolver',
  verificarToken,
  async (req, res, next) => {
    try {
      const prestamoId = req.params.id
      const organizacionId = req.usuario.organizacionId
      let nuevoEstado = 'devuelto'

      const [[prestamo]] = await pool.query(
        `SELECT id, estado, id_organizacion FROM prestamos
       WHERE id = ? AND id_organizacion = ?`,
        [prestamoId, organizacionId],
      )

      if (!prestamo) {
        return res
          .status(404)
          .json({ error: 'no_encontrado', mensaje: 'Préstamo no encontrado' })
      }

      if (
        !['activo', 'atrasado', 'pendiente_retiro'].includes(prestamo.estado)
      ) {
        return res.status(409).json({
          error: 'no_disponible',
          mensaje: 'El préstamo no está disponible',
        })
      }

      if (prestamo.estado === 'pendiente_retiro') {
        nuevoEstado = 'cancelado'

        await pool.query(
          'UPDATE prestamos SET estado = ? WHERE id = ? AND id_organizacion = ?',
          [nuevoEstado, prestamo.id, organizacionId],
        )

        const [[prestamoActualizado]] = await pool.query(
          `SELECT p.id, p.id_libro, p.id_usuario, u.nombre AS nombre_usuario, p.fecha_prestamo, p.fecha_devolucion_esperada, p.fecha_devolucion_real,
                p.extensiones_realizadas, p.lugar_retiro, p.estado,
                l.titulo, l.autor, l.portada
        FROM prestamos p
        JOIN libros l ON l.id = p.id_libro
        JOIN usuarios u ON u.id = p.id_usuario
        WHERE p.id = ? AND p.id_organizacion = ?`,
          [prestamoId, organizacionId],
        )

        if (!prestamoActualizado) {
          return res.status(404).json({ error: 'Préstamo no encontrado' })
        }
        return res.json(prestamoActualizado)
      }
      await pool.query(
        `UPDATE prestamos SET estado = ?, fecha_devolucion_real = NOW() WHERE id = ? AND id_organizacion = ? AND estado IN ('activo','atrasado','pendiente_retiro') `,
        [nuevoEstado, prestamo.id, organizacionId],
      )

      const [[prestamoActualizado]] = await pool.query(
        `SELECT p.id, p.id_libro, p.id_usuario, p.fecha_prestamo, p.fecha_devolucion_esperada, p.fecha_devolucion_real,
              p.extensiones_realizadas, p.lugar_retiro, p.estado,
              l.titulo, l.autor, l.portada
      FROM prestamos p
      JOIN libros l ON l.id = p.id_libro
      WHERE p.id = ? AND p.id_organizacion = ?`,
        [prestamoId, organizacionId],
      )

      if (!prestamoActualizado) {
        return res.status(404).json({ error: 'Préstamo no encontrado' })
      }

      try {
        await notificarDevolucionPrestamo({
          idPrestamo: prestamoActualizado.id,
          idLibro: prestamoActualizado.id_libro,
          idUsuario: prestamoActualizado.id_usuario,
          idOrganizacion: organizacionId,
        })
      } catch (errorNotificacion) {
        console.error(
          'Error al notificar devolución de préstamo:',
          errorNotificacion,
        )
      }

      res.json(prestamoActualizado)
    } catch (err) {
      next(err)
    }
  },
)

// DELETE /api/prestamos/:id - Eliminar un préstamo (admin)
app.delete('/api/prestamos/:id', verificarToken, verificarAdmin)

/* ============================================================
   REPORTES DE PROBLEMAS
   ============================================================ */

// Pueden reportar el admin de una organización y el lector. El super-admin
// queda afuera: no pertenece a ninguna organización y la tabla la exige.
const ROLES_QUE_REPORTAN = ['admin', 'lector']

const verificarPuedeReportar = (req, res, next) => {
  if (!ROLES_QUE_REPORTAN.includes(req.usuario.rol)) {
    return res.status(403).json({
      error: 'sin_permiso',
      mensaje: 'Tu rol no puede enviar reportes.',
    })
  }
  next()
}

// GET /api/secciones - Secciones para el selector de "Reportar un problema"
app.get('/api/secciones', verificarToken, async (req, res, next) => {
  try {
    const [secciones] = await pool.query(
      'SELECT id, nombre FROM secciones WHERE activo = 1 ORDER BY orden, nombre',
    )
    res.json(secciones)
  } catch (err) {
    next(err)
  }
})

// POST /api/reportes - Guardar un reporte (usuario y fecha salen del token y de la base)
app.post(
  '/api/reportes',
  verificarToken,
  verificarPuedeReportar,
  async (req, res, next) => {
    const { idSeccion, descripcion } = req.body ?? {}
    const idSeccionNumero = Number(idSeccion)

    if (!Number.isInteger(idSeccionNumero) || idSeccionNumero <= 0) {
      return res
        .status(400)
        .json({ error: 'campos_vacios', mensaje: 'Elegí una sección.' })
    }

    if (typeof descripcion !== 'string' || !descripcion.trim()) {
      return res
        .status(400)
        .json({ error: 'campos_vacios', mensaje: 'Contanos qué pasó.' })
    }

    try {
      const [[seccion]] = await pool.query(
        'SELECT id FROM secciones WHERE id = ? AND activo = 1',
        [idSeccionNumero],
      )

      if (!seccion) {
        return res.status(400).json({
          error: 'seccion_invalida',
          mensaje: 'La sección elegida no existe.',
        })
      }

      const [resultado] = await pool.query(
        'INSERT INTO reportes_problemas (id_usuario, id_organizacion, id_seccion, descripcion) VALUES (?, ?, ?, ?)',
        [
          req.usuario.id,
          req.usuario.organizacionId,
          idSeccionNumero,
          descripcion.trim(),
        ],
      )

      res.status(201).json({
        id: resultado.insertId,
        mensaje: '¡Gracias! Recibimos tu reporte.',
      })
    } catch (err) {
      next(err)
    }
  },
)

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
  })
})

// Errores de mysql2 que significan "no hay base de datos": el servidor está
// caído, las credenciales del .env no sirven o la base no existe. No es un
// bug del endpoint, así que se responde 503 (servicio no disponible).
const ERRORES_SIN_CONEXION_DB = new Set([
  'ECONNREFUSED',
  'ETIMEDOUT',
  'ENOTFOUND',
  'PROTOCOL_CONNECTION_LOST',
  'ER_ACCESS_DENIED_ERROR',
  'ER_BAD_DB_ERROR',
])

// Cualquier error no capturado en un handler. Express 5 manda acá también
// los errores de los handlers async, así que una consulta que falla no
// tumba el servidor: se loguea y el cliente recibe un mensaje.
app.use((err, req, res, next) => {
  console.error(
    `[error] ${req.method} ${req.originalUrl} ->`,
    err.code ?? '',
    err.message,
  )

  if (ERRORES_SIN_CONEXION_DB.has(err.code)) {
    return res.status(503).json({
      error: 'db_no_disponible',
      mensaje:
        'No pudimos conectarnos con la base de datos. Probá de nuevo en unos minutos.',
    })
  }

  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      error: 'registro_duplicado',
      mensaje: 'Ya existe un registro con esos datos.',
    })
  }

  res.status(500).json({
    error: 'error_interno',
    mensaje: 'Ocurrió un error inesperado. Probá de nuevo más tarde.',
  })
})

// Red de seguridad para promesas que fallan fuera de un request (por ejemplo
// un envío de mail que nadie espera con await). Sin esto, Node corta el
// proceso y se cae todo el backend por un solo error.
process.on('unhandledRejection', (err) => {
  console.error('[unhandledRejection]', err?.code ?? '', err?.message ?? err)
})

/* ============================================================ */

app.listen(PUERTO, () => {
  console.log(`Servidor en http://localhost:${PUERTO}`)
})
