export const planes = [
    {
        id: 1,
        codigo: "esencial",
        nombre: "Esencial",
        tagline: "inicial",
        descripcion: "Para una biblioteca escolar que arranca su digitalización.",
        icono: "📗",
        destacado: false,
        precioMensual: 39,
        precioAnual: 390,
        limites: { usuarios: 150, admins: 2, titulos: 500 },
        caracteristicas: [
            "Catálogo con búsqueda y filtros",
            "Préstamos automáticos y devoluciones",
            "Notificaciones por correo",
            "Reportes básicos de circulación",
        ],
    },
    {
        id: 2,
        codigo: "colegio",
        nombre: "Colegio",
        tagline: "recomendado",
        descripcion: "Para bachilleratos y colegios con la marca y los reportes que necesitan.",
        icono: "📘",
        destacado: true,
        etiquetaDestacado: "MÁS ELEGIDO",
        precioMensual: 89,
        precioAnual: 890,
        limites: { usuarios: 600, admins: 6, titulos: 3000 },
        caracteristicas: [
            "Todo lo del plan Esencial",
            "Personalización de marca completa",
            "Hasta 3.000 títulos en catálogo",
            "Reportes avanzados con exportación",
        ],
    },
    {
        id: 3,
        codigo: "campus",
        nombre: "Campus",
        tagline: "avanzado",
        descripcion: "Para redes de colegios y bibliotecas grandes.",
        icono: "📚",
        destacado: false,
        precioMensual: 179,
        precioAnual: 1790,
        limites: { usuarios: 2500, admins: 25, titulos: 10000 },
        caracteristicas: [
            "Todo lo del plan Colegio",
            "2.500 usuarios y 10.000 títulos",
            "Soporte prioritario con SLA",
            "Gestor de cuenta dedicado",
        ],
    },
];

export const planesComparativa = {
    categorias: [
        {
            nombre: "Catálogo",
            filas: [
                { funcionalidad: "Catálogo con búsqueda y filtros", valores: [true, true, true] },
                { funcionalidad: "Fichas de libro con reseñas", valores: [true, true, true] },
                { funcionalidad: "Vista de invitado (solo lectura)", valores: [true, true, true] },
                { funcionalidad: "Recomendados y novedades destacadas", valores: [true, true, true] },
            ],
        },
        {
            nombre: "Préstamos",
            filas: [
                { funcionalidad: "Préstamos automáticos por stock", valores: [true, true, true] },
                { funcionalidad: "Gestión de devoluciones", valores: [true, true, true] },
                { funcionalidad: "Reglas de préstamo configurables", valores: [false, true, true] },
                { funcionalidad: "Congelamiento por atraso reiterado", valores: [false, true, true] },
            ],
        },
        {
            nombre: "Límites",
            filas: [
                { funcionalidad: "Usuarios incluidos", valores: [150, 600, 2500] },
                { funcionalidad: "Administradores", valores: [2, 6, 25] },
                { funcionalidad: "Títulos en catálogo", valores: [500, 3000, 10000] },
            ],
        },
        {
            nombre: "Marca y reportes",
            filas: [
                { funcionalidad: "Personalización de marca", valores: [false, true, true] },
                { funcionalidad: "Plantillas de notificación editables", valores: [false, true, true] },
                { funcionalidad: "Reportes de circulación", valores: ["Básicos", "Avanzados", "Avanzados"] },
                { funcionalidad: "Exportación de reportes", valores: [false, true, true] },
            ],
        },
        {
            nombre: "Soporte",
            filas: [
                { funcionalidad: "Migración de tu Excel", valores: [true, true, true] },
                { funcionalidad: "Canal de soporte", valores: ["Correo", "Correo y teléfono", "Prioritario 4 h"] },
                { funcionalidad: "Gestor de cuenta dedicado", valores: [false, false, true] },
            ],
        },
    ],
};

export const organizaciones = [
    { id: 1, nombre: "Anima BT", idPlan: 2, dominio: "anima.edu.uy", activo: true, expiracion:"", logoUrl: "https://www.ceaosa.com.uy/wp-content/uploads/2021/12/anima.png"},
    { id: 2, nombre: "Providencia", idPlan: 1, dominio: "providencia.edu.uy", activo: true, expiracion:"", logoUrl: "https://www.providencia.org.uy/wp-content/uploads/2016/08/logoNegro.png"},
    { id: 3, nombre: "Anima btt", idPlan: 2, dominio: "test.com", activo: true, expiracion: "2026-10-08", logoUrl: "https://www.ceaosa.com.uy/wp-content/uploads/2021/12/anima.png"},
];

// Contraseña de todos: "password123"
const CONTRASENA_DE_PRUEBA = "$2b$10$CsPYZnO.L4G/AiV/.iKh5.yvMlopWoT8cHAY/m4tuWLhVy0TUoYde";

