// services/email.js
//
// Envía emails llamando a la API HTTP de Brevo (https://api.brevo.com), no
// por SMTP. Muchas redes (la del liceo incluida) bloquean los puertos SMTP
// salientes (587/465/2525) para evitar que se usen como relay de spam, pero
// dejan pasar HTTPS normal. La API de Brevo hace lo mismo que el SMTP
// (mismo free tier, 300 emails/día) viajando por el puerto 443.
const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';

// Se valida al cargar el módulo (o sea, al arrancar el servidor) y no en
// cada envío: si falta una variable es mejor enterarse en el arranque que
// descubrirlo cuando un préstamo no avisó a nadie.
const variablesRequeridas = ['BREVO_API_KEY', 'BREVO_FROM_EMAIL', 'BREVO_FROM_NAME'];
const variablesFaltantes = variablesRequeridas.filter((nombre) => !process.env[nombre]);
if (variablesFaltantes.length > 0) {
  throw new Error(
    `Faltan variables de entorno para el envío de emails: ${variablesFaltantes.join(', ')} (ver .env.example)`
  );
}

/**
 * Envía un email. Nunca relanza el error: si el envío falla (API caída,
 * clave mal puesta, timeout, etc.) queda logueado en consola y se devuelve
 * { ok: false, error }, para que quien la llamó decida qué hacer (registrar
 * el error, reintentar o cortar la operación).
 *
 */
export async function enviarEmail({ para, asunto, html }) {
  try {
    const respuesta = await fetch(BREVO_URL, {
      method: 'POST',
      // Sin timeout, si Brevo no contesta el fetch queda esperando para
      // siempre. A los 10 segundos se aborta y cae en el catch.
      signal: AbortSignal.timeout(10_000),
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

    return { ok: true };
  } catch (err) {
    console.error('[email] no se pudo enviar a', para, '->', err.message);
    return { ok: false, error: err.message };
  }
}
