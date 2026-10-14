// services/notificaciones.js
//
// Punto único donde vive la lógica de "qué se avisa y a quién" (RF de
// notificaciones). Cada función arma el mensaje, lo guarda en la tabla
// notificaciones (para que se vea también dentro del sistema) y dispara
// el email correspondiente.
import { pool } from '../db.js';
import { enviarEmail } from './email.js';
import { escaparHtml } from './escaparHtml.js';
import { plantillaEmail } from './plantillaEmail.js';

/**
 * Se dispara al crear un préstamo: avisa a los admins de la organización
 * de que un usuario pidió un libro, para que lo tengan pendiente de entrega.
 */
export async function notificarNuevoPrestamo({ idPrestamo, idLibro, idUsuario, idOrganizacion }) {
  const [
    [[libro]],
    [[usuario]],
    [admins]
  ] = await Promise.all([
    pool.query('SELECT titulo FROM libros WHERE id = ?', [idLibro]),
    pool.query('SELECT nombre, email FROM usuarios WHERE id = ?', [idUsuario]),
    pool.query("SELECT id, email FROM usuarios WHERE id_organizacion = ? AND rol = 'admin_organizacion'", [idOrganizacion])
  ]);

  const tituloLibro = libro?.titulo ?? 'un libro';
  const mensajeParaAdmin = `${usuario?.nombre ?? 'Un usuario'} solicitó el préstamo de "${tituloLibro}".`;
  const mensajeParaSolicitante = `Registramos tu solicitud de préstamo de "${tituloLibro}". Te avisamos por acá cuando esté listo para retirar.`;

  const envios = [];

  for (const admin of admins) {
    const [resultado] = await pool.query(
      `INSERT INTO notificaciones (id_usuario, id_prestamo, tipo, canal, mensaje, estado)
       VALUES (?, ?, 'nuevo_prestamo', 'email', ?, 'pendiente')`,
      [admin.id, idPrestamo, mensajeParaAdmin]
    );

    envios.push({
      idNotificacion: resultado.insertId,
      para: admin.email,
      asunto: 'Nuevo préstamo solicitado',
      html: plantillaEmail({ titulo: 'Nuevo préstamo solicitado', cuerpo: escaparHtml(mensajeParaAdmin) }),
    });
  }

  // El solicitante también es parte del RF de notificaciones ("al generar
  // un préstamo"): además del aviso al admin para que prepare el libro,
  // el usuario recibe la confirmación de que su pedido quedó registrado.
  if (usuario?.email) {
    const [resultado] = await pool.query(
      `INSERT INTO notificaciones (id_usuario, id_prestamo, tipo, canal, mensaje, estado)
       VALUES (?, ?, 'nuevo_prestamo', 'email', ?, 'pendiente')`,
      [idUsuario, idPrestamo, mensajeParaSolicitante]
    );

    envios.push({
      idNotificacion: resultado.insertId,
      para: usuario.email,
      asunto: 'Confirmamos tu solicitud de préstamo',
      html: plantillaEmail({ titulo: 'Confirmamos tu solicitud', cuerpo: escaparHtml(mensajeParaSolicitante) }),
    });
  }

  // Manda todos los emails en paralelo y, cuando termina cada uno, deja
  // asentado en su fila si salió o no.
  async function procesarEnvios() {
    const resultados = await Promise.allSettled(
      envios.map((envio) => enviarEmail({ para: envio.para, asunto: envio.asunto, html: envio.html }))
    );

    await Promise.all(
      resultados.map((resultado, i) => {
        const { idNotificacion } = envios[i];

        if (resultado.status === 'fulfilled' && resultado.value.ok) {
          return pool.query(
            "UPDATE notificaciones SET estado = 'enviado', enviado_en = NOW() WHERE id = ?",
            [idNotificacion]
          );
        }

        // enviarEmail no debería rechazar nunca (devuelve { ok: false }),
        // pero por las dudas también se cubre el caso 'rejected'.
        const mensajeError =
          resultado.status === 'fulfilled' ? resultado.value.error : String(resultado.reason?.message ?? resultado.reason);
        return pool.query(
          "UPDATE notificaciones SET estado = 'error', error = ? WHERE id = ?",
          [mensajeError, idNotificacion]
        );
      })
    );
  }

  // No se espera el envío: si Brevo tarda, no tiene que demorar la
  // respuesta de POST /api/prestamos. El "void" deja claro que es a
  // propósito, y el .catch hace que ningún error quede sin manejar.
  void procesarEnvios().catch((err) => {
    console.error('[notificaciones] error al procesar los envíos del préstamo', idPrestamo, '->', err);
  });
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
  const link = `${process.env.FRONTEND_URL}/crear-contrasena?token=${tokenInvitacion}`;
  const cuerpo = `
    Hola ${escaparHtml(nombre)}, te invitaron a Bookly. Hacé clic en el botón para crear tu contraseña y activar tu cuenta.
    <br /><br />
    <a href="${link}" style="display:inline-block; background-color:#12A594; color:#FFFFFF; text-decoration:none; padding:12px 24px; border-radius:8px; font-weight:bold;">Crear mi contraseña</a>
    <br /><br />
    Si el botón no funciona, copiá este link en el navegador:<br />
    <span style="color:#8595A6; font-size:13px;">${link}</span>
  `;

  const resultado = await enviarEmail({
    para: correo,
    asunto: 'Te invitaron a Bookly',
    html: plantillaEmail({ titulo: 'Creá tu contraseña', cuerpo }),
  });

  if (!resultado.ok) {
    throw new Error(`No se pudo enviar el email de invitación: ${resultado.error}`);
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
export async function notificarRegistro({ nombre, correo, tokenCrearContrasena }) {
  // El link lo arma el propio código (FRONTEND_URL + token), no viene del
  // usuario, por eso no se escapa. Va a la misma página que la invitación.
  const link = `${process.env.FRONTEND_URL}/crear-contrasena?token=${tokenCrearContrasena}`;
  const cuerpo = `
    Hola ${escaparHtml(nombre)}, gracias por registrarte en Bookly. Hacé clic en el botón para validar tu correo y crear tu contraseña.
    <br /><br />
    <a href="${link}" style="display:inline-block; background-color:#12A594; color:#FFFFFF; text-decoration:none; padding:12px 24px; border-radius:8px; font-weight:bold;">Crear mi contraseña</a>
    <br /><br />
    El link vence en 24 horas. Si el botón no funciona, copiá este link en el navegador:<br />
    <span style="color:#8595A6; font-size:13px;">${link}</span>
  `;

  const resultado = await enviarEmail({
    para: correo,
    asunto: 'Validá tu correo en Bookly',
    html: plantillaEmail({ titulo: 'Validá tu correo', cuerpo }),
  });

  if (!resultado.ok) {
    const error = new Error(`No se pudo enviar el email de registro: ${resultado.error}`);
    error.code = 'EMAIL_NO_ENVIADO';
    throw error;
  }
}

/**
 * Se dispara después de un login exitoso: le avisa al usuario que se
 * inició sesión con su cuenta. Por ahora sirve para probar de punta a
 * punta que el envío de emails funciona.
 *
 * No devuelve una promesa a propósito: el envío corre en segundo plano y
 * cualquier error queda capturado acá adentro, así que el login nunca se
 * demora ni falla por culpa de este email.
 *
 * Igual que notificarInvitacion, no inserta fila en `notificaciones`: el
 * ENUM `tipo` es para avisos de actividad de biblioteca.
 */
export function notificarInicioSesion({ idUsuario, nombre, correo }) {
  async function enviar() {
    // Se fija la zona horaria de Uruguay: el servidor puede estar en UTC y
    // la hora le tiene que tener sentido a quien lee el mail.
    const fechaHora = new Date().toLocaleString('es-UY', {
      timeZone: 'America/Montevideo',
      dateStyle: 'long',
      timeStyle: 'short',
    });

    const cuerpo = `
      Hola ${escaparHtml(nombre)}, se inició sesión en tu cuenta de Bookly el ${escaparHtml(fechaHora)}.
      <br /><br />
      Si fuiste vos, no tenés que hacer nada. Si no reconocés este acceso, avisale al administrador de tu organización.
    `;

    await enviarEmail({
      para: correo,
      asunto: 'Nuevo inicio de sesión',
      html: plantillaEmail({ titulo: 'Nuevo inicio de sesión', cuerpo }),
    });
  }

  void enviar().catch((err) => {
    console.error('[notificaciones] error al avisar el inicio de sesión del usuario', idUsuario, '->', err);
  });
}
