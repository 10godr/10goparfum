"""
schemas.py: modelos Pydantic = el "contrato" de los datos que entran y salen de la API.

Los modelos de SQLAlchemy (models.py) hablan con la base de datos.
Los schemas de Pydantic validan lo que llega y dan forma a lo que respondemos.
"""
from datetime import datetime
from decimal import ROUND_HALF_UP, Decimal
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, computed_field

from database import USD_TO_DOP


def to_dop(usd: Decimal) -> Decimal:
    """USD -> DOP con la tasa fija, redondeando .5 hacia arriba (igual que el frontend)."""
    return (usd * Decimal(str(USD_TO_DOP))).quantize(Decimal("1"), rounding=ROUND_HALF_UP)


# ---------- Salida: perfumes ----------
class VariantOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)  # permite leer objetos de SQLAlchemy

    id: int
    size_ml: int
    is_decant: bool
    price: Decimal  # USD
    stock: int

    @computed_field
    @property
    def price_dop(self) -> Decimal:
        """Precio en pesos dominicanos con la tasa fija de demostración."""
        return to_dop(self.price)


class Accord(BaseModel):
    name: str
    percentage: int = Field(ge=1, le=100)
    color: str


class PerfumeBase(BaseModel):
    name: str
    brand: str
    category: str
    concentration: str
    aromatic_family: str
    duration: str
    sillage: str
    occasion: str
    notes_top: List[str]
    notes_heart: List[str]
    notes_base: List[str]
    accords: List[Accord]
    description: Optional[str] = None
    perfumer: Optional[str] = None
    release_year: Optional[int] = None
    source: Optional[str] = None
    image_url: Optional[str] = None
    is_featured: bool = False


class PerfumeOut(PerfumeBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    variants: List[VariantOut]

    @computed_field
    @property
    def from_price(self) -> Optional[Decimal]:
        """Precio 'Desde': la variante más barata (normalmente el decant de 3 ml)."""
        return min((v.price for v in self.variants), default=None)

    @computed_field
    @property
    def from_price_dop(self) -> Optional[Decimal]:
        if self.from_price is None:
            return None
        return to_dop(self.from_price)


# ---------- Entrada: crear/editar (admin) ----------
class VariantIn(BaseModel):
    size_ml: int
    is_decant: bool
    price: Decimal = Field(gt=0)
    stock: int = Field(ge=0)


class PerfumeCreate(PerfumeBase):
    variants: List[VariantIn] = []


class VariantUpdate(BaseModel):
    price: Optional[Decimal] = Field(default=None, gt=0)
    stock: Optional[int] = Field(default=None, ge=0)


# ---------- Órdenes de prueba ----------
class OrderItemIn(BaseModel):
    variant_id: int
    quantity: int = Field(ge=1, le=10)


class OrderCreate(BaseModel):
    customer_name: str = Field(min_length=2, max_length=120)
    customer_email: str = Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    notes: Optional[str] = Field(default=None, max_length=500)
    items: List[OrderItemIn] = Field(min_length=1)


class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    order_code: str
    customer_name: str
    customer_email: str
    notes: Optional[str]
    items: list
    total_price: Decimal  # USD
    created_at: datetime

    @computed_field
    @property
    def total_price_dop(self) -> Decimal:
        return to_dop(self.total_price)
