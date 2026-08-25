/* ================================================================== */
/* Helpers de normalización                                            */
/* ================================================================== */

import { MAX_CATEGORIAS } from "./config.js";
import { IDIOMAS } from "./idiomas.js";

/** Une partes de texto ignorando las vacías. Ej: título + subtítulo. */
export function unirTexto(partes, separador = ": ") {
  return partes.filter(Boolean).join(separador);
}

/** Extrae el año de formatos variados: "2004", "2004-05-01", "c1984". */
export function extraerAnio(...candidatos) {
  for (const valor of candidatos) {
    const match = String(valor ?? "").match(/\d{4}/);
    if (match) return Number(match[0]);
  }
  return null;
}

/** Las descripciones de Google vienen con <p>, <br>, <b>. Las limpiamos. */
export function quitarHtml(texto = "") {
  return String(texto)
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Traduce un código de idioma a nombre legible. Si no lo conoce, lo devuelve tal cual. */
export function traducirIdioma(codigo) {
  if (!codigo) return "";
  return IDIOMAS[codigo] ?? codigo;
}

/** Open Library expresa el idioma como "/languages/spa". Nos quedamos con "spa". */
export function extraerCodigoIdioma(languages) {
  const key = languages?.[0]?.key;
  if (!key) return "";
  return key.split("/").pop() ?? "";
}

/** Normaliza una lista de categorías: sin vacíos, sin repetidos, con tope. */
export function limpiarCategorias(lista = []) {
  const vistas = new Set();
  const salida = [];

  for (const item of lista) {
    const texto = String(item ?? "").trim();
    if (!texto) continue;

    const clave = texto.toLowerCase();
    if (vistas.has(clave)) continue;

    vistas.add(clave);
    salida.push(texto);

    if (salida.length === MAX_CATEGORIAS) break;
  }

  return salida;
}

/**
 * Los subjects de Open Library llegan como objetos {name, url} en jscmd=data
 * y como strings planos en jscmd=details y en el work. Acepta las dos formas.
 */
export function nombresDeSubjects(lista = []) {
  return lista.map((s) => (typeof s === "string" ? s : s?.name));
}

/** La descripción de Open Library puede ser string o {type, value}. */
export function textoDeDescripcion(desc) {
  if (!desc) return "";
  return typeof desc === "string" ? desc : (desc.value ?? "");
}

/**
 * Las descripciones de Open Library están escritas por voluntarios: suelen
 * traer markdown y una línea de crédito a la fuente al final.
 */
export function limpiarDescripcionOpenLibrary(texto = "") {
  return String(texto)
    .split(/\n-{3,}|\n*\(\[source\]|\n*\[?source\]?:/i)[0]
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1") // links e imágenes markdown
    .replace(/[*_#>]/g, "")
    .trim();
}