export const usuarios = [
    { id: 1, CI: null, nombre: "Super Admin", correo: "super@plataforma.com", contrasena: CONTRASENA_DE_PRUEBA, fecharegistro: "01/09/2026", rol: "super-admin", organizacionNombre: null, organizacionId: null },

    // Anima BT (id 1): 1 admin + 8 lectores de prueba
    { id: 2, CI: 10000001, nombre: "Admin Uno", correo: "admin@anima.edu.uy", contrasena: CONTRASENA_DE_PRUEBA, fecharegistro: "01/09/2026", rol: "admin", organizacionNombre: "Anima BT", organizacionId: 1 },
    { id: 3, CI: 10000002, nombre: "Mauro Aires", correo: "mauro.aires@anima.edu.uy", contrasena: CONTRASENA_DE_PRUEBA, fecharegistro: "01/09/2026", rol: "lector", organizacionNombre: "Anima BT", organizacionId: 1 },
    { id: 4, CI: 10000003, nombre: "Angelina López", correo: "angelina.lopez@anima.edu.uy", contrasena: CONTRASENA_DE_PRUEBA, fecharegistro: "01/09/2026", rol: "lector", organizacionNombre: "Anima BT", organizacionId: 1 },
    { id: 5, CI: 10000004, nombre: "Alex Vasconcelo", correo: "alex.vasconcelo@anima.edu.uy", contrasena: CONTRASENA_DE_PRUEBA, fecharegistro: "01/09/2026", rol: "lector", organizacionNombre: "Anima BT", organizacionId: 1 },
    { id: 6, CI: 10000005, nombre: "Valentina Barrios", correo: "valentina.barrios@anima.edu.uy", contrasena: CONTRASENA_DE_PRUEBA, fecharegistro: "01/09/2026", rol: "lector", organizacionNombre: "Anima BT", organizacionId: 1 },
    { id: 7, CI: 10000006, nombre: "Luciano Vargas", correo: "luciano.vargas@anima.edu.uy", contrasena: CONTRASENA_DE_PRUEBA, fecharegistro: "01/09/2026", rol: "lector", organizacionNombre: "Anima BT", organizacionId: 1 },
    { id: 8, CI: 10000007, nombre: "Ariana Rodríguez", correo: "ariana.rodriguez@anima.edu.uy", contrasena: CONTRASENA_DE_PRUEBA, fecharegistro: "01/09/2026", rol: "lector", organizacionNombre: "Anima BT", organizacionId: 1 },
    { id: 9, CI: 10000008, nombre: "Gianna Vasconcelo", correo: "gianna.vasconcelo@anima.edu.uy", contrasena: CONTRASENA_DE_PRUEBA, fecharegistro: "01/09/2026", rol: "lector", organizacionNombre: "Anima BT", organizacionId: 1 },
    { id: 10, CI: 10000009, nombre: "Leandro Benítez", correo: "leandro.benitez@anima.edu.uy", contrasena: CONTRASENA_DE_PRUEBA, fecharegistro: "01/09/2026", rol: "lector", organizacionNombre: "Anima BT", organizacionId: 1 },

    // Providencia (id 2): 1 admin + 8 lectores de prueba
    { id: 11, CI: 20000001, nombre: "Admin Dos", correo: "admin@providencia.edu.uy", contrasena: CONTRASENA_DE_PRUEBA, fecharegistro: "01/09/2026", rol: "admin", organizacionNombre: "Providencia", organizacionId: 2 },
    { id: 12, CI: 20000002, nombre: "Sofía Méndez", correo: "sofia.mendez@providencia.edu.uy", contrasena: CONTRASENA_DE_PRUEBA, fecharegistro: "01/09/2026", rol: "lector", organizacionNombre: "Providencia", organizacionId: 2 },
    { id: 13, CI: 20000003, nombre: "Tomás Ferreira", correo: "tomas.ferreira@providencia.edu.uy", contrasena: CONTRASENA_DE_PRUEBA, fecharegistro: "01/09/2026", rol: "lector", organizacionNombre: "Providencia", organizacionId: 2 },
    { id: 14, CI: 20000004, nombre: "Camila Suárez", correo: "camila.suarez@providencia.edu.uy", contrasena: CONTRASENA_DE_PRUEBA, fecharegistro: "01/09/2026", rol: "lector", organizacionNombre: "Providencia", organizacionId: 2 },
    { id: 15, CI: 20000005, nombre: "Bruno Acosta", correo: "bruno.acosta@providencia.edu.uy", contrasena: CONTRASENA_DE_PRUEBA, fecharegistro: "01/09/2026", rol: "lector", organizacionNombre: "Providencia", organizacionId: 2 },
    { id: 16, CI: 20000006, nombre: "Martina Silva", correo: "martina.silva@providencia.edu.uy", contrasena: CONTRASENA_DE_PRUEBA, fecharegistro: "01/09/2026", rol: "lector", organizacionNombre: "Providencia", organizacionId: 2 },
    { id: 17, CI: 20000007, nombre: "Nicolás Pereyra", correo: "nicolas.pereyra@providencia.edu.uy", contrasena: CONTRASENA_DE_PRUEBA, fecharegistro: "01/09/2026", rol: "lector", organizacionNombre: "Providencia", organizacionId: 2 },
    { id: 18, CI: 20000008, nombre: "Julieta Rivas", correo: "julieta.rivas@providencia.edu.uy", contrasena: CONTRASENA_DE_PRUEBA, fecharegistro: "01/09/2026", rol: "lector", organizacionNombre: "Providencia", organizacionId: 2 },
    { id: 19, CI: 20000009, nombre: "Federico Castro", correo: "federico.castro@providencia.edu.uy", contrasena: CONTRASENA_DE_PRUEBA, fecharegistro: "01/09/2026", rol: "lector", organizacionNombre: "Providencia", organizacionId: 2 },

    // Anima btt (id 3): 1 admin + 1 lector de prueba
    { id: 20, CI: 57642736, nombre: "ADMIN ANIMA BTT", correo: "admin@test.com", contrasena: "$2b$10$qNIGEVVgwzbDqGbMDFfi0eN8UBOPqXUf73vp0qR51iUY6h7dnuFdG", fecharegistro: "08/09/2026", rol: "admin", organizacionNombre: "Anima btt", organizacionId: 3 },
    { id: 21, CI: 57922388, nombre: "Mauro", correo: "mauro.aires@test.com", contrasena: "$2b$10$dUJpjOTnjqB0WUH5kIDmpeWUuSxXnd1Wrf1kdekMyXnMAPLuYPS/K", fecharegistro: "08/09/2026", rol: "lector", organizacionNombre: "Anima btt", organizacionId: 3 },
];

