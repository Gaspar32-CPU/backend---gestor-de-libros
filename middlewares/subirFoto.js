// middlewares/subirFoto.js
//
// Recibe la foto de perfil de un usuario (campo "foto" de un
// multipart/form-data) y la guarda en uploads/avatars/. Mismo patrón que
// middlewares/subirLogo.js para el logo de organización: un multer propio
// por tipo de archivo, envuelto para responder con el formato de error de
// la API en vez de caer en el 500 genérico.
import fs from 'node:fs'
import path from 'node:path'
import multer from 'multer'
import { CARPETA_UPLOADS } from './subirLogo.js'

export const CARPETA_AVATARES = path.join(CARPETA_UPLOADS, 'avatars')

fs.mkdirSync(CARPETA_AVATARES, { recursive: true })

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
    destination: CARPETA_AVATARES,
    // El timestamp hace que cada foto tenga una URL nueva, así el navegador
    // no muestra la anterior desde la caché.
    filename: (req, file, cb) =>
      cb(
        null,
        `usuario-${parseInt(req.params.id)}-${Date.now()}${EXTENSIONES[file.mimetype]}`,
      ),
  }),
  limits: { fileSize: MAX_MB * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => cb(null, file.mimetype in EXTENSIONES),
}).single('foto')

export function subirFoto(req, res, next) {
  subida(req, res, (err) => {
    if (err?.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'archivo_muy_grande',
        mensaje: `La foto no puede superar los ${MAX_MB} MB.`,
      })
    }
    if (err) return next(err)

    if (!req.file) {
      return res.status(400).json({
        error: 'archivo_invalido',
        mensaje: 'Mandá una imagen PNG, JPG o WEBP en el campo "foto".',
      })
    }
    next()
  })
}

// Borra el archivo de una foto a partir de su URL guardada en la DB. Solo
// toca archivos dentro de uploads/avatars.
export function borrarArchivoFoto(url) {
  if (!url?.startsWith('/uploads/avatars/')) return
  const archivo = path.join(CARPETA_AVATARES, path.basename(url))
  fs.rm(archivo, { force: true }, (err) => {
    if (err) console.error('[foto] no se pudo borrar', archivo, err.message)
  })
}
