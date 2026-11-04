import { Router } from 'express'
import multer from 'multer'
import { randomUUID } from 'crypto'
import { verificarToken, verificarAdmin } from '../middlewares/auth.js'
import {
  insertarLibros,
  leerLibrosDelBuffer,
  prepararLibros,
} from '../services/crearLibrosExcel.js'

const router = Router()

const TAMANO_MAXIMO_BYTES = 5 * 1024 * 1024
const MAX_FILAS = 1000

// Importar puede tardar minutos (consulta el ISBN de cada libro incompleto),
// más de lo que aguanta un request HTTP. Por eso la importación corre en segundo
// plano y el front consulta el avance. Los trabajos viven en memoria: si el
// servidor se reinicia se pierden, y hay que volver a subir el archivo.
const VIDA_DEL_TRABAJO_MS = 60 * 60 * 1000
const trabajos = new Map()

function descartarVencidos() {
  const limite = Date.now() - VIDA_DEL_TRABAJO_MS
  for (const [id, trabajo] of trabajos) {
    if (trabajo.creado < limite) trabajos.delete(id)
  }
}

// El archivo se lee desde memoria: no se guarda nada en disco.
const subirExcel = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: TAMANO_MAXIMO_BYTES },
  fileFilter: (req, file, cb) => cb(null, /\.xlsx$/i.test(file.originalname)),
}).single('excel')

function recibirExcel(req, res, next) {
  subirExcel(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        error: 'archivo_invalido',
        mensaje:
          error.code === 'LIMIT_FILE_SIZE'
            ? 'El archivo supera los 5 MB.'
            : 'No se pudo leer el archivo.',
      })
    }
    if (!req.file) {
      return res.status(400).json({
        error: 'archivo_invalido',
        mensaje: 'Subí un archivo Excel (.xlsx).',
      })
    }
    next()
  })
}

// Un trabajo solo lo ve la organización que lo creó
function buscarTrabajo(req, res) {
  const trabajo = trabajos.get(req.params.id)
  if (!trabajo || trabajo.idOrganizacion !== req.usuario.organizacionId) {
    res.status(404).json({
      error: 'no_encontrado',
      mensaje: 'La importación no existe o venció. Volvé a subir el archivo.',
    })
    return null
  }
  return trabajo
}

/**
 * POST /api/libros/importar
 *
 * Recibe el Excel (campo "excel") y empieza a validarlo en segundo plano.
 * NO guarda libros: eso lo hace /importar/:id/confirmar.
 */
router.post(
  '/importar',
  verificarToken,
  verificarAdmin,
  recibirExcel,
  (req, res) => {
    let libros
    try {
      libros = leerLibrosDelBuffer(req.file.buffer)
    } catch {
      return res.status(400).json({
        error: 'excel_ilegible',
        mensaje: 'No se pudo leer el Excel. Revisá que sea un .xlsx válido.',
      })
    }

    if (libros.length === 0 || libros.length > MAX_FILAS) {
      return res.status(400).json({
        error: 'excel_tamano',
        mensaje: `El Excel tiene que tener entre 1 y ${MAX_FILAS} filas de libros.`,
      })
    }

    descartarVencidos()

    const trabajo = {
      id: randomUUID(),
      idOrganizacion: req.usuario.organizacionId,
      creado: Date.now(),
      estado: 'procesando',
      procesados: 0,
      total: libros.length,
      listos: [],
      rechazados: [],
      insertados: 0,
      mensaje: null,
    }
    trabajos.set(trabajo.id, trabajo)

    prepararLibros(
      libros,
      trabajo.idOrganizacion,
      ({ procesados }) => {
        trabajo.procesados = procesados
      },
      () => trabajo.cancelado,
    )
      .then(({ listos, rechazados }) => {
        trabajo.listos = listos
        trabajo.rechazados = rechazados
        trabajo.procesados = trabajo.total
        trabajo.estado = 'listo'
      })
      .catch((error) => {
        if (trabajo.cancelado) return
        console.error('[importar] Falló la importación:', error.message)
        trabajo.estado = 'error'
        trabajo.mensaje = 'La importación falló. Intentá de nuevo.'
      })

    res.status(202).json({ id: trabajo.id, total: trabajo.total })
  },
)

/**
 * GET /api/libros/importar/:id
 *
 * Avance de la importación. Cuando termina (estado "listo") trae la vista previa:
 * los libros que se van a cargar y los rechazados con su motivo.
 */
router.get('/importar/:id', verificarToken, verificarAdmin, (req, res) => {
  const trabajo = buscarTrabajo(req, res)
  if (!trabajo) return

  const { estado, procesados, total, insertados, mensaje } = trabajo
  const respuesta = { estado, procesados, total, insertados, mensaje }

  if (estado === 'listo' || estado === 'insertando' || estado === 'insertado') {
    respuesta.listos = trabajo.listos.map((libro) => ({
      fila: libro.filaExcel,
      titulo: libro.titulo,
      autor: libro.autor,
      codigoInterno: libro.codigo_interno,
      origen: libro.origen,
    }))
    respuesta.rechazados = trabajo.rechazados
  }

  res.json(respuesta)
})

/**
 * DELETE /api/libros/importar/:id
 *
 * Cancela la importación: corta la validación (si sigue en curso) y descarta
 * el trabajo. No se puede cancelar mientras se está guardando en la base.
 */
router.delete('/importar/:id', verificarToken, verificarAdmin, (req, res) => {
  const trabajo = buscarTrabajo(req, res)
  if (!trabajo) return

  if (trabajo.estado === 'insertando') {
    return res.status(409).json({
      error: 'estado_invalido',
      mensaje: 'Los libros se están guardando, no se puede cancelar.',
    })
  }

  trabajo.cancelado = true
  trabajos.delete(trabajo.id)
  res.status(204).end()
})

/**
 * POST /api/libros/importar/:id/confirmar
 *
 * Guarda en la base los libros de la vista previa, todos o ninguno.
 */
router.post(
  '/importar/:id/confirmar',
  verificarToken,
  verificarAdmin,
  async (req, res) => {
    const trabajo = buscarTrabajo(req, res)
    if (!trabajo) return

    if (trabajo.estado !== 'listo') {
      return res.status(409).json({
        error: 'estado_invalido',
        mensaje:
          trabajo.estado === 'insertado'
            ? 'Esta importación ya se guardó.'
            : 'La importación todavía no terminó de validarse.',
      })
    }

    // Se marca antes de insertar para que un doble clic no cargue todo dos veces
    trabajo.estado = 'insertando'

    try {
      trabajo.insertados = await insertarLibros(
        trabajo.listos,
        trabajo.idOrganizacion,
      )
      trabajo.estado = 'insertado'
      res.json({ insertados: trabajo.insertados })
    } catch (error) {
      console.error('[importar] Falló la inserción:', error.message)
      trabajo.estado = 'listo'
      res.status(500).json({
        error: 'error_al_guardar',
        mensaje: 'No se pudieron guardar los libros. No se guardó ninguno.',
      })
    }
  },
)

export default router
