# 10go's Perfumes

Proyecto de portafolio fullstack: tienda de perfumes y decants **de demostración** (no es una tienda real, no hay pagos ni envíos).
Backend: FastAPI + SQLAlchemy + PostgreSQL. Frontend: HTML, CSS y JavaScript vanilla.

## Cómo correrlo

1. Crea la base de datos en PostgreSQL: `CREATE DATABASE diez_go_perfumes;`
2. `cd backend` y copia `.env.example` como `.env`. Pon tu contraseña de PostgreSQL y define `ADMIN_USER`, `ADMIN_PASSWORD` y `JWT_SECRET` (el login del admin).
3. `pip install -r requirements.txt`
4. `python seed.py` (crea las tablas y carga 8 perfumes con sus formatos).
5. `uvicorn main:app --reload`

Abre http://localhost:8000 (el backend también sirve el frontend) y http://localhost:8000/docs para probar la API.

## Estructura

- `backend/database.py` conexión · `models.py` tablas · `schemas.py` validación · `auth.py` login JWT · `main.py` endpoints · `seed.py` datos iniciales
- `frontend/` páginas (`index`, `producto`, `checkout`, `admin`, `legal`), `css/styles.css` y `js/` (módulos ES)

## Notas

- Precios guardados en USD; los pesos dominicanos se calculan con `USD_TO_DOP` (61 por defecto, en `.env`).
- Notas, acordes (con su fuerza relativa), año y perfumista están verificados en Fragrantica (octubre de 2026); la concentración viene de la marca o tiendas. La duración y la estela son percepciones aproximadas.
- `/admin.html` pide usuario y contraseña (JWT de 8 horas). Las rutas `/api/admin/*` devuelven 401 sin token; en `/docs` usa el botón *Authorize* con el token de `POST /api/auth/login`.
- Catálogo: `GET /api/perfumes` acepta `category`, `family`, `note`, `duration`, `sillage`, `occasion`, `q`, `featured` y `sort` (`price_asc`, `price_desc`, `name`).
- Las imágenes son ilustraciones SVG generadas para el proyecto.

## Fotos reales de los perfumes

Por defecto los frascos son ilustraciones SVG. Para usar una foto, guárdala en `frontend/img/perfumes/` con el nombre del perfume y la extensión `.webp`, `.jpg` o `.png` (mejor con fondo blanco y de formato vertical), y corre `python seed.py` otra vez. El seed usa la foto si existe y, si no, la ilustración.

| Perfume | Archivo |
|---|---|
| Khamrah | `khamrah` |
| Asad | `asad` |
| 9 PM | `9pm` |
| Club de Nuit Intense Man | `club-de-nuit-intense-man` |
| Y Eau de Parfum | `y-edp` |
| Sauvage Elixir | `sauvage-elixir` |
| Aventus | `aventus` |
| Baccarat Rouge 540 | `baccarat-rouge-540` |

Las fotos son de terceros (marcas o sitios de perfumería): anota su procedencia y mantén el aviso de `legal.html#marcas`.

## Imágenes del hero (carrusel de portada)

Son 4 banners en `frontend/img/hero/` (`hero-1.svg` a `hero-4.svg`) que cambian solos cada 10 segundos con un fundido superpuesto y se pueden pasar con las flechas o los puntos. Los textos están en `SLIDES` al inicio de `frontend/js/app.js`. Para usar tus propias fotos, cambia la ruta `img` de cada slide (por ejemplo `img/hero/hero-1.jpg`). Medida recomendada: 1920x800 px, con los frascos abajo (el texto va centrado arriba).
