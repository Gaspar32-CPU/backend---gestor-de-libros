// repos.js
//
// Todas las consultas van contra MySQL, sin datos de respaldo en memoria. Si
// la consulta falla (la base no está levantada, credenciales mal, etc.), el
// error sube hasta el manejador de errores de index.js, que le responde al
// cliente con un mensaje claro en vez de devolver datos inventados.
//
// La tabla "usuarios" no usa los mismos valores de rol que el resto del
// código: la DB usa admin_organizacion/admin_plataforma y los middlewares de
// middlewares/auth.js esperan admin/super-admin. Por eso las filas se
// normalizan antes de devolverlas.
import { pool } from './db.js';

const ROL_DB_A_APP = {
  lector: 'lector',
  admin_organizacion: 'admin',
  admin_plataforma: 'super-admin',
};

const usuarioDeDB = (fila) => ({
  id: fila.id,
  CI: fila.ci,
  nombre: fila.nombre,
  correo: fila.email,
  contrasena: fila.contrasena,
  fecharegistro: fila.fecha_registro,
  rol: ROL_DB_A_APP[fila.rol] ?? fila.rol,
  organizacionId: fila.id_organizacion,
});

const organizacionDeDB = (fila) => ({
  id: fila.id,
  nombre: fila.nombre,
  idPlan: fila.id_plan,
  dominio: fila.dominio,
  activo: !!fila.activo,
  expiracion: fila.expiracion_suscripcion,
});

const configuracionOrganizacionDeDB = (fila) => ({
  id: fila.id,
  organizacionId: fila.id_organizacion,
  nombreApp: fila.nombre_app,
  logo: fila.logo,
  colorPrimario: fila.color_primario,
  colorSecundario: fila.color_secundario,
  maxLibrosPorUsuario: fila.max_libros_por_usuario,
  lugarRetiro: fila.lugar_retiro,
  diasPrestamo: fila.dias_prestamo,
  permiteExtension: !!fila.permite_extension,
  maxExtensiones: fila.max_extensiones,
  diasExtension: fila.dias_extension,
  congelarUsuarios: !!fila.congelar_usuarios,
  diasAtrasoCongelamiento: fila.dias_atraso_congelamiento,
  mensajesPersonalizados: fila.mensajes_personalizados,
});

// Solo los campos que existen en la tabla "planes". Lo que la landing
// muestra de más (precio anual, etc.) lo calcula el frontend.
// mysql2 ya convierte la columna JSON "funcionalidades" en un objeto.
const planDeDB = (fila) => ({
  id: fila.id,
  nombre: fila.nombre,
  descripcion: fila.descripcion,
  precioMensual: Number(fila.precio_mensual),
  limites: { usuarios: fila.limite_usuarios, titulos: fila.limite_libros },
  funcionalidades: fila.funcionalidades ?? {},
  activo: !!fila.activo,
});

/* ============================================================
   USUARIOS
   ============================================================ */

export async function buscarUsuarioPorCorreo(correo) {
  const [filas] = await pool.query('SELECT * FROM usuarios WHERE email = ?', [correo]);
  return filas[0] ? usuarioDeDB(filas[0]) : undefined;
}

export async function buscarUsuarioPorId(id) {
  const idNum = parseInt(id, 10);
  if (isNaN(idNum)) return undefined;

  const [filas] = await pool.query('SELECT * FROM usuarios WHERE id = ?', [idNum]);
  return filas[0] ? usuarioDeDB(filas[0]) : undefined;
}

export async function listarUsuariosPorOrganizacion(idOrganizacion) {
  const [filas] = await pool.query('SELECT * FROM usuarios WHERE id_organizacion = ?', [
    idOrganizacion,
  ]);
  return filas.map(usuarioDeDB);
}

export async function listarUsuarios() {
  const [filas] = await pool.query('SELECT * FROM usuarios');
  return filas.map(usuarioDeDB);
}

