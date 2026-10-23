# Pruebas unitarias de Bookly — KAN-242

Se ejecutan con el runner incorporado de Node.js 24. No levantan el servidor,
no consultan MySQL y no envían correos. Los datos y secretos usados son ficticios.

## Reproducción

Desde la raíz del repositorio, con Node.js 24 y npm:

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run test:unit
```

`--ignore-scripts` evita ejecutar hooks de instalación; las unidades probadas no
necesitan generar Prisma ni inicializar bases de datos. No hace falta un `.env`.

## Resultado conservado

22 pruebas: 21 aprobadas y 1 fallida.
La salida 1 es el resultado esperado mientras persistan los defectos detectados:
las aserciones fallidas no están omitidas ni marcadas como TODO.

Los reportes originales TAP y JUnit están en el paquete de evidencia entregado.
El informe distingue el testing unitario de integración, aceptación y pruebas
sobre la VM. No se midió cobertura global del proyecto.
