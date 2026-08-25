CREATE TABLE planes (
    id               INT NOT NULL AUTO_INCREMENT,
    nombre           VARCHAR(100) NOT NULL,
    precio           DECIMAL(10,2) NOT NULL,
    limite_usuarios  INT NOT NULL,
    funcionalidades  JSON NOT NULL,
    PRIMARY KEY (id)
);

CREATE TABLE organizaciones (
    id                     INT NOT NULL AUTO_INCREMENT,
    nombre                 VARCHAR(150) NOT NULL,
    id_plan                INT NOT NULL,
    dominio                VARCHAR(150) NOT NULL UNIQUE,
    activo                 TINYINT(1) NOT NULL,
    expiracion_suscripcion DATETIME NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (id_plan) REFERENCES planes(id)
);

CREATE TABLE usuarios (
    id	 INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    ci 	INT NOT NULL,
    nombre 	VARCHAR(150) NOT NULL,
    email 	VARCHAR(150) NOT NULL UNIQUE,
    contrasena 	VARCHAR(255) NOT NULL,
    fecha_registro 	DATETIME NOT NULL,
    rol ENUM('lector', 'admin_organizacion', 'admin_plataforma') NOT NULL
);

CREATE TABLE usuarios_organizaciones (
    id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    id_usuario INT UNSIGNED NOT NULL,
    id_organizacion INT UNSIGNED NOT NULL,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (id_organizacion) REFERENCES organizaciones(id) ON DELETE CASCADE,
    UNIQUE KEY uq_usuario_organizacion (id_usuario, id_organizacion)
);

CREATE TABLE libros (
    id               INT NOT NULL AUTO_INCREMENT,
    titulo           VARCHAR(255) NOT NULL,
    id_organizacion  INT NOT NULL,
    autor            VARCHAR(150) NOT NULL,
    genero           VARCHAR(100) NOT NULL,
    editorial        VARCHAR(150),
    fecha_pub        DATETIME NOT NULL,
    resumen          TEXT,
    portada          VARCHAR(255) NOT NULL,
    disponible       TINYINT(1) NOT NULL,
    stock            INT NOT NULL,
    fecha_creacion   DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (id_organizacion) REFERENCES organizaciones(id) ON DELETE CASCADE
);

CREATE TABLE prestamos (
    id_prestamo                INT NOT NULL AUTO_INCREMENT,
    id_usuario                 INT NOT NULL,
    id_libro                   INT NOT NULL,
    id_organizacion            INT NOT NULL,
    fecha_prestamo             DATETIME NOT NULL, 
    fecha_devolucion_esperada  DATETIME NOT NULL,
    fecha_devolucion_real      DATETIME,
    estado                     VARCHAR(50) NOT NULL,
    PRIMARY KEY (id_prestamo),
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (id_libro) REFERENCES libros(id) ON DELETE CASCADE,
    FOREIGN KEY (id_organizacion) REFERENCES organizaciones(id) ON DELETE RESTRICT
);

CREATE TABLE configuraciones (
    id                       INT NOT NULL AUTO_INCREMENT,
    id_organizacion          INT NOT NULL,
    nombre                   VARCHAR(150) NOT NULL,
    nombre_app               VARCHAR(150) NOT NULL,
    logo                     VARCHAR(255) NOT NULL,
    color_primario           VARCHAR(20) NOT NULL,
    color_secundario         VARCHAR(20),
    mensajes_personalizados  JSON,
    PRIMARY KEY (id),
    FOREIGN KEY (id_organizacion) REFERENCES organizaciones(id) ON DELETE CASCADE
);
