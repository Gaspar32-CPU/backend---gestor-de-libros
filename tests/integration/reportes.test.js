import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { createServer } from 'node:net'
import { readFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import mysql from 'mysql2/promise'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

const root = new URL('../../', import.meta.url)
const database = `bookly_test_${randomUUID().replaceAll('-', '')}`
const secret = 'bookly-integracion-secreto-ficticio'
const password = 'SoloTesting2026!'
let db,
  child,
  base,
  logs = '',
  created = false
const tokens = {}
const ids = {}

async function request(
  path,
  { role = 'lector', method = 'GET', body, token } = {},
) {
  const headers = { 'Content-Type': 'application/json' }
  const authorization = token === undefined ? tokens[role] : token
  if (authorization) headers.Authorization = `Bearer ${authorization}`
  const response = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(5000),
  })
  return { status: response.status, data: await response.json() }
}
async function count() {
  const [[row]] = await db.query(
    'SELECT COUNT(*) AS total FROM reportes_problemas',
  )
  return row.total
}
async function create(
  body = { idSeccion: 1, descripcion: 'Problema ficticio de integración' },
  options = {},
) {
  return request('/api/reportes', { method: 'POST', body, ...options })
}
async function fresh() {
  const r = await create()
  assert.equal(r.status, 201)
  return r.data.id
}

