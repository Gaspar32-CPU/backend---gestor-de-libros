import 'dotenv/config';
import XLSX from 'xlsx';
import os from 'os';
import path from 'path';
import { pool } from '../db.js';
import { buscarLibroPorIsbn, isbnEsValido, limpiarIsbn } from './isbn/index.js';

const RUTA_POR_DEFECTO = path.join(os.homedir(), 'Downloads', 'MiBiblioteca_completo.xlsx');
const DOMINIO_POR_DEFECTO = '@anima.edu.uy';

// Mismos obligatorios que POST /api/libros (index.js). codigo_interno, idioma y
// fecha_pub son opcionales.
const CAMPOS_OBLIGATORIOS = ['titulo', 'autor', 'generos', 'editorial', 'stock'];

// Largos de las columnas VARCHAR de la tabla libros
const LARGO_MAXIMO = { titulo: 255, autor: 150, editorial: 150, idioma: 50 };

// Pausa entre consultas por ISBN, para no pasar el límite de Google Books (429)
const PAUSA_ISBN_MS = 500;

const esperar = (ms) => new Promise((resolver) => setTimeout(resolver, ms));

function textoOnull(valor) {
  const texto = String(valor ?? '').trim();
  return texto || null;
}

function numeroOnull(valor) {
  const numero = Number(valor);
  return valor !== undefined && valor !== '' && Number.isInteger(numero) ? numero : null;
}

/** Acepta fechas de Excel, "YYYY-MM-DD" o solo el año ("1967"). */
function fechaOnull(valor) {
  if (valor instanceof Date) {
    // +12h: evita que un desfase de huso horario cambie el día
    return new Date(valor.getTime() + 12 * 60 * 60 * 1000).toISOString().slice(0, 10);
  }
  const texto = textoOnull(valor);
  if (texto && /^\d{4}$/.test(texto)) return `${texto}-01-01`;
  return texto;
}

function fechaValida(fecha) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(fecha) &&
    !Number.isNaN(Date.parse(fecha)) &&
    Number(fecha.slice(0, 4)) <= new Date().getFullYear()
  );
}

/**
 * Lee todas las hojas y devuelve un objeto por fila con los nombres
 * de campo de la tabla libros. Los campos vacíos quedan en null (generos en []).
 */
export function leerLibrosDelExcel(ruta = RUTA_POR_DEFECTO) {
  return librosDelWorkbook(XLSX.readFile(ruta, { cellDates: true }));
}

/** Igual que leerLibrosDelExcel, pero desde un archivo subido (req.file.buffer). */
export function leerLibrosDelBuffer(buffer) {
  return librosDelWorkbook(XLSX.read(buffer, { type: 'buffer', cellDates: true }));
}

function librosDelWorkbook(workbook) {
  // Se recorren todas las hojas del archivo
  return workbook.SheetNames.flatMap((nombreHoja) => {
    const filas = XLSX.utils.sheet_to_json(workbook.Sheets[nombreHoja]);

    return filas.map((fila, i) => {
      const genero = textoOnull(fila['Género']);

      return {
        hoja: nombreHoja,
        filaExcel: i + 2,
        titulo: textoOnull(fila['Libro']),
        autor: textoOnull(fila['Autor']),
        generos: genero ? [genero] : [],
        editorial: textoOnull(fila['Editorial']),
        isbn: textoOnull(fila['ISBN'])?.replace(/\s/g, '') ?? null,
        codigo_interno: textoOnull(fila['Código interno']),
        fecha_pub: fechaOnull(fila['Fecha de publicación']),
        idioma: textoOnull(fila['Idioma']) || "Español",
        stock: numeroOnull(fila['Stock']) || 1,
      };
    });
  });
}

/** Devuelve la lista de problemas del libro; vacía si está completo y válido. */
export function validarLibro(libro) {
  const problemas = [];

  const faltan = CAMPOS_OBLIGATORIOS.filter((campo) =>
    campo === 'generos' ? libro.generos.length === 0 : !libro[campo],
  );
  if (faltan.length > 0) {
    problemas.push({ error: 'faltan_campos', detalle: faltan.join(', ') });
  }

  if (libro.fecha_pub && !fechaValida(libro.fecha_pub)) {
    problemas.push({ error: 'fecha_invalida', detalle: libro.fecha_pub });
  }

  if (libro.isbn && !isbnEsValido(limpiarIsbn(libro.isbn))) {
    problemas.push({ error: 'isbn_invalido', detalle: libro.isbn });
  }

  if (libro.codigo_interno && libro.codigo_interno.length > 50) {
    problemas.push({ error: 'codigo_interno_invalido', detalle: 'más de 50 caracteres' });
  }

  const demasiadoLargos = Object.entries(LARGO_MAXIMO).filter(([campo, max]) => libro[campo]?.length > max);
  if (demasiadoLargos.length > 0) {
    problemas.push({ error: 'campo_demasiado_largo', detalle: demasiadoLargos.map(([campo]) => campo).join(', ') });
  }

  return problemas;
}

