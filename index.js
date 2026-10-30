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
import {
  CARPETA_UPLOADS,
  subirLogo,
  borrarArchivoLogo,
} from './middlewares/subirLogo.js'
import { subirFoto, borrarArchivoFoto } from './middlewares/subirFoto.js'
import {
  buscarUsuarioPorCorreo,
  buscarUsuarioPorId,
  listarUsuarios,
  listarUsuariosPorOrganizacion,
  crearUsuario,
  actualizarUsuario,
  actualizarFotoUsuario,
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
  crearConfiguracion,
  actualizarConfiguracion,
  eliminarConfiguracion,
  listarUsuariosTodasOrganizaciones,
  listarOrganizaciones,
  ROL_DB_A_APP,
} from './repos.js'

import isbnRoutes from './routes/isbn.routes.js'
import {
  notificarNuevoPrestamo,
  notificarInvitacion,
  notificarRegistro,
  notificarExtensionPrestamo,
  notificarDevolucionPrestamo,
  notificarRetiroLibro,
  notificarRecuperacionContrasena,
} from './services/notificaciones.js'
import {
  generarTokenCrearContrasena,
  verificarTokenCrearContrasena,
  generarTokenRestablecerContrasena,
  verificarTokenRestablecerContrasena,
  huellaDeContrasena,
} from './services/token.js'
import { calcularDevolucion } from './services/fechaDevolucion.js'

const app = express()
const PUERTO = process.env.PORT || 3001

// Si falta el secreto, el login falla con un error confuso en tiempo de
// ejecución. Mejor no arrancar y decir exactamente qué falta.
if (!process.env.JWT_SECRET) {
  console.error('Falta JWT_SECRET en el .env. El servidor no puede arrancar.')
  process.exit(1)
}

app.use(cors())

