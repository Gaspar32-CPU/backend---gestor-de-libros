-- Datos de prueba (solo desarrollo)
SET NAMES utf8mb4;

INSERT INTO planes (nombre, descripcion, precio_mensual, limite_usuarios, limite_libros, funcionalidades) VALUES
  ('Básico',   'Para bibliotecas chicas',   0.00, 100,  500,  '{"reservas": false, "reportes": false}'),
  ('Estándar', 'Uso institucional',        49.00, 500,  5000, '{"reservas": true,  "reportes": false}'),
  ('Premium',  'Sin límites prácticos',    99.00, 5000, 50000,'{"reservas": true,  "reportes": true}');

INSERT INTO organizaciones (nombre, id_plan, dominio, expiracion_suscripcion) VALUES
  ('Anima BT',    2, 'anima.edu.uy',       DATE_ADD(CURDATE(), INTERVAL 1 YEAR)),
  ('Providencia', 1, 'providencia.edu.uy', NULL),
  ('Anima btt',   2, 'test.com',           '2026-10-08');

INSERT INTO configuraciones (id_organizacion, nombre_app, logo, color_primario, color_secundario,
                             max_libros_por_usuario, lugar_retiro, dias_prestamo,
                             permite_extension, max_extensiones, dias_extension, congelar_usuarios) VALUES
  (1, 'Biblioteca Anima BT',    NULL, '#1D4ED8', '#93C5FD', 3, 'Sala de tutores',  30, 1, 2, 30, 0),
  (2, 'Biblioteca Providencia', NULL, '#1a1c20', '#bccee2', 3, 'Sala de dicaprio', 20, 1, 1, 30, 0),
  (3, 'Biblioteca Anima BTT',   'https://www.ceaosa.com.uy/wp-content/uploads/2021/12/anima.png',
      '#047857', '#6EE7B7', 2, 'Recepción sede Anima BTT', 15, 1, 1, 30, 0);

