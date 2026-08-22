export const planes = [
    { id: 1, nombre: "Plan Básico", precio: 10000, funcionalidades: "", limiteUsuarios: 200},
    { id: 2, nombre: "Plan Premium", precio: 25000, funcionalidades: "", limiteUsuarios: 500},
    { id: 3, nombre: "Plan Empresarial", precio: 50000, funcionalidades: "", limiteUsuarios: 1000,}
];

export const organizaciones = [
    { id: 1, nombre: "", idPlan: 1, dominio: "", activo: true, expiracion:""},
    { id: 2, nombre: "", idPlan: 2, dominio: "", activo: true, expiracion:""},
    { id: 3, nombre: "", idPlan: 3, dominio: "", activo: true, expiracion:""},
    { id: 4, nombre: "", idPlan: 1, dominio: "", activo: true, expiracion:""},
    { id: 5, nombre: "", idPlan: 2, dominio: "", activo: true, expiracion:""},

];

export const usuarios = [
    { id: 1, CI: 12345678, nombre: "superadmin", correo: "superadmin@anima.edu.uy", contrasenia: "$2a$12$...", fecharegistro: "09/01/2009" ,rol: "admin_plataforma"},
    { id: 2, CI: 87654321, nombre: "mauro", correo: "mauro@anima.edu.uy", contrasenia: "$2a$12$nKf.hj2obZ/rSh1vciHZNuO8a1FJJtJnjfh85PAmAOIB3PoSGfVX6", fecharegistro: "21/08/2026" ,rol: "lector"},
    { id: 3, CI: 11111111, nombre: "admin", correo: "superadmin", contrasenia: "$2a$12$...", fecharegistro: "21/08/2026" ,rol: "admin"},
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