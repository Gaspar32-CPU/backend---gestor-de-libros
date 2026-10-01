// services/notificaciones.js
//
// Punto único donde vive la lógica de "qué se avisa y a quién" (RF de
// notificaciones). Cada función arma el mensaje, lo guarda en la tabla
// notificaciones (para que se vea también dentro del sistema) y dispara
// el email correspondiente.
import { pool } from '../db.js';
import { enviarEmail } from './email.js';
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

  for (const admin of admins) {
    await pool.query(
      `INSERT INTO notificaciones (id_usuario, id_prestamo, tipo, canal, mensaje)
       VALUES (?, ?, 'nuevo_prestamo', 'email', ?)`,
      [admin.id, idPrestamo, mensajeParaAdmin]
    );

    // No se espera el resultado del envío: si el SMTP tarda, no tiene que
    // demorar la respuesta de POST /api/prestamos.
    enviarEmail({
      para: admin.email,
      asunto: 'Nuevo préstamo solicitado',
      html: plantillaEmail({ titulo: 'Nuevo préstamo solicitado', cuerpo: mensajeParaAdmin }),
    });
  }

  // El solicitante también es parte del RF de notificaciones ("al generar
  // un préstamo"): además del aviso al admin para que prepare el libro,
  // el usuario recibe la confirmación de que su pedido quedó registrado.
  if (usuario?.email) {
    await pool.query(
      `INSERT INTO notificaciones (id_usuario, id_prestamo, tipo, canal, mensaje)
       VALUES (?, ?, 'nuevo_prestamo', 'email', ?)`,
      [idUsuario, idPrestamo, mensajeParaSolicitante]
    );

    enviarEmail({
      para: usuario.email,
      asunto: 'Confirmamos tu solicitud de préstamo',
      html: plantillaEmail({ titulo: 'Confirmamos tu solicitud', cuerpo: mensajeParaSolicitante }),
    });
  }
}

/**
 * Se dispara cuando un admin da de alta a un usuario invitado (sin
 * contraseña todavía): le manda el link para que la cree.
 *
 * No inserta fila en la tabla `notificaciones`: ese ENUM (`tipo`) está
 * pensado para avisos de la actividad de biblioteca (préstamos, vencimientos),
 * no para el alta de la cuenta, así que forzar un valor ahí sería una
 * decisión de diseño nueva y no una que ya esté tomada.
 */
export async function notificarInvitacion({ nombre, correo, tokenInvitacion }) {
  const link = `${process.env.FRONTEND_URL}/crear-contrasena?token=${tokenInvitacion}`;
  const cuerpo = `
    Hola ${nombre}, te invitaron a Bookly. Hacé clic en el botón para crear tu contraseña y activar tu cuenta.
    <br /><br />
    <a href="${link}" style="display:inline-block; background-color:#12A594; color:#FFFFFF; text-decoration:none; padding:12px 24px; border-radius:8px; font-weight:bold;">Crear mi contraseña</a>
    <br /><br />
    Si el botón no funciona, copiá este link en el navegador:<br />
    <span style="color:#8595A6; font-size:13px;">${link}</span>
  `;

  await enviarEmail({
    para: correo,
    asunto: 'Te invitaron a Bookly',
    html: plantillaEmail({ titulo: 'Creá tu contraseña', cuerpo }),
  });
}
