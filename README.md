## Base de datos local

El proyecto usa MySQL 8.4 en Docker. No hace falta instalar MySQL en la máquina.

### Requisitos

- Docker Desktop (macOS/Windows) o Docker Engine (Linux)
- Node.js 20.6 o superior

### Primer arranque

```bash
# 1. Levantar la base
docker compose up -d

# 2. Configurar variables de entorno
cp .env.example .env

# 3. Instalar dependencias y arrancar
npm install
node index.js
```

La primera vez, Docker descarga la imagen y ejecuta los scripts de `db/init/`,
que crean el esquema y cargan datos de prueba. Puede tardar un minuto.

Verificar que todo funciona: http://localhost:3001/api/salud
Debe responder `{"ok":true,"db":"conectada","libros":5}`.

### Comandos frecuentes

| Acción | Comando |
|---|---|
| Levantar la base | `docker compose up -d` |
| Apagar (conserva datos) | `docker compose stop` |
| **Resetear** (borra datos y recrea el esquema) | `docker compose down -v && docker compose up -d` |
| Ver logs de MySQL | `docker compose logs -f db` |
| Consola MySQL | `docker exec -it biblioteca_db mysql -u biblioteca -pbiblioteca biblioteca` |
| Recargar solo los datos de prueba | `docker exec -i biblioteca_db mysql -u biblioteca -pbiblioteca biblioteca < db/init/02_seed.sql` |

### Panel web (Adminer)

http://localhost:8080

| Campo | Valor |
|---|---|
| Motor | MySQL |
| Servidor | `db` |
| Usuario | `biblioteca` |
| Contraseña | `biblioteca` |
| Base de datos | `biblioteca` |

> El servidor es `db`, no `localhost`: Adminer corre dentro de la red de Docker.

**Acceder desde otra PC en la misma red:** conseguí la IP de la máquina que
levanta Docker (`ipconfig getifaddr en0` en macOS) y entrá a
`http://<esa-IP>:8080` desde el otro equipo. No expongas este puerto fuera de
la red local: no tiene autenticación adicional más allá del usuario/contraseña
de MySQL de arriba.

### Estructura

```
db/
└── init/
    ├── 01_schema.sql   ← esquema (fuente de verdad del MER)
    └── 02_seed.sql     ← datos de prueba
```

Los scripts de `db/init/` **solo se ejecutan cuando el volumen está vacío**.
Si modificás el esquema, hay que hacer `docker compose down -v` para que se
vuelvan a aplicar. Editá siempre el `.sql`, nunca la base a mano desde Adminer:
así todo el equipo trabaja con el mismo esquema.

### Alternativa: MySQL local (sin Docker)

Si Docker Desktop no arranca (falla frecuente en Windows) o preferís no usarlo, podés
apuntar el proyecto a un MySQL instalado en la máquina en vez del contenedor. Cambiá
el `.env` para que apunte a esa instancia (usuario, contraseña y `DB_NAME` propios,
no tienen que coincidir con los del `docker-compose.yml`).

Como en este caso los scripts de `db/init/` no se auto-ejecutan (eso solo lo hace
Docker en un volumen vacío), hay que correrlos a mano con el cliente `mysql`. Esto
aplica tanto para el primer arranque como para cualquier cambio posterior en
`01_schema.sql` o `02_seed.sql` — no hace falta distinguir los casos, recrear todo
siempre funciona porque el schema son puros `CREATE TABLE` sobre una base vacía:

```bash
# Ajustá MYSQL, host, usuario, contraseña y DB_NAME a los de tu .env
MYSQL="/c/Program Files/MySQL/MySQL Server 8.0/bin/mysql.exe"   # en Linux/Mac: solo "mysql"

"$MYSQL" -h 127.0.0.1 -P 3306 -u root -proot -e "DROP DATABASE IF EXISTS gestion_libros; CREATE DATABASE gestion_libros CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;"
"$MYSQL" -h 127.0.0.1 -P 3306 -u root -proot gestion_libros < "db/init/01_schema.sql"
"$MYSQL" -h 127.0.0.1 -P 3306 -u root -proot gestion_libros < "db/init/02_seed.sql"
```

### Usuarios de prueba

Contraseña de todos: `password123`

| Email | Rol | Organización |
|---|---|---|
| `super@plataforma.com` | admin_plataforma | — |
| `admin@liceodemo1.edu.uy` | admin_organizacion | Liceo Demo Uno |
| `lectora@liceodemo1.edu.uy` | lector | Liceo Demo Uno |
| `admin@liceodemo2.edu.uy` | admin_organizacion | Liceo Demo Dos |

### Problemas comunes

**`no configuration file provided`** — Estás en la carpeta equivocada. Los comandos
`docker compose` se corren desde la raíz de este repo.

**`Cannot connect to the Docker daemon`** — Docker Desktop no está abierto.
En macOS: `open -a Docker` y esperar a que arranque.

**`port 3306 already allocated`** — Tenés MySQL corriendo en la máquina. Cambiá el
mapeo en `docker-compose.yml` a `"3307:3306"` y poné `DB_PORT=3307` en el `.env`.

**`Access denied for user 'root'@...`** — Las variables del `.env` no llegan al pool.
Asegurate de que `import 'dotenv/config'` sea la primera línea de `index.js`,
o arrancá con `node --env-file=.env index.js`.

**`libros: 0` en `/api/salud`** — El esquema se creó pero el seed no corrió.
Ejecutá el comando de "Recargar solo los datos de prueba".