-- Mismos usuarios que en mockData.js (mismo orden => mismos id autoincrementales).
-- Contraseña de todos: "password123"
INSERT INTO usuarios (id_organizacion, ci, nombre, email, telefono, contrasena, rol) VALUES
  (NULL, NULL,        'Super Admin',       'super@plataforma.com',            '099000000',
   '$2b$10$CsPYZnO.L4G/AiV/.iKh5.yvMlopWoT8cHAY/m4tuWLhVy0TUoYde', 'admin_plataforma'),

  -- Anima BT (id_organizacion = 1): 1 admin + 8 lectores de prueba
  (1, '10000001', 'Admin Uno',          'admin@anima.edu.uy',              '099100001',
   '$2b$10$CsPYZnO.L4G/AiV/.iKh5.yvMlopWoT8cHAY/m4tuWLhVy0TUoYde', 'admin_organizacion'),
  (1, '10000002', 'Mauro Aires',        'mauro.aires@anima.edu.uy',        '099100002',
   '$2b$10$CsPYZnO.L4G/AiV/.iKh5.yvMlopWoT8cHAY/m4tuWLhVy0TUoYde', 'lector'),
  (1, '10000003', 'Angelina López',     'angelina.lopez@anima.edu.uy',     '099100003',
   '$2b$10$CsPYZnO.L4G/AiV/.iKh5.yvMlopWoT8cHAY/m4tuWLhVy0TUoYde', 'lector'),
  (1, '10000004', 'Alex Vasconcelo',    'alex.vasconcelo@anima.edu.uy',    '099100004',
   '$2b$10$CsPYZnO.L4G/AiV/.iKh5.yvMlopWoT8cHAY/m4tuWLhVy0TUoYde', 'lector'),
  (1, '10000005', 'Valentina Barrios',  'valentina.barrios@anima.edu.uy',  '099100005',
   '$2b$10$CsPYZnO.L4G/AiV/.iKh5.yvMlopWoT8cHAY/m4tuWLhVy0TUoYde', 'lector'),
  (1, '10000006', 'Luciano Vargas',     'luciano.vargas@anima.edu.uy',     '099100006',
   '$2b$10$CsPYZnO.L4G/AiV/.iKh5.yvMlopWoT8cHAY/m4tuWLhVy0TUoYde', 'lector'),
  (1, '10000007', 'Ariana Rodríguez',   'ariana.rodriguez@anima.edu.uy',   '099100007',
   '$2b$10$CsPYZnO.L4G/AiV/.iKh5.yvMlopWoT8cHAY/m4tuWLhVy0TUoYde', 'lector'),
  (1, '10000008', 'Gianna Vasconcelo',  'gianna.vasconcelo@anima.edu.uy',  '099100008',
   '$2b$10$CsPYZnO.L4G/AiV/.iKh5.yvMlopWoT8cHAY/m4tuWLhVy0TUoYde', 'lector'),
  (1, '10000009', 'Leandro Benítez',    'leandro.benitez@anima.edu.uy',    '099100009',
   '$2b$10$CsPYZnO.L4G/AiV/.iKh5.yvMlopWoT8cHAY/m4tuWLhVy0TUoYde', 'lector'),

  -- Providencia (id_organizacion = 2): 1 admin + 8 lectores de prueba
  (2, '20000001', 'Admin Dos',          'admin@providencia.edu.uy',        '099200001',
   '$2b$10$CsPYZnO.L4G/AiV/.iKh5.yvMlopWoT8cHAY/m4tuWLhVy0TUoYde', 'admin_organizacion'),
  (2, '20000002', 'Sofía Méndez',       'sofia.mendez@providencia.edu.uy', '099200002',
   '$2b$10$CsPYZnO.L4G/AiV/.iKh5.yvMlopWoT8cHAY/m4tuWLhVy0TUoYde', 'lector'),
  (2, '20000003', 'Tomás Ferreira',     'tomas.ferreira@providencia.edu.uy', '099200003',
   '$2b$10$CsPYZnO.L4G/AiV/.iKh5.yvMlopWoT8cHAY/m4tuWLhVy0TUoYde', 'lector'),
  (2, '20000004', 'Camila Suárez',      'camila.suarez@providencia.edu.uy', '099200004',
   '$2b$10$CsPYZnO.L4G/AiV/.iKh5.yvMlopWoT8cHAY/m4tuWLhVy0TUoYde', 'lector'),
  (2, '20000005', 'Bruno Acosta',       'bruno.acosta@providencia.edu.uy', '099200005',
   '$2b$10$CsPYZnO.L4G/AiV/.iKh5.yvMlopWoT8cHAY/m4tuWLhVy0TUoYde', 'lector'),
  (2, '20000006', 'Martina Silva',      'martina.silva@providencia.edu.uy', '099200006',
   '$2b$10$CsPYZnO.L4G/AiV/.iKh5.yvMlopWoT8cHAY/m4tuWLhVy0TUoYde', 'lector'),
  (2, '20000007', 'Nicolás Pereyra',    'nicolas.pereyra@providencia.edu.uy', '099200007',
   '$2b$10$CsPYZnO.L4G/AiV/.iKh5.yvMlopWoT8cHAY/m4tuWLhVy0TUoYde', 'lector'),
  (2, '20000008', 'Julieta Rivas',      'julieta.rivas@providencia.edu.uy', '099200008',
   '$2b$10$CsPYZnO.L4G/AiV/.iKh5.yvMlopWoT8cHAY/m4tuWLhVy0TUoYde', 'lector'),
  (2, '20000009', 'Federico Castro',    'federico.castro@providencia.edu.uy', '099200009',
   '$2b$10$CsPYZnO.L4G/AiV/.iKh5.yvMlopWoT8cHAY/m4tuWLhVy0TUoYde', 'lector'),

  -- Anima btt (id_organizacion = 3): 1 admin + 1 lector de prueba
  (3, '57642736', 'ADMIN ANIMA BTT', 'admin@test.com',      '099999999',
   '$2b$10$qNIGEVVgwzbDqGbMDFfi0eN8UBOPqXUf73vp0qR51iUY6h7dnuFdG', 'admin_organizacion'),
  (3, '57922388', 'Mauro',           'mauro.aires@test.com', '099999999',
   '$2b$10$dUJpjOTnjqB0WUH5kIDmpeWUuSxXnd1Wrf1kdekMyXnMAPLuYPS/K', 'lector');

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
