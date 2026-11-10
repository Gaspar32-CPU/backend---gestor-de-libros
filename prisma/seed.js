// prisma/seed.js
//
// Seed mínimo para desarrollo: una sola organización (Ánima), un admin y un
// grupo de lectores, un catálogo de libros, y préstamos y reseñas que
// vinculan a esos lectores con esos libros para poder probar el front sin
// tener que cargar datos a mano.
//
// Usa el mismo pool de mysql2 que usa el resto del backend (ver repos.js),
// no el cliente generado por Prisma, porque la app tampoco lo usa en runtime.
import 'dotenv/config'
import bcrypt from 'bcrypt'
import { pool } from '../db.js'

const DOMINIO_ANIMA = 'anima.edu.uy'
const EMAIL_ADMIN = `admin@${DOMINIO_ANIMA}`
const CONTRASENA_POR_DEFECTO = 'password123'
const LUGAR_RETIRO = 'Sala de tutores'

// Un día en milisegundos, para ubicar fechas de préstamo en el pasado o el
// futuro sin depender de una librería de fechas.
const UN_DIA_MS = 24 * 60 * 60 * 1000
const diasDesdeHoy = (dias) => new Date(Date.now() + dias * UN_DIA_MS)

// Mismo equipo que aparece en los documentos del proyecto (ver
// references/requisitos.md de la skill), reutilizado acá como lectores de
// prueba para no inventar nombres sueltos. El correo va sin tildes, como en
// el resto de la base.
const LECTORES = [
  {
    ci: '10100001',
    nombre: 'Mauro',
    apellido: 'Aires',
    correo: `mauro.aires@${DOMINIO_ANIMA}`,
    telefono: '099100001',
  },
  {
    ci: '10100002',
    nombre: 'Angelina',
    apellido: 'López',
    correo: `angelina.lopez@${DOMINIO_ANIMA}`,
    telefono: '099100002',
  },
  {
    ci: '10100003',
    nombre: 'Alex',
    apellido: 'Vasconcelo',
    correo: `alex.vasconcelo@${DOMINIO_ANIMA}`,
    telefono: '099100003',
  },
  {
    ci: '10100004',
    nombre: 'Valentina',
    apellido: 'Barrios',
    correo: `valentina.barrios@${DOMINIO_ANIMA}`,
    telefono: '099100004',
  },
  {
    ci: '10100005',
    nombre: 'Luciano',
    apellido: 'Vargas',
    correo: `luciano.vargas@${DOMINIO_ANIMA}`,
    telefono: '099100005',
  },
  {
    ci: '10100006',
    nombre: 'Ariana',
    apellido: 'Rodríguez',
    correo: `ariana.rodriguez@${DOMINIO_ANIMA}`,
    telefono: '099100006',
  },
  {
    ci: '10100007',
    nombre: 'Gianna',
    apellido: 'Vasconcelo',
    correo: `gianna.vasconcelo@${DOMINIO_ANIMA}`,
    telefono: '099100007',
  },
  {
    ci: '10100008',
    nombre: 'Leandro',
    apellido: 'Benítez',
    correo: `leandro.benitez@${DOMINIO_ANIMA}`,
    telefono: '099100008',
  },
]

