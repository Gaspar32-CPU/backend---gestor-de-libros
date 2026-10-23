# Integración: reportes de problemas y Soporte

28 casos con Node.js 24, HTTP real, Express, JWT, bcrypt, mysql2 y MySQL 8.0.46.
Se utiliza el esquema completo db/init/01_schema.sql. No se simulan las consultas
SQL, los middleware ni las respuestas HTTP.

## Ejecución

Usar una instancia MySQL local EXCLUSIVA de pruebas en el puerto 3306.
El usuario necesita CREATE y DROP DATABASE. La suite crea una base aleatoria
bookly_test_<uuid>, carga fixtures ficticios y elimina esa base al finalizar.
No indicar una base en la URL ni usar una instancia de producción.
No necesita .env: el backend hijo recibe un entorno explícito de pruebas.

```sh
npm ci --ignore-scripts --no-audit --no-fund
export BOOKLY_TEST_MYSQL_URL='mysql://USUARIO:CLAVE@127.0.0.1:3306'
npm run test:integration
```

GitHub Actions inicia un servicio MySQL temporal, ejecuta la suite y conserva
TAP y JUnit. La contraseña del servicio es ficticia y no requiere secretos.
Corre en PR hacia main y, una vez integrado, permite ejecución manual desde
Actions > Integración HTTP y MySQL > Run workflow.

## Alcance

Login, permisos, secciones por rol, creación y persistencia de reportes,
validaciones y límites, identidad del token, consulta de Soporte, resolución
y conflicto entre dos tomas concurrentes. IDs IT-01 a IT-28.
No prueba React, navegación, Nginx, correo, APIs externas ni la VM del colegio.
Una falla de preparación no equivale a un defecto funcional. La preparación
local quedó bloqueada por el socket Unix del entorno; los resultados funcionales
se obtienen de la ejecución en GitHub Actions.
