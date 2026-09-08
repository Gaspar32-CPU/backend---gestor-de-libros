// services/plantillaEmail.js
//
// Plantilla HTML compartida por todos los emails del sistema. Los clientes
// de correo (Gmail, Outlook) no soportan bien CSS externo ni moderno, por
// eso los estilos van inline y el layout se arma con <table> en vez de
// flexbox/grid: es la forma más compatible de centrar una tarjeta en un mail.
export function plantillaEmail({ titulo, cuerpo }) {
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F6F4EE; padding:32px 0;">
  <tr>
    <td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF; border-radius:12px; overflow:hidden; font-family:Arial, Helvetica, sans-serif;">
        <tr>
          <td style="background-color:#12A594; padding:20px 32px;">
            <span style="color:#FFFFFF; font-size:18px; font-weight:bold;">📚 Bookly</span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h1 style="margin:0 0 16px; color:#16324F; font-size:20px;">${titulo}</h1>
            <p style="margin:0; color:#4A6076; font-size:15px; line-height:1.6;">${cuerpo}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px; border-top:1px solid #E7E2D7;">
            <p style="margin:0; color:#8595A6; font-size:12px;">Este es un mensaje automático de Bookly, no respondas a este correo.</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}
