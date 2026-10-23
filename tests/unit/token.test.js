import test from 'node:test'
import assert from 'node:assert/strict'
import jwt from 'jsonwebtoken'
import {
  generarTokenCrearContrasena,
  verificarTokenCrearContrasena,
} from '../../services/token.js'

// Secreto ficticio, exclusivo del proceso de pruebas; nunca se lee .env.
process.env.JWT_SECRET = 'bookly-secreto-ficticio-exclusivo-de-pruebas'
test('UT-BE-006 Token válido devuelve id del usuario', () =>
  assert.equal(
    verificarTokenCrearContrasena(generarTokenCrearContrasena(42)),
    42,
  ))
test('UT-BE-007 Vencimiento por defecto es 24 horas', () => {
  const payload = jwt.decode(generarTokenCrearContrasena(42))
  assert.equal(payload.exp - payload.iat, 24 * 60 * 60)
})
test('UT-BE-008 Rechaza token vencido', () =>
  assert.equal(
    verificarTokenCrearContrasena(generarTokenCrearContrasena(42, -1)),
    null,
  ))
test('UT-BE-009 Rechaza firma de otro secreto', () =>
  assert.equal(
    verificarTokenCrearContrasena(
      jwt.sign(
        { id: 42, proposito: 'crear_contrasena' },
        'otro-secreto-ficticio',
      ),
    ),
    null,
  ))
test('UT-BE-010 Rechaza token de sesión como activación', () =>
  assert.equal(
    verificarTokenCrearContrasena(
      jwt.sign({ id: 42, rol: 'lector' }, process.env.JWT_SECRET),
    ),
    null,
  ))
test('UT-BE-011 Rechaza token mal formado o vacío', () => {
  assert.equal(verificarTokenCrearContrasena('no-es-un-jwt'), null)
  assert.equal(verificarTokenCrearContrasena(''), null)
})
