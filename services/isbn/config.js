/* ================================================================== */
/* Configuración                                                       */
/* ================================================================== */

export const TIMEOUT_MS = 6000;

// Un 429 suele ser transitorio: vale reintentar una vez antes de rendirse.
export const REINTENTOS_429 = 1;
export const ESPERA_429_MS = 1000;

// Un resultado positivo es estable: el título de un libro no cambia.
// Un negativo puede ser un typo del admin, así que caduca rápido.
export const CACHE_TTL_OK_MS = 1000 * 60 * 60 * 24; // 24 horas
export const CACHE_TTL_NULL_MS = 1000 * 60 * 10; //    10 minutos
export const CACHE_MAX_ENTRADAS = 500;

// Cuántas categorías guardamos como máximo por libro.
export const MAX_CATEGORIAS = 5;