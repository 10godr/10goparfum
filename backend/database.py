"""
database.py: conexión a PostgreSQL con SQLAlchemy.

Este archivo hace 3 cosas:
  1. Lee la URL de la base de datos desde el archivo .env (así la contraseña
     nunca queda escrita en el código ni en git).
  2. Crea el "engine": el objeto que mantiene la conexión con PostgreSQL.
  3. Expone `Base` (de la que heredan los modelos) y `get_db` (que FastAPI
     usa para darle una sesión de base de datos a cada petición).
"""
import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()  # carga las variables del archivo .env

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("Falta DATABASE_URL. Copia .env.example como .env y complétalo.")

# Forzamos el driver psycopg2 (el que instalamos) aunque la URL diga solo "postgresql://".
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

# Tasa fija de demostración USD -> DOP (se usa más adelante en la API).
USD_TO_DOP = float(os.getenv("USD_TO_DOP", "61"))

# El engine es la "puerta" hacia PostgreSQL.
engine = create_engine(DATABASE_URL)

# SessionLocal fabrica sesiones: una sesión es una conversación con la BD
# (consultar, insertar, guardar con commit).
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)

# Todos los modelos (tablas) heredan de Base.
Base = declarative_base()


def get_db():
    """Dependencia de FastAPI: abre una sesión por petición y la cierra al terminar."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
