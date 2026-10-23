// services/notificaciones.js
//
// Punto único donde vive la lógica de "qué se avisa y a quién" (RF de
// notificaciones). Cada función arma el mensaje, lo guarda en la tabla
// notificaciones (para que se vea también dentro del sistema) y dispara
// el email correspondiente.
import { pool } from '../db.js'
import { enviarEmail } from './email.js'
import { escaparHtml } from './escaparHtml.js'
import { plantillaEmail } from './plantillaEmail.js'

// ---------------------------------------------------------------------------
// Piezas reutilizables para los avisos de préstamos (nuevo, devuelto,
// vencido...). Cada aviso concreto solo decide los textos y a quién va.
// ---------------------------------------------------------------------------

/**
 * Trae lo que casi todo aviso de préstamo necesita: el título del libro,
 * el usuario que lo pidió y los admins de la organización.
 */
async function obtenerDatosPrestamo({
  idLibro,
  idPrestamo,
  idUsuario,
  idOrganizacion,
}) {
  const [[[libro]], [[usuario]], [admins], [[prestamo]]] = await Promise.all([
    pool.query('SELECT titulo FROM libros WHERE id = ?', [idLibro]),
    pool.query('SELECT nombre, email FROM usuarios WHERE id = ?', [idUsuario]),
    pool.query(
      "SELECT id, email FROM usuarios WHERE id_organizacion = ? AND rol = 'admin_organizacion'",
      [idOrganizacion],
    ),
    pool.query(
      'SELECT id, fecha_devolucion_esperada, extensiones_realizadas FROM prestamos WHERE id = ? AND id_organizacion = ?',
      [idPrestamo, idOrganizacion],
    ),
  ])

  return {
    tituloLibro: libro?.titulo ?? 'un libro',
    usuario,
    admins,
    prestamo,
  }
}

/**
 * Guarda la notificación en la tabla (estado 'pendiente') y devuelve el
 * envío listo para pasarle a procesarEnvios.
 */
async function crearEnvio({
  idUsuario,
  idPrestamo,
  tipo,
  mensaje,
  para,
  asunto,
  titulo,
  html,
}) {
  const [resultado] = await pool.query(
    `INSERT INTO notificaciones (id_usuario, id_prestamo, tipo, canal, mensaje, estado)
     VALUES (?, ?, ?, 'email', ?, 'pendiente')`,
    [idUsuario, idPrestamo, tipo, mensaje],
  )

  return {
    idNotificacion: resultado.insertId,
    para,
    asunto,
    html: html ?? plantillaEmail({ titulo, cuerpo: escaparHtml(mensaje) }),
  }
}

/**
 * Manda todos los emails en paralelo y, cuando termina cada uno, deja
 * asentado en su fila si salió o no.
 */
async function procesarEnvios(envios) {
  const resultados = await Promise.allSettled(
    envios.map((envio) =>
      enviarEmail({ para: envio.para, asunto: envio.asunto, html: envio.html }),
    ),
  )

  await Promise.all(
    resultados.map((resultado, i) => {
      const { idNotificacion } = envios[i]

      if (resultado.status === 'fulfilled' && resultado.value.ok) {
        return pool.query(
          "UPDATE notificaciones SET estado = 'enviado', enviado_en = NOW() WHERE id = ?",
          [idNotificacion],
        )
      }

      // enviarEmail no debería rechazar nunca (devuelve { ok: false }),
      // pero por las dudas también se cubre el caso 'rejected'.
      const mensajeError =
        resultado.status === 'fulfilled'
          ? resultado.value.error
          : String(resultado.reason?.message ?? resultado.reason)
      return pool.query(
        "UPDATE notificaciones SET estado = 'error', error = ? WHERE id = ?",
        [mensajeError, idNotificacion],
      )
    }),
  )
}

/**
 * Dispara procesarEnvios sin esperarlo: si Brevo tarda, no tiene que
 * demorar la respuesta del endpoint. El "void" deja claro que es a
 * propósito, y el .catch hace que ningún error quede sin manejar.
 */
