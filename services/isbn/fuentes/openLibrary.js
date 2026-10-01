/* ================================================================== */
/* Fuente: Open Library                                                */
/* ================================================================== */

import { pedirJson } from "../http.js";
import {
  extraerAnio,
  extraerCodigoIdioma,
  limpiarCategorias,
  limpiarDescripcionOpenLibrary,
  nombresDeSubjects,
  quitarHtml,
  textoDeDescripcion,
  traducirIdioma,
  unirTexto,
} from "../normalizar.js";

function urlOpenLibrary(isbn, jscmd) {
  return (
    `https://openlibrary.org/api/books` +
    `?bibkeys=ISBN:${isbn}&format=json&jscmd=${jscmd}`
  );
}

/**
 * `?default=false` evita que Open Library devuelva un PNG blanco de 1x1
 * cuando no tiene portada. Así el front recibe un 404 limpio y puede
 * mostrar su propio placeholder.
 */
function portadaOpenLibrary(isbn) {
  return `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg?default=false`;
}

/** La edición apunta a la obra: {"works": [{"key": "/works/OL...W"}]}. */
function keyDeObra(details) {
  return details.works?.[0]?.key ?? "";
}

/**
 * La descripción de verdad vive en la OBRA, no en la edición. Los excerpts
 * de la edición no sirven: son fragmentos del texto, mezclados entre todas
 * las traducciones existentes (por eso aparecían en inglés).
 */
async function consultarObraOpenLibrary(workKey) {
  const data = await pedirJson(
    `https://openlibrary.org${workKey}.json`,
    "Open Library (work)",
  );

  return {
    descripcion: limpiarDescripcionOpenLibrary(textoDeDescripcion(data.description)),
    subjects: data.subjects ?? [],
  };
}

/**
 * Combina las tres vistas de Open Library:
 *  - jscmd=data    campos "lindos" (autores con nombre, subjects ricos)
 *  - jscmd=details esquema crudo de la edición, con el idioma
 *  - /works/...    la obra, con la descripción real
 */
function normalizarOpenLibrary(isbn, data, details, obra = null) {
  const codigoIdioma = extraerCodigoIdioma(details.languages);

  const subjects = data.subjects?.length
    ? data.subjects
    : (obra?.subjects?.length ? obra.subjects : details.subjects);

  return {
    fuente: "Open Library",
    titulo: unirTexto([
      data.title ?? details.title,
      data.subtitle ?? details.subtitle,
    ]),
    // En el esquema crudo los autores son referencias (/authors/OL...),
    // sin nombre. by_statement es el mejor reemplazo disponible.
    autor:
      data.authors
        ?.map((a) => a.name)
        .filter(Boolean)
        .join(", ") ||
      details.by_statement ||
      "",
    // publishers: objetos {name} en data, strings planos en details.
    editorial:
      data.publishers
        ?.map((p) => p.name)
        .filter(Boolean)
        .join(", ") ||
      details.publishers?.filter(Boolean).join(", ") ||
      "",
    anio: extraerAnio(data.publish_date, details.publish_date),
    paginas: data.number_of_pages ?? details.number_of_pages ?? null,
    // Sin excerpts: o hay sinopsis real, o queda vacío para que lo cargue
    // el admin. Un fragmento del primer párrafo no le sirve a nadie.
    descripcion: quitarHtml(
      limpiarDescripcionOpenLibrary(textoDeDescripcion(details.description)) ||
        obra?.descripcion ||
        "",
    ),
    categorias: limpiarCategorias(nombresDeSubjects(subjects)),
    idioma: traducirIdioma(codigoIdioma),
    codigoIdioma,
    portada: portadaOpenLibrary(isbn),
  };
}

export async function consultarOpenLibrary(isbn) {
  const bibkey = `ISBN:${isbn}`;

  const [resData, resDetails] = await Promise.allSettled([
    pedirJson(urlOpenLibrary(isbn, "data"), "Open Library"),
    pedirJson(urlOpenLibrary(isbn, "details"), "Open Library (details)"),
  ]);

  // data es la fuente principal: si falla, falla toda la consulta.
  if (resData.status === "rejected") {
    throw resData.reason;
  }

  const data = resData.value[bibkey];
  if (!data) return null; // La API funcionó, pero no encontró el ISBN.

  // details es complemento (idioma): si falla, seguimos sin idioma.
  let details = {};
  if (resDetails.status === "fulfilled") {
    details = resDetails.value[bibkey]?.details ?? {};
  } else {
    console.warn(`[isbn] details falló para ${isbn}: ${resDetails.reason.message}`);
  }

  // La obra tiene la descripción. Solo la pedimos si la edición no la trae.
  let obra = null;
  const workKey = keyDeObra(details);

  if (workKey && !textoDeDescripcion(details.description)) {
    try {
      obra = await consultarObraOpenLibrary(workKey);
    } catch (error) {
      console.warn(`[isbn] No se pudo leer la obra ${workKey}: ${error.message}`);
    }
  }

  return normalizarOpenLibrary(isbn, data, details, obra);
}