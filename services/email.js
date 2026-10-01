// services/email.js
//
// Envía emails llamando a la API HTTP de Brevo (https://api.brevo.com), no
// por SMTP. Muchas redes (la del liceo incluida) bloquean los puertos SMTP
// salientes (587/465/2525) para evitar que se usen como relay de spam, pero
// dejan pasar HTTPS normal. La API de Brevo hace lo mismo que el SMTP
// (mismo free tier, 300 emails/día) viajando por el puerto 443.
const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';

/**
 * Envía un email. Nunca relanza el error: si el envío falla (API caída,
 * clave mal puesta, etc.) queda logueado en consola, pero no debe tumbar la
 * operación que lo disparó (ej. no se puede fallar la creación de un
 * préstamo porque el mail de aviso no salió).
 */
export async function enviarEmail({ para, asunto, html }) {
  try {
    const respuesta = await fetch(BREVO_URL, {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { email: process.env.BREVO_FROM_EMAIL, name: process.env.BREVO_FROM_NAME },
        to: [{ email: para }],
        subject: asunto,
        htmlContent: html,
      }),
    });

    if (!respuesta.ok) {
      const detalle = await respuesta.text();
      throw new Error(`${respuesta.status} ${detalle}`);
    }
  } catch (err) {
    console.error('[email] no se pudo enviar a', para, '->', err.message);
  }
}
