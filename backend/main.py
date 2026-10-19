"""
main.py: la API (FastAPI). Cada función decorada con @app.get / @app.post es un endpoint.
Documentación interactiva automática en  http://localhost:8000/docs
"""
import uuid
from collections import defaultdict
from decimal import Decimal
from pathlib import Path
from typing import List, Optional

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import String, cast, func, or_
from sqlalchemy.orm import Session, selectinload

import models
import schemas
from database import USD_TO_DOP, Base, engine, get_db

# Crea las tablas si no existen (para este proyecto simple no necesitamos migraciones).
Base.metadata.create_all(bind=engine)

app = FastAPI(title="10go's Perfumes API", description="Proyecto de portafolio: NO es una tienda real.")

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


# ====================== Catálogo público ======================
@app.get("/api/config")
def get_config():
    """Datos de configuración que necesita el frontend (tasa de cambio de demostración)."""
    return {"usd_to_dop": USD_TO_DOP}


@app.get("/api/perfumes", response_model=List[schemas.PerfumeOut])
def list_perfumes(
    category: Optional[str] = None,
    brand: Optional[str] = None,
    duration: Optional[str] = None,
    sillage: Optional[str] = None,
    occasion: Optional[str] = None,
    family: Optional[str] = None,
    note: Optional[str] = Query(None, description="Nota olfativa, ej. Vainilla"),
    q: Optional[str] = Query(None, description="Búsqueda por nombre o marca"),
    featured: Optional[bool] = None,
    db: Session = Depends(get_db),
):
    """Lista perfumes. Todos los filtros son opcionales y se pueden combinar."""
    query = db.query(models.Perfume).options(selectinload(models.Perfume.variants))

    if category:
        query = query.filter(models.Perfume.category == category)
    if brand:
        query = query.filter(models.Perfume.brand == brand)
    if duration:
        query = query.filter(models.Perfume.duration == duration)
    if sillage:
        query = query.filter(models.Perfume.sillage == sillage)
    if occasion:
        # La ocasión se guarda como texto: "Noche, Citas". Buscamos coincidencia parcial.
        query = query.filter(models.Perfume.occasion.ilike(f"%{occasion}%"))
    if family:
        query = query.filter(models.Perfume.aromatic_family.ilike(f"%{family}%"))
    if featured is not None:
        query = query.filter(models.Perfume.is_featured == featured)
    if note:
        # Las notas son listas JSON; las convertimos a texto y buscamos dentro.
        pattern = f"%{note}%"
        query = query.filter(
            or_(
                cast(models.Perfume.notes_top, String).ilike(pattern),
                cast(models.Perfume.notes_heart, String).ilike(pattern),
                cast(models.Perfume.notes_base, String).ilike(pattern),
            )
        )
    if q:
        pattern = f"%{q}%"
        query = query.filter(or_(models.Perfume.name.ilike(pattern), models.Perfume.brand.ilike(pattern)))

    return query.order_by(models.Perfume.id).all()


@app.get("/api/filters")
def get_filter_options(db: Session = Depends(get_db)):
    """Valores disponibles para armar los filtros del catálogo."""
    perfumes = db.query(models.Perfume).all()
    notes, occasions = set(), set()
    for p in perfumes:
        notes.update(p.notes_top + p.notes_heart + p.notes_base)
        occasions.update(o.strip() for o in p.occasion.split(","))
    return {
        "categories": sorted({p.category for p in perfumes}),
        "brands": sorted({p.brand for p in perfumes}),
        "durations": ["Baja", "Media", "Alta"],
        "sillages": ["Suave", "Moderada", "Pesada"],
        "occasions": sorted(occasions),
        "families": sorted({p.aromatic_family for p in perfumes}),
        "notes": sorted(notes),
    }


@app.get("/api/perfumes/{perfume_id}", response_model=schemas.PerfumeOut)
def get_perfume(perfume_id: int, db: Session = Depends(get_db)):
    perfume = db.get(models.Perfume, perfume_id)
    if not perfume:
        raise HTTPException(status_code=404, detail="Perfume no encontrado")
    return perfume


