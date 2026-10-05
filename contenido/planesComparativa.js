// Texto de marketing de la tabla comparativa de la landing. No son datos de
// negocio ni de prueba, por eso no tiene tabla en la DB: se sirve tal cual en
// GET /api/planes/comparativa.
//
// Cada "valores" tiene una posición por plan, en el mismo orden en que los
// devuelve GET /api/planes (por precio, de menor a mayor). Si se agrega o se
// quita un plan en la DB, hay que ajustar estos arrays.
//
// Los límites (usuarios y títulos) no están acá: el frontend los toma de
// cada plan, así no quedan dos fuentes que se puedan contradecir.
export const planesComparativa = {
  categorias: [
    {
      nombre: 'Catálogo',
      filas: [
        { funcionalidad: 'Catálogo con búsqueda y filtros', valores: [true, true, true] },
        { funcionalidad: 'Fichas de libro con reseñas', valores: [true, true, true] },
        { funcionalidad: 'Vista de invitado (solo lectura)', valores: [true, true, true] },
        { funcionalidad: 'Recomendados y novedades destacadas', valores: [true, true, true] },
      ],
    },
    {
      nombre: 'Préstamos',
      filas: [
        { funcionalidad: 'Préstamos automáticos por stock', valores: [true, true, true] },
        { funcionalidad: 'Gestión de devoluciones', valores: [true, true, true] },
        { funcionalidad: 'Reglas de préstamo configurables', valores: [false, true, true] },
        { funcionalidad: 'Congelamiento por atraso reiterado', valores: [false, true, true] },
      ],
    },
    {
      nombre: 'Marca y reportes',
      filas: [
        { funcionalidad: 'Personalización de marca', valores: [false, true, true] },
        { funcionalidad: 'Plantillas de notificación editables', valores: [false, true, true] },
        { funcionalidad: 'Reportes de circulación', valores: ['Básicos', 'Avanzados', 'Avanzados'] },
        { funcionalidad: 'Exportación de reportes', valores: [false, true, true] },
      ],
    },
    {
      nombre: 'Soporte',
      filas: [
        { funcionalidad: 'Migración de tu Excel', valores: [true, true, true] },
        { funcionalidad: 'Canal de soporte', valores: ['Correo', 'Correo y teléfono', 'Prioritario 4 h'] },
        { funcionalidad: 'Gestor de cuenta dedicado', valores: [false, false, true] },
      ],
    },
  ],
};
