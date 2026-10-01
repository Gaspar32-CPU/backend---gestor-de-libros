/* ================================================================== */
/* Acceso HTTP                                                         */
/* ================================================================== */

import { ESPERA_429_MS, REINTENTOS_429, TIMEOUT_MS } from "./config.js";

function esperar(ms) {
  return new Promise((resolver) => setTimeout(resolver, ms));
}

/**
 * Corta la espera si la fuente externa se cuelga. Sin esto, una API lenta
 * deja al admin mirando un spinner eterno.
 *
 * Cada llamada crea su propio AbortController: si se compartiera, el timeout
 * de una request abortaría también a las otras del Promise.allSettled.
 */
async function fetchConTimeout(url) {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), TIMEOUT_MS);

  try {
    return await fetch(url, { signal: controlador.signal });
  } finally {
    clearTimeout(temporizador);
  }
}

/**
 * Pide una URL y devuelve el JSON parseado.
 * Lanza error si la respuesta no fue 2xx: eso es una falla de la fuente,
 * distinta de "la fuente respondió bien pero no conoce el ISBN".
 * Reintenta ante un 429 (rate limit), que casi siempre es transitorio.
 */
export async function pedirJson(url, nombreFuente, reintentos = REINTENTOS_429) {
  const res = await fetchConTimeout(url);

  if (res.status === 429 && reintentos > 0) {
    const segundos = Number(res.headers.get("retry-after"));
    const espera = Number.isFinite(segundos) && segundos > 0 ? segundos * 1000 : ESPERA_429_MS;

    console.warn(`[isbn] ${nombreFuente} devolvió 429, reintentando en ${espera}ms`);
    await esperar(espera);

    return pedirJson(url, nombreFuente, reintentos - 1);
  }

  if (!res.ok) {
    throw new Error(`${nombreFuente} respondió ${res.status}`);
  }

  return res.json();
}