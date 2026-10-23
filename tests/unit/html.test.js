import test from 'node:test'
import assert from 'node:assert/strict'
import { escaparHtml } from '../../services/escaparHtml.js'

test('UT-BE-001 Escapa etiquetas HTML y comillas dobles', () =>
  assert.equal(escaparHtml('<img src="x">'), '&lt;img src=&quot;x&quot;&gt;'))
test('UT-BE-002 Escapa ampersand sin volver a escapar las entidades generadas', () =>
  assert.equal(escaparHtml('A&B <C>'), 'A&amp;B &lt;C&gt;'))
test('UT-BE-003 Convierte null y undefined a texto vacío', () => {
  assert.equal(escaparHtml(null), '')
  assert.equal(escaparHtml(undefined), '')
})
test('UT-BE-004 Conserva texto español', () =>
  assert.equal(
    escaparHtml('Biblioteca Ánima: reseñas'),
    'Biblioteca Ánima: reseñas',
  ))
test('UT-BE-005 Convierte valores numéricos a texto', () =>
  assert.equal(escaparHtml(0), '0'))