// Archivos subidos (por ahora, logos de organizaciones). nosniff evita que el
// navegador interprete una imagen como otro tipo de archivo.
// Cada archivo tiene un nombre único (lleva timestamp) y nunca se reescribe,
// así que se puede cachear para siempre: el navegador no vuelve a pedirlo al
// cambiar de vista y el logo no parpadea.
app.use(
  '/uploads',
  express.static(CARPETA_UPLOADS, {
    maxAge: '1y',
    immutable: true,
    setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
  }),
)

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
    const { nombre, descripcion, precioMensual, limiteUsuarios } =
      req.body ?? {}

    if (!nombre || precioMensual == null || limiteUsuarios == null) {
      return res.status(400).json({
        error: 'faltan_campos',
        mensaje:
          'Faltan campos obligatorios: nombre, precioMensual, limiteUsuarios',
      })
    }

    const planNuevo = await crearPlan({
      nombre,
      descripcion: descripcion ?? null,
      precioMensual,
      limiteUsuarios,
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

// GET /api/organizaciones - Listar todas las organizaciones (super-admin)
app.get(
  '/api/organizaciones',
  verificarToken,
  verificarSuperAdmin,
  async (req, res, next) => {
    try {
      res.json(await listarOrganizaciones())
    } catch (err) {
      next(err)
    }
  },
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

const COLOR_VALIDO = /^#[0-9a-fA-F]{6}$/

const esEnteroEntre = (valor, min, max) =>
  Number.isInteger(valor) && valor >= min && valor <= max

const esTextoHasta = (valor, max) =>
  typeof valor === 'string' && valor.trim() !== '' && valor.length <= max

const validarConfiguracion = (campos) => {
  const {
    nombreApp,
    logo,
    colorPrimario,
    colorSecundario,
    maxLibrosPorUsuario,
    lugarRetiro,
    lugarDevolucion,
    diasPrestamo,
    permiteExtension,
    maxExtensiones,
    diasExtension,
    congelarUsuarios,
    diasAtrasoCongelamiento,
    mensajesPersonalizados,
    horarios,
  } = campos

  if (nombreApp !== undefined && !esTextoHasta(nombreApp, 150)) {
    return 'nombreApp debe ser un texto de hasta 150 caracteres'
  }
  if (logo !== undefined && logo !== null && !esTextoHasta(logo, 255)) {
    return 'logo debe ser una URL de hasta 255 caracteres o null'
  }
  if (colorPrimario !== undefined && !COLOR_VALIDO.test(colorPrimario)) {
    return 'colorPrimario debe tener el formato #RRGGBB'
  }
  if (
    colorSecundario !== undefined &&
    colorSecundario !== null &&
    !COLOR_VALIDO.test(colorSecundario)
  ) {
    return 'colorSecundario debe tener el formato #RRGGBB o ser null'
  }
  if (
    maxLibrosPorUsuario !== undefined &&
    !esEnteroEntre(maxLibrosPorUsuario, 1, 255)
  ) {
    return 'maxLibrosPorUsuario debe ser un entero entre 1 y 255'
  }
  if (lugarRetiro !== undefined && !esTextoHasta(lugarRetiro, 150)) {
    return 'lugarRetiro debe ser un texto de hasta 150 caracteres'
  }
  if (
    lugarDevolucion !== undefined &&
    lugarDevolucion !== null &&
    !esTextoHasta(lugarDevolucion, 150)
  ) {
    return 'lugarDevolucion debe ser un texto de hasta 150 caracteres o null'
  }
  if (diasPrestamo !== undefined && !esEnteroEntre(diasPrestamo, 1, 65535)) {
    return 'diasPrestamo debe ser un entero mayor a 0'
  }
  if (permiteExtension !== undefined && typeof permiteExtension !== 'boolean') {
    return 'permiteExtension debe ser true o false'
  }
  if (maxExtensiones !== undefined && !esEnteroEntre(maxExtensiones, 0, 255)) {
    return 'maxExtensiones debe ser un entero entre 0 y 255'
  }
  if (diasExtension !== undefined && !esEnteroEntre(diasExtension, 1, 65535)) {
    return 'diasExtension debe ser un entero mayor a 0'
  }
  if (congelarUsuarios !== undefined && typeof congelarUsuarios !== 'boolean') {
    return 'congelarUsuarios debe ser true o false'
  }
  if (
    diasAtrasoCongelamiento !== undefined &&
    diasAtrasoCongelamiento !== null &&
    !esEnteroEntre(diasAtrasoCongelamiento, 1, 65535)
  ) {
    return 'diasAtrasoCongelamiento debe ser un entero mayor a 0 o null'
  }

  if (mensajesPersonalizados !== undefined && mensajesPersonalizados !== null) {
    if (!Array.isArray(mensajesPersonalizados)) {
      return 'mensajesPersonalizados debe ser un arreglo'
    }
    const tipos = new Set()
    for (const m of mensajesPersonalizados) {
      if (
        !m ||
        !esTextoHasta(m.tipo, 50) ||
        typeof m.mensaje !== 'string' ||
        typeof m.activo !== 'boolean'
      ) {
        return 'Cada mensaje personalizado debe tener tipo (texto), mensaje (texto) y activo (true/false)'
      }
      if (tipos.has(m.tipo)) {
        return `El tipo de mensaje "${m.tipo}" está repetido`
      }
      tipos.add(m.tipo)
    }
  }

  if (horarios !== undefined && horarios !== null) {
    if (!Array.isArray(horarios) || horarios.length !== 7) {
      return 'horarios debe ser un arreglo con los 7 días de la semana'
    }
    const dias = new Set()
    for (const h of horarios) {
      if (
        !h ||
        !esEnteroEntre(h.dia, 0, 6) ||
        typeof h.abierto !== 'boolean' ||
        !HORA_VALIDA.test(h.apertura) ||
        !HORA_VALIDA.test(h.cierre)
      ) {
        return 'Cada horario debe tener dia (0-6), abierto (true/false), apertura y cierre (HH:MM)'
      }
      if (dias.has(h.dia)) {
        return `El día ${h.dia} está repetido en horarios`
      }
      // "HH:MM" con ceros a la izquierda se puede comparar como texto.
      if (h.abierto && h.apertura >= h.cierre) {
        return `En el día ${h.dia} la apertura tiene que ser antes del cierre`
      }
      dias.add(h.dia)
    }
  }

  return null
}

const HORA_VALIDA = /^([01]\d|2[0-3]):[0-5]\d$/

const limpiarMensajes = (mensajes) =>
  Array.isArray(mensajes)
    ? mensajes.map(({ tipo, mensaje, activo }) => ({ tipo, mensaje, activo }))
    : mensajes

const limpiarHorarios = (horarios) =>
  Array.isArray(horarios)
    ? horarios
        .map(({ dia, abierto, apertura, cierre }) => ({
          dia,
          abierto,
          apertura,
          cierre,
        }))
        .sort((a, b) => a.dia - b.dia)
    : horarios

// POST /api/organizaciones/:id/configuracion - Crear configuración (admin)
app.post(
  '/api/organizaciones/:id/configuracion',
  verificarToken,
  verificarAdmin,
  async (req, res) => {
    if (!esDeMiOrganizacion(req, req.params.id)) {
      return res.status(403).json({ error: 'No autorizado' })
    }

    const campos = req.body ?? {}

    if (!campos.nombreApp || !campos.lugarRetiro) {
      return res.status(400).json({
        error: 'faltan_campos',
        mensaje: 'Faltan campos obligatorios: nombreApp, lugarRetiro',
      })
    }

    const errorValidacion = validarConfiguracion(campos)
    if (errorValidacion) {
      return res
        .status(400)
        .json({ error: 'datos_invalidos', mensaje: errorValidacion })
    }

    if (!(await buscarOrganizacionPorId(req.params.id))) {
      return res.status(404).json({ error: 'Organizacion no encontrada' })
    }

    try {
      const configuracion = await crearConfiguracion(parseInt(req.params.id), {
        ...campos,
        mensajesPersonalizados: limpiarMensajes(campos.mensajesPersonalizados),
        horarios: limpiarHorarios(campos.horarios),
        // El logo solo se cambia con los endpoints de /logo, que validan el archivo.
        logo: undefined,
      })
      res.status(201).json(configuracion)
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
          error: 'configuracion_existente',
          mensaje:
            'La organización ya tiene configuración. Usá PUT para editarla.',
        })
      }
      throw err
    }
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
// Es parcial: solo se cambian los campos que vienen en el body.
app.put(
  '/api/organizaciones/:id/configuracion',
  verificarToken,
  verificarAdmin,
  async (req, res) => {
    if (!esDeMiOrganizacion(req, req.params.id)) {
      return res.status(403).json({ error: 'No autorizado' })
    }

    const campos = req.body ?? {}

    const errorValidacion = validarConfiguracion(campos)
    if (errorValidacion) {
      return res
        .status(400)
        .json({ error: 'datos_invalidos', mensaje: errorValidacion })
    }

    if (!(await buscarDatosOrganizacionPorId(req.params.id))) {
      return res.status(404).json({ error: 'Configuracion no encontrada' })
    }

    res.json(
      await actualizarConfiguracion(parseInt(req.params.id), {
        ...campos,
        mensajesPersonalizados: limpiarMensajes(campos.mensajesPersonalizados),
        horarios: limpiarHorarios(campos.horarios),
        // El logo solo se cambia con los endpoints de /logo, que validan el archivo.
        logo: undefined,
      }),
    )
  },
)

// DELETE /api/organizaciones/:id/configuracion - Borrar configuración (admin)
app.delete(
  '/api/organizaciones/:id/configuracion',
  verificarToken,
  verificarAdmin,
  async (req, res) => {
    if (!esDeMiOrganizacion(req, req.params.id)) {
      return res.status(403).json({ error: 'No autorizado' })
    }

    const configuracion = await buscarDatosOrganizacionPorId(req.params.id)
    if (!(await eliminarConfiguracion(parseInt(req.params.id)))) {
      return res.status(404).json({ error: 'Configuracion no encontrada' })
    }
    borrarArchivoLogo(configuracion?.logo)

    res.json({ mensaje: 'Configuracion eliminada' })
  },
)

// Corre antes de multer: si no tiene permiso o la organización no tiene
// configuración, se corta sin escribir nada en disco.
const puedeEditarConfiguracion = async (req, res, next) => {
  if (!esDeMiOrganizacion(req, req.params.id)) {
    return res.status(403).json({ error: 'No autorizado' })
  }
  if (!(await buscarDatosOrganizacionPorId(req.params.id))) {
    return res.status(404).json({ error: 'Configuracion no encontrada' })
  }
  next()
}

// POST /api/organizaciones/:id/configuracion/logo - Subir o reemplazar el logo (admin)
// multipart/form-data con el archivo en el campo "logo". Se guarda en el
// momento, sin pasar por el PUT de la configuración.
app.post(
  '/api/organizaciones/:id/configuracion/logo',
  verificarToken,
  verificarAdmin,
  puedeEditarConfiguracion,
  subirLogo,
  async (req, res) => {
    const anterior = await buscarDatosOrganizacionPorId(req.params.id)
    const url = `/uploads/logos/${req.file.filename}`

    try {
      const configuracion = await actualizarConfiguracion(
        parseInt(req.params.id),
        { logo: url },
      )
      borrarArchivoLogo(anterior?.logo)
      res.json(configuracion)
    } catch (err) {
      // Si no se pudo guardar la URL, el archivo queda huérfano: se borra.
      borrarArchivoLogo(url)
      throw err
    }
  },
)

// DELETE /api/organizaciones/:id/configuracion/logo - Quitar el logo (admin)
app.delete(
  '/api/organizaciones/:id/configuracion/logo',
  verificarToken,
  verificarAdmin,
  puedeEditarConfiguracion,
  async (req, res) => {
    const anterior = await buscarDatosOrganizacionPorId(req.params.id)
    const configuracion = await actualizarConfiguracion(
      parseInt(req.params.id),
      { logo: null },
    )
    borrarArchivoLogo(anterior?.logo)
    res.json(configuracion)
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
// Solo actualiza datos de perfil (nombre, apellido, teléfono y, opcionalmente,
// contraseña). El correo, el rol y la organización no se tocan acá: el
// frontend los muestra como no editables (ver Perfil.jsx) porque cambiarlos
// tiene implicancias de identidad/organización que no son parte de "editar
// mi perfil".
app.put('/api/usuarios/:id', verificarToken, async (req, res, next) => {
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

  // El frontend (perfilService.js) ya valida la confirmación de contraseña
  // en el cliente antes de llamar a este endpoint, así que acá solo llega
  // "contrasena" (sin repetir).
  const { nombre, apellido, telefono, contrasena, notificacionesActivadas } = req.body ?? {}

  if (
    typeof nombre !== 'string' || !nombre.trim() ||
    typeof apellido !== 'string' || !apellido.trim() ||
    typeof telefono !== 'string' || !telefono.trim()
  ) {
    return res.status(400).json({
      error: 'faltan_campos',
      mensaje: 'Faltan campos obligatorios: nombre, apellido, telefono',
    })
  }

  // Opcional: llega como 'TRUE'/'FALSE' (mismo formato que devuelve el GET).
  // Si no viene, se conserva el valor actual del usuario.
  const notificaciones = String(
    notificacionesActivadas ?? usuario.notificacionesActivadas,
  ).toUpperCase()
  if (!['TRUE', 'FALSE'].includes(notificaciones)) {
    return res.status(400).json({
      error: 'notificaciones_invalidas',
      mensaje: 'notificacionesActivadas debe ser TRUE o FALSE',
    })
  }

  try {
    const contrasenaHasheada = contrasena
      ? await bcrypt.hash(contrasena, 10)
      : undefined

    await actualizarUsuario({
      id: usuario.id,
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      telefono: telefono.trim(),
      contrasena: contrasenaHasheada,
      notificacionesActivadas: notificaciones === 'TRUE' ? 1 : 0,
    })

    const usuarioActualizado = await buscarUsuarioPorId(usuario.id)
    const { contrasena: _contrasena, ...usuarioSinContrasena } =
      usuarioActualizado
    res.json(usuarioSinContrasena)
  } catch (err) {
    next(err)
  }
})

// Corre antes de multer: si no tiene permiso o el usuario no existe, se
// corta sin escribir nada en disco. Mismo criterio que el resto de
// /api/usuarios/:id: el propio usuario, o un admin de su organización.
const puedeEditarFotoDe = async (req, res, next) => {
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

  req.usuarioEditado = usuario
  next()
}

// POST /api/usuarios/:id/foto - Subir/reemplazar la foto de perfil
// (el propio usuario, o admin de su organización). Tiene su propio endpoint,
// igual que el logo de organización, en vez de ir por el PUT genérico: ese
// recibe JSON, este un archivo multipart.
app.post(
  '/api/usuarios/:id/foto',
  verificarToken,
  puedeEditarFotoDe,
  subirFoto,
  async (req, res, next) => {
    const url = `/uploads/avatars/${req.file.filename}`

    try {
      await actualizarFotoUsuario(req.usuarioEditado.id, url)
      borrarArchivoFoto(req.usuarioEditado.foto)

      const usuarioActualizado = await buscarUsuarioPorId(
        req.usuarioEditado.id,
      )
      const { contrasena, ...usuarioSinContrasena } = usuarioActualizado
      res.json(usuarioSinContrasena)
    } catch (err) {
      // Si no se pudo guardar la URL, el archivo queda huérfano: se borra.
      borrarArchivoFoto(url)
      next(err)
    }
  },
)

// DELETE /api/usuarios/:id/foto - Quitar la foto de perfil (volver a iniciales)
app.delete(
  '/api/usuarios/:id/foto',
  verificarToken,
  puedeEditarFotoDe,
  async (req, res, next) => {
    try {
      await actualizarFotoUsuario(req.usuarioEditado.id, null)
      borrarArchivoFoto(req.usuarioEditado.foto)

      const usuarioActualizado = await buscarUsuarioPorId(
        req.usuarioEditado.id,
      )
      const { contrasena, ...usuarioSinContrasena } = usuarioActualizado
      res.json(usuarioSinContrasena)
    } catch (err) {
      next(err)
    }
  },
)

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

  if (usuarioElegido.activo === "INACTIVO") {
    return res.status(401).json({
      code: 'USUARIO_INACTIVO',
      message: 'El usuario no está activo',
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
app.post('/api/auth/recuperar', async (req, res, next) => {
  const { correo } = req.body ?? {}

  if (!correo || !EMAIL_VALIDO.test(correo)) {
    return res.status(400).json({ error: 'El correo no es válido' })
  }

  try {
    const usuario = await buscarUsuarioPorCorreo(correo)

    if (usuario?.contrasena) {
      notificarRecuperacionContrasena({
        idUsuario: usuario.id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        tokenRestablecer: generarTokenRestablecerContrasena(
          usuario.id,
          usuario.contrasena,
        ),
      })
    }

    res.status(200).json({
      mensaje:
        'Si el correo tiene una cuenta en Bookly, te enviamos un email para restablecer tu contraseña.',
    })
  } catch (err) {
    next(err)
  }
})

app.post('/api/auth/restablecer-contrasena', async (req, res, next) => {
  const { token, contrasena, confirmarContrasena } = req.body ?? {}

  if (!token || !contrasena || !confirmarContrasena) {
    return res.status(400).json({ error: 'Faltan token o contraseña' })
  }

  if (contrasena !== confirmarContrasena) {
    return res.status(400).json({ error: 'Las contraseñas no coinciden' })
  }

  const datosToken = verificarTokenRestablecerContrasena(token)
  if (!datosToken) {
    return res.status(401).json({ error: 'El link es inválido o ya venció' })
  }

  try {
    const [[usuario]] = await pool.query(
      'SELECT contrasena FROM usuarios WHERE id = ?',
      [datosToken.id],
    )

    if (!usuario) {
      return res.status(404).json({ error: 'La cuenta ya no existe' })
    }

    if (
      !usuario.contrasena ||
      huellaDeContrasena(usuario.contrasena) !== datosToken.huella
    ) {
      return res.status(401).json({ error: 'El link es inválido o ya venció' })
    }

    const contrasenaHasheada = await bcrypt.hash(contrasena, 10)
    await pool.query('UPDATE usuarios SET contrasena = ? WHERE id = ?', [
      contrasenaHasheada,
      datosToken.id,
    ])

    res.status(200).json({ mensaje: 'Contraseña actualizada' })
  } catch (err) {
    next(err)
  }
})

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

// Acepta uno o varios géneros (array o string suelto) y devuelve solo los
// no vacíos, ya sin espacios sobrantes.
function normalizarGeneros(valor) {
  const lista = Array.isArray(valor) ? valor : [valor]
  return lista
    .filter((g) => typeof g === 'string')
    .map((g) => g.trim())
    .filter(Boolean)
}

// POST /api/libros - Crear un nuevo libro (admin)
app.post(
  '/api/libros',
  verificarToken,
  verificarAdmin,
  async (req, res, next) => {
    const {
      titulo,
      autor,
      generos,
      editorial,
      idioma,
      isbn,
      fecha_pub,
      resumen,
      portada,
      stock,
    } = req.body ?? {}

    const listaGeneros = normalizarGeneros(generos)
    if (!titulo || !autor || listaGeneros.length === 0) {
      return res.status(400).json({
        error: 'faltan_campos',
        mensaje: 'Faltan campos obligatorios: titulo, autor, generos',
      })
    }

    try {
      const [resultado] = await pool.query(
        `INSERT INTO libros
         (id_organizacion, titulo, autor, generos, editorial, idioma, isbn, fecha_pub, resumen, portada, stock)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          req.usuario.organizacionId,
          titulo,
          autor,
          JSON.stringify(listaGeneros),
          editorial ?? null,
          idioma ?? null,
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
    const { busqueda, generos } = req.query
    let sql = `
      SELECT l.id, l.titulo, l.autor, l.generos, l.editorial, l.idioma, l.isbn, l.fecha_pub,
             l.resumen, l.portada, l.fecha_creacion, l.stock,
             l.stock - COALESCE(p.activos, 0) AS disponibles,
             ROUND(COALESCE(r.promedio, 0), 2) AS promedio_estrellas,
             COALESCE(r.total, 0) AS total_resenas
      FROM libros l
      LEFT JOIN (SELECT id_libro, COUNT(*) AS activos FROM prestamos
                 WHERE estado IN ('pendiente_retiro','activo','atrasado')
                 GROUP BY id_libro) p ON p.id_libro = l.id
      LEFT JOIN (SELECT id_libro, AVG(calificacion) AS promedio, COUNT(*) AS total FROM resenas
                 GROUP BY id_libro) r ON r.id_libro = l.id
      WHERE l.id_organizacion = ? AND l.eliminado = FALSE`
    const params = [req.usuario.organizacionId]

    if (busqueda) {
      sql += ' AND (l.titulo LIKE ? OR l.autor LIKE ?)'
      params.push(`%${busqueda}%`, `%${busqueda}%`)
    }
    const filtroGeneros = normalizarGeneros(generos)
    if (filtroGeneros.length > 0) {
      sql += ' AND JSON_OVERLAPS(l.generos, CAST(? AS JSON))'
      params.push(JSON.stringify(filtroGeneros))
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
      `SELECT l.id, l.titulo, l.autor, l.generos, l.editorial, l.idioma, l.isbn, l.fecha_pub,
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
       WHERE l.id = ? AND l.id_organizacion = ? AND l.eliminado = FALSE`,
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

  if (comentario.trim().length < 50) {
    return res.status(400).json({
      error: 'conflicto',
      mensaje: 'El comentario debe tener al menos 50 caracteres.',
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
      generos,
      editorial,
      idioma,
      isbn,
      fecha_pub,
      resumen,
      portada,
      stock,
    } = req.body ?? {}

    const listaGeneros = normalizarGeneros(generos)
    if (!titulo || !autor || listaGeneros.length === 0) {
      return res.status(400).json({
        error: 'faltan_campos',
        mensaje: 'Faltan campos obligatorios: titulo, autor, generos',
      })
    }

    try {
      const [resultado] = await pool.query(
        `UPDATE libros
       SET titulo = ?, autor = ?, generos = ?, editorial = ?, idioma = ?, isbn = ?, fecha_pub = ?,
           resumen = ?, portada = ?, stock = ?
       WHERE id = ? AND id_organizacion = ? AND eliminado = FALSE`,
        [
          titulo,
          autor,
          JSON.stringify(listaGeneros),
          editorial ?? null,
          idioma ?? null,
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
      // Borrado lógico: la fila queda para no perder el historial de
      // préstamos. Solo se permite si ningún préstamo sigue en curso
      // (todos devueltos o cancelados, o ninguno).
      const [resultado] = await pool.query(
        `UPDATE libros
        SET eliminado = TRUE
        WHERE id = ?
          AND id_organizacion = ?
          AND eliminado = FALSE
          AND NOT EXISTS (
            SELECT 1
            FROM prestamos p
            WHERE p.id_libro = libros.id
              AND p.estado NOT IN ('devuelto', 'cancelado')
          )`,
        [req.params.id, req.usuario.organizacionId],
      )

      if (resultado.affectedRows === 0) {
        const [[libro]] = await pool.query(
          'SELECT 1 FROM libros WHERE id = ? AND id_organizacion = ? AND eliminado = FALSE',
          [req.params.id, req.usuario.organizacionId],
        )

        if (libro) {
          return res.status(409).json({
            error: 'libro_con_prestamos',
            mensaje:
              'No se puede eliminar: el libro tiene préstamos pendientes de retiro, activos o atrasados.',
          })
        }

        return res
          .status(404)
          .json({ error: 'no_encontrado', mensaje: 'Libro no encontrado' })
      }

      res.status(200).json({ mensaje: 'Libro eliminado' })
    } catch (err) {
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

async function buscarPrestamoParaTabla(prestamoId, organizacionId) {
  const [[prestamo]] = await pool.query(
    `SELECT p.id, p.id_libro, p.id_usuario, u.nombre AS nombre_usuario, p.fecha_prestamo, p.fecha_devolucion_esperada, p.fecha_devolucion_real,
            p.extensiones_realizadas, p.lugar_retiro, p.estado,
            l.titulo, l.autor, l.portada, c.max_extensiones
     FROM prestamos p
     JOIN libros l ON l.id = p.id_libro
     JOIN usuarios u ON u.id = p.id_usuario
     LEFT JOIN configuraciones c ON c.id_organizacion = p.id_organizacion
     WHERE p.id = ? AND p.id_organizacion = ?`,
    [prestamoId, organizacionId],
  )
  return prestamo
}

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

      const prestamoActualizado = await buscarPrestamoParaTabla(
        prestamoId,
        organizacionId,
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

      res.json(prestamoActualizado)
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

const MAX_PRESTAMOS_ACTIVOS = 5

// POST /api/prestamos - Crear un nuevo préstamo (cualquier usuario autenticado)
app.post('/api/prestamos', verificarToken, async (req, res, next) => {
  try {
    const { libroId } = req.body
    // El usuario sale del token, no del body: si no, cualquiera podría
    // pedir préstamos a nombre de otro.
    const usuarioId = req.usuario.id

    const [[libro]] = await pool.query(
      'SELECT 1 FROM libros WHERE id = ? AND id_organizacion = ? AND eliminado = FALSE',
      [libroId, req.usuario.organizacionId],
    )
    if (!libro) {
      return res
        .status(404)
        .json({ error: 'no_encontrado', mensaje: 'Libro no encontrado' })
    }

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

    const [[{ activos }]] = await pool.query(
      `SELECT COUNT(*) AS activos FROM prestamos
       WHERE id_usuario = ?
         AND estado IN ('pendiente_retiro','activo','atrasado')`,
      [usuarioId],
    )
    if (activos >= MAX_PRESTAMOS_ACTIVOS) {
      return res.status(409).json({
        error: 'limite_prestamos',
        mensaje: `Ya tenés ${MAX_PRESTAMOS_ACTIVOS} libros prestados, que es el máximo. Devolvé alguno para pedir otro.`,
      })
    }

    // El plazo y el lugar de retiro son configurables por organización
    // (tabla configuraciones), por eso no se reciben del cliente: se buscan acá.
    const [[configuracion]] = await pool.query(
      `SELECT dias_prestamo, lugar_retiro, lugar_devolucion, horarios,
              permite_extension, max_extensiones, dias_extension
       FROM configuraciones WHERE id_organizacion = ?`,
      [req.usuario.organizacionId],
    )
    const diasPrestamo = configuracion?.dias_prestamo ?? 30
    const lugarRetiro = configuracion?.lugar_retiro ?? null
    // Si el día que se cumple el plazo la organización está cerrada, la
    // devolución pasa al próximo día abierto, hasta la hora de cierre.
    const { fecha: fechaDevolucionEsperada, horario: horarioDevolucion } =
      calcularDevolucion(new Date(), diasPrestamo, configuracion?.horarios)

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

    res.status(201).json({
      id: resultado.insertId,
      fecha_devolucion_esperada: fechaDevolucionEsperada,
      // { dia, apertura, cierre } del día de devolución; null si la
      // organización no configuró horarios.
      horario_devolucion: horarioDevolucion,
      lugar_retiro: lugarRetiro,
      // NULL en configuraciones = se devuelve donde se retiró.
      lugar_devolucion: configuracion?.lugar_devolucion ?? lugarRetiro,
      dias_prestamo: diasPrestamo,
      // Semana completa, para que el front calcule cuándo se puede retirar.
      horarios: configuracion?.horarios ?? null,
      permite_extension: configuracion
        ? !!configuracion.permite_extension
        : false,
      max_extensiones: configuracion?.max_extensiones ?? 0,
      dias_extension: configuracion?.dias_extension ?? null,
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/prestamos/:id - Ver un préstamo específico (admin)
app.get('/api/prestamos/:id', verificarToken, verificarAdmin, sinImplementar)

// PATCH /api/prestamos/:id/devolver - Marcar préstamo como devuelto (admin)
app.patch(
  '/api/prestamos/:id/devolver',
  verificarToken,
  verificarAdmin,
  async (req, res, next) => {
    try {
      const prestamoId = req.params.id
      const organizacionId = req.usuario.organizacionId

      const [resultado] = await pool.query(
        `UPDATE prestamos SET estado = 'devuelto', fecha_devolucion_real = NOW()
         WHERE id = ? AND id_organizacion = ? AND estado IN ('activo','atrasado')`,
        [prestamoId, organizacionId],
      )

      const prestamoActualizado = await buscarPrestamoParaTabla(
        prestamoId,
        organizacionId,
      )

      if (!prestamoActualizado) {
        return res
          .status(404)
          .json({ error: 'no_encontrado', mensaje: 'Préstamo no encontrado' })
      }

      if (resultado.affectedRows === 0) {
        return res.status(409).json({
          error: 'no_disponible',
          mensaje:
            prestamoActualizado.estado === 'pendiente_retiro'
              ? 'El libro todavía no se retiró: el préstamo se cancela, no se devuelve.'
              : 'El préstamo ya no está activo.',
        })
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

app.patch(
  '/api/prestamos/:id/cancelar',
  verificarToken,
  async (req, res, next) => {
    try {
      const prestamoId = req.params.id
      const organizacionId = req.usuario.organizacionId
      const esAdmin = req.usuario.rol === 'admin'

      let sql = `UPDATE prestamos SET estado = 'cancelado'
                 WHERE id = ? AND id_organizacion = ? AND estado = 'pendiente_retiro'`
      const params = [prestamoId, organizacionId]
      if (!esAdmin) {
        sql += ' AND id_usuario = ?'
        params.push(req.usuario.id)
      }
      const [resultado] = await pool.query(sql, params)

      const prestamoActualizado = await buscarPrestamoParaTabla(
        prestamoId,
        organizacionId,
      )

      if (
        !prestamoActualizado ||
        (!esAdmin && prestamoActualizado.id_usuario !== req.usuario.id)
      ) {
        return res
          .status(404)
          .json({ error: 'no_encontrado', mensaje: 'Préstamo no encontrado' })
      }

      if (resultado.affectedRows === 0) {
        return res.status(409).json({
          error: 'no_cancelable',
          mensaje: 'Solo se puede cancelar un préstamo antes del retiro.',
        })
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

// Largo máximo de la descripción de un reporte y del comentario con que
// Soporte lo resuelve. El frontend usa el mismo límite en los textarea.
const MAX_CARACTERES_REPORTE = 500

// Qué secciones puede elegir cada rol al reportar. El super-admin las ve
// todas, para poder filtrar los reportes en Soporte.
const FILTRO_SECCIONES_POR_ROL = {
  lector: 'AND para_lector = 1',
  admin: 'AND para_admin = 1',
  'super-admin': '',
}

const verificarPuedeReportar = (req, res, next) => {
  if (!ROLES_QUE_REPORTAN.includes(req.usuario.rol)) {
    return res.status(403).json({
      error: 'sin_permiso',
      mensaje: 'Tu rol no puede enviar reportes.',
    })
  }
  next()
}

// GET /api/secciones - Secciones para el selector, según el rol de quien pide
app.get('/api/secciones', verificarToken, async (req, res, next) => {
  const filtro = FILTRO_SECCIONES_POR_ROL[req.usuario.rol]

  if (filtro === undefined) {
    return res.status(403).json({
      error: 'sin_permiso',
      mensaje: 'Tu rol no tiene secciones para reportar.',
    })
  }

  try {
    const [secciones] = await pool.query(
      `SELECT id, nombre FROM secciones WHERE activo = 1 ${filtro} ORDER BY orden, nombre`,
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

    if (descripcion.trim().length > MAX_CARACTERES_REPORTE) {
      return res.status(400).json({
        error: 'texto_largo',
        mensaje: `La descripción puede tener hasta ${MAX_CARACTERES_REPORTE} caracteres.`,
      })
    }

    try {
      const [[seccion]] = await pool.query(
        `SELECT id FROM secciones WHERE id = ? AND activo = 1 ${FILTRO_SECCIONES_POR_ROL[req.usuario.rol]}`,
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
   SOPORTE (super admin)
   ============================================================ */

// Consulta base de los reportes para Soporte, con quién lo reportó,
// quién lo tomó y quién lo resolvió.
const CONSULTA_REPORTES_SOPORTE = `
  SELECT r.id, r.id_seccion, r.descripcion, r.estado, r.fecha_reporte,
         CONCAT_WS(' ', u.nombre, u.apellido) AS usuario,
         u.rol AS rol_usuario,
         o.nombre AS organizacion,
         s.nombre AS seccion,
         IF(ut.id IS NULL, NULL, CONCAT_WS(' ', ut.nombre, ut.apellido)) AS tomado_por,
         r.fecha_tomado,
         IF(ur.id IS NULL, NULL, CONCAT_WS(' ', ur.nombre, ur.apellido)) AS resuelto_por,
         r.fecha_resuelto,
         r.comentario_resolucion
  FROM reportes_problemas r
  JOIN usuarios u ON u.id = r.id_usuario
  JOIN organizaciones o ON o.id = r.id_organizacion
  LEFT JOIN secciones s ON s.id = r.id_seccion
  LEFT JOIN usuarios ut ON ut.id = r.id_tomado_por
  LEFT JOIN usuarios ur ON ur.id = r.id_resuelto_por`

// El rol viene como está en la DB (admin_organizacion): se pasa al nombre
// que usa la app (admin), igual que en repos.js.
const reporteSoporteDeDB = (fila) => ({
  ...fila,
  rol_usuario: ROL_DB_A_APP[fila.rol_usuario] ?? fila.rol_usuario,
})

// GET /api/soporte/reportes - Todos los reportes de todas las organizaciones
app.get(
  '/api/soporte/reportes',
  verificarToken,
  verificarSuperAdmin,
  async (req, res, next) => {
    try {
      const [reportes] = await pool.query(
        `${CONSULTA_REPORTES_SOPORTE} ORDER BY r.fecha_reporte DESC, r.id DESC`,
      )
      res.json(reportes.map(reporteSoporteDeDB))
    } catch (err) {
      next(err)
    }
  },
)

// PATCH /api/soporte/reportes/:id/estado - Tomar o resolver un reporte
//   { estado: 'en_revision' }                → "Tomar": solo si está abierto
//   { estado: 'resuelto', comentario: '...' } → "Resolver": solo si está en curso
// El UPDATE incluye el estado anterior en el WHERE: si dos super admins
// tocan el mismo reporte a la vez, solo el primero lo cambia.
app.patch(
  '/api/soporte/reportes/:id/estado',
  verificarToken,
  verificarSuperAdmin,
  async (req, res, next) => {
    const { estado, comentario } = req.body ?? {}
    const id = Number(req.params.id)

    if (!['en_revision', 'resuelto'].includes(estado)) {
      return res.status(400).json({
        error: 'estado_invalido',
        mensaje: 'El estado tiene que ser en_revision o resuelto.',
      })
    }

    const comentarioLimpio =
      typeof comentario === 'string' ? comentario.trim() : ''

    if (estado === 'resuelto' && !comentarioLimpio) {
      return res.status(400).json({
        error: 'campos_vacios',
        mensaje: 'Contanos qué se hizo para resolverlo.',
      })
    }

    if (comentarioLimpio.length > MAX_CARACTERES_REPORTE) {
      return res.status(400).json({
        error: 'texto_largo',
        mensaje: `El comentario puede tener hasta ${MAX_CARACTERES_REPORTE} caracteres.`,
      })
    }

    try {
      const [resultado] =
        estado === 'en_revision'
          ? await pool.query(
              `UPDATE reportes_problemas
               SET estado = 'en_revision', id_tomado_por = ?, fecha_tomado = NOW()
               WHERE id = ? AND estado = 'abierto'`,
              [req.usuario.id, id],
            )
          : await pool.query(
              `UPDATE reportes_problemas
               SET estado = 'resuelto', id_resuelto_por = ?, fecha_resuelto = NOW(),
                   comentario_resolucion = ?
               WHERE id = ? AND estado = 'en_revision'`,
              [req.usuario.id, comentarioLimpio, id],
            )

      if (resultado.affectedRows === 0) {
        const [[existe]] = await pool.query(
          'SELECT id FROM reportes_problemas WHERE id = ?',
          [id],
        )
        if (!existe) {
          return res
            .status(404)
            .json({ error: 'no_encontrado', mensaje: 'Reporte no encontrado.' })
        }
        return res.status(409).json({
          error: 'conflicto',
          mensaje:
            estado === 'en_revision'
              ? 'Este reporte ya lo tomó otra persona.'
              : 'Este reporte no está en curso: hay que tomarlo antes de resolverlo.',
        })
      }

      const [[actualizado]] = await pool.query(
        `${CONSULTA_REPORTES_SOPORTE} WHERE r.id = ?`,
        [id],
      )
      res.json(reporteSoporteDeDB(actualizado))
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
