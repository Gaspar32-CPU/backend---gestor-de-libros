// middlewares.js
import jwt from 'jsonwebtoken';

/**
 * Verifica que venga un token válido en el header:
 *   Authorization: Bearer <token>
 */
function verificarToken(req, res, next) {   // ← 3 parámetros
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Token no provisto' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Token inválido o expirado' });
  }
}

function verificarAdmin(req, res, next) {
  if (!req.usuario) {
    return res.status(401).json({ success: false, message: 'No autenticado' });
  }
  if (req.usuario.rol !== 'admin') {
    return res.status(403).json({ success: false, message: 'No tenés permisos de administrador' });
  }
  next();
}

function verificarSuperAdmin(req, res, next) {
  if (!req.usuario) {
    return res.status(401).json({ success: false, message: 'No autenticado' });
  }
  if (req.usuario.rol !== 'super-admin') {
    return res.status(403).json({ success: false, message: 'No tenés permisos de super-administrador' });
  }
  next();
}

/**
 * Manejador de errores. Se monta en app.js, DESPUÉS de todas las rutas.
 */
function manejadorErrores(err, req, res, next) {   // ← 4 parámetros, acá sí
  if (res.headersSent) return next(err);

  console.error(err.stack);

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Error interno del servidor',
    errors: err.errors || []
  });
}

export { verificarToken, verificarAdmin, verificarSuperAdmin, manejadorErrores };