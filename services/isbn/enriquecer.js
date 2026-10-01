/* ================================================================== */
/* Enriquecimiento con la fuente secundaria                            */
/* ================================================================== */

import { consultarOpenLibrary } from "./fuentes/openLibrary.js";
import { limpiarCategorias } from "./normalizar.js";

/**
 * Google devuelve categorías BISAC muy genéricas: muchas veces una sola,
 * tipo "Fiction". Los subjects de Open Library son bastante más ricos
 * ("magic realism", "Latin American fiction", "Colombian fiction"), y de eso
 * depende que el filtro por género del catálogo sirva para algo.
 */
function necesitaEnriquecimiento(libro) {
  if (libro.fuente !== "Google Books") return false;

  return (
    libro.categorias.length <= 1 || !libro.descripcion || !libro.codigoIdioma
  );
}

/**
 * Completa los huecos del resultado de Google con datos de Open Library.
 * Nunca falla: si Open Library no responde, devolvemos el libro como estaba.
 */
export async function enriquecerConOpenLibrary(libro, isbn) {
  if (!necesitaEnriquecimiento(libro)) return libro;

  let complemento = null;
  try {
    complemento = await consultarOpenLibrary(isbn);
  } catch (error) {
    console.warn(`[isbn] No se pudo enriquecer ${isbn}: ${error.message}`);
    return libro;
  }

  if (!complemento) return libro;

  return {
    ...libro,
    // Las de Google primero: son menos, pero más prolijas.
    categorias: limpiarCategorias([
      ...libro.categorias,
      ...complemento.categorias,
    ]),
    descripcion: libro.descripcion || complemento.descripcion,
    idioma: libro.idioma || complemento.idioma,
    codigoIdioma: libro.codigoIdioma || complemento.codigoIdioma,
    portada: libro.portada || complemento.portada,
  };
}