before(
  async () => {
    assert.ok(
      process.env.BOOKLY_TEST_MYSQL_URL,
      'Definir BOOKLY_TEST_MYSQL_URL con una instancia MySQL LOCAL exclusiva de pruebas (ver tests/integration/README.md)',
    )
    const url = new URL(process.env.BOOKLY_TEST_MYSQL_URL)
    assert.equal(url.protocol, 'mysql:')
    assert.ok(
      ['127.0.0.1', 'localhost'].includes(url.hostname),
      'Solo se permite MySQL local',
    )
    assert.ok(
      !url.port || url.port === '3306',
      'db.js usa el puerto MySQL 3306',
    )
    assert.ok(
      url.pathname === '' || url.pathname === '/',
      'No indicar una base existente: la suite crea una temporal',
    )
    db = await mysql.createConnection({
      host: '127.0.0.1',
      port: 3306,
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      multipleStatements: true,
    })
    await db.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4`)
    created = true
    await db.query(`USE \`${database}\``)
    await db.query(
      await readFile(new URL('db/init/01_schema.sql', root), 'utf8'),
    )
    await db.query(
      "INSERT INTO planes (id,nombre,precio_mensual,limite_usuarios) VALUES (1,'Plan ficticio',0,20)",
    )
    await db.query(
      "INSERT INTO organizaciones (id,nombre,id_plan,dominio) VALUES (1,'Institución A',1,'@a.example'),(2,'Institución B',1,'@b.example')",
    )
    const hash = await bcrypt.hash(password, 4)
    for (const [id, org, role, email] of [
      [1, 1, 'lector', 'lector@a.example'],
      [2, 1, 'admin_organizacion', 'admin@a.example'],
      [3, null, 'admin_plataforma', 'soporte@example.test'],
      [4, 2, 'lector', 'lector@b.example'],
    ]) {
      await db.query(
        'INSERT INTO usuarios (id,id_organizacion,nombre,apellido,email,telefono,contrasena,rol) VALUES (?,?,?,?,?,?,?,?)',
        [id, org, 'Usuario', 'Ficticio', email, '099000000', hash, role],
      )
    }
    await db.query(
      "INSERT INTO secciones (id,nombre,para_lector,para_admin,activo) VALUES (100,'Inactiva ficticia',1,1,0)",
    )
    const probe = createServer()
    probe.listen(0, '127.0.0.1')
    await once(probe, 'listening')
    const port = probe.address().port
    await new Promise((resolve) => probe.close(resolve))
    base = `http://127.0.0.1:${port}`
    // Entorno explícito: no hereda credenciales ni lee el .env del proyecto.
    child = spawn(process.execPath, ['index.js'], {
      cwd: root,
      env: {
        PATH: process.env.PATH,
        NODE_ENV: 'test',
        PORT: String(port),
        JWT_SECRET: secret,
        DB_HOST: '127.0.0.1',
        DB_USER: decodeURIComponent(url.username),
        DB_PASSWORD: decodeURIComponent(url.password),
        DB_NAME: database,
        DOTENV_CONFIG_PATH: new URL('tests/integration/NO_ENV_FILE', root)
          .pathname,
        BREVO_API_KEY: 'ficticia-no-utilizable',
        BREVO_FROM_EMAIL: 'no-reply@example.test',
        BREVO_FROM_NAME: 'Testing',
        FRONTEND_URL: 'http://127.0.0.1',
        NOTIFICAR_LOGIN: 'false',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    child.stdout.on('data', (b) => {
      logs += b
    })
    child.stderr.on('data', (b) => {
      logs += b
    })
    for (let i = 0; i < 100; i++) {
      if (child.exitCode !== null) throw new Error(`Backend terminó: ${logs}`)
      try {
        const r = await request('/api/secciones', { token: null })
        if (r.status === 401) break
      } catch {}
      if (i === 99) throw new Error(`Backend no disponible: ${logs}`)
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
    for (const [role, email] of [
      ['lector', 'lector@a.example'],
      ['admin', 'admin@a.example'],
      ['super-admin', 'soporte@example.test'],
      ['otra', 'lector@b.example'],
    ]) {
      const r = await request('/api/auth/login', {
        method: 'POST',
        token: null,
        body: { email, password },
      })
      assert.equal(r.status, 200, JSON.stringify(r.data))
      assert.equal(typeof r.data.token, 'string')
      tokens[role] = r.data.token
    }
  },
  { timeout: 20000 },
)

after(async () => {
  if (child && child.exitCode === null) {
    const exited = once(child, 'exit')
    child.kill('SIGTERM')
    await exited
  }
  if (db) {
    try {
      if (created) await db.query(`DROP DATABASE \`${database}\``)
    } finally {
      await db.end()
    }
  }
})

test('IT-01: login HTTP consulta MySQL, verifica bcrypt y emite JWT de sesión', () => {
  const payload = jwt.verify(tokens.lector, secret)
  assert.equal(payload.id, 1)
  assert.equal(payload.organizacionId, 1)
  assert.equal(payload.rol, 'lector')
})
test('IT-02: lector obtiene únicamente secciones activas de su rol', async () => {
  const r = await request('/api/secciones')
  assert.equal(r.status, 200)
  assert.deepEqual(
    r.data.map((s) => s.id),
    [1, 2, 3, 4],
  )
})
test('IT-03: administrador obtiene las secciones administrativas', async () => {
  const r = await request('/api/secciones', { role: 'admin' })
  assert.equal(r.status, 200)
  assert.deepEqual(
    r.data.map((s) => s.id),
    [1, 5, 6, 7, 8, 9],
  )
})
test('IT-04: lector crea reporte y se persiste con identidad y fecha correctas', async () => {
  const r = await create({
    idSeccion: 1,
    descripcion: '  Reporte ficticio del catálogo  ',
  })
  assert.equal(r.status, 201)
  assert.ok(Number.isInteger(r.data.id))
  ids.lector = r.data.id
  const [[row]] = await db.query(
    'SELECT * FROM reportes_problemas WHERE id=?',
    [r.data.id],
  )
  assert.equal(row.id_usuario, 1)
  assert.equal(row.id_organizacion, 1)
  assert.equal(row.id_seccion, 1)
  assert.equal(row.descripcion, 'Reporte ficticio del catálogo')
  assert.equal(row.estado, 'abierto')
  assert.ok(row.fecha_reporte instanceof Date)
})
test('IT-05: administrador crea reporte en su sección', async () => {
  const r = await create(
    { idSeccion: 5, descripcion: 'Reporte administrativo ficticio' },
    { role: 'admin' },
  )
  assert.equal(r.status, 201)
  const [[row]] = await db.query(
    'SELECT id_usuario,id_organizacion FROM reportes_problemas WHERE id=?',
    [r.data.id],
  )
  assert.deepEqual(row, { id_usuario: 2, id_organizacion: 1 })
})
const invalid = [
  ['IT-06', 'sin sección', { descripcion: 'Problema' }, 'campos_vacios'],
  [
    'IT-07',
    'sección inexistente',
    { idSeccion: 999999, descripcion: 'Problema' },
    'seccion_invalida',
  ],
  [
    'IT-08',
    'sección inactiva',
    { idSeccion: 100, descripcion: 'Problema' },
    'seccion_invalida',
  ],
  [
    'IT-09',
    'sección no autorizada para lector',
    { idSeccion: 5, descripcion: 'Problema' },
    'seccion_invalida',
  ],
  ['IT-10', 'descripción ausente', { idSeccion: 1 }, 'campos_vacios'],
  [
    'IT-11',
    'descripción en blanco',
    { idSeccion: 1, descripcion: '   ' },
    'campos_vacios',
  ],
  [
    'IT-12',
    'descripción no textual',
    { idSeccion: 1, descripcion: 42 },
    'campos_vacios',
  ],
  [
    'IT-13',
    'descripción de 501 caracteres',
    { idSeccion: 1, descripcion: 'x'.repeat(501) },
    'texto_largo',
  ],
  [
    'IT-14',
    'sección fraccionaria',
    { idSeccion: 1.5, descripcion: 'Problema' },
    'campos_vacios',
  ],
]
for (const [id, title, body, error] of invalid)
  test(`${id}: rechaza ${title} sin insertar`, async () => {
    const total = await count()
    const r = await create(body)
    assert.equal(r.status, 400)
    assert.equal(r.data.error, error)
    assert.equal(await count(), total)
  })
test('IT-15: acepta el límite de 500 caracteres', async () => {
  const r = await create({ idSeccion: 1, descripcion: 'x'.repeat(500) })
  assert.equal(r.status, 201)
  const [[row]] = await db.query(
    'SELECT CHAR_LENGTH(descripcion) AS largo FROM reportes_problemas WHERE id=?',
    [r.data.id],
  )
  assert.equal(row.largo, 500)
})
for (const [id, title, options, status] of [
  ['IT-16', 'sin token', { token: null }, 401],
  ['IT-17', 'token alterado', { token: 'token-invalido' }, 401],
  [
    'IT-18',
    'token vencido',
    {
      token: jwt.sign({ id: 1, rol: 'lector', organizacionId: 1 }, secret, {
        expiresIn: -1,
      }),
    },
    401,
  ],
  [
    'IT-19',
    'super administrador no puede reportar',
    { role: 'super-admin' },
    403,
  ],
])
  test(`${id}: ${title} y no inserta`, async () => {
    const total = await count()
    const r = await create(undefined, options)
    assert.equal(r.status, status)
    assert.equal(await count(), total)
  })
test('IT-20: ignora identidad y organización enviadas en el cuerpo', async () => {
  const r = await create({
    idSeccion: 1,
    descripcion: 'Identidad ficticia',
    id_usuario: 4,
    id_organizacion: 2,
    usuarioId: 4,
    organizacionId: 2,
  })
  assert.equal(r.status, 201)
  const [[row]] = await db.query(
    'SELECT id_usuario,id_organizacion FROM reportes_problemas WHERE id=?',
    [r.data.id],
  )
  assert.deepEqual(row, { id_usuario: 1, id_organizacion: 1 })
})
test('IT-21: lector de otra organización conserva su propia pertenencia', async () => {
  const r = await create(undefined, { role: 'otra' })
  assert.equal(r.status, 201)
  const [[row]] = await db.query(
    'SELECT id_usuario,id_organizacion FROM reportes_problemas WHERE id=?',
    [r.data.id],
  )
  assert.deepEqual(row, { id_usuario: 4, id_organizacion: 2 })
})
test('IT-22: lector y administrador no pueden consultar Soporte', async () => {
  for (const role of ['lector', 'admin'])
    assert.equal((await request('/api/soporte/reportes', { role })).status, 403)
})
test('IT-23: super administrador consulta el reporte con los joins reales', async () => {
  const r = await request('/api/soporte/reportes', { role: 'super-admin' })
  assert.equal(r.status, 200)
  const row = r.data.find((x) => x.id === ids.lector)
  assert.ok(row)
  assert.equal(row.organizacion, 'Institución A')
  assert.equal(row.usuario, 'Usuario Ficticio')
  assert.equal(row.seccion, 'Catálogo')
  assert.equal(row.rol_usuario, 'lector')
})
test('IT-24: tomar y resolver persiste actor, fechas y comentario', async () => {
  const id = await fresh()
  const path = `/api/soporte/reportes/${id}/estado`
  let r = await request(path, {
    role: 'super-admin',
    method: 'PATCH',
    body: { estado: 'en_revision' },
  })
  assert.equal(r.status, 200)
  assert.equal(r.data.estado, 'en_revision')
  r = await request(path, {
    role: 'super-admin',
    method: 'PATCH',
    body: { estado: 'resuelto', comentario: '  Solución ficticia  ' },
  })
  assert.equal(r.status, 200)
  assert.equal(r.data.estado, 'resuelto')
  const [[row]] = await db.query(
    'SELECT * FROM reportes_problemas WHERE id=?',
    [id],
  )
  assert.equal(row.id_tomado_por, 3)
  assert.equal(row.id_resuelto_por, 3)
  assert.ok(row.fecha_tomado)
  assert.ok(row.fecha_resuelto)
  assert.equal(row.comentario_resolucion, 'Solución ficticia')
})
test('IT-25: no permite resolver antes de tomar el reporte', async () => {
  const id = await fresh()
  const r = await request(`/api/soporte/reportes/${id}/estado`, {
    role: 'super-admin',
    method: 'PATCH',
    body: { estado: 'resuelto', comentario: 'Solución' },
  })
  assert.equal(r.status, 409)
  const [[row]] = await db.query(
    'SELECT estado FROM reportes_problemas WHERE id=?',
    [id],
  )
  assert.equal(row.estado, 'abierto')
})
test('IT-26: dos tomas simultáneas producen un éxito y un conflicto', async () => {
  const id = await fresh()
  const take = () =>
    request(`/api/soporte/reportes/${id}/estado`, {
      role: 'super-admin',
      method: 'PATCH',
      body: { estado: 'en_revision' },
    })
  const results = await Promise.all([take(), take()])
  assert.deepEqual(results.map((x) => x.status).sort(), [200, 409])
})
test('IT-27: resolver sin comentario se rechaza sin modificar el estado', async () => {
  const id = await fresh()
  const path = `/api/soporte/reportes/${id}/estado`
  assert.equal(
    (
      await request(path, {
        role: 'super-admin',
        method: 'PATCH',
        body: { estado: 'en_revision' },
      })
    ).status,
    200,
  )
  const r = await request(path, {
    role: 'super-admin',
    method: 'PATCH',
    body: { estado: 'resuelto', comentario: '   ' },
  })
  assert.equal(r.status, 400)
  const [[row]] = await db.query(
    'SELECT estado FROM reportes_problemas WHERE id=?',
    [id],
  )
  assert.equal(row.estado, 'en_revision')
})
test('IT-28: reporte inexistente devuelve 404', async () => {
  const r = await request('/api/soporte/reportes/999999/estado', {
    role: 'super-admin',
    method: 'PATCH',
    body: { estado: 'en_revision' },
  })
  assert.equal(r.status, 404)
})
