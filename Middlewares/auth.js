const jwt = require('jsonwebtoken');

/**
 * Verifica que venga un token válido en el header:
 *   Authorization: Bearer <token>
 * Si es válido, guarda el payload decodificado en req.usuario
 * y lo deja disponible para las siguientes rutas/middlewares.
 */
function verificarToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token no provisto' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decoded; // { id, email, rol, organizacionId, ... }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

/**
 * Debe usarse SIEMPRE después de verificarToken.
 * Solo deja pasar si el usuario del token tiene rol admin.
 */
function verificarAdmin(req, res, next) {
  if (!req.usuario) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  if (req.usuario.rol !== 'admin') {
    return res.status(403).json({ error: 'No tenés permisos de administrador' });
  }
  next();
}

/**
 * Solo deja pasar si el usuario del token es super-admin
 * (para rutas de plataforma: planes, organizaciones, admin/usuarios).
 */
function verificarSuperAdmin(req, res, next) {
  if (!req.usuario) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  if (req.usuario.rol !== 'super-admin') {
    return res.status(403).json({ error: 'No tenés permisos de super-administrador' });
  }
  next();
}

module.exports = { verificarToken, verificarAdmin, verificarSuperAdmin };