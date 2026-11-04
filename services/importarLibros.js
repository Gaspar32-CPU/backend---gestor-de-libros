// Uso:
//   node services/importarLibros.js              -> modo prueba: valida y muestra el resumen, no guarda nada
//   node services/importarLibros.js --insertar   -> además guarda los libros listos en la base
import 'dotenv/config';
import os from 'os';
import path from 'path';
import { writeFileSync } from 'fs';
import { pool } from '../db.js';
import { insertarLibros, prepararLibrosDesdeExcel } from './crearLibrosExcel.js';

const insertar = process.argv.includes('--insertar');
const ARCHIVO_RECHAZADOS = path.join(os.homedir(), 'Downloads', 'libros_rechazados.json');

try {
  const { listos, rechazados, idOrganizacion } = await prepararLibrosDesdeExcel();

  const porIsbn = listos.filter((libro) => libro.origen === 'isbn').length;
  console.log(`Listos: ${listos.length} (${porIsbn} completados con datos del ISBN)`);
  console.log(`Rechazados: ${rechazados.length}`);

  const porMotivo = {};
  for (const { problemas } of rechazados) {
    for (const { error } of problemas) porMotivo[error] = (porMotivo[error] ?? 0) + 1;
  }
  console.log('Motivos de rechazo:', porMotivo);

  writeFileSync(ARCHIVO_RECHAZADOS, JSON.stringify(rechazados, null, 2));
  console.log(`Detalle de rechazados en ${ARCHIVO_RECHAZADOS}`);

  const [[organizacion]] = await pool.query('SELECT nombre FROM organizaciones WHERE id = ?', [idOrganizacion]);
  console.log(`\nOrganización: ${organizacion.nombre} (id ${idOrganizacion})`);
  console.log(insertar ? 'Libros que se cargan:' : 'Libros que se cargarían:');
  for (const libro of listos) {
    console.log(`  fila ${libro.filaExcel}: ${libro.titulo} [código ${libro.codigo_interno}, datos de ${libro.origen}]`);
  }

  if (insertar) {
    const total = await insertarLibros(listos, idOrganizacion);
    console.log(`\nInsertados ${total} libros en ${organizacion.nombre}.`);
  } else {
    console.log('\nModo prueba: no se guardó nada. Corré con --insertar para guardar.');
  }
} finally {
  // Cierra las conexiones a MySQL; sin esto el script queda colgado al terminar
  await pool.end();
}
