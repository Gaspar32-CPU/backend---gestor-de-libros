// services/escaparHtml.js
//
// Convierte un valor en texto seguro para meter dentro de HTML. Sin esto,
// un título de libro o un nombre con "<b>" (o algo peor) se interpretaría
// como markup y rompería el email (inyección de HTML).
//
// El & va primero a propósito: si fuera después, convertiría el "&" de
// las entidades ya generadas ("&lt;" pasaría a "&amp;lt;").
export function escaparHtml(valor) {
  if (valor === null || valor === undefined) return '';

  return String(valor)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