function procesarEnviosEnSegundoPlano(envios, idPrestamo) {
  void procesarEnvios(envios).catch((err) => {
    console.error(
      '[notificaciones] error al procesar los envíos del préstamo',
      idPrestamo,
      '->',
      err,
    )
  })
}

/**
 * Se dispara al crear un préstamo: avisa a los admins de la organización
 * de que un usuario pidió un libro, para que lo tengan pendiente de entrega.
 */
export async function notificarExtensionPrestamo({
  idPrestamo,
  idLibro,
  idUsuario,
  idOrganizacion,
}) {
  const { tituloLibro, usuario, admins, prestamo } = await obtenerDatosPrestamo(
    { idLibro, idPrestamo, idUsuario, idOrganizacion },
  )

  const mensajeParaAdmin = `${usuario?.nombre ?? 'Un usuario'} solicitó la extensión del préstamo de "${tituloLibro}" y la fecha de devolucion es el ${prestamo?.fecha_devolucion_esperada?.toLocaleDateString() ?? 'fecha no disponible'}.`
  const mensajeParaSolicitante = `Registramos tu solicitud de extensión del préstamo de "${tituloLibro}". Se extendió hasta el ${prestamo?.fecha_devolucion_esperada?.toLocaleDateString() ?? 'fecha no disponible consulta con el administrador de tu institución'}.`

  const envios = []

  for (const admin of admins) {
    envios.push(
      await crearEnvio({
        idUsuario: admin.id,
        idPrestamo,
        tipo: 'extension_prestamo',
        mensaje: mensajeParaAdmin,
        para: admin.email,
        asunto: 'Extensión de préstamo',
        titulo: 'Extensión de préstamo',
      }),
    )
  }

  if (usuario?.email) {
    envios.push(
      await crearEnvio({
        idUsuario,
        idPrestamo,
        tipo: 'extension_prestamo',
        mensaje: mensajeParaSolicitante,
        para: usuario.email,
        asunto: 'Extensión de préstamo',
        titulo: 'Extensión de préstamo',
      }),
    )
  }

  procesarEnviosEnSegundoPlano(envios, idPrestamo)
}

export async function notificarRetiroLibro({
  idPrestamo,
  idLibro,
  idUsuario,
  idOrganizacion,
}) {
  const { tituloLibro, usuario, prestamo } = await obtenerDatosPrestamo({
    idLibro,
    idPrestamo,
    idUsuario,
    idOrganizacion,
  })

  const fechaLimite = prestamo?.fecha_devolucion_esperada
    ? new Date(prestamo.fecha_devolucion_esperada).toLocaleDateString()
    : null

  const textoFecha = fechaLimite
    ? `Recordá devolverlo antes del ${fechaLimite}.`
    : 'No pudimos obtener la fecha de devolución, consultá con el administrador de tu institución.'

  const mensajeParaSolicitante = `Ya registramos el retiro de "${tituloLibro}". ${textoFecha}`

  const tituloEscapado = escaparHtml(tituloLibro)
  const cuerpoHtml = `
    Un/a administrador/a de tu organización confirmó el retiro de "${tituloEscapado}".
    <br /><br />
    ${escaparHtml(textoFecha)}
    <br /><br />
    Esperamos que lo disfrutes y no olvides dejar una reseña al devolverlo.
  `

  const envios = []

  if (usuario?.email) {
    envios.push(
      await crearEnvio({
        idUsuario,
        idPrestamo,
        tipo: 'retiro_libro',
        mensaje: mensajeParaSolicitante,
        html: plantillaEmail({ titulo: 'Retiro de libro', cuerpo: cuerpoHtml }),
        para: usuario.email,
        asunto: 'Retiro de libro registrado',
      }),
    )
  }

  procesarEnviosEnSegundoPlano(envios, idPrestamo)
}