// Los subjects de Open Library son etiquetas libres ("Widowers", "Autor"). Solo se
// aceptan las que corresponden a un género conocido, con su nombre en español.
// Van de lo más específico a lo más general.
const GENEROS_CONOCIDOS = [
  [/science fiction|ciencia ficci[oó]n/i, 'Ciencia ficción'],
  [/fantasy|fantas[ií]a/i, 'Fantasía'],
  [/thriller|suspense/i, 'Thriller'],
  [/mystery|detective|crime|novela negra|polic[ií]aca?/i, 'Novela negra'],
  [/horror|terror|gothic/i, 'Terror'],
  [/historical|novela hist[oó]rica/i, 'Novela histórica'],
  [/romance|love stories|romántic/i, 'Romance'],
  [/poetry|poes[ií]a/i, 'Poesía'],
  [/\bplays?\b|drama|teatro/i, 'Teatro'],
  [/short stories|cuentos/i, 'Cuentos'],
  [/essays?|ensayo/i, 'Ensayo'],
  [/biograph|biograf[ií]a/i, 'Biografía'],
  [/young adult|juvenil/i, 'Juvenil'],
  [/children|infantil/i, 'Infantil'],
  [/comics|graphic novels|historieta|manga/i, 'Historieta'],
  [/philosoph|filosof[ií]a/i, 'Filosofía'],
  [/self-help|autoayuda/i, 'Autoayuda'],
  [/adventure|aventura/i, 'Aventura'],
  [/humou?r/i, 'Humor'],
  [/medicine|medicina/i, 'Medicina'],
  [/classic|cl[aá]sic/i, 'Clásico'],
];
const MAX_GENEROS = 3;

/** Deja solo los géneros conocidos; "Ficción" solo si no hay uno más específico. */
export function filtrarGeneros(categorias = []) {
  const encontrados = [];

  for (const categoria of categorias) {
    const coincidencia = GENEROS_CONOCIDOS.find(([patron]) => patron.test(categoria));
    if (coincidencia && !encontrados.includes(coincidencia[1])) {
      encontrados.push(coincidencia[1]);
    }
  }

  if (encontrados.length === 0 && categorias.some((c) => /fiction|ficci[oó]n|novel|novela/i.test(c))) {
    return ['Ficción'];
  }
  return encontrados.slice(0, MAX_GENEROS);
}

/**
 * Completa lo que falta con los datos del ISBN. Lo que ya vino válido en el
 * documento no se pisa. Resumen y portada solo pueden venir del ISBN.
 */
export function completarConIsbn(libro, datos) {
  return {
    ...libro,
    titulo: libro.titulo ?? (datos.titulo || null),
    autor: libro.autor ?? (datos.autor || null),
    generos: libro.generos.length > 0 ? libro.generos : filtrarGeneros(datos.categorias),
    editorial: libro.editorial ?? (datos.editorial || null),
    idioma: libro.idioma ?? (datos.idioma || null),
    fecha_pub:
      libro.fecha_pub && fechaValida(libro.fecha_pub)
        ? libro.fecha_pub
        : datos.anio
          ? `${datos.anio}-01-01`
          : null,
    resumen: datos.descripcion || null,
    portada: datos.portada || null,
  };
}

function rechazo(libro, problemas) {
  return { hoja: libro.hoja, fila: libro.filaExcel, titulo: libro.titulo, problemas };
}

/**
 * Validación contra la base: ISBN repetido y código interno repetido (igual que
 * POST /api/libros).
 */
