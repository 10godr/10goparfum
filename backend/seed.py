"""
seed.py: llena la base de datos con 8 perfumes reales y sus variantes.

Uso (desde la carpeta backend):   python seed.py
Es seguro correrlo varias veces: borra los perfumes anteriores y los vuelve a crear.

SOBRE LOS DATOS
- Marca, nombre, año, concentración y pirámide de notas salen de la ficha de la marca
  y de tiendas/fichas públicas (se anotan en el campo `source`).
- Los porcentajes de los acordes y las etiquetas de duración/estela son APROXIMADOS
  (estilo Fragrantica / percepción de la comunidad). Revísalos contra Fragrantica antes de publicar.
- Los precios (USD) son de DEMOSTRACIÓN pero verosímiles. El precio en DOP se calcula en la API.
"""
from database import Base, SessionLocal, engine
from models import Perfume, PerfumeVariant

# Colores por acorde: se reutilizan para que el gráfico se vea coherente.
ACCORD_COLORS = {
    "Especiado cálido": "#b5441a", "Dulce": "#d9577b", "Canela": "#8f3b1b",
    "Ámbar": "#c97a2b", "Vainilla": "#e8c77a", "Polvoso": "#d8c3d8",
    "Amaderado": "#6e4720", "Especiado fresco": "#6f9a4a", "Tabaco": "#7a4b2a",
    "Café": "#4a2c1b", "Ahumado": "#5a5a5a", "Cítrico": "#e3c829",
    "Afrutado": "#e8803a", "Cuero": "#4b3426", "Aromático": "#4f8a6b",
    "Lavanda": "#8d7fc4", "Anís": "#6aa0a8", "Floral blanco": "#efe6d8",
    "Almizclado": "#cdbfae", "Manzana": "#8dbd4b", "Salado": "#9ab6c4",
    "Azafrán": "#d9622b", "Floral": "#e08fb0", "Coco": "#cfb99a",
}

SLUG_IMG = "img/perfumes/{}.svg"
BASE_SRC = "Notas: ficha de la marca y fichas públicas. Acordes, duración y estela: aproximados (estilo Fragrantica), pendientes de verificar."

