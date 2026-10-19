"""
models.py: las tablas de la base de datos escritas como clases de Python.

Cada clase = una tabla. Cada atributo `Column` = una columna.
Relaciones:  Perfume 1 ──── N PerfumeVariant   (un perfume tiene varios tamaños)
Los precios se guardan en USD; el precio en DOP se calcula en la API
con la tasa USD_TO_DOP (61), para no duplicar datos.
"""
from datetime import datetime

from sqlalchemy import (
    JSON, Boolean, Column, DateTime, ForeignKey, Integer, Numeric, String, Text,
)
from sqlalchemy.orm import relationship

from database import Base


class Perfume(Base):
    __tablename__ = "perfumes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False, index=True)
    brand = Column(String(80), nullable=False, index=True)
    category = Column(String(20), nullable=False, index=True)    # Árabe / Diseñador / Nicho
    concentration = Column(String(30), nullable=False)           # EDT, EDP, Parfum, Extrait
    aromatic_family = Column(String(60), nullable=False, index=True)
    duration = Column(String(20), nullable=False, index=True)    # Baja / Media / Alta
    sillage = Column(String(20), nullable=False, index=True)     # Suave / Moderada / Pesada
    occasion = Column(String(80), nullable=False, index=True)    # Día / Noche / Casual ...

    # Notas olfativas separadas en pirámide. Son listas JSON: ["Canela", "Bergamota"]
    notes_top = Column(JSON, nullable=False, default=list)       # salida
    notes_heart = Column(JSON, nullable=False, default=list)     # corazón
    notes_base = Column(JSON, nullable=False, default=list)      # fondo

    # Acordes para el gráfico: [{"name": "Amaderado", "percentage": 95, "color": "#6e4720"}, ...]
    accords = Column(JSON, nullable=False, default=list)

    description = Column(Text, nullable=True)
    perfumer = Column(String(120), nullable=True)
    release_year = Column(Integer, nullable=True)
    source = Column(String(255), nullable=True)                  # de dónde salieron los datos
    image_url = Column(String(255), nullable=True)
    is_featured = Column(Boolean, nullable=False, default=False)

    # cascade: si se borra un perfume, se borran también sus variantes.
    variants = relationship(
        "PerfumeVariant", back_populates="perfume", cascade="all, delete-orphan",
        order_by="PerfumeVariant.size_ml",  # siempre del tamaño más pequeño al más grande
    )


class PerfumeVariant(Base):
    __tablename__ = "perfume_variants"

    id = Column(Integer, primary_key=True, index=True)
    perfume_id = Column(Integer, ForeignKey("perfumes.id"), nullable=False, index=True)
    size_ml = Column(Integer, nullable=False)                    # 3, 5, 10 o 100
    is_decant = Column(Boolean, nullable=False, default=True)    # False solo para la botella de 100 ml
    price = Column(Numeric(10, 2), nullable=False)               # en USD
    stock = Column(Integer, nullable=False, default=0)

    perfume = relationship("Perfume", back_populates="variants")


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    order_code = Column(String(20), unique=True, nullable=False, index=True)  # ej. ORD-1042
    customer_name = Column(String(120), nullable=False)
    customer_email = Column(String(120), nullable=False)
    notes = Column(Text, nullable=True)                          # dirección / notas de prueba
    items = Column(JSON, nullable=False)                         # copia del carrito al comprar
    total_price = Column(Numeric(10, 2), nullable=False)         # en USD
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