async function validarContraBase(completos, rechazados, idOrganizacion) {
  const [existentes] = await pool.query(
    `SELECT codigo_interno, REPLACE(REPLACE(isbn, '-', ''), ' ', '') AS isbn
       FROM libros
      WHERE id_organizacion = ? AND eliminado = FALSE`,
    [idOrganizacion],
  );

  const codigos = new Set(existentes.map((e) => e.codigo_interno).filter(Boolean));
  const isbns = new Set(existentes.map((e) => e.isbn).filter(Boolean));
  const listos = [];

  for (const libro of completos) {
    const isbn = libro.isbn ? limpiarIsbn(libro.isbn) : null;

    if (isbn && isbns.has(isbn)) {
      rechazados.push(rechazo(libro, [{ error: 'libro_existente', detalle: isbn }]));
      continue;
    }
    if (libro.codigo_interno && codigos.has(libro.codigo_interno)) {
      rechazados.push(
        rechazo(libro, [{ error: 'codigo_interno_duplicado', detalle: libro.codigo_interno }]),
      );
      continue;
    }

    if (isbn) isbns.add(isbn);
    if (libro.codigo_interno) codigos.add(libro.codigo_interno);
    listos.push({ ...libro, isbn });
  }

  return listos;
}

/**
 * Valida dos veces: primero los datos del documento; si no alcanzan y hay ISBN,
 * los completa con los datos del ISBN y valida de nuevo.
 *
 * @returns {Promise<{ listos: object[], rechazados: object[] }>}
 */
export async function prepararLibros(
  libros,
  idOrganizacion,
  onProgreso = () => {},
  estaCancelado = () => false,
) {
  const completos = [];
  const rechazados = [];
  let procesados = 0;

  for (const libro of libros) {
    if (estaCancelado()) throw new Error('Importación cancelada');
    onProgreso({ procesados, total: libros.length });
    procesados += 1;

    // 1ª validación: datos del documento
    const problemas = validarLibro(libro);
    if (problemas.length === 0) {
      completos.push({ ...libro, origen: 'excel' });
      continue;
    }

    if (!libro.isbn) {
      rechazados.push(rechazo(libro, [...problemas, { error: 'sin_isbn_para_completar' }]));
      continue;
    }
    if (problemas.some((p) => p.error === 'isbn_invalido')) {
      rechazados.push(rechazo(libro, problemas));
      continue;
    }

    // 2ª validación: datos buscados por ISBN
    let datos;
    try {
      datos = await buscarLibroPorIsbn(libro.isbn);
    } catch (error) {
      rechazados.push(
        rechazo(libro, [...problemas, { error: 'isbn_consulta_fallida', detalle: error.message }]),
      );
      continue;
    } finally {
      await esperar(PAUSA_ISBN_MS);
    }

    if (!datos) {
      rechazados.push(rechazo(libro, [...problemas, { error: 'isbn_no_encontrado', detalle: libro.isbn }]));
      continue;
    }

    const completado = completarConIsbn(libro, datos);
    const problemasFinales = validarLibro(completado);
    if (problemasFinales.length > 0) {
      rechazados.push(rechazo(libro, problemasFinales));
      continue;
    }

    completos.push({ ...completado, origen: 'isbn' });
  }

  const listos = await validarContraBase(completos, rechazados, idOrganizacion);
  return { listos, rechazados };
}

export async function prepararLibrosDesdeExcel({ ruta, dominio = DOMINIO_POR_DEFECTO } = {}) {
  const [[organizacion]] = await pool.query('SELECT id FROM organizaciones WHERE dominio = ?', [dominio]);
  if (!organizacion) throw new Error(`No existe la organización ${dominio}`);

  const resultado = await prepararLibros(leerLibrosDelExcel(ruta), organizacion.id);
  return { ...resultado, idOrganizacion: organizacion.id };
}

/**
 * Inserta los libros en una sola transacción: si uno falla, no se guarda ninguno.
 * Mismo INSERT que POST /api/libros.
 */
export async function insertarLibros(libros, idOrganizacion) {
  const conexion = await pool.getConnection();

  try {
    await conexion.beginTransaction();

    for (const libro of libros) {
      await conexion.query(
        `INSERT INTO libros
         (id_organizacion, titulo, autor, generos, editorial, idioma, codigo_interno, isbn, fecha_pub, resumen, portada, stock)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          idOrganizacion,
          libro.titulo,
          libro.autor,
          JSON.stringify(libro.generos),
          libro.editorial,
          libro.idioma,
          libro.codigo_interno,
          libro.isbn,
          libro.fecha_pub,
          libro.resumen ?? null,
          libro.portada ?? null,
          libro.stock,
        ],
      );
    }

    await conexion.commit();
    return libros.length;
  } catch (error) {
    await conexion.rollback();
    throw error;
  } finally {
    conexion.release();
  }
}
