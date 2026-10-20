# Cómo correr 10go's Perfumes en tu computadora (Windows)

Esta guía te lleva paso a paso: desde descargar el código hasta entrar al panel de administración y mirar la base de datos con tus propios ojos. Si algo falla, mira la sección **Problemas comunes** al final.

> Todos los comandos se escriben en **PowerShell** (busca "PowerShell" en el menú Inicio). Cada bloque gris es algo que copias y pegas, y pulsas Enter.

---

## 0. Primero, entiende las piezas (2 minutos)

Piensa en una biblioteca:

| Pieza | En la biblioteca | En este proyecto |
|---|---|---|
| **PostgreSQL** (el servidor) | El edificio | Un programa que ya instalaste y que está corriendo en segundo plano |
| **Base de datos** | Una sala del edificio | `diez_go_perfumes`, la que vamos a crear |
| **Tabla** | Un estante con fichas | `perfumes`, `perfume_variants`, `orders` |
| **Fila** | Una ficha | Un perfume, un tamaño, una orden |
| **Columna** | Un dato de la ficha | `name`, `brand`, `price`, `stock`... |
| **Backend (FastAPI)** | El bibliotecario | Un programa Python que lee y escribe en la base de datos cuando se lo piden |
| **Frontend** | El mostrador | Las páginas que ves en el navegador; le piden cosas al backend |

El flujo es: **navegador → backend (Python) → base de datos (PostgreSQL)** y de vuelta.

Las 3 tablas se relacionan así:
- `perfumes` ←→ `perfume_variants`: un perfume tiene varios tamaños (3, 5, 10 ml y botella). Cada tamaño apunta a su perfume con la columna `perfume_id`.
- `orders` guarda cada orden de prueba, con los productos comprados dentro de una columna `items`.

---

## 1. Lo que necesitas tener instalado

Comprueba cada cosa en PowerShell:

```powershell
git --version
python --version
```

- **Git**: si no aparece, instálalo desde https://git-scm.com
- **Python 3.11, 3.12 o 3.13** (recomendado). Si `python` no se reconoce, prueba con `py --version`. Al instalar Python marca la casilla **"Add Python to PATH"**.
- **PostgreSQL**: ya lo tienes. Necesitas saber **la contraseña del usuario `postgres`** que elegiste al instalarlo y el puerto (casi siempre `5432`).

---

## 2. Descargar el código

```powershell
cd C:\C4\Projects\10goperfumes
git clone https://github.com/10godr/10goparfum .
```

(El punto final es importante: clona dentro de la carpeta actual. La carpeta debe estar vacía.)

Si ya lo habías clonado, solo actualiza:

```powershell
git pull origin main
```

---

## 3. Preparar Python (entorno virtual)

Un **entorno virtual** es una caja donde se instalan las librerías de este proyecto, para no mezclarlas con otras.

```powershell
cd C:\C4\Projects\10goperfumes\backend
python -m venv venv
.\venv\Scripts\Activate.ps1
```

Cuando funciona, verás `(venv)` al inicio de la línea de PowerShell. Luego instala las librerías:

```powershell
pip install -r requirements.txt
```

Si al activar sale un error de "ejecución de scripts deshabilitada", corre esto una vez y vuelve a activar:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

---

## 4. Crear la base de datos en PostgreSQL

Elige **una** de las dos formas.

### Opción A: con pgAdmin (visual, la más fácil)

1. Abre **pgAdmin 4** (se instaló junto con PostgreSQL). Te pedirá una contraseña maestra la primera vez.
2. En el panel izquierdo abre **Servers → PostgreSQL**. Te pedirá la contraseña del usuario `postgres`.
3. Clic derecho sobre **Databases → Create → Database...**
4. Nombre: `diez_go_perfumes` → **Save**.

### Opción B: con la terminal (psql)

```powershell
psql -U postgres
```

(Si dice que `psql` no se reconoce, usa la ruta completa, por ejemplo: `& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres`. El número 16 depende de tu versión.)

Escribe la contraseña y, dentro de `psql`, ejecuta:

```sql
CREATE DATABASE diez_go_perfumes;
\l
\q
```

`\l` lista las bases de datos (debe aparecer `diez_go_perfumes`) y `\q` sale.

> La base está **vacía**: todavía no tiene tablas. Las crea el siguiente paso.

---

## 5. Configurar el archivo `.env`