const LIBROS = [
  {
    titulo: 'Cien años de soledad',
    autor: 'Gabriel García Márquez',
    generos: ['Realismo mágico', 'Clásico'],
    editorial: 'Sudamericana',
    isbn: '9780307474728',
    fecha_pub: '1967-05-30',
    resumen: 'La saga de la familia Buendía en el pueblo de Macondo.',
    idioma: 'Español',
    resena: {
      calificacion: 5,
      comentario: 'Una obra maestra, la prosa es hipnótica.',
    },
  },
  {
    titulo: '1984',
    autor: 'George Orwell',
    generos: ['Distopía', 'Ciencia ficción'],
    editorial: 'Secker & Warburg',
    isbn: '9780451524935',
    fecha_pub: '1949-06-08',
    resumen:
      'Un régimen totalitario vigila cada pensamiento de sus ciudadanos.',
    idioma: 'Español',
    resena: { calificacion: 5, comentario: 'Vigente hoy más que nunca.' },
  },
  {
    titulo: 'Rayuela',
    autor: 'Julio Cortázar',
    generos: ['Clásico', 'Literatura experimental'],
    editorial: 'Sudamericana',
    isbn: '9788437604572',
    fecha_pub: '1963-06-28',
    resumen: 'Una novela que puede leerse en varios órdenes distintos.',
    idioma: 'Español',
    resena: { calificacion: 4, comentario: 'Exigente pero vale la pena.' },
  },
  {
    titulo: 'El principito',
    autor: 'Antoine de Saint-Exupéry',
    generos: ['Fábula', 'Infantil'],
    editorial: 'Reynal & Hitchcock',
    isbn: '9780156012195',
    fecha_pub: '1943-04-06',
    resumen:
      'Un aviador perdido en el desierto conoce a un pequeño príncipe viajero.',
    idioma: 'Español',
    resena: {
      calificacion: 5,
      comentario: 'Un clásico para releer a cualquier edad.',
    },
  },
  {
    titulo: 'Crónica de una muerte anunciada',
    autor: 'Gabriel García Márquez',
    generos: ['Clásico', 'Drama'],
    editorial: 'La Oveja Negra',
    isbn: '9780307387849',
    fecha_pub: '1981-01-01',
    resumen: 'La reconstrucción de un crimen anunciado que nadie evitó.',
    idioma: 'Español',
    resena: {
      calificacion: 4,
      comentario: 'Corto, intenso y muy bien narrado.',
    },
  },
  {
    titulo: 'Fahrenheit 451',
    autor: 'Ray Bradbury',
    generos: ['Ciencia ficción', 'Distopía'],
    editorial: 'Ballantine Books',
    isbn: '9781451673319',
    fecha_pub: '1953-10-19',
    resumen: 'Una sociedad donde los libros están prohibidos y se queman.',
    idioma: 'Español',
    resena: {
      calificacion: 4,
      comentario: 'Una crítica muy actual al conformismo.',
    },
  },
  {
    titulo: 'Orgullo y prejuicio',
    autor: 'Jane Austen',
    generos: ['Romance', 'Clásico'],
    editorial: 'T. Egerton',
    isbn: '9780141439518',
    fecha_pub: '1813-01-28',
    resumen: 'Elizabeth Bennet y el señor Darcy chocan antes de enamorarse.',
    idioma: 'Español',
    resena: { calificacion: 5, comentario: 'Los diálogos son una delicia.' },
  },
  {
    titulo: 'El Hobbit',
    autor: 'J. R. R. Tolkien',
    generos: ['Fantasía', 'Aventura'],
    editorial: 'George Allen & Unwin',
    isbn: '9780547928227',
    fecha_pub: '1937-09-21',
    resumen: 'Bilbo Bolsón se embarca en una aventura inesperada.',
    idioma: 'Español',
    resena: {
      calificacion: 5,
      comentario: 'Ideal para entrar al mundo de Tolkien.',
    },
  },
  {
    titulo: 'Harry Potter y la piedra filosofal',
    autor: 'J. K. Rowling',
    generos: ['Fantasía', 'Juvenil'],
    editorial: 'Bloomsbury',
    isbn: '9780747532699',
    fecha_pub: '1997-06-26',
    resumen:
      'Un niño descubre que es un mago el día de su cumpleaños número once.',
    idioma: 'Español',
  },
  {
    titulo: 'Matar a un ruiseñor',
    autor: 'Harper Lee',
    generos: ['Drama', 'Clásico'],
    editorial: 'J. B. Lippincott & Co.',
    isbn: '9780061120084',
    fecha_pub: '1960-07-11',
    resumen: 'La infancia de Scout Finch en el sur racista de Estados Unidos.',
    idioma: 'Español',
  },
  {
    titulo: 'El señor de los anillos: La comunidad del anillo',
    autor: 'J. R. R. Tolkien',
    generos: ['Fantasía', 'Aventura'],
    editorial: 'George Allen & Unwin',
    isbn: '9780544003415',
    fecha_pub: '1954-07-29',
    resumen: 'Frodo emprende el viaje para destruir el Anillo Único.',
    idioma: 'Español',
  },
  {
    titulo: 'Crimen y castigo',
    autor: 'Fiódor Dostoyevski',
    generos: ['Clásico', 'Drama psicológico'],
    editorial: 'The Russian Messenger',
    isbn: '9780486454115',
    fecha_pub: '1866-01-01',
    resumen: 'Un estudiante comete un asesinato y carga con la culpa.',
    idioma: 'Español',
  },
  {
    titulo: 'La sombra del viento',
    autor: 'Carlos Ruiz Zafón',
    generos: ['Misterio', 'Drama'],
    editorial: 'Planeta',
    isbn: '9788408043645',
    fecha_pub: '2001-01-01',
    resumen:
      'Un joven encuentra un libro que cambiará su destino en la Barcelona de posguerra.',
    idioma: 'Español',
  },
  {
    titulo: 'Ficciones',
    autor: 'Jorge Luis Borges',
    generos: ['Cuentos', 'Literatura fantástica'],
    editorial: 'Sur',
    isbn: '9788466332079',
    fecha_pub: '1944-01-01',
    resumen: 'Una colección de relatos sobre laberintos, espejos e infinitos.',
    idioma: 'Español',
  },
  {
    titulo: 'Drácula',
    autor: 'Bram Stoker',
    generos: ['Terror', 'Clásico'],
    editorial: 'Archibald Constable and Company',
    isbn: '9780141439846',
    fecha_pub: '1897-05-26',
    resumen: 'El conde Drácula intenta mudarse de Transilvania a Inglaterra.',
    idioma: 'Español',
  },
  {
    titulo: 'Frankenstein',
    autor: 'Mary Shelley',
    generos: ['Terror', 'Ciencia ficción'],
    editorial: 'Lackington, Hughes, Harding, Mavor & Jones',
    isbn: '9780141439471',
    fecha_pub: '1818-01-01',
    resumen: 'Un científico da vida a una criatura que termina rechazando.',
    idioma: 'Español',
  },
  {
    titulo: 'El alquimista',
    autor: 'Paulo Coelho',
    generos: ['Ficción', 'Filosofía'],
    editorial: 'Rocco',
    isbn: '9780061122415',
    fecha_pub: '1988-01-01',
    resumen: 'Un pastor andaluz viaja en busca de un tesoro y de sí mismo.',
    idioma: 'Español',
  },
  {
    titulo: 'Los juegos del hambre',
    autor: 'Suzanne Collins',
    generos: ['Distopía', 'Juvenil'],
    editorial: 'Scholastic',
    isbn: '9780439023528',
    fecha_pub: '2008-09-14',
    resumen: 'Katniss Everdeen compite en un juego televisado a muerte.',
    idioma: 'Español',
  },
  {
    titulo: 'La casa de los espíritus',
    autor: 'Isabel Allende',
    generos: ['Realismo mágico', 'Drama'],
    editorial: 'Plaza & Janés',
    isbn: '9780525433451',
    fecha_pub: '1982-01-01',
    resumen:
      'Varias generaciones de la familia Trueba marcadas por la historia de Chile.',
    idioma: 'Español',
  },
  {
    titulo: 'El retrato de Dorian Gray',
    autor: 'Oscar Wilde',
    generos: ['Clásico', 'Filosofía'],
    editorial: 'Ward, Lock and Company',
    isbn: '9780141439570',
    fecha_pub: '1890-07-01',
    resumen: 'Un hombre permanece joven mientras su retrato envejece por él.',
    idioma: 'Español',
  },
]

