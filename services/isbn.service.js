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
 * Escrito en CommonJS (require/module.exports) para que coincida con server.js.
 */

const GOOGLE_BOOKS_KEY = process.env.GOOGLE_BOOKS_KEY;
const TIMEOUT_MS = 6000;

/* ------------------------------------------------------------------ */
/* Validación                                                          */
/* ------------------------------------------------------------------ */

function limpiarIsbn(valor = "") {
  return String(valor).replace(/[^0-9Xx]/g, "").toUpperCase();
}

// Verifica el dígito de control del ISBN (10 o 13 dígitos).
function isbnEsValido(isbn) {
  if (isbn.length === 10) {
    let suma = 0;
    for (let i = 0; i < 9; i++) {
      if (!/\d/.test(isbn[i])) return false;
      suma += (10 - i) * Number(isbn[i]);
    }
    const control = isbn[9] === "X" ? 10 : Number(isbn[9]);
    if (Number.isNaN(control)) return false;
    return (suma + control) % 11 === 0;
  }

  if (isbn.length === 13) {
    if (!/^\d{13}$/.test(isbn)) return false;
    let suma = 0;
    for (let i = 0; i < 13; i++) {
      suma += Number(isbn[i]) * (i % 2 === 0 ? 1 : 3);
    }
    return suma % 10 === 0;
  }

  return false;
}

/* ------------------------------------------------------------------ */
/* Caché en memoria                                                    */
/* ------------------------------------------------------------------ */

/**
 * Un mismo ISBN suele consultarse varias veces (el admin recarga, se equivoca
 * y vuelve, carga varios ejemplares del mismo título). Guardarlo en memoria
 * ahorra cuota de la API y hace la respuesta instantánea.
 *
 * Es memoria del proceso: se pierde al reiniciar el servicio. Está bien,
 * es un caché, no una base de datos.
 */
const cache = new Map();
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 horas

function leerDeCache(isbn) {
  const entrada = cache.get(isbn);
  if (!entrada) return null;
  if (Date.now() - entrada.guardadoEn > CACHE_TTL_MS) {
    cache.delete(isbn);
    return null;
  }
  return entrada.valor;
}

function guardarEnCache(isbn, valor) {
  cache.set(isbn, { valor, guardadoEn: Date.now() });
}

/* ------------------------------------------------------------------ */
/* Fuentes externas                                                    */
/* ------------------------------------------------------------------ */

// Corta la espera si la fuente externa se cuelga. Sin esto, una API lenta
// deja al admin mirando un spinner eterno.
async function fetchConTimeout(url) {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controlador.signal });
  } finally {
    clearTimeout(temporizador);
  }
}

async function consultarGoogleBooks(isbn) {
  // Formato exacto del endpoint: .../volumes?q=isbn:9783988288820&key=TU_KEY
  // La key se agrega solo si está configurada: sin ella la consulta también
  // funciona, apenas con una cuota más baja.
  const url =
    `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}` +
    (GOOGLE_BOOKS_KEY ? `&key=${GOOGLE_BOOKS_KEY}` : "");

  const res = await fetchConTimeout(url);
  if (!res.ok) throw new Error(`Google Books respondió ${res.status}`);

  const data = await res.json();
  const info = data.items?.[0]?.volumeInfo;
  if (!info) return null;

  const libro = {
    fuente: "Google Books",
    titulo: [info.title, info.subtitle].filter(Boolean).join(": "),
    autor: info.authors?.join(", ") ?? "",
    editorial: info.publisher ?? "",
    anio: info.publishedDate ? Number(info.publishedDate.slice(0, 4)) : null,
    paginas: info.pageCount ?? null,
    descripcion: info.description ?? "",
    categorias: info.categories ?? [],
    idioma: info.language ?? "",
    portada:
      info.imageLinks?.thumbnail
        ?.replace("http://", "https://")
        .replace("&edge=curl", "") ?? "",
  };
  return libro;
}

async function consultarOpenLibrary(isbn) {
  const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`;

  const res = await fetchConTimeout(url);
  if (!res.ok) throw new Error(`Open Library respondió ${res.status}`);

  const data = await res.json();
  const libroCrudo = data[`ISBN:${isbn}`];
  if (!libroCrudo) return null;

  
  const libro = {
    fuente: "Open Library",
    titulo: [libroCrudo.title, libroCrudo.subtitle].filter(Boolean).join(": "),
    autor: libroCrudo.authors?.map((a) => a.name).join(", ") ?? "",
    editorial: libroCrudo.publishers?.map((p) => p.name).join(", ") ?? "",
    anio: libroCrudo.publish_date?.match(/\d{4}/)
      ? Number(libroCrudo.publish_date.match(/\d{4}/)[0])
      : null,
    paginas: libroCrudo.number_of_pages ?? null,
    descripcion: libroCrudo.excerpts?.[0]?.text ?? "",
    categorias: libroCrudo.subjects?.slice(0, 5).map((s) => s.name) ?? [],
    idioma: "",
    portada: libroCrudo.cover?.medium ?? libroCrudo.cover?.large ?? "",
  };

  return libro;
}

/* ------------------------------------------------------------------ */
/* Función principal                                                   */
/* ------------------------------------------------------------------ */

/**
 * Busca los datos de un libro por ISBN.
 * Devuelve el objeto normalizado, o null si ninguna fuente lo conoce.
 * Lanza error solo si TODAS las fuentes fallaron por problemas de conexión.
 */
async function buscarLibroPorIsbn(isbnLimpio) {
  const enCache = leerDeCache(isbnLimpio);
  if (enCache !== null) return enCache;

  const fuentes = [consultarGoogleBooks, consultarOpenLibrary];
  let huboFallaTecnica = false;

  for (const consultar of fuentes) {
    try {
      const resultado = await consultar(isbnLimpio);
      if (resultado) {
        const libro = { ...resultado, isbn: isbnLimpio };
        guardarEnCache(isbnLimpio, libro);
        return libro;
      }
      // Respondió bien pero no conoce el ISBN: seguimos con la próxima fuente.
    } catch (error) {
      // Si una fuente se cae, no cortamos: probamos la siguiente.
      huboFallaTecnica = true;
      console.error(`[isbn] Falló una fuente para ${isbnLimpio}:`, error.message);
    }
  }

  if (huboFallaTecnica) {
    throw new Error("Las fuentes externas no están disponibles");
  }

  // Todas respondieron y ninguna lo tiene: el ISBN no existe en los catálogos.
  guardarEnCache(isbnLimpio, null);
  return null;
}

module.exports = { buscarLibroPorIsbn, limpiarIsbn, isbnEsValido };