export function calcularDevolucion(desde, diasPrestamo, horarios) {
  const fecha = new Date(desde)
  fecha.setDate(fecha.getDate() + diasPrestamo)

  const abiertos = Array.isArray(horarios)
    ? horarios.filter((h) => h?.abierto)
    : []
  if (abiertos.length === 0) {
    return { fecha, horario: null }
  }

  // Con al menos un día abierto, en 7 vueltas como máximo se encuentra.
  let horario = abiertos.find((h) => h.dia === fecha.getDay())
  while (!horario) {
    fecha.setDate(fecha.getDate() + 1)
    horario = abiertos.find((h) => h.dia === fecha.getDay())
  }

  const [horas, minutos] = horario.cierre.split(':').map(Number)
  fecha.setHours(horas, minutos, 0, 0)

  return {
    fecha,
    horario: {
      dia: horario.dia,
      apertura: horario.apertura,
      cierre: horario.cierre,
    },
  }
}
