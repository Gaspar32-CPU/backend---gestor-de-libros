-- CreateTable
CREATE TABLE `planes` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(100) NOT NULL,
    `descripcion` TEXT NULL,
    `precio_mensual` DECIMAL(10, 2) NOT NULL,
    `limite_usuarios` INTEGER UNSIGNED NOT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `uq_planes_nombre`(`nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `organizaciones` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(150) NOT NULL,
    `id_plan` INTEGER UNSIGNED NOT NULL,
    `dominio` VARCHAR(150) NOT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `expiracion_suscripcion` DATE NULL,
    `fecha_creacion` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `uq_org_dominio`(`dominio`),
    INDEX `fk_org_plan`(`id_plan`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `usuarios` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `id_organizacion` INTEGER UNSIGNED NULL,
    `ci` VARCHAR(20) NULL,
    `nombre` VARCHAR(150) NOT NULL,
    `apellido` VARCHAR(150) NULL,
    `email` VARCHAR(150) NOT NULL,
    `telefono` VARCHAR(30) NOT NULL,
    `contrasena` VARCHAR(255) NULL,
    `rol` ENUM('lector', 'admin_organizacion', 'admin_plataforma') NOT NULL DEFAULT 'lector',
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `congelado_hasta` DATE NULL,
    `fecha_registro` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `uq_usuarios_email`(`email`),
    UNIQUE INDEX `uq_ci_organizacion`(`id_organizacion`, `ci`),
    UNIQUE INDEX `uq_usuarios_id_org`(`id`, `id_organizacion`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `libros` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `id_organizacion` INTEGER UNSIGNED NOT NULL,
    `titulo` VARCHAR(255) NOT NULL,
    `autor` VARCHAR(150) NOT NULL,
    `generos` JSON NOT NULL,
    `editorial` VARCHAR(150) NULL,
    `isbn` VARCHAR(20) NULL,
    `fecha_pub` DATE NULL,
    `resumen` TEXT NULL,
    `portada` VARCHAR(255) NULL,
    `stock` INTEGER UNSIGNED NOT NULL DEFAULT 1,
    `fecha_creacion` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_libros_org_titulo`(`id_organizacion`, `titulo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `prestamos` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `id_usuario` INTEGER UNSIGNED NOT NULL,
    `id_libro` INTEGER UNSIGNED NOT NULL,
    `id_organizacion` INTEGER UNSIGNED NOT NULL,
    `fecha_prestamo` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `fecha_devolucion_esperada` DATETIME(0) NOT NULL,
    `fecha_devolucion_real` DATETIME(0) NULL,
    `extensiones_realizadas` TINYINT UNSIGNED NOT NULL DEFAULT 0,
    `lugar_retiro` VARCHAR(150) NULL,
    `estado` ENUM('pendiente_retiro', 'activo', 'devuelto', 'atrasado', 'cancelado') NOT NULL DEFAULT 'pendiente_retiro',

    INDEX `fk_prestamos_usuario`(`id_usuario`, `id_organizacion`),
    INDEX `idx_prestamos_libro`(`id_libro`),
    INDEX `idx_prestamos_org_estado`(`id_organizacion`, `estado`),
    INDEX `idx_prestamos_vencimiento`(`estado`, `fecha_devolucion_esperada`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `configuraciones` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `id_organizacion` INTEGER UNSIGNED NOT NULL,
    `nombre_app` VARCHAR(150) NOT NULL,
    `logo` VARCHAR(255) NULL,
    `color_primario` CHAR(7) NOT NULL DEFAULT '#000000',
    `color_secundario` CHAR(7) NULL,
    `max_libros_por_usuario` TINYINT UNSIGNED NOT NULL DEFAULT 3,
    `lugar_retiro` VARCHAR(150) NOT NULL,
    `dias_prestamo` SMALLINT UNSIGNED NOT NULL DEFAULT 30,
    `permite_extension` BOOLEAN NOT NULL DEFAULT true,
    `max_extensiones` TINYINT UNSIGNED NOT NULL DEFAULT 2,
    `dias_extension` SMALLINT UNSIGNED NOT NULL DEFAULT 30,
    `congelar_usuarios` BOOLEAN NOT NULL DEFAULT false,
    `dias_atraso_congelamiento` SMALLINT UNSIGNED NULL,
    `mensajes_personalizados` JSON NULL,

    UNIQUE INDEX `uq_config_org`(`id_organizacion`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notificaciones` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `id_usuario` INTEGER UNSIGNED NOT NULL,
    `id_prestamo` INTEGER UNSIGNED NULL,
    `tipo` ENUM('nuevo_prestamo', 'listo_para_retiro', 'vencimiento_10_dias', 'vencimiento_1_dia', 'limite_alcanzado', 'recomendacion', 'nuevo_libro') NOT NULL,
    `canal` ENUM('sistema', 'email') NOT NULL DEFAULT 'sistema',
    `mensaje` TEXT NOT NULL,
    `leida` BOOLEAN NOT NULL DEFAULT false,
    `fecha_envio` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_notif_prestamo`(`id_prestamo`),
    INDEX `idx_notif_usuario_leida`(`id_usuario`, `leida`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reportes_problemas` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `id_usuario` INTEGER UNSIGNED NOT NULL,
    `id_organizacion` INTEGER UNSIGNED NOT NULL,
    `id_libro` INTEGER UNSIGNED NULL,
    `descripcion` TEXT NOT NULL,
    `estado` ENUM('abierto', 'en_revision', 'resuelto') NOT NULL DEFAULT 'abierto',
    `fecha_reporte` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_reportes_libro`(`id_libro`),
    INDEX `idx_reportes_org_estado`(`id_organizacion`, `estado`),
    INDEX `idx_reportes_usuario`(`id_usuario`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `resenas` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `id_usuario` INTEGER UNSIGNED NOT NULL,
    `id_libro` INTEGER UNSIGNED NOT NULL,
    `id_organizacion` INTEGER UNSIGNED NOT NULL,
    `calificacion` TINYINT UNSIGNED NOT NULL,
    `comentario` TEXT NULL,
    `fecha` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `fk_resenas_usuario_org`(`id_usuario`, `id_organizacion`),
    INDEX `idx_resenas_libro`(`id_libro`),
    INDEX `idx_resenas_org`(`id_organizacion`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reservas` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `id_usuario` INTEGER UNSIGNED NOT NULL,
    `id_libro` INTEGER UNSIGNED NOT NULL,
    `id_organizacion` INTEGER UNSIGNED NOT NULL,
    `fecha_reserva` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `fecha_retiro` DATE NOT NULL,
    `estado` ENUM('activa', 'convertida', 'cancelada', 'expirada') NOT NULL DEFAULT 'activa',
    `id_prestamo` INTEGER UNSIGNED NULL,

    INDEX `fk_reservas_usuario`(`id_usuario`, `id_organizacion`),
    INDEX `idx_reservas_libro`(`id_libro`),
    INDEX `idx_reservas_org_estado`(`id_organizacion`, `estado`),
    INDEX `idx_reservas_prestamo`(`id_prestamo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `organizaciones` ADD CONSTRAINT `fk_org_plan` FOREIGN KEY (`id_plan`) REFERENCES `planes`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `usuarios` ADD CONSTRAINT `fk_usuarios_org` FOREIGN KEY (`id_organizacion`) REFERENCES `organizaciones`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `libros` ADD CONSTRAINT `fk_libros_org` FOREIGN KEY (`id_organizacion`) REFERENCES `organizaciones`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `prestamos` ADD CONSTRAINT `fk_prestamos_libro` FOREIGN KEY (`id_libro`) REFERENCES `libros`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `prestamos` ADD CONSTRAINT `fk_prestamos_org` FOREIGN KEY (`id_organizacion`) REFERENCES `organizaciones`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `prestamos` ADD CONSTRAINT `fk_prestamos_usuario` FOREIGN KEY (`id_usuario`, `id_organizacion`) REFERENCES `usuarios`(`id`, `id_organizacion`) ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `configuraciones` ADD CONSTRAINT `fk_config_org` FOREIGN KEY (`id_organizacion`) REFERENCES `organizaciones`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `notificaciones` ADD CONSTRAINT `fk_notif_prestamo` FOREIGN KEY (`id_prestamo`) REFERENCES `prestamos`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `notificaciones` ADD CONSTRAINT `fk_notif_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `reportes_problemas` ADD CONSTRAINT `fk_reportes_libro` FOREIGN KEY (`id_libro`) REFERENCES `libros`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `reportes_problemas` ADD CONSTRAINT `fk_reportes_org` FOREIGN KEY (`id_organizacion`) REFERENCES `organizaciones`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `reportes_problemas` ADD CONSTRAINT `fk_reportes_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `resenas` ADD CONSTRAINT `fk_resenas_libro` FOREIGN KEY (`id_libro`) REFERENCES `libros`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `resenas` ADD CONSTRAINT `fk_resenas_usuario_org` FOREIGN KEY (`id_usuario`, `id_organizacion`) REFERENCES `usuarios`(`id`, `id_organizacion`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `reservas` ADD CONSTRAINT `fk_reservas_libro` FOREIGN KEY (`id_libro`) REFERENCES `libros`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `reservas` ADD CONSTRAINT `fk_reservas_prestamo` FOREIGN KEY (`id_prestamo`) REFERENCES `prestamos`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `reservas` ADD CONSTRAINT `fk_reservas_usuario` FOREIGN KEY (`id_usuario`, `id_organizacion`) REFERENCES `usuarios`(`id`, `id_organizacion`) ON DELETE CASCADE ON UPDATE NO ACTION;
