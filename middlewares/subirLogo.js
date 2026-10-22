// middlewares/subirLogo.js
//
// Recibe el logo de una organización (campo "logo" de un multipart/form-data)
// y lo guarda en uploads/logos/. La URL pública la arma el endpoint.
import fs from 'node:fs'
import path from 'node:path'
import multer from 'multer'

export const CARPETA_UPLOADS = path.join(import.meta.dirname, '..', 'uploads')
export const CARPETA_LOGOS = path.join(CARPETA_UPLOADS, 'logos')

fs.mkdirSync(CARPETA_LOGOS, { recursive: true })

const MAX_MB = 2

// Sin SVG a propósito: un SVG puede traer <script> y, servido desde el mismo
// dominio que la API, sería un XSS.
const EXTENSIONES = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
}

const subida = multer({
  storage: multer.diskStorage({
    destination: CARPETA_LOGOS,
    // El timestamp hace que cada logo tenga una URL nueva, así el navegador
    // no muestra el anterior desde la caché.
    filename: (req, file, cb) =>
      cb(
        null,
        `org-${parseInt(req.params.id)}-${Date.now()}${EXTENSIONES[file.mimetype]}`,
      ),
  }),
  limits: { fileSize: MAX_MB * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => cb(null, file.mimetype in EXTENSIONES),
}).single('logo')

// Envuelve a multer para responder con el mismo formato de error que el resto
// de la API en vez de dejar que caiga en el 500 genérico.
export function subirLogo(req, res, next) {
  subida(req, res, (err) => {
    if (err?.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'archivo_muy_grande',
        mensaje: `El logo no puede superar los ${MAX_MB} MB.`,
      })
    }
    if (err) return next(err)

    // fileFilter rechazó el tipo, o no vino ningún archivo en "logo".
    if (!req.file) {
      return res.status(400).json({
        error: 'archivo_invalido',
        mensaje: 'Mandá una imagen PNG, JPG o WEBP en el campo "logo".',
      })
    }
    next()
  })
}

// Borra el archivo de un logo a partir de su URL guardada en la DB. Solo
// toca archivos dentro de uploads/logos, por si la columna tiene una URL
// externa (como la del seed).
export function borrarArchivoLogo(url) {
  if (!url?.startsWith('/uploads/logos/')) return
  const archivo = path.join(CARPETA_LOGOS, path.basename(url))
  fs.rm(archivo, { force: true }, (err) => {
    if (err) console.error('[logo] no se pudo borrar', archivo, err.message)
  })
}