El `.env` guarda tus **secretos** (contraseñas). Nunca se sube a GitHub.

```powershell
copy .env.example .env
notepad .env
```

Edita estas líneas:

```
DATABASE_URL=postgresql+psycopg2://postgres:TU_PASSWORD@localhost:5432/diez_go_perfumes
USD_TO_DOP=61
ADMIN_USER=admin
ADMIN_PASSWORD=pon-aqui-una-contrasena
JWT_SECRET=pon-aqui-un-texto-largo-y-aleatorio
```

Qué significa cada una:

- **`DATABASE_URL`** = la "dirección" de tu base: `usuario:contraseña@servidor:puerto/nombre_de_la_base`. Cambia `TU_PASSWORD` por la contraseña de `postgres`. Si tu contraseña tiene caracteres especiales, escríbelos codificados (`@` → `%40`, `#` → `%23`, `/` → `%2F`, `:` → `%3A`).
- **`USD_TO_DOP`** = tasa de dólares a pesos (61).
- **`ADMIN_USER` / `ADMIN_PASSWORD`** = el usuario y la contraseña con los que entrarás al panel de admin. Los eliges tú.
- **`JWT_SECRET`** = una clave para firmar las sesiones. Genera una con:

```powershell
python -c "import secrets; print(secrets.token_hex(32))"
```

y pega el resultado. Guarda el archivo (Ctrl+S) y ciérralo.

---

## 6. Crear las tablas y cargar los perfumes

```powershell
python seed.py
```

Debe responder: `Listo: 8 perfumes y 32 variantes.`

Qué pasó: SQLAlchemy leyó `models.py`, **creó las 3 tablas** y `seed.py` insertó los 8 perfumes con sus 4 tamaños cada uno (8 × 4 = 32).

> ⚠️ Si vuelves a correr `seed.py`, los perfumes se borran y se cargan de nuevo: el stock y los precios vuelven al valor inicial. Las órdenes ya creadas se conservan.

---

## 7. Encender el backend

```powershell
uvicorn main:app --reload
```

Debe decir algo como `Uvicorn running on http://127.0.0.1:8000`. **Deja esa ventana abierta**: mientras esté abierta, el sitio funciona. Para apagarlo, pulsa **Ctrl + C**.

(`--reload` hace que se reinicie solo cuando cambias el código.)

Ahora abre en el navegador:

| Dirección | Qué es |
|---|---|
| http://localhost:8000 | La tienda (el backend también sirve el frontend) |
| http://localhost:8000/docs | Documentación interactiva de la API (Swagger) |
| http://localhost:8000/admin.html | El panel de administración |

### Probar la API desde `/docs`

1. Abre `/docs`, clic en **GET /api/perfumes** → **Try it out** → **Execute**.
2. Verás en JSON los 8 perfumes: son los datos que están en la base de datos.
3. Prueba los filtros: escribe `Árabe` en `category` y ejecuta otra vez.

---

## 8. Entrar al panel de administración

1. Ve a http://localhost:8000/admin.html (también está el enlace «Panel de administración» en el pie de página).
2. Escribe el `ADMIN_USER` y `ADMIN_PASSWORD` que pusiste en el `.env`.
3. Si entras, verás las tarjetas de resumen, el inventario y la pestaña **Órdenes de prueba**.

Lo que puedes hacer ahí:

- **Cambiar precio o stock** de un formato: edita el número y pulsa **Guardar**.
- **Nuevo perfume**: formulario para crear uno (nombre, notas, acordes y formatos).
- **Editar / Eliminar** un perfume.
- **Órdenes de prueba**: las que se generaron en el checkout.

La sesión dura 8 horas; luego te pedirá entrar otra vez. Si te sale "Usuario o contraseña incorrectos", revisa que coincidan **exactamente** con el `.env` (y reinicia uvicorn si cambiaste el `.env`).

---

## 9. Ejercicio para entender la base de datos

Haz esto en orden. Es la mejor manera de "ver" cómo todo se conecta.

1. **Mira el stock inicial.** En pgAdmin: **Servers → PostgreSQL → Databases → diez_go_perfumes → Schemas → public → Tables**. Clic derecho en `perfume_variants` → **View/Edit Data → All Rows**. Busca la fila del Khamrah de 3 ml: `stock` = 12.
2. **Haz una compra de prueba.** En la tienda entra a Khamrah, elige 3 ml, añade 2 al carrito y genera la orden en el checkout.
3. **Refresca la tabla** (botón de recargar en la ventana de datos): el stock bajó a 10.
4. **Mira la orden.** Abre la tabla `orders`: está tu orden `ORD-1001` y sus productos dentro de la columna `items`.
5. **Mira lo mismo en el admin**: la orden aparece en «Órdenes de prueba» y el stock coincide.

