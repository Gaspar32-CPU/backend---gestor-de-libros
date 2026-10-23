import test from 'node:test'
import assert from 'node:assert/strict'
import { calcularDevolucion } from '../../services/fechaDevolucion.js'

// Lunes a viernes de 08:00 a 17:00, fin de semana cerrado.
const SEMANA = [0, 1, 2, 3, 4, 5, 6].map((dia) => ({
  dia,
  abierto: dia >= 1 && dia <= 5,
  apertura: '08:00',
  cierre: '17:00',
}))
// Lunes 2 de marzo de 2026, 10:30 (hora local).
const LUNES = new Date(2026, 2, 2, 10, 30)

test('UT-BE-023 Plazo que cae en día abierto vence a la hora de cierre', () => {
  const { fecha, horario } = calcularDevolucion(LUNES, 3, SEMANA)
  assert.deepEqual(fecha, new Date(2026, 2, 5, 17, 0))
  assert.deepEqual(horario, { dia: 4, apertura: '08:00', cierre: '17:00' })
})
test('UT-BE-024 Plazo que cae en fin de semana pasa al lunes', () => {
  const { fecha, horario } = calcularDevolucion(LUNES, 5, SEMANA)
  assert.deepEqual(fecha, new Date(2026, 2, 9, 17, 0))
  assert.equal(horario.dia, 1)
})
test('UT-BE-025 Sin horarios configurados se suman los días exactos', () => {
  const { fecha, horario } = calcularDevolucion(LUNES, 5, null)
  assert.deepEqual(fecha, new Date(2026, 2, 7, 10, 30))
  assert.equal(horario, null)
})
test('UT-BE-026 Si ningún día está abierto no se ajusta la fecha', () => {
  const cerrado = SEMANA.map((h) => ({ ...h, abierto: false }))
  const { fecha, horario } = calcularDevolucion(LUNES, 5, cerrado)
  assert.deepEqual(fecha, new Date(2026, 2, 7, 10, 30))
  assert.equal(horario, null)
})
test('UT-BE-027 No modifica la fecha de inicio recibida', () => {
  const desde = new Date(LUNES)
  calcularDevolucion(desde, 5, SEMANA)
  assert.deepEqual(desde, LUNES)
})
