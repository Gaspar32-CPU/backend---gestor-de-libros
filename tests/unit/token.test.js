import test from 'node:test'
import assert from 'node:assert/strict'
import jwt from 'jsonwebtoken'
import {
  generarTokenCrearContrasena,
  verificarTokenCrearContrasena,
  generarTokenRestablecerContrasena,
  verificarTokenRestablecerContrasena,
  huellaDeContrasena,
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

const HASH_ACTUAL = '$2b$10$hash-ficticio-de-pruebas-actual'
const HASH_NUEVO = '$2b$10$hash-ficticio-de-pruebas-nuevo'

test('UT-BE-028 Token de restablecer devuelve id y huella del hash actual', () =>
  assert.deepEqual(
    verificarTokenRestablecerContrasena(
      generarTokenRestablecerContrasena(42, HASH_ACTUAL),
    ),
    { id: 42, huella: huellaDeContrasena(HASH_ACTUAL) },
  ))
test('UT-BE-029 Token de restablecer vence en 1 hora', () => {
  const payload = jwt.decode(generarTokenRestablecerContrasena(42, HASH_ACTUAL))
  assert.equal(payload.exp - payload.iat, 60 * 60)
})
test('UT-BE-030 Cambiar la contraseña invalida la huella del link', () => {
  const { huella } = verificarTokenRestablecerContrasena(
    generarTokenRestablecerContrasena(42, HASH_ACTUAL),
  )
  assert.notEqual(huella, huellaDeContrasena(HASH_NUEVO))
})
test('UT-BE-031 Los tokens de crear y restablecer no se intercambian', () => {
  assert.equal(
    verificarTokenRestablecerContrasena(generarTokenCrearContrasena(42)),
    null,
  )
  assert.equal(
    verificarTokenCrearContrasena(
      generarTokenRestablecerContrasena(42, HASH_ACTUAL),
    ),
    null,
  )
})
test('UT-BE-032 La huella no expone el hash de la contraseña', () => {
  const payload = jwt.decode(generarTokenRestablecerContrasena(42, HASH_ACTUAL))
  assert.ok(!JSON.stringify(payload).includes(HASH_ACTUAL))
})
