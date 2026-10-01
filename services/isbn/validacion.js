/* ================================================================== */
/* Validación de ISBN                                                  */
/* ================================================================== */

/** Deja solo dígitos y la X final del ISBN-10. Tolera guiones y espacios. */
export function limpiarIsbn(valor = "") {
  return String(valor)
    .replace(/[^0-9Xx]/g, "")
    .toUpperCase();
}

/** Validar dígito de control del ISBN-10: suma ponderada 10..1, módulo 11. */
export function validarIsbn10(isbn) {
  let suma = 0;

  for (let i = 0; i < 9; i++) {
    if (!/\d/.test(isbn[i])) return false;
    suma += (10 - i) * Number(isbn[i]);
  }

  const control = isbn[9] === "X" ? 10 : Number(isbn[9]);
  if (Number.isNaN(control)) return false;

  return (suma + control) % 11 === 0;
}

/** Validar dígito de control del ISBN-13: pesos alternados 1 y 3, módulo 10. */
export function validarIsbn13(isbn) {
  if (!/^\d{13}$/.test(isbn)) return false;

  let suma = 0;
  for (let i = 0; i < 13; i++) {
    suma += Number(isbn[i]) * (i % 2 === 0 ? 1 : 3);
  }

  return suma % 10 === 0;
}

/** Verifica el dígito de control de un ISBN ya limpio (10 o 13 dígitos). */
export function isbnEsValido(isbn) {
  if (isbn.length === 10) return validarIsbn10(isbn);
  if (isbn.length === 13) return validarIsbn13(isbn);
  return false;
}