# ====================== Órdenes de prueba ======================
@app.post("/api/orders", response_model=schemas.OrderOut, status_code=201)
def create_order(data: schemas.OrderCreate, db: Session = Depends(get_db)):
    """
    Genera una ORDEN DE PRUEBA: valida, descuenta el stock real y guarda la orden.
    No hay pago ni envío.
    """
    # Si el mismo variant_id viene repetido, sumamos las cantidades.
    wanted = defaultdict(int)
    for item in data.items:
        wanted[item.variant_id] += item.quantity

    # with_for_update bloquea las filas para que dos compras a la vez no vendan la misma unidad.
    variants = (
        db.query(models.PerfumeVariant)
        .filter(models.PerfumeVariant.id.in_(wanted.keys()))
        .with_for_update()
        .all()
    )
    found = {v.id: v for v in variants}

    lines, total = [], Decimal("0")
    for variant_id, qty in wanted.items():
        variant = found.get(variant_id)
        if not variant:
            raise HTTPException(status_code=404, detail=f"La variante {variant_id} no existe")
        if variant.stock < qty:
            raise HTTPException(
                status_code=409,
                detail=f"Stock insuficiente: {variant.perfume.name} {variant.size_ml} ml (quedan {variant.stock})",
            )
        variant.stock -= qty  # <- aquí se descuenta el stock real
        subtotal = variant.price * qty
        total += subtotal
        lines.append({
            "variant_id": variant.id,
            "perfume_id": variant.perfume_id,
            "name": variant.perfume.name,
            "brand": variant.perfume.brand,
            "size_ml": variant.size_ml,
            "quantity": qty,
            "unit_price": float(variant.price),
            "subtotal": float(subtotal),
        })

    order = models.Order(
        order_code=f"TMP-{uuid.uuid4().hex[:12]}",  # provisional hasta conocer el id
        customer_name=data.customer_name,
        customer_email=data.customer_email,
        notes=data.notes,
        items=lines,
        total_price=total,
    )
    db.add(order)
    db.flush()  # asigna order.id sin cerrar la transacción
    order.order_code = f"ORD-{1000 + order.id}"
    db.commit()
    db.refresh(order)
    return order


@app.get("/api/orders/{order_code}", response_model=schemas.OrderOut)
def get_order(order_code: str, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.order_code == order_code).first()
    if not order:
        raise HTTPException(status_code=404, detail="Orden no encontrada")
    return order


# ====================== Admin básico (sin login por ahora) ======================
@app.get("/api/admin/stats")
def admin_stats(db: Session = Depends(get_db)):
    revenue = db.query(func.coalesce(func.sum(models.Order.total_price), 0)).scalar()
    return {
        "simulated_revenue_usd": float(revenue),
        "simulated_revenue_dop": float(revenue) * USD_TO_DOP,
        "orders_count": db.query(models.Order).count(),
        "out_of_stock_variants": db.query(models.PerfumeVariant).filter(models.PerfumeVariant.stock == 0).count(),
        "perfumes_count": db.query(models.Perfume).count(),
    }


@app.get("/api/admin/orders", response_model=List[schemas.OrderOut])
def admin_orders(db: Session = Depends(get_db)):
    return db.query(models.Order).order_by(models.Order.id.desc()).all()


@app.post("/api/admin/perfumes", response_model=schemas.PerfumeOut, status_code=201)
def admin_create_perfume(data: schemas.PerfumeCreate, db: Session = Depends(get_db)):
    payload = data.model_dump(exclude={"variants"})
    perfume = models.Perfume(**payload)
    perfume.variants = [models.PerfumeVariant(**v.model_dump()) for v in data.variants]
    db.add(perfume)
    db.commit()
    db.refresh(perfume)
    return perfume


@app.put("/api/admin/perfumes/{perfume_id}", response_model=schemas.PerfumeOut)
def admin_update_perfume(perfume_id: int, data: schemas.PerfumeBase, db: Session = Depends(get_db)):
    """Edita los datos del perfume (no sus variantes; esas se editan con PATCH /variants)."""
    perfume = db.get(models.Perfume, perfume_id)
    if not perfume:
        raise HTTPException(status_code=404, detail="Perfume no encontrado")
    for field, value in data.model_dump().items():
        setattr(perfume, field, value)
    db.commit()
    db.refresh(perfume)
    return perfume


@app.patch("/api/admin/variants/{variant_id}", response_model=schemas.VariantOut)
def admin_update_variant(variant_id: int, data: schemas.VariantUpdate, db: Session = Depends(get_db)):
    variant = db.get(models.PerfumeVariant, variant_id)
    if not variant:
        raise HTTPException(status_code=404, detail="Variante no encontrada")
    if data.price is not None:
        variant.price = data.price
    if data.stock is not None:
        variant.stock = data.stock
    db.commit()
    db.refresh(variant)
    return variant


@app.delete("/api/admin/perfumes/{perfume_id}", status_code=204)
def admin_delete_perfume(perfume_id: int, db: Session = Depends(get_db)):
    perfume = db.get(models.Perfume, perfume_id)
    if not perfume:
        raise HTTPException(status_code=404, detail="Perfume no encontrado")
    db.delete(perfume)
    db.commit()


# ====================== Frontend estático ======================
# Sirve la carpeta frontend/ en la raíz para correr todo con un solo comando (uvicorn).
# Va al final para que las rutas /api tengan prioridad.
FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"
if FRONTEND_DIR.is_dir():
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
