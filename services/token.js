// services/token.js
//
// Token del link "crear tu contraseña" que se manda por email. Lo usan
// tanto el registro (POST /api/auth/register) como la invitación de un
// admin (POST /api/usuarios), y lo verifica POST /api/auth/crear-contrasena.
//
// Ese mismo link es el que valida el correo: si la persona pudo abrirlo, el
// email es suyo. Por eso no hace falta un token aparte de "validar email".
//
// Son JWT firmados con JWT_SECRET, con un campo "proposito" para que este
// token no sirva como token de sesión (y viceversa). La función que genera
// y la que verifica viven juntas: así el propósito está en un solo lugar.
import { createHash } from 'node:crypto'
import jwt from 'jsonwebtoken'

const CREAR_CONTRASENA = 'crear_contrasena'

/**
 * Genera el token que va en el link del email. El vencimiento cambia según
 * el caso: quien se registra solo está esperando el mail (24h alcanza), a
 * un invitado se le da más margen porque no sabe que le va a llegar.
 */
export function generarTokenCrearContrasena(idUsuario, vencimiento = '24h') {
  return jwt.sign(
    { id: idUsuario, proposito: CREAR_CONTRASENA },
    process.env.JWT_SECRET,
    { expiresIn: vencimiento },
  )
}

/**
 * Devuelve el id del usuario si el token es válido y es para crear
 * contraseña. Si no (vencido, firma inválida o de otro propósito), devuelve
 * null.
 */
export function verificarTokenCrearContrasena(token) {
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    return payload.proposito === CREAR_CONTRASENA ? payload.id : null
  } catch {
    return null
  }
}

const RESTABLECER_CONTRASENA = 'restablecer_contrasena'

export function huellaDeContrasena(hashContrasena) {
  return createHash('sha256').update(hashContrasena).digest('hex').slice(0, 16)
}

export function generarTokenRestablecerContrasena(idUsuario, hashContrasena) {
  return jwt.sign(
    {
      id: idUsuario,
      proposito: RESTABLECER_CONTRASENA,
      huella: huellaDeContrasena(hashContrasena),
    },
    process.env.JWT_SECRET,
    { expiresIn: '1h' },
  )
}

export function verificarTokenRestablecerContrasena(token) {
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    return payload.proposito === RESTABLECER_CONTRASENA
      ? { id: payload.id, huella: payload.huella }
      : null
  } catch {
    return null
  }
}
