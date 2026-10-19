# 10go's Perfumes

Proyecto de portafolio fullstack: tienda de perfumes y decants **de demostración** (no es una tienda real, no hay pagos ni envíos).
Backend: FastAPI + SQLAlchemy + PostgreSQL. Frontend: HTML, CSS y JavaScript vanilla.

## Cómo correrlo

1. Crea la base de datos en PostgreSQL: `CREATE DATABASE diez_go_perfumes;`
2. `cd backend` y copia `.env.example` como `.env` (pon tu contraseña de PostgreSQL).
3. `pip install -r requirements.txt`
4. `python seed.py` (crea las tablas y carga 8 perfumes con sus formatos).
5. `uvicorn main:app --reload`

Abre http://localhost:8000 (el backend también sirve el frontend) y http://localhost:8000/docs para probar la API.

## Estructura

- `backend/database.py` conexión · `models.py` tablas · `schemas.py` validación · `main.py` endpoints · `seed.py` datos iniciales
- `frontend/` páginas (`index`, `producto`, `checkout`, `admin`, `legal`), `css/styles.css` y `js/` (módulos ES)

## Notas

- Precios guardados en USD; los pesos dominicanos se calculan con `USD_TO_DOP` (61 por defecto, en `.env`).
- Las notas de los perfumes vienen de fichas de marca y públicas. Los porcentajes de acordes, la duración y la estela son **aproximados** y deben revisarse contra Fragrantica.
- El panel `/admin.html` no tiene login por ahora (el JWT queda como siguiente paso).
- Las imágenes son ilustraciones SVG generadas para el proyecto.