export async function notificarDevolucionPrestamo({
  idPrestamo,
  idLibro,
  idUsuario,
  idOrganizacion,
}) {
  const { tituloLibro, usuario } = await obtenerDatosPrestamo({
    idLibro,
    idPrestamo,
    idUsuario,
    idOrganizacion,
  })
  const link = `${process.env.FRONTEND_URL}/libro/${idLibro}`

  const mensajeParaSolicitante = `Un/a administrador de tu organización confirmó la devolución de "${tituloLibro}". Ingresá a ${link} para dejar tu reseña.`

  const tituloEscapado = escaparHtml(tituloLibro)
  const cuerpoHtml = `
    Un/a administrador de tu organización confirmó la devolución de "${tituloEscapado}".
    <br /><br />
    Ingresando al siguiente link, podés dejar tu valoración del mismo.
    <br /><br />
    <a href="${link}" style="display:inline-block; background-color:#12A594; color:#FFFFFF; text-decoration:none; padding:12px 24px; border-radius:8px; font-weight:bold;">Dejar una reseña</a>
    <br /><br />
    Si el botón no funciona, copiá este link en el navegador:<br />
    <span style="color:#8595A6; font-size:13px;">${link}</span>
  `

  const envios = []

  if (usuario?.email) {
    envios.push(
      await crearEnvio({
        idUsuario,
        idPrestamo,
        tipo: 'devolucion_libro',
        mensaje: mensajeParaSolicitante,
        html: plantillaEmail({
          titulo: 'Devolucion de libro',
          cuerpo: cuerpoHtml,
        }),
        para: usuario.email,
        asunto: 'Devolucion de libro',
      }),
    )
  }

  procesarEnviosEnSegundoPlano(envios, idPrestamo)
}

/**
 * Se dispara al crear un préstamo: avisa a los admins de la organización
 * de que un usuario pidió un libro, para que lo tengan pendiente de entrega.
 */
export async function notificarNuevoPrestamo({
  idPrestamo,
  idLibro,
  idUsuario,
  idOrganizacion,
}) {
  const { tituloLibro, usuario, admins } = await obtenerDatosPrestamo({
    idLibro,
    idUsuario,
    idPrestamo,
    idOrganizacion,
  })

  const mensajeParaAdmin = `${usuario?.nombre ?? 'Un usuario'} solicitó el préstamo de "${tituloLibro}".`
  const mensajeParaSolicitante = `Registramos tu solicitud de préstamo de "${tituloLibro}". Te avisamos por acá cuando esté listo para retirar.`

  const envios = []

  for (const admin of admins) {
    envios.push(
      await crearEnvio({
        idUsuario: admin.id,
        idPrestamo,
        tipo: 'nuevo_prestamo',
        mensaje: mensajeParaAdmin,
        para: admin.email,
        asunto: 'Nuevo préstamo solicitado',
        titulo: 'Nuevo préstamo solicitado',
      }),
    )
  }

  // El solicitante también es parte del RF de notificaciones ("al generar
  // un préstamo"): además del aviso al admin para que prepare el libro,
  // el usuario recibe la confirmación de que su pedido quedó registrado.
  if (usuario?.email) {
    envios.push(
      await crearEnvio({
        idUsuario,
        idPrestamo,
        tipo: 'nuevo_prestamo',
        mensaje: mensajeParaSolicitante,
        para: usuario.email,
        asunto: 'Confirmamos tu solicitud de préstamo',
        titulo: 'Confirmamos tu solicitud',
      }),
    )
  }

  procesarEnviosEnSegundoPlano(envios, idPrestamo)
}

/**
 * Se dispara cuando un admin da de alta a un usuario invitado (sin
 * contraseña todavía): le manda el link para que la cree.
 *
 * A diferencia del aviso de préstamo, acá el envío SÍ se espera y, si
 * falla, se lanza un error: sin este email el invitado no tiene forma de
 * crear su contraseña y entrar al sistema.
 *
 * No inserta fila en la tabla `notificaciones`: ese ENUM (`tipo`) está
 * pensado para avisos de la actividad de biblioteca (préstamos, vencimientos),
 * no para el alta de la cuenta, así que forzar un valor ahí sería una
 * decisión de diseño nueva y no una que ya esté tomada.
 */
