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
    { id: 1, nombre: "Anima BT", idPlan: 1, dominio: "", activo: true, expiracion:"", logoUrl: "https://www.ceaosa.com.uy/wp-content/uploads/2021/12/anima.png"},
    { id: 2, nombre: "Providencia", idPlan: 2, dominio: "", activo: true, expiracion:"", logoUrl: "https://www.providencia.org.uy/wp-content/uploads/2016/08/logoNegro.png"},
    { id: 3, nombre: "Universidad de la Republica", idPlan: 3, dominio: "", activo: true, expiracion:"", logoUrl: "https://i0.wp.com/parlamentodata.com/wp-content/uploads/2020/05/logo-udelar.png?ssl=1"},
    { id: 4, nombre: "", idPlan: 1, dominio: "", activo: true, expiracion:""},
    { id: 5, nombre: "", idPlan: 2, dominio: "", activo: true, expiracion:""},
];

export const usuarios = [
    { id: 1, CI: 12345678, nombre: "superadmin", correo: "superadmin@anima.edu.uy", contrasena: "$2a$12$nKf.hj2obZ/rSh1vciHZNuO8a1FJJtJnjfh85PAmAOIB3PoSGfVX6", fecharegistro: "09/01/2009" ,rol: "super-admin", organizacionNombre: "Anima BT", organizacionId: 1},
    { id: 2, CI: 87654321, nombre: "mauro aires", correo: "mauro@anima.edu.uy", contrasena: "$2a$12$nKf.hj2obZ/rSh1vciHZNuO8a1FJJtJnjfh85PAmAOIB3PoSGfVX6", fecharegistro: "21/08/2026", rol: "lector", organizacionNombre: "Anima BT", organizacionId: 2},
    { id: 3, CI: 57642736, nombre: "admin", correo: "admin@anima.edu.uy", contrasena: "$2a$12$nKf.hj2obZ/rSh1vciHZNuO8a1FJJtJnjfh85PAmAOIB3PoSGfVX6", fecharegistro: "21/08/2026" ,rol: "admin", organizacionNombre: "Anima BT", organizacionId: 3},
];

export const usuarios_configuracion = [
    { id: 1, idUsuario: 1, idOrganizacion: 1,},
    { id: 2, idUsuario: 2, idOrganizacion: 1,},
    { id: 3, idUsuario: 3, idOrganizacion: 1,},
    { id: 4, idUsuario: 1, idOrganizacion: 2,},
    { id: 5, idUsuario: 2, idOrganizacion: 2,},
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
    { id: 3, idOrganizacion: 3, nombre: "configuracion3", nombreApp: "", logo: "", color_primario: "naranja", color_secundario: "morado", mensajes_personalizados: "",},
    {id: 4, idOrganizacion: 4, nombre: "configuracion4", nombreApp: "", logo: "", color_primario: "rosa", color_secundario: "gris", mensajes_personalizados: "",},
    { id: 5, idOrganizacion: 5, nombre: "configuracion5", nombreApp: "", logo: "", color_primario: "negro", color_secundario: "blanco", mensajes_personalizados: "",},

    
    

];    