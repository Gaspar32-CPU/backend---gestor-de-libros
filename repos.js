// repos.js
//
// Cada función de acá intenta primero contra MySQL. Si la consulta falla
// (por ejemplo, la base no está levantada) o la fila/registro no existe,
// cae en los datos de mockData.js para que el resto del sistema siga
// funcionando mientras se termina de migrar todo a la base real.
//
// La tabla "usuarios" y el mock de usuarios no tienen exactamente los mismos
// nombres de columna ni los mismos valores de rol (la DB usa
// admin_organizacion/admin_plataforma, el resto del código y el mock usan
// admin/super-admin, que es lo que esperan los middlewares de
// middlewares/auth.js). Por eso las filas que vienen de la DB se normalizan
// a la forma del mock antes de devolverlas.
import { pool } from './db.js';
import {
  usuarios as usuariosMock,
  organizaciones as organizacionesMock,
  planes as planesMock,
  configuraciones,
} from './mockData.js';

const ROL_DB_A_MOCK = {
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
  rol: ROL_DB_A_MOCK[fila.rol] ?? fila.rol,
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
  activo: !!fila.activo,
  expiracion: fila.expiracion_suscripcion,
});

// La tabla "planes" todavía no tiene las columnas de marketing que sí tiene
// el mock (codigo, tagline, icono, destacado, caracteristicas, precioAnual):
// son datos pensados para la landing de ventas, no para la lógica de
// negocio, y no se definieron en el schema. Hasta que se agreguen, quedan
// vacíos cuando el plan viene de la DB. Esto es una decisión tomada acá,
// no algo ya definido con el equipo: avisar antes de depender de esos
// campos para un plan que salga de la base.
const planDeDB = (fila) => ({
  id: fila.id,
  codigo: null,
  nombre: fila.nombre,
  tagline: '',
  descripcion: fila.descripcion,
  icono: '',
  destacado: false,
  precioMensual: Number(fila.precio_mensual),
  precioAnual: null,
  limites: { usuarios: fila.limite_usuarios, admins: null, titulos: fila.limite_libros },
  caracteristicas: [],
});

/* ============================================================
   USUARIOS
   ============================================================ */

// Sin fallback a mock (a diferencia del resto de este archivo): esta función
// decide si un correo "ya existe" para el alta de cuentas. Si cayera al mock
// ante un error de conexión, un correo que sí está libre en la base real
// podría bloquearse por un usuario fantasma que solo vive en memoria (pasó
// de verdad: ver el email de invitación de mauro.aires@lightit.io).
export async function buscarUsuarioPorCorreo(correo) {
  const [filas] = await pool.query('SELECT * FROM usuarios WHERE email = ?', [correo]);
  return filas[0] ? usuarioDeDB(filas[0]) : undefined;
}

export async function buscarUsuarioPorId(id) {
  const idNum = parseInt(id, 10);
  if (isNaN(idNum)) return undefined;

  try {
    const [filas] = await pool.query('SELECT * FROM usuarios WHERE id = ?', [idNum]);
    if (filas[0]) return usuarioDeDB(filas[0]);
  } catch (err) {
    console.error('[repos] buscarUsuarioPorId: falló la consulta a la DB, uso mock ->', err.message);
  }
  return usuariosMock.find((u) => u.id === idNum);
}

export async function listarUsuariosPorOrganizacion(idOrganizacion) {
  try {
    const [filas] = await pool.query('SELECT * FROM usuarios WHERE id_organizacion = ?', [
      idOrganizacion,
    ]);
    if (filas.length > 0) return filas.map(usuarioDeDB);
  } catch (err) {
    console.error(
      '[repos] listarUsuariosPorOrganizacion: falló la consulta a la DB, uso mock ->',
      err.message
    );
  }
  return usuariosMock.filter((u) => u.organizacionId === idOrganizacion);
}

export async function listarUsuarios() {
  try {
    const [filas] = await pool.query('SELECT * FROM usuarios');
    if (filas.length > 0) return filas.map(usuarioDeDB);
  } catch (err) {
    console.error('[repos] listarUsuarios: falló la consulta a la DB, uso mock ->', err.message);
  }
  return usuariosMock;
}

// Sin fallback a mock: un usuario "creado" que en realidad solo vive en
// memoria es peor que un error visible. Cosas que dependen de que el id sea
// real (el JWT de invitación, el login) fallarían más adelante y de forma
// mucho más confusa que un 500 inmediato acá.
export async function crearUsuario({ nombre, ci, correo, telefono, contrasena, organizacionId, rol = 'lector' }) {
  const [resultado] = await pool.query(
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

  try {
    const [filas] = await pool.query('SELECT * FROM organizaciones WHERE id = ?', [idNum]);
    if (filas[0]) return organizacionDeDB(filas[0]);
  } catch (err) {
    console.error('[repos] buscarOrganizacionPorId: falló la consulta a la DB, uso mock ->', err.message);
  }
  return organizacionesMock.find((o) => o.id === idNum);
}

export async function buscarDatosOrganizacionPorId(id) {
  const idNum = parseInt(id, 10);
  if (isNaN(idNum)) return undefined;

  try {
    const [filas] = await pool.query('SELECT * FROM configuraciones WHERE id_organizacion = ?', [idNum]);
    if (filas[0]) return configuracionOrganizacionDeDB(filas[0]);
  } catch (err) {
    console.error('[repos] buscarDatosOrganizacionPorId: falló la consulta a la DB, uso mock ->', err.message);
  }
  return configuraciones.find((o) => o.id_organizacion === idNum);
}

export async function buscarOrganizacionPorDominio(dominio) {
  try {
    const [filas] = await pool.query('SELECT * FROM organizaciones WHERE dominio = ?', [dominio]);
    if (filas[0]) return organizacionDeDB(filas[0]);
  } catch (err) {
    console.error('[repos] buscarOrganizacionPorDominio: falló la consulta a la DB, uso mock ->', err.message);
  }
  return organizacionesMock.find((o) => o.dominio === dominio);
}

export async function crearOrganizacion({ nombre, idPlan, dominio, expiracion }) {
  try {
    const [resultado] = await pool.query(
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
  } catch (err) {
    console.error('[repos] crearOrganizacion: falló el insert en la DB, uso mock ->', err.message);

    const organizacionNueva = {
      id: organizacionesMock.reduce((max, o) => Math.max(max, o.id), 0) + 1,
      nombre,
      idPlan,
      dominio,
      activo: true,
      expiracion,
    };
    organizacionesMock.push(organizacionNueva);
    return organizacionNueva;
  }
}

/* ============================================================
   PLANES
   ============================================================ */

export async function listarPlanes() {
  try {
    const [filas] = await pool.query('SELECT * FROM planes');
    if (filas.length > 0) return filas.map(planDeDB);
  } catch (err) {
    console.error('[repos] listarPlanes: falló la consulta a la DB, uso mock ->', err.message);
  }
  return planesMock;
}

export async function buscarPlanPorId(id) {
  const idNum = parseInt(id, 10);
  if (isNaN(idNum)) return undefined;

  try {
    const [filas] = await pool.query('SELECT * FROM planes WHERE id = ?', [idNum]);
    if (filas[0]) return planDeDB(filas[0]);
  } catch (err) {
    console.error('[repos] buscarPlanPorId: falló la consulta a la DB, uso mock ->', err.message);
  }
  return planesMock.find((p) => p.id === idNum);
}
