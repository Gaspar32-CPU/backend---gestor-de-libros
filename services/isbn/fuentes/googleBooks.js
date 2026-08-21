/* ================================================================== */
/* Fuente: Google Books                                                */
/* ================================================================== */

import { pedirJson } from "../http.js";
import {
  extraerAnio,
  limpiarCategorias,
  quitarHtml,
  traducirIdioma,
  unirTexto,
} from "../normalizar.js";

/**
 * La key se lee en cada llamada, no al cargar el módulo: si dotenv se
 * configura después del require, igual la encontramos.
 */
function urlGoogleBooks(isbn) {
  const key = process.env.GOOGLE_BOOKS_KEY;
  const base = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`;

  return key ? `${base}&key=${key}` : base;
}

/** Las portadas de Google llegan por http y con parámetros que las afean. */
function portadaGoogle(imageLinks) {
  const url = imageLinks?.thumbnail ?? imageLinks?.smallThumbnail;
  if (!url) return "";

  return url
    .replace("http://", "https://")
    .replace("&edge=curl", "")
    .replace("zoom=1", "zoom=2");
}

function normalizarGoogle(info) {
  return {
    fuente: "Google Books",
    titulo: unirTexto([info.title, info.subtitle]),
    autor: info.authors?.join(", ") ?? "",
    editorial: info.publisher ?? "",
    anio: extraerAnio(info.publishedDate),
    paginas: info.pageCount ?? null,
    descripcion: quitarHtml(info.description),
    categorias: limpiarCategorias(info.categories),
    idioma: traducirIdioma(info.language),
    codigoIdioma: info.language ?? "",
    portada: portadaGoogle(info.imageLinks),
  };
}

export async function consultarGoogleBooks(isbn) {
  const data = await pedirJson(urlGoogleBooks(isbn), "Google Books");
  const info = data.items?.[0]?.volumeInfo;

  // La API funcionó, pero no encontró el libro.
  // Ojo: Google a veces manda totalItems > 0 sin array items.
  if (!info) return null;

  return normalizarGoogle(info);
}