export async function notificarInvitacion({ nombre, correo, tokenInvitacion }) {
  const link = `${process.env.FRONTEND_URL}/crear-contrasena?token=${tokenInvitacion}`
  const cuerpo = `
    Hola ${escaparHtml(nombre)}, te invitaron a Bookly. Hacé clic en el botón para crear tu contraseña y activar tu cuenta.
    <br /><br />
    <a href="${link}" style="display:inline-block; background-color:#12A594; color:#FFFFFF; text-decoration:none; padding:12px 24px; border-radius:8px; font-weight:bold;">Crear mi contraseña</a>
    <br /><br />
    Si el botón no funciona, copiá este link en el navegador:<br />
    <span style="color:#8595A6; font-size:13px;">${link}</span>
  `

  const resultado = await enviarEmail({
    para: correo,
    asunto: 'Te invitaron a Bookly',
    html: plantillaEmail({ titulo: 'Creá tu contraseña', cuerpo }),
  })

  if (!resultado.ok) {
    throw new Error(
      `No se pudo enviar el email de invitación: ${resultado.error}`,
    )
  }
}

/**
 * Se dispara cuando alguien se registra (POST /api/auth/register): la
 * cuenta se crea sin contraseña y este email trae el link para crearla.
 * Abrir ese link es lo que valida que el correo es de quien se registró.
 *
 * Igual que notificarInvitacion, el envío SÍ se espera y, si falla, se
 * lanza un error con code 'EMAIL_NO_ENVIADO': sin este email la persona no
 * tiene forma de crear su contraseña, así que el registro tiene que
 * deshacerse para que pueda volver a intentarlo.
 *
 * No inserta fila en `notificaciones`: el ENUM `tipo` es para avisos de
 * actividad de biblioteca.
 */
export async function notificarRegistro({
  nombre,
  correo,
  tokenCrearContrasena,
}) {
  // El link lo arma el propio código (FRONTEND_URL + token), no viene del
  // usuario, por eso no se escapa. Va a la misma página que la invitación.
  const link = `${process.env.FRONTEND_URL}/crear-contrasena?token=${tokenCrearContrasena}`
  const cuerpo = `
    Hola ${escaparHtml(nombre)}, gracias por registrarte en Bookly. Hacé clic en el botón para validar tu correo y crear tu contraseña.
    <br /><br />
    <a href="${link}" style="display:inline-block; background-color:#12A594; color:#FFFFFF; text-decoration:none; padding:12px 24px; border-radius:8px; font-weight:bold;">Crear mi contraseña</a>
    <br /><br />
    El link vence en 24 horas. Si el botón no funciona, copiá este link en el navegador:<br />
    <span style="color:#8595A6; font-size:13px;">${link}</span>
  `

  const resultado = await enviarEmail({
    para: correo,
    asunto: 'Validá tu correo en Bookly',
    html: plantillaEmail({ titulo: 'Validá tu correo', cuerpo }),
  })

  if (!resultado.ok) {
    const error = new Error(
      `No se pudo enviar el email de registro: ${resultado.error}`,
    )
    error.code = 'EMAIL_NO_ENVIADO'
    throw error
  }
}

export function notificarRecuperacionContrasena({
  idUsuario,
  nombre,
  correo,
  tokenRestablecer,
}) {
  const link = `${process.env.FRONTEND_URL}/restablecer-contrasena?token=${tokenRestablecer}`
  const cuerpo = `
    Hola ${escaparHtml(nombre)}, recibimos un pedido para restablecer la contraseña de tu cuenta de Bookly. Hacé clic en el botón para elegir una nueva.
    <br /><br />
    <a href="${link}" style="display:inline-block; background-color:#12A594; color:#FFFFFF; text-decoration:none; padding:12px 24px; border-radius:8px; font-weight:bold;">Restablecer mi contraseña</a>
    <br /><br />
    El link vence en 1 hora y sirve una sola vez. Si no fuiste vos, ignorá este email: tu contraseña no cambia.
    <br /><br />
    Si el botón no funciona, copiá este link en el navegador:<br />
    <span style="color:#8595A6; font-size:13px;">${link}</span>
  `

  void enviarEmail({
    para: correo,
    asunto: 'Restablecé tu contraseña de Bookly',
    html: plantillaEmail({ titulo: 'Restablecé tu contraseña', cuerpo }),
  }).catch((err) => {
    console.error(
      '[notificaciones] error al enviar la recuperación de contraseña del usuario',
      idUsuario,
      '->',
      err,
    )
  })
}
