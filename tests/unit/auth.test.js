import test from 'node:test'
import assert from 'node:assert/strict'
import jwt from 'jsonwebtoken'
import {
  verificarToken,
  verificarAdmin,
  verificarSuperAdmin,
} from '../../middlewares/auth.js'
import { generarTokenCrearContrasena } from '../../services/token.js'

process.env.JWT_SECRET = 'bookly-secreto-ficticio-exclusivo-de-pruebas'
// Dobles de req/res/next: no se inicia Express ni se abre un puerto.
function ejecutar(middleware, req) {
  const resultado = { codigo: null, cuerpo: null, llamadasNext: 0 }
  const res = {
    status(codigo) {
      resultado.codigo = codigo
      return this
    },
    json(cuerpo) {
      resultado.cuerpo = cuerpo
      return this
    },
  }
  middleware(req, res, () => {
    resultado.llamadasNext++
  })
  return resultado
}
const sesion = () =>
  jwt.sign({ id: 42, rol: 'lector', organizacionId: 7 }, process.env.JWT_SECRET)
test('UT-BE-012 Rechaza solicitud sin Authorization', () => {
  const r = ejecutar(verificarToken, { headers: {} })
  assert.equal(r.codigo, 401)
  assert.equal(r.llamadasNext, 0)
})
test('UT-BE-013 Rechaza esquema diferente de Bearer', () =>
  assert.equal(
    ejecutar(verificarToken, { headers: { authorization: 'Basic ficticio' } })
      .codigo,
    401,
  ))
test('UT-BE-014 Rechaza sesión con firma inválida', () =>
  assert.equal(
    ejecutar(verificarToken, { headers: { authorization: 'Bearer inválido' } })
      .codigo,
    401,
  ))
test('UT-BE-015 Sesión válida carga usuario y llama next', () => {
  const req = { headers: { authorization: `Bearer ${sesion()}` } }
  const r = ejecutar(verificarToken, req)
  assert.equal(r.llamadasNext, 1)
  assert.equal(r.codigo, null)
  assert.equal(req.usuario.id, 42)
  assert.equal(req.usuario.organizacionId, 7)
})
test('UT-BE-016 Token de activación no debe funcionar como sesión', () => {
  const r = ejecutar(verificarToken, {
    headers: { authorization: `Bearer ${generarTokenCrearContrasena(42)}` },
  })
  assert.deepEqual(
    { codigo: r.codigo, llamadasNext: r.llamadasNext },
    { codigo: 401, llamadasNext: 0 },
  )
})
test('UT-BE-017 Administración rechaza usuario no autenticado', () =>
  assert.equal(ejecutar(verificarAdmin, {}).codigo, 401))
test('UT-BE-018 Administración rechaza lector', () =>
  assert.equal(
    ejecutar(verificarAdmin, { usuario: { rol: 'lector' } }).codigo,
    403,
  ))
test('UT-BE-019 Administración permite rol admin', () =>
  assert.equal(
    ejecutar(verificarAdmin, { usuario: { rol: 'admin' } }).llamadasNext,
    1,
  ))
test('UT-BE-020 Plataforma rechaza usuario no autenticado', () =>
  assert.equal(ejecutar(verificarSuperAdmin, {}).codigo, 401))
test('UT-BE-021 Plataforma rechaza administrador de organización', () =>
  assert.equal(
    ejecutar(verificarSuperAdmin, { usuario: { rol: 'admin' } }).codigo,
    403,
  ))
test('UT-BE-022 Plataforma permite super-admin', () =>
  assert.equal(
    ejecutar(verificarSuperAdmin, { usuario: { rol: 'super-admin' } })
      .llamadasNext,
    1,
  ))