export const usuarios_configuracion = [
    { id: 1, idUsuario: 2, idOrganizacion: 1,},
    { id: 2, idUsuario: 3, idOrganizacion: 1,},
    { id: 3, idUsuario: 11, idOrganizacion: 2,},
    { id: 4, idUsuario: 12, idOrganizacion: 2,},
];

export const libros = [
    { id: 1, titulo: "El principito", idOrganizacion: 1, autor: "Antoine de Saint-Exupéry", genero: "Ficción", editorial: "Editorial Planeta", fechapub: 2010, resumen: "Un libro clásico sobre la vida y la amistad.", portada: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR_LheuMEIKpMc5taDRJYwldVYcULuPO3qU_kQ0mjJWaw&s=100", disponible: true, stock: 10, fecha_creacion: ""},
    { id: 2, titulo: "Las aventuras de Sapo Ruperto", idOrganizacion: 1, autor: "Roy Berocay", genero: "Infantil", editorial: "Alfaguara Infantil", fechapub: 2010, resumen: "", portada: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRl_thqKwG078sdekpjrBlWJPl6AZwMTVoz71JTlVwCmQ&s=100", disponible: true, stock: 10, fecha_creacion: ""},
    { id: 3, titulo: "Una Pindo", idOrganizacion: 1, autor: "Susan Olaondo", genero: "Infantil", editorial: "Editorial Planeta", fechapub: 2010, resumen: "", portada: "https://encrypted-tbn0.gsta tic.com/images?q=tbn:ANd9GcQKWk6A2kgnDKKbNaJW5r0CDCVyPKHhLvChqrdDXd6s7zI2rO3Jihc1S0Q9&s=10", disponible: true, stock: 10, fecha_creacion: ""},
];

export const prestamos = [
    { idprestamo: 1,id: 1, idUsuario: 1, idLibro: 1, idOrganizacion: 1,fecha_prestamo: "", fecha_devolucionesperada: "", fecha_devolucionreal: "", estado: "pendiente",},
    { idprestamo: 2,id: 2, idUsuario: 2, idLibro: 2, idOrganizacion: 1,fecha_prestamo: "", fecha_devolucionesperada: "", fecha_devolucionreal: "", estado: "pendiente"},
    {idprestamo: 3,id: 3, idUsuario: 3, idLibro: 3, idOrganizacion: 1,fecha_prestamo: "", fecha_devolucionesperada: "", fecha_devolucionreal: "", estado: "pendiente"},
    

];

export const configuraciones = [
    { id: 1, idOrganizacion: 1, nombre: "configuracion1", nombreApp: "", logo: "", color_primario: "rojo", color_secundario: "azul", mensajes_personalizados: "",},
    { id: 2, idOrganizacion: 2, nombre: "configuracion2", nombreApp: "", logo: "", color_primario: "verde", color_secundario: "amarillo", mensajes_personalizados: "",},
    { id: 3, idOrganizacion: 3, nombre: "configuracion3", nombreApp: "Biblioteca Anima BTT", logo: "https://www.ceaosa.com.uy/wp-content/uploads/2021/12/anima.png", color_primario: "#047857", color_secundario: "#6EE7B7", mensajes_personalizados: "",},
];
