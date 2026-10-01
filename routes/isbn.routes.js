import { Router } from "express";
import {
  buscarLibroPorIsbn,
  limpiarIsbn,
  isbnEsValido,
} from "../services/isbn/index.js";

const router = Router();

/**
 * GET /api/libros/isbn/:isbn
 *
 * Devuelve los metadatos de un libro para autocompletar el formulario de alta.
 * NO guarda nada: solo consulta. El alta la hace POST /api/libros.
 *
 * Códigos de respuesta:
 *   200 - Se encontró el libro.
 *   400 - El ISBN está mal formado (falla el dígito de control).
 *   404 - El ISBN es válido pero ninguna fuente lo conoce.
 *   503 - Las fuentes externas no responden. El front ofrece carga manual.
 */
router.get("/isbn/:isbn", async (req, res) => {
  const isbn = limpiarIsbn(req.params.isbn);

  if (!isbnEsValido(isbn)) {
    return res.status(400).json({
      error: "isbn_invalido",
      mensaje: "El ISBN no es válido. Tiene que tener 10 o 13 dígitos correctos.",
    });
  }

  try {
    const libro = await buscarLibroPorIsbn(isbn);

    if (!libro) {
      return res.status(404).json({
        error: "no_encontrado",
        mensaje: "Ninguna fuente tiene datos para este ISBN.",
      });
    }

    return res.json({ libro });
  } catch (error) {
    console.error("[isbn] Error consultando fuentes:", error.message);
    return res.status(503).json({
      error: "fuentes_no_disponibles",
      mensaje: "No se pudo consultar el servicio de datos en este momento.",
    });
  }
});

export default router;