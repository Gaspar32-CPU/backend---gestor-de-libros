/**
 * Servicio de consulta de metadatos de libros por ISBN.
 *
 * Consulta fuentes externas y devuelve SIEMPRE la misma forma de objeto,
 * sin importar de dónde vinieron los datos. El resto del sistema no necesita
 * saber si respondió Google Books o Open Library.
 *
 * La API key vive acá, en el servidor. Nunca viaja al navegador.
 *
 * Node 24 ya trae fetch global: no hace falta instalar node-fetch.
 */

import { guardarEnCache, leerDeCache, limpiarCache } from "./cache.js";
import { enriquecerConOpenLibrary } from "./enriquecer.js";
import { consultarGoogleBooks } from "./fuentes/googleBooks.js";
import { consultarOpenLibrary } from "./fuentes/openLibrary.js";
import { isbnEsValido, limpiarIsbn } from "./validacion.js";

/**
 * Busca los datos de un libro por ISBN.
 *
 * @param   {string} isbn  ISBN-10 o ISBN-13, con o sin guiones.
 * @returns {Promise<object|null>}  El libro normalizado, o null si ninguna
 *          fuente lo conoce.
 * @throws  Si el ISBN es inválido, o si TODAS las fuentes fallaron por
 *          problemas de conexión (distinto de "no existe").
 */
async function buscarLibroPorIsbn(isbn) {
  const isbnLimpio = limpiarIsbn(isbn);

  if (!isbnEsValido(isbnLimpio)) {
    throw new Error("ISBN inválido");
  }

  const enCache = leerDeCache(isbnLimpio);
  if (enCache !== undefined) {
    return enCache;
  }

  let algunaFuenteRespondio = false;

  for (const consultar of FUENTES) {
    try {
      const resultado = await consultar(isbnLimpio);

      algunaFuenteRespondio = true;

      if (resultado) {
        const libro = {
          ...(await enriquecerConOpenLibrary(resultado, isbnLimpio)),
          isbn: isbnLimpio,
        };

        guardarEnCache(isbnLimpio, libro);
        return libro;
      }
      // null = la fuente respondió bien pero no conoce el ISBN.
      // Seguimos con la próxima.
    } catch (error) {
      console.error(`[isbn] Falló una fuente para ${isbnLimpio}: ${error.message}`);
    }
  }

  // Ninguna fuente encontró el libro. Distinguimos por qué:
  if (!algunaFuenteRespondio) {
    throw new Error("Las fuentes externas no están disponibles");
  }

  guardarEnCache(isbnLimpio, null);
  return null;
}

/* ================================================================== */
/* Función principal                                                   */
/* ================================================================== */

// Orden de preferencia. Google va primero: trae idioma siempre y una
// descripción editorial real, en el idioma de la edición.
const FUENTES = [consultarGoogleBooks, consultarOpenLibrary];



export {
  buscarLibroPorIsbn,
  limpiarIsbn,
  isbnEsValido,
  limpiarCache,
};