// `conexion` permite correr el insert dentro de una transacción (ver
// POST /api/auth/register); si no se pasa, usa el pool como siempre.
export async function crearUsuario(
  { nombre, ci, correo, telefono, contrasena, organizacionId, rol = 'lector' },
  conexion = pool
) {
  const [resultado] = await conexion.query(
    `INSERT INTO usuarios (id_organizacion, ci, nombre, email, telefono, contrasena, rol)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [organizacionId, ci, nombre, correo, telefono, contrasena, rol]
  );

  return usuarioDeDB({
    id: resultado.insertId,
    id_organizacion: organizacionId,
    ci,
    nombre,
    email: correo,
    telefono,
    contrasena,
    rol,
    fecha_registro: new Date(),
  });
}

/* ============================================================
   ORGANIZACIONES
   ============================================================ */

export async function buscarOrganizacionPorId(id) {
  const idNum = parseInt(id, 10);
  if (isNaN(idNum)) return undefined;

  const [filas] = await pool.query('SELECT * FROM organizaciones WHERE id = ?', [idNum]);
  return filas[0] ? organizacionDeDB(filas[0]) : undefined;
}

export async function buscarDatosOrganizacionPorId(id) {
  const idNum = parseInt(id, 10);
  if (isNaN(idNum)) return undefined;

  const [filas] = await pool.query('SELECT * FROM configuraciones WHERE id_organizacion = ?', [idNum]);
  return filas[0] ? configuracionOrganizacionDeDB(filas[0]) : undefined;
}

export async function buscarOrganizacionPorDominio(dominio) {
  const [filas] = await pool.query('SELECT * FROM organizaciones WHERE dominio = ?', [dominio]);
  return filas[0] ? organizacionDeDB(filas[0]) : undefined;
}

export async function crearOrganizacion({ nombre, idPlan, dominio, expiracion }, conexion = pool) {
  const [resultado] = await conexion.query(
    `INSERT INTO organizaciones (nombre, id_plan, dominio, activo, expiracion_suscripcion)
     VALUES (?, ?, ?, 1, ?)`,
    [nombre, idPlan, dominio, expiracion]
  );

  return organizacionDeDB({
    id: resultado.insertId,
    nombre,
    id_plan: idPlan,
    dominio,
    activo: 1,
    expiracion_suscripcion: expiracion,
  });
}

/* ============================================================
   PLANES
   ============================================================ */

export async function listarPlanes() {
  const [filas] = await pool.query('SELECT * FROM planes WHERE activo = 1 ORDER BY precio_mensual');
  return filas.map(planDeDB);
}

export async function buscarPlanPorId(id) {
  const idNum = parseInt(id, 10);
  if (isNaN(idNum)) return undefined;

  const [filas] = await pool.query('SELECT * FROM planes WHERE id = ?', [idNum]);
  return filas[0] ? planDeDB(filas[0]) : undefined;
}

export async function crearPlan({ nombre, descripcion, precioMensual, limiteUsuarios, limiteLibros, funcionalidades }) {
  const [resultado] = await pool.query(
    `INSERT INTO planes (nombre, descripcion, precio_mensual, limite_usuarios, limite_libros, funcionalidades)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [nombre, descripcion, precioMensual, limiteUsuarios, limiteLibros, JSON.stringify(funcionalidades)]
  );
  return buscarPlanPorId(resultado.insertId);
}

// Solo actualiza los campos que vienen definidos; el resto queda como estaba.
export async function actualizarPlan(id, campos) {
  const COLUMNAS = {
    nombre: 'nombre',
    descripcion: 'descripcion',
    precioMensual: 'precio_mensual',
    limiteUsuarios: 'limite_usuarios',
    limiteLibros: 'limite_libros',
    funcionalidades: 'funcionalidades',
    activo: 'activo',
  };

  const sets = [];
  const valores = [];
  for (const [campo, columna] of Object.entries(COLUMNAS)) {
    if (campos[campo] === undefined) continue;
    sets.push(`${columna} = ?`);
    valores.push(campo === 'funcionalidades' ? JSON.stringify(campos[campo]) : campos[campo]);
  }

  if (sets.length > 0) {
    await pool.query(`UPDATE planes SET ${sets.join(', ')} WHERE id = ?`, [...valores, id]);
  }
  return buscarPlanPorId(id);
}

// Devuelve true si borró el plan. Si hay organizaciones usando el plan, MySQL
// lo impide (FK con ON DELETE RESTRICT) y el error sube a quien llama.
export async function eliminarPlan(id) {
  const [resultado] = await pool.query('DELETE FROM planes WHERE id = ?', [id]);
  return resultado.affectedRows > 0;
}
