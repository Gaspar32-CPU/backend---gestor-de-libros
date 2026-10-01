-- =====================================================================
-- Sistema de Gestión de Libros - Esquema de Base de Datos
-- MySQL 8.x / InnoDB / utf8mb4
-- Criterio unificado de PK: INT UNSIGNED AUTO_INCREMENT
-- =====================================================================

SET NAMES utf8mb4;

-- ---------------------------------------------------------------------
-- PLANES (gestionados por el super administrador)
-- ---------------------------------------------------------------------
CREATE TABLE planes (
    id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre            VARCHAR(100) NOT NULL,
    descripcion       TEXT,
    precio_mensual    DECIMAL(10,2) NOT NULL,
    limite_usuarios   INT UNSIGNED NOT NULL,
    limite_libros     INT UNSIGNED NOT NULL,
    funcionalidades   JSON NOT NULL,
    activo            TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (id),
    UNIQUE KEY uq_planes_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- ORGANIZACIONES (los clientes: liceos, escuelas, universidades)
-- ---------------------------------------------------------------------
CREATE TABLE organizaciones (
    id                      INT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre                  VARCHAR(150) NOT NULL,
    id_plan                 INT UNSIGNED NOT NULL,
    dominio                 VARCHAR(150) NOT NULL,
    activo                  TINYINT(1) NOT NULL DEFAULT 1,
    expiracion_suscripcion  DATE NULL,
    fecha_creacion          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_org_dominio (dominio),
    CONSTRAINT fk_org_plan FOREIGN KEY (id_plan)
        REFERENCES planes(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- CONFIGURACIONES (1 por organización)
-- ---------------------------------------------------------------------
CREATE TABLE configuraciones (
    id                        INT UNSIGNED NOT NULL AUTO_INCREMENT,
    id_organizacion           INT UNSIGNED NOT NULL,
    nombre_app                VARCHAR(150) NOT NULL,
    logo                      VARCHAR(255),
    color_primario            CHAR(7) NOT NULL DEFAULT '#000000',
    color_secundario          CHAR(7),
    max_libros_por_usuario    TINYINT UNSIGNED NOT NULL DEFAULT 3,
    lugar_retiro              VARCHAR(150) NOT NULL,
    dias_prestamo             SMALLINT UNSIGNED NOT NULL DEFAULT 30,
    permite_extension         TINYINT(1) NOT NULL DEFAULT 1,
    max_extensiones           TINYINT UNSIGNED NOT NULL DEFAULT 2,
    dias_extension            SMALLINT UNSIGNED NOT NULL DEFAULT 30,
    congelar_usuarios         TINYINT(1) NOT NULL DEFAULT 0,
    dias_atraso_congelamiento SMALLINT UNSIGNED,
    mensajes_personalizados   JSON,
    PRIMARY KEY (id),
    UNIQUE KEY uq_config_org (id_organizacion),
    CONSTRAINT fk_config_org FOREIGN KEY (id_organizacion)
        REFERENCES organizaciones(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- USUARIOS
-- id_organizacion es NULL únicamente para admin_plataforma.
-- ---------------------------------------------------------------------
CREATE TABLE usuarios (
    id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
    id_organizacion  INT UNSIGNED NULL,
    ci               VARCHAR(20) NULL,
    nombre           VARCHAR(150) NOT NULL,
    email            VARCHAR(150) NOT NULL,
    telefono         VARCHAR(30) NOT NULL,
    -- NULL = usuario invitado por un admin que todavía no creó su contraseña
    -- (ver POST /api/usuarios y POST /api/auth/crear-contrasena en index.js).
    contrasena       VARCHAR(255) NULL,
    rol              ENUM('lector','admin_organizacion','admin_plataforma')
                     NOT NULL DEFAULT 'lector',
    activo           TINYINT(1) NOT NULL DEFAULT 1,
    congelado_hasta  DATE NULL,
    fecha_registro   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_usuarios_email (email),
    UNIQUE KEY uq_ci_organizacion (id_organizacion, ci),
    UNIQUE KEY uq_usuarios_id_org (id, id_organizacion),
    CONSTRAINT fk_usuarios_org FOREIGN KEY (id_organizacion)
        REFERENCES organizaciones(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- LIBROS
-- Sin columna "disponible": se calcula como stock - préstamos/reservas activos.
-- ---------------------------------------------------------------------
CREATE TABLE libros (
    id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
    id_organizacion  INT UNSIGNED NOT NULL,
    titulo           VARCHAR(255) NOT NULL,
    autor            VARCHAR(150) NOT NULL,
    genero           VARCHAR(100) NOT NULL,
    editorial        VARCHAR(150),
    isbn             VARCHAR(20),
    fecha_pub        DATE,
    resumen          TEXT,
    portada          VARCHAR(255),
    stock            INT UNSIGNED NOT NULL DEFAULT 1,
    fecha_creacion   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_libros_org_titulo (id_organizacion, titulo),
    KEY idx_libros_org_genero (id_organizacion, genero),
    CONSTRAINT fk_libros_org FOREIGN KEY (id_organizacion)
        REFERENCES organizaciones(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- PRESTAMOS
-- id_organizacion denormalizado: permite filtrar por tenant sin JOIN
-- y validar la pertenencia del usuario con la FK compuesta.
-- ---------------------------------------------------------------------
CREATE TABLE prestamos (
    id                         INT UNSIGNED NOT NULL AUTO_INCREMENT,
    id_usuario                 INT UNSIGNED NOT NULL,
    id_libro                   INT UNSIGNED NOT NULL,
    id_organizacion            INT UNSIGNED NOT NULL,
    fecha_prestamo             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_devolucion_esperada  DATETIME NOT NULL,
    fecha_devolucion_real      DATETIME NULL,
    extensiones_realizadas     TINYINT UNSIGNED NOT NULL DEFAULT 0,
    lugar_retiro               VARCHAR(150),
    estado                     ENUM('pendiente_retiro','activo','devuelto','atrasado','cancelado')
                               NOT NULL DEFAULT 'pendiente_retiro',
    PRIMARY KEY (id),
    KEY idx_prestamos_org_estado (id_organizacion, estado),
    KEY idx_prestamos_vencimiento (estado, fecha_devolucion_esperada),
    KEY idx_prestamos_libro (id_libro),
    CONSTRAINT fk_prestamos_libro FOREIGN KEY (id_libro)
        REFERENCES libros(id) ON DELETE RESTRICT,
    CONSTRAINT fk_prestamos_org FOREIGN KEY (id_organizacion)
        REFERENCES organizaciones(id) ON DELETE RESTRICT,
    CONSTRAINT fk_prestamos_usuario FOREIGN KEY (id_usuario, id_organizacion)
        REFERENCES usuarios(id, id_organizacion) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- RESERVAS
-- ---------------------------------------------------------------------
CREATE TABLE reservas (
    id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
    id_usuario        INT UNSIGNED NOT NULL,
    id_libro          INT UNSIGNED NOT NULL,
    id_organizacion   INT UNSIGNED NOT NULL,
    fecha_reserva     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_retiro      DATE NOT NULL,
    estado            ENUM('activa','convertida','cancelada','expirada') NOT NULL DEFAULT 'activa',
    id_prestamo       INT UNSIGNED NULL,
    PRIMARY KEY (id),
    KEY idx_reservas_org_estado (id_organizacion, estado),
    KEY idx_reservas_libro (id_libro),
    KEY idx_reservas_prestamo (id_prestamo),
    CONSTRAINT fk_reservas_libro FOREIGN KEY (id_libro)
        REFERENCES libros(id) ON DELETE CASCADE,
    CONSTRAINT fk_reservas_usuario FOREIGN KEY (id_usuario, id_organizacion)
        REFERENCES usuarios(id, id_organizacion) ON DELETE CASCADE,
    CONSTRAINT fk_reservas_prestamo FOREIGN KEY (id_prestamo)
        REFERENCES prestamos(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- RESEÑAS (una por usuario y libro)
-- ---------------------------------------------------------------------
CREATE TABLE resenas (
    id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
    id_usuario     INT UNSIGNED NOT NULL,
    id_libro       INT UNSIGNED NOT NULL,
    calificacion   TINYINT UNSIGNED NOT NULL,
    comentario     TEXT,
    fecha          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_resena_usuario_libro (id_usuario, id_libro),
    KEY idx_resenas_libro (id_libro),
    CONSTRAINT chk_calificacion CHECK (calificacion BETWEEN 1 AND 5),
    CONSTRAINT fk_resenas_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT fk_resenas_libro FOREIGN KEY (id_libro)
        REFERENCES libros(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- NOTIFICACIONES
-- ---------------------------------------------------------------------
CREATE TABLE notificaciones (
    id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
    id_usuario    INT UNSIGNED NOT NULL,
    id_prestamo   INT UNSIGNED NULL,
    tipo          ENUM('nuevo_prestamo','listo_para_retiro','vencimiento_10_dias',
                       'vencimiento_1_dia','limite_alcanzado','recomendacion','nuevo_libro') NOT NULL,
    canal         ENUM('sistema','email') NOT NULL DEFAULT 'sistema',
    mensaje       TEXT NOT NULL,
    leida         TINYINT(1) NOT NULL DEFAULT 0,
    fecha_envio   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_notif_usuario_leida (id_usuario, leida),
    KEY idx_notif_prestamo (id_prestamo),
    CONSTRAINT fk_notif_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT fk_notif_prestamo FOREIGN KEY (id_prestamo)
        REFERENCES prestamos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- REPORTES DE PROBLEMAS
-- ---------------------------------------------------------------------
CREATE TABLE reportes_problemas (
    id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
    id_usuario       INT UNSIGNED NOT NULL,
    id_organizacion  INT UNSIGNED NOT NULL,
    id_libro         INT UNSIGNED NULL,
    descripcion      TEXT NOT NULL,
    estado           ENUM('abierto','en_revision','resuelto') NOT NULL DEFAULT 'abierto',
    fecha_reporte    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_reportes_org_estado (id_organizacion, estado),
    KEY idx_reportes_usuario (id_usuario),
    KEY idx_reportes_libro (id_libro),
    CONSTRAINT fk_reportes_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT fk_reportes_org FOREIGN KEY (id_organizacion)
        REFERENCES organizaciones(id) ON DELETE CASCADE,
    CONSTRAINT fk_reportes_libro FOREIGN KEY (id_libro)
        REFERENCES libros(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
