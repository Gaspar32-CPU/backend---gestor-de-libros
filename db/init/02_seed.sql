-- Datos de prueba (solo desarrollo)
SET NAMES utf8mb4;

INSERT INTO planes (nombre, descripcion, precio_mensual, limite_usuarios, limite_libros, funcionalidades) VALUES
  ('Básico',   'Para bibliotecas chicas',   0.00, 100,  500,  '{"reservas": false, "reportes": false}'),
  ('Estándar', 'Uso institucional',        49.00, 500,  5000, '{"reservas": true,  "reportes": false}'),
  ('Premium',  'Sin límites prácticos',    99.00, 5000, 50000,'{"reservas": true,  "reportes": true}');

INSERT INTO organizaciones (nombre, id_plan, dominio, expiracion_suscripcion) VALUES
  ('Liceo Demo Uno', 2, 'liceodemo1.edu.uy', DATE_ADD(CURDATE(), INTERVAL 1 YEAR)),
  ('Liceo Demo Dos', 1, 'liceodemo2.edu.uy', NULL);

INSERT INTO configuraciones (id_organizacion, nombre_app, color_primario, color_secundario,
                             max_libros_por_usuario, dias_prestamo, max_extensiones) VALUES
  (1, 'Biblioteca Liceo Uno', '#1D4ED8', '#93C5FD', 3, 30, 2),
  (2, 'Biblioteca Liceo Dos', '#047857', '#6EE7B7', 2, 15, 1);

-- Contraseña de todos: "password123"
INSERT INTO usuarios (id_organizacion, ci, nombre, email, telefono, contrasena, rol) VALUES
  (NULL, NULL,       'Super Admin',   'super@plataforma.com', '099000000',
   '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'admin_plataforma'),
  (1,    '11111111', 'Admin Uno',     'admin@liceodemo1.edu.uy', '099111111',
   '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'admin_organizacion'),
  (1,    '22222222', 'Lectora Uno',   'lectora@liceodemo1.edu.uy', '099222222',
   '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'lector'),
  (2,    '33333333', 'Admin Dos',     'admin@liceodemo2.edu.uy', '099333333',
   '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'admin_organizacion');

INSERT INTO libros (id_organizacion, titulo, autor, genero, editorial, isbn, fecha_pub, stock) VALUES
  (1, 'Cien años de soledad',      'Gabriel García Márquez', 'Novela',          'Sudamericana', '9780307474728', '1967-05-30', 3),
  (1, 'Fahrenheit 451',            'Ray Bradbury',           'Ciencia ficción', 'Ballantine',   '9781451673319', '1953-10-19', 2),
  (1, 'Rayuela',                   'Julio Cortázar',         'Novela',          'Sudamericana', '9788437604572', '1963-06-28', 2),
  (1, 'Breve historia del tiempo', 'Stephen Hawking',        'Ciencia',         'Bantam',       '9780553380163', '1988-04-01', 1),
  (2, 'El nombre de la rosa',      'Umberto Eco',            'Novela',          'Lumen',        '9788497592802', '1980-01-01', 2);

INSERT INTO prestamos (id_usuario, id_libro, id_organizacion, fecha_devolucion_esperada, lugar_retiro, estado) VALUES
  (3, 1, 1, DATE_ADD(NOW(), INTERVAL 30 DAY), 'Mostrador principal', 'activo'),
  (3, 2, 1, DATE_SUB(NOW(), INTERVAL 3 DAY),  'Mostrador principal', 'atrasado');

INSERT INTO resenas (id_usuario, id_libro, calificacion, comentario) VALUES
  (3, 1, 5, 'Excelente, muy recomendable.'),
  (3, 2, 4, NULL);

INSERT INTO notificaciones (id_usuario, id_prestamo, tipo, mensaje) VALUES
  (3, 2, 'vencimiento_1_dia', 'Tu préstamo de Fahrenheit 451 está atrasado.'),
  (2, 1, 'nuevo_prestamo',    'Se generó un nuevo préstamo en tu organización.');