Lo mismo con comandos, por si prefieres la terminal:

```powershell
psql -U postgres -d diez_go_perfumes
```

```sql
\dt
SELECT id, name, brand, category FROM perfumes;
SELECT perfume_id, size_ml, price, stock FROM perfume_variants WHERE perfume_id = 1 ORDER BY size_ml;
SELECT order_code, customer_name, total_price, created_at FROM orders;
\q
```

- `\dt` lista las tablas. `SELECT` significa «muéstrame». `WHERE` filtra. `ORDER BY` ordena.
- Cuidado: los `UPDATE` y `DELETE` cambian datos de verdad. Mientras aprendes, usa mejor el admin.

---

## 10. Cada vez que quieras trabajar en el proyecto

1. Abre PowerShell y entra a la carpeta del backend:
   ```powershell
   cd C:\C4\Projects\10goperfumes\backend
   .\venv\Scripts\Activate.ps1
   ```
2. (Opcional, si hubo cambios nuevos en GitHub):
   ```powershell
   git pull origin main
   pip install -r requirements.txt
   ```
3. Enciende el backend:
   ```powershell
   uvicorn main:app --reload
   ```
4. Abre http://localhost:8000.

PostgreSQL ya corre solo en segundo plano; no hay que encenderlo (salvo que lo hayas apagado).

---

## Problemas comunes

| Lo que ves | Qué significa y cómo arreglarlo |
|---|---|
| `password authentication failed for user "postgres"` | La contraseña del `DATABASE_URL` en el `.env` no es la de PostgreSQL. Corrígela. |
| `connection refused` / `could not connect to server` | PostgreSQL no está encendido. Abre **Servicios** de Windows (`services.msc`), busca `postgresql-x64-16` (el número varía) y pulsa **Iniciar**. Revisa también el puerto. |
| `database "diez_go_perfumes" does not exist` | Falta el paso 4: crea la base con ese nombre exacto. |
| `RuntimeError: Falta DATABASE_URL` o `Faltan JWT_SECRET y ADMIN_PASSWORD` | No existe el `.env` o le faltan esas líneas. Revisa el paso 5. Debe estar en la carpeta `backend`. |
| `ModuleNotFoundError: No module named ...` | No activaste el entorno virtual (no ves `(venv)`) o falta `pip install -r requirements.txt`. |
| `python` no se reconoce | Prueba `py` en vez de `python`, o reinstala Python marcando «Add Python to PATH». |
| Error de instalación de `psycopg2-binary` | Suele pasar con versiones de Python muy nuevas. Usa Python 3.11, 3.12 o 3.13. |
| `Address already in use` / puerto 8000 ocupado | Hay otro programa (o otro uvicorn) usando el puerto. Usa otro: `uvicorn main:app --reload --port 8001` y abre http://localhost:8001. |
| La tienda carga pero sin perfumes | No corriste `python seed.py`, o el backend no está encendido. |
| En el admin: «Sesión no válida o caducada» | Vuelve a iniciar sesión. Pasa si pasaron 8 horas o cambiaste `JWT_SECRET`. |

Si te sale un error que no está aquí, copia **el mensaje completo de la terminal** y pásamelo.

---

## Mapa del código (para cuando quieras leerlo)

| Archivo | Para qué sirve |
|---|---|
| `backend/database.py` | Se conecta a PostgreSQL usando el `.env` |
| `backend/models.py` | Define las 3 tablas como clases de Python |
| `backend/schemas.py` | Define qué datos entran y salen de la API (validación) |
| `backend/auth.py` | El login del admin con JWT |
| `backend/main.py` | Los endpoints: cada función es una dirección de la API |
| `backend/seed.py` | Carga los 8 perfumes iniciales |
| `frontend/` | Las páginas (HTML), estilos (CSS) y scripts (JS) |

Sugerencia para aprender: lee `models.py` primero, luego `seed.py` (verás cómo se crean filas) y después el endpoint `create_order` de `main.py`, que es donde se descuenta el stock.