async function seed() {
  const conexion = await pool.getConnection()

  try {
    await conexion.beginTransaction()

    const tablas = [
      'notificaciones',
      'reservas',
      'resenas',
      'reportes_problemas',
      'prestamos',
      'libros',
      'configuraciones',
      'usuarios',
      'organizaciones',
      'planes',
    ]
    await conexion.query('SET FOREIGN_KEY_CHECKS = 0')
    for (const tabla of tablas) {
      await conexion.query(`TRUNCATE TABLE ${tabla}`)
    }
    await conexion.query('SET FOREIGN_KEY_CHECKS = 1')

    const [planResultado] = await conexion.query(
      `INSERT INTO planes (nombre, descripcion, precio_mensual, limite_usuarios, activo)
       VALUES (?, ?, ?, ?, ?)`,
      ['Básico', 'Plan de prueba para desarrollo', 0, 500, true],
    )
    const idPlan = planResultado.insertId

    const [orgResultado] = await conexion.query(
      `INSERT INTO organizaciones (nombre, id_plan, dominio, activo)
       VALUES (?, ?, ?, ?)`,
      ['Ánima', idPlan, DOMINIO_ANIMA, true],
    )
    const idOrganizacion = orgResultado.insertId

    const contrasenaHasheada = await bcrypt.hash(CONTRASENA_POR_DEFECTO, 10)
    const [adminResultado] = await conexion.query(
      `INSERT INTO usuarios (id_organizacion, ci, nombre, apellido, email, telefono, contrasena, rol, activo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        idOrganizacion,
        '00000000',
        'Admin',
        'Ánima',
        EMAIL_ADMIN,
        '000000000',
        contrasenaHasheada,
        'admin_organizacion',
        true,
      ],
    )
    const idAdmin = adminResultado.insertId

    const idsLectores = []
    for (const lector of LECTORES) {
      const [lectorResultado] = await conexion.query(
        `INSERT INTO usuarios (id_organizacion, ci, nombre, apellido, email, telefono, contrasena, rol, activo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          idOrganizacion,
          lector.ci,
          lector.nombre,
          lector.apellido,
          lector.correo,
          lector.telefono,
          contrasenaHasheada,
          'lector',
          true,
        ],
      )
      idsLectores.push(lectorResultado.insertId)
    }

    const idsLibros = []
    for (const libro of LIBROS) {
      const [libroResultado] = await conexion.query(
        `INSERT INTO libros (id_organizacion, titulo, autor, generos, editorial, idioma, isbn, fecha_pub, resumen, stock)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          idOrganizacion,
          libro.titulo,
          libro.autor,
          JSON.stringify(libro.generos),
          libro.editorial,
          libro.idioma,
          libro.isbn,
          libro.fecha_pub,
          libro.resumen,
          3,
        ],
      )
      idsLibros.push(libroResultado.insertId)
    }

    // Préstamos y reseñas de prueba: los libros que en LIBROS tienen
    // "resena" quedan como préstamos ya "devuelto" (la reseña se habilita al
    // finalizar el préstamo, ver references/requisitos.md de la skill), uno
    // por lector, repartidos en orden rotando entre los 8 lectores. El resto
    // del catálogo queda sin préstamo, salvo un puñado de libros a los que se
    // les agrega un préstamo en otro estado (activo/atrasado/pendiente de
    // retiro) para poder probar esas vistas. Es a propósito que no todos los
    // libros tengan préstamo: el proyecto parte de una circulación muy baja
    // (2-3 préstamos por semana), no de un catálogo todo prestado.
    let totalPrestamos = 0
    let totalResenas = 0

    for (const [indice, libro] of LIBROS.entries()) {
      if (!libro.resena) continue

      const idLibro = idsLibros[indice]
      const idLector = idsLectores[indice % idsLectores.length]

      // Préstamo ya devuelto, a tiempo (unos días antes del vencimiento),
      // para poder mostrar historial además del estado actual.
      await conexion.query(
        `INSERT INTO prestamos (id_usuario, id_libro, id_organizacion, fecha_prestamo, fecha_devolucion_esperada, fecha_devolucion_real, lugar_retiro, estado)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          idLector,
          idLibro,
          idOrganizacion,
          diasDesdeHoy(-60),
          diasDesdeHoy(-30),
          diasDesdeHoy(-35),
          LUGAR_RETIRO,
          'devuelto',
        ],
      )
      totalPrestamos += 1

      await conexion.query(
        `INSERT INTO resenas (id_usuario, id_libro, id_organizacion, calificacion, comentario)
         VALUES (?, ?, ?, ?, ?)`,
        [
          idLector,
          idLibro,
          idOrganizacion,
          libro.resena.calificacion,
          libro.resena.comentario,
        ],
      )
      totalResenas += 1
    }

    // Un préstamo de cada estado restante, sobre libros que todavía no
    // tienen uno (los que no llevan "resena" arriba), para cubrir las vistas
    // de "mis préstamos" y de biblioteca en distintas situaciones.
    const indicesLibresDePrestamo = LIBROS.map((_, indice) => indice).filter(
      (indice) => !LIBROS[indice].resena,
    )
    const prestamosExtra = [
      {
        // En curso, todavía dentro de plazo.
        estado: 'activo',
        fechaPrestamo: diasDesdeHoy(-10),
        fechaEsperada: diasDesdeHoy(20),
        fechaReal: null,
      },
      {
        // En curso, sin devolver, pasado el plazo.
        estado: 'atrasado',
        fechaPrestamo: diasDesdeHoy(-45),
        fechaEsperada: diasDesdeHoy(-15),
        fechaReal: null,
      },
      {
        // Recién pedido, esperando que el lector lo retire.
        estado: 'pendiente_retiro',
        fechaPrestamo: diasDesdeHoy(0),
        fechaEsperada: diasDesdeHoy(30),
        fechaReal: null,
      },
    ]

    for (const [posicion, prestamo] of prestamosExtra.entries()) {
      const indiceLibro = indicesLibresDePrestamo[posicion]
      if (indiceLibro === undefined) break

      await conexion.query(
        `INSERT INTO prestamos (id_usuario, id_libro, id_organizacion, fecha_prestamo, fecha_devolucion_esperada, fecha_devolucion_real, lugar_retiro, estado)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          idsLectores[posicion % idsLectores.length],
          idsLibros[indiceLibro],
          idOrganizacion,
          prestamo.fechaPrestamo,
          prestamo.fechaEsperada,
          prestamo.fechaReal,
          LUGAR_RETIRO,
          prestamo.estado,
        ],
      )
      totalPrestamos += 1
    }

    await conexion.commit()
    console.log(
      `Seed completo: organización "${DOMINIO_ANIMA}", admin "${EMAIL_ADMIN}" (contraseña: ${CONTRASENA_POR_DEFECTO}), ${LECTORES.length} lectores, ${LIBROS.length} libros, ${totalPrestamos} préstamos, ${totalResenas} reseñas.`,
    )
  } catch (error) {
    await conexion.rollback()
    throw error
  } finally {
    conexion.release()
    await pool.end()
  }
}

seed().catch((error) => {
  console.error('Error al ejecutar el seed:', error)
  process.exit(1)
})