PERFUMES = [
    dict(slug="khamrah", name="Khamrah", brand="Lattafa", category="Árabe", concentration="Eau de Parfum",
         aromatic_family="Ámbar Especiado Gourmand", duration="Alta", sillage="Pesada",
         occasion="Noche, Invierno, Citas", release_year=2022, perfumer=None, is_featured=True,
         notes_top=["Canela", "Nuez moscada", "Bergamota"],
         notes_heart=["Dátiles", "Praliné", "Tuberosa", "Mandarina"],
         notes_base=["Vainilla", "Haba tonka", "Benjuí", "Madera de ámbar", "Mirra", "Akigalawood"],
         accords=[("Especiado cálido", 100), ("Dulce", 92), ("Canela", 80), ("Ámbar", 72), ("Vainilla", 66), ("Polvoso", 48), ("Amaderado", 40)],
         description="Un gourmand especiado de la casa Lattafa: canela y dátiles sobre un fondo cremoso de vainilla y praliné.",
         sizes=[(3, 4.50, 12), (5, 6.50, 15), (10, 11.00, 10), (100, 38.00, 8)]),
    dict(slug="asad", name="Asad", brand="Lattafa", category="Árabe", concentration="Eau de Parfum",
         aromatic_family="Oriental Especiado", duration="Alta", sillage="Moderada",
         occasion="Noche, Otoño, Casual", release_year=2022, perfumer=None, is_featured=True,
         notes_top=["Pimienta negra", "Piña", "Tabaco"],
         notes_heart=["Café", "Pachulí", "Iris"],
         notes_base=["Ámbar", "Vainilla", "Maderas secas", "Benjuí", "Láudano"],
         accords=[("Especiado cálido", 100), ("Ámbar", 82), ("Amaderado", 74), ("Tabaco", 66), ("Vainilla", 60), ("Dulce", 55), ("Café", 40)],
         description="Un oriental oscuro y especiado con tabaco, café y ámbar; intenso, masculino y de mucha presencia.",
         sizes=[(3, 4.00, 14), (5, 6.00, 12), (10, 10.00, 10), (100, 32.00, 9)]),
    dict(slug="9pm", name="9 PM", brand="Afnan", category="Árabe", concentration="Eau de Parfum",
         aromatic_family="Ámbar Vainilla", duration="Alta", sillage="Pesada",
         occasion="Noche, Fiesta, Citas", release_year=2020, perfumer=None, is_featured=True,
         notes_top=["Manzana", "Canela", "Lavanda", "Bergamota"],
         notes_heart=["Flor de azahar", "Lirio de los valles"],
         notes_base=["Vainilla", "Haba tonka", "Ámbar", "Pachulí"],
         accords=[("Dulce", 100), ("Vainilla", 90), ("Especiado cálido", 78), ("Canela", 66), ("Ámbar", 60), ("Afrutado", 50), ("Polvoso", 42)],
         description="Dulce, vainilloso y nocturno: una de las propuestas árabes más populares para salir de noche.",
         sizes=[(3, 4.00, 15), (5, 6.00, 12), (10, 10.00, 10), (100, 32.00, 7)]),
    dict(slug="club-de-nuit-intense-man", name="Club de Nuit Intense Man", brand="Armaf", category="Árabe", concentration="Eau de Toilette",
         aromatic_family="Amaderado Cítrico Ahumado", duration="Alta", sillage="Pesada",
         occasion="Día, Oficina, Casual", release_year=2015, perfumer=None, is_featured=True,
         notes_top=["Limón", "Piña", "Bergamota", "Grosella negra", "Manzana"],
         notes_heart=["Abedul", "Jazmín", "Rosa"],
         notes_base=["Almizcle", "Ámbar gris", "Pachulí", "Vainilla"],
         accords=[("Cítrico", 100), ("Afrutado", 88), ("Ahumado", 72), ("Amaderado", 66), ("Cuero", 48), ("Almizclado", 40)],
         description="El famoso 'clon' de Aventus: piña y cítricos sobre un fondo ahumado de abedul y almizcle.",
         sizes=[(3, 5.00, 14), (5, 7.50, 12), (10, 13.00, 10), (105, 42.00, 6)]),
    dict(slug="y-edp", name="Y Eau de Parfum", brand="Yves Saint Laurent", category="Diseñador", concentration="Eau de Parfum",
         aromatic_family="Aromático Fougère", duration="Media", sillage="Moderada",
         occasion="Día, Oficina, Casual", release_year=2018, perfumer="Dominique Ropion, Juliette Karagueuzoglou, Anne Flipo", is_featured=False,
         notes_top=["Manzana", "Jengibre", "Bergamota"],
         notes_heart=["Salvia", "Bayas de enebro", "Geranio"],
         notes_base=["Madera de ámbar", "Haba tonka", "Cedro", "Vetiver", "Olíbano"],
         accords=[("Especiado fresco", 100), ("Aromático", 88), ("Amaderado", 76), ("Cítrico", 62), ("Afrutado", 52), ("Ámbar", 44)],
         description="Fresco, limpio y versátil: manzana y salvia sobre un fondo de ámbar y cedro.",
         sizes=[(3, 8.00, 12), (5, 12.00, 10), (10, 21.00, 8), (100, 125.00, 5)]),
    dict(slug="sauvage-elixir", name="Sauvage Elixir", brand="Dior", category="Diseñador", concentration="Extrait de Parfum",
         aromatic_family="Aromático Especiado", duration="Alta", sillage="Pesada",
         occasion="Noche, Invierno, Citas", release_year=2021, perfumer="François Demachy", is_featured=True,
         notes_top=["Toronja", "Canela", "Nuez moscada", "Cardamomo"],
         notes_heart=["Lavanda"],
         notes_base=["Regaliz", "Sándalo", "Ámbar", "Pachulí", "Vetiver de Haití"],
         accords=[("Especiado cálido", 100), ("Aromático", 84), ("Amaderado", 72), ("Ámbar", 64), ("Lavanda", 58), ("Anís", 50), ("Especiado fresco", 44)],
         description="La versión más concentrada de Sauvage: lavanda y regaliz con un corazón de especias cálidas.",
         sizes=[(3, 10.00, 10), (5, 15.00, 10), (10, 27.00, 8), (100, 185.00, 4)]),
    dict(slug="aventus", name="Aventus", brand="Creed", category="Nicho", concentration="Eau de Parfum",
         aromatic_family="Chipre Frutal", duration="Alta", sillage="Moderada",
         occasion="Día, Oficina, Noche", release_year=2010, perfumer="Olivier Creed, Erwin Creed", is_featured=True,
         notes_top=["Piña", "Bergamota", "Grosella negra", "Manzana"],
         notes_heart=["Abedul", "Pachulí", "Jazmín de Marruecos", "Rosa"],
         notes_base=["Almizcle", "Musgo de roble", "Ámbar gris", "Vainilla"],
         accords=[("Afrutado", 100), ("Cítrico", 84), ("Ahumado", 70), ("Amaderado", 62), ("Almizclado", 44)],
         description="El icono de la perfumería de nicho masculina: piña ahumada, abedul y musgo de roble.",
         sizes=[(3, 24.00, 10), (5, 38.00, 8), (10, 70.00, 0), (100, 445.00, 3)]),
    dict(slug="baccarat-rouge-540", name="Baccarat Rouge 540", brand="Maison Francis Kurkdjian", category="Nicho", concentration="Eau de Parfum",
         aromatic_family="Ámbar Floral", duration="Alta", sillage="Pesada",
         occasion="Noche, Fiesta, Citas", release_year=2015, perfumer="Francis Kurkdjian", is_featured=True,
         notes_top=["Azafrán", "Jazmín"],
         notes_heart=["Madera de ámbar", "Ámbar gris"],
         notes_base=["Resina de abeto", "Cedro"],
         accords=[("Ámbar", 100), ("Especiado cálido", 82), ("Dulce", 74), ("Amaderado", 66), ("Floral", 50), ("Azafrán", 44)],
         description="Luminoso y casi cristalino: azafrán y jazmín sobre una estela ambarada inconfundible.",
         sizes=[(3, 20.00, 10), (5, 32.00, 8), (10, 58.00, 6), (70, 325.00, 3)]),
]


def run():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        db.query(PerfumeVariant).delete()
        db.query(Perfume).delete()
        for p in PERFUMES:
            sizes = p.pop("sizes")
            slug = p.pop("slug")
            accords = [{"name": n, "percentage": pct, "color": ACCORD_COLORS[n]} for n, pct in p.pop("accords")]
            perfume = Perfume(**p, accords=accords, image_url=SLUG_IMG.format(slug), source=BASE_SRC)
            perfume.variants = [
                PerfumeVariant(size_ml=ml, is_decant=ml < 30, price=price, stock=stock)
                for ml, price, stock in sizes
            ]
            db.add(perfume)
        db.commit()
        print(f"Listo: {db.query(Perfume).count()} perfumes y {db.query(PerfumeVariant).count()} variantes.")
    finally:
        db.close()


if __name__ == "__main__":
    run()
