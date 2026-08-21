/* ================================================================== */
/* Caché en memoria                                                    */
/* ================================================================== */

import {
  CACHE_MAX_ENTRADAS,
  CACHE_TTL_NULL_MS,
  CACHE_TTL_OK_MS,
} from "./config.js";

/**
 * Un mismo ISBN suele consultarse varias veces (el admin recarga, se equivoca
 * y vuelve, carga varios ejemplares del mismo título). Guardarlo en memoria
 * ahorra cuota de la API y hace la respuesta instantánea.
 *
 * Es memoria del proceso: se pierde al reiniciar el servicio. Está bien,
 * es un caché, no una base de datos.
 */
const cache = new Map();

export function leerDeCache(isbn) {
  const entrada = cache.get(isbn);
  if (!entrada) return undefined;

  if (Date.now() - entrada.guardadoEn > entrada.ttl) {
    cache.delete(isbn);
    return undefined;
  }

  return entrada.valor;
}

export function guardarEnCache(isbn, valor) {
  // Tope simple: si está lleno, sacamos la entrada más vieja (la primera
  // insertada, porque Map preserva el orden de inserción).
  if (cache.size >= CACHE_MAX_ENTRADAS) {
    const masVieja = cache.keys().next().value;
    cache.delete(masVieja);
  }

  cache.set(isbn, {
    valor,
    guardadoEn: Date.now(),
    ttl: valor === null ? CACHE_TTL_NULL_MS : CACHE_TTL_OK_MS,
  });
}

/** Útil para los tests y para un endpoint de mantenimiento. */
export function limpiarCache() {
  cache.clear();
}
