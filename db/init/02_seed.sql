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

INSERT INTO libros (id_organizacion, titulo, autor, genero, editorial, isbn, fecha_pub, stock, portada) VALUES
  (1, 'Cien años de soledad',      'Gabriel García Márquez', 'Novela',          'Sudamericana', '9780307474728', '1967-05-30', 3, 'https://covers.openlibrary.org/b/isbn/9780307474728-L.jpg'),
  (1, 'Fahrenheit 451',            'Ray Bradbury',           'Ciencia ficción', 'Ballantine',   '9781451673319', '1953-10-19', 2, 'https://covers.openlibrary.org/b/isbn/9781451673319-L.jpg'),
  (1, 'Rayuela',                   'Julio Cortázar',         'Novela',          'Sudamericana', '9788437604572', '1963-06-28', 2, 'https://covers.openlibrary.org/b/isbn/9788437604572-L.jpg'),
  (1, 'Breve historia del tiempo', 'Stephen Hawking',        'Ciencia',         'Bantam',       '9780553380163', '1988-04-01', 1, 'https://covers.openlibrary.org/b/isbn/9780553380163-L.jpg'),
  (2, 'El nombre de la rosa',      'Umberto Eco',            'Novela',          'Lumen',        '9788497592802', '1980-01-01', 2, 'https://covers.openlibrary.org/b/isbn/9788497592802-L.jpg'),
  (1, '1984',                                  'George Orwell',              'Distopía',           'Debolsillo',    '9780451524935', '1949-06-08', 4, 'https://covers.openlibrary.org/b/isbn/9780451524935-L.jpg'),
  (1, 'Don Quijote de la Mancha',               'Miguel de Cervantes',        'Clásico',            'Cátedra',       '9788420412146', '1605-01-01', 4, 'https://covers.openlibrary.org/b/isbn/9788420412146-L.jpg'),
  (1, 'Harry Potter y la piedra filosofal',     'J. K. Rowling',              'Fantasía',           'Salamandra',    '9788478884452', '1997-06-26', 6, 'https://covers.openlibrary.org/b/isbn/9788478884452-L.jpg'),
  (1, 'Sapiens: De animales a dioses',          'Yuval Noah Harari',          'Ensayo / Historia',  'Debate',        '9780062316097', '2011-01-01', 3, 'https://covers.openlibrary.org/b/isbn/9780062316097-L.jpg'),
  (1, 'El amor en los tiempos del cólera',      'Gabriel García Márquez',     'Romance',            'Oveja Negra',   '9780307389732', '1985-01-01', 2, 'https://covers.openlibrary.org/b/isbn/9780307389732-L.jpg'),
  (1, 'Crónica de una muerte anunciada',        'Gabriel García Márquez',     'Novela corta',       'Plaza & Janés', '9788497592077', '1981-01-01', 3, 'https://covers.openlibrary.org/b/isbn/9788497592077-L.jpg'),
  (2, 'El principito',                          'Antoine de Saint-Exupéry',   'Infantil',           'Salamandra',    '9788478887198', '1943-04-06', 5, 'https://covers.openlibrary.org/b/isbn/9788478887198-L.jpg'),
  (1, 'Ficciones',                              'Jorge Luis Borges',          'Cuento',             'Debolsillo',    '9788499089183', '1944-01-01', 2, 'https://covers.openlibrary.org/b/isbn/9788499089183-L.jpg'),
  (2, 'El túnel',                               'Ernesto Sabato',             'Novela',             'Seix Barral',   '9788432217600', '1948-01-01', 1, 'https://covers.openlibrary.org/b/isbn/9788432217600-L.jpg'),
  (1, 'Los detectives salvajes',                'Roberto Bolaño',             'Novela',             'Anagrama',      '9788433968365', '1998-01-01', 2, 'https://covers.openlibrary.org/b/isbn/9788433968365-L.jpg');

INSERT INTO prestamos (id_usuario, id_libro, id_organizacion, fecha_devolucion_esperada, lugar_retiro, estado) VALUES
  (3, 1, 1, DATE_ADD(NOW(), INTERVAL 30 DAY), 'Mostrador principal', 'activo'),
  (3, 2, 1, DATE_SUB(NOW(), INTERVAL 3 DAY),  'Mostrador principal', 'atrasado');

INSERT INTO resenas (id_usuario, id_libro, calificacion, comentario) VALUES
  (3, 1, 5, 'Excelente, muy recomendable.'),
  (3, 2, 4, NULL);

INSERT INTO notificaciones (id_usuario, id_prestamo, tipo, mensaje) VALUES
  (3, 2, 'vencimiento_1_dia', 'Tu préstamo de Fahrenheit 451 está atrasado.'),
  (2, 1, 'nuevo_prestamo',    'Se generó un nuevo préstamo en tu organización.');
