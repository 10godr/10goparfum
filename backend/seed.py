"""
seed.py: llena la base de datos con 8 perfumes reales y sus variantes.

Uso (desde la carpeta backend):   python seed.py
Es seguro correrlo varias veces: borra los perfumes anteriores y los vuelve a crear.

SOBRE LOS DATOS
- Notas, acordes (con su fuerza relativa), año y perfumista están verificados en la ficha de
  Fragrantica de cada perfume (consultadas en octubre de 2026). Fragrantica los cambia con el tiempo.
- La concentración (EDP, EDT...) viene de la marca o de tiendas, porque Fragrantica no siempre la indica.
- Duración y estela son percepciones aproximadas de la comunidad, no mediciones.
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
    "Fresco": "#7fc8b5", "Herbal": "#5f9b55", "Metálico": "#aab4bd",
    "Animálico": "#8a6f5a", "Especiado suave": "#c98f62",
}

SLUG_IMG = "img/perfumes/{}.svg"
BASE_SRC = "Fragrantica (notas, acordes, año y perfumista; oct. 2026). Concentración: marca/tiendas. Duración y estela: percepción aproximada."

PERFUMES = [
    dict(slug="khamrah", name="Khamrah", brand="Lattafa", category="Árabe", concentration="Eau de Parfum",
         aromatic_family="Oriental Especiado", duration="Alta", sillage="Pesada",
         occasion="Noche, Invierno, Citas", release_year=2022, perfumer=None, is_featured=True,
         notes_top=["Canela", "Nuez moscada", "Bergamota"],
         notes_heart=["Dátiles", "Praliné", "Tuberosa", "Mahonial"],
         notes_base=["Vainilla", "Haba tonka", "Benjuí", "Madera de ámbar", "Mirra", "Akigalawood"],
         accords=[("Dulce", 100), ("Especiado cálido", 75), ("Vainilla", 72), ("Ámbar", 66), ("Canela", 55), ("Amaderado", 27), ("Especiado fresco", 26), ("Afrutado", 20)],
         description="Un gourmand especiado de la casa Lattafa: canela y dátiles sobre un fondo cremoso de vainilla y praliné.",
         sizes=[(3, 4.50, 12), (5, 6.50, 15), (10, 11.00, 10), (100, 38.00, 8)]),
    dict(slug="asad", name="Asad", brand="Lattafa", category="Árabe", concentration="Eau de Parfum",
         aromatic_family="Oriental", duration="Alta", sillage="Moderada",
         occasion="Noche, Otoño, Casual", release_year=2021, perfumer=None, is_featured=True,
         notes_top=["Pimienta negra", "Tabaco", "Piña"],
         notes_heart=["Pachulí", "Café", "Iris"],
         notes_base=["Vainilla", "Ámbar", "Madera seca", "Benjuí", "Láudano"],
         accords=[("Ámbar", 100), ("Especiado fresco", 88), ("Amaderado", 81), ("Especiado cálido", 77), ("Vainilla", 74), ("Dulce", 61), ("Tabaco", 57), ("Polvoso", 40)],
         description="Un oriental oscuro y especiado con tabaco, café y ámbar; intenso, masculino y de mucha presencia.",
         sizes=[(3, 4.00, 14), (5, 6.00, 12), (10, 10.00, 10), (100, 32.00, 9)]),
    dict(slug="9pm", name="9 PM", brand="Afnan", category="Árabe", concentration="Eau de Parfum",
         aromatic_family="Oriental Vainilla", duration="Alta", sillage="Pesada",
         occasion="Noche, Fiesta, Citas", release_year=2020, perfumer=None, is_featured=True,
         notes_top=["Manzana", "Canela", "Lavanda silvestre", "Bergamota"],
         notes_heart=["Flor de azahar", "Lirio de los valles"],
         notes_base=["Vainilla", "Haba tonka", "Ámbar", "Pachulí"],
         accords=[("Vainilla", 100), ("Ámbar", 47), ("Especiado cálido", 43), ("Afrutado", 39), ("Canela", 36), ("Dulce", 36), ("Lavanda", 34), ("Fresco", 30)],
         description="Dulce, vainilloso y nocturno: una de las propuestas árabes más populares para salir de noche.",
         sizes=[(3, 4.00, 15), (5, 6.00, 12), (10, 10.00, 10), (100, 32.00, 7)]),
    dict(slug="club-de-nuit-intense-man", name="Club de Nuit Intense Man", brand="Armaf", category="Árabe", concentration="Eau de Toilette",
         aromatic_family="Amaderado Especiado", duration="Alta", sillage="Pesada",
         occasion="Día, Oficina, Casual", release_year=2015, perfumer=None, is_featured=True,
         notes_top=["Limón", "Piña", "Bergamota", "Grosella negra", "Manzana"],
         notes_heart=["Abedul", "Jazmín", "Rosa"],
         notes_base=["Almizcle", "Ámbar gris", "Pachulí", "Vainilla"],
         accords=[("Cítrico", 100), ("Afrutado", 57), ("Cuero", 45), ("Ahumado", 36), ("Amaderado", 35), ("Aromático", 34), ("Dulce", 30), ("Fresco", 30)],
         description="Famoso por su parecido con Aventus: cítricos y piña sobre un fondo ahumado de abedul y almizcle.",
         sizes=[(3, 5.00, 14), (5, 7.50, 12), (10, 13.00, 10), (105, 42.00, 6)]),
    dict(slug="y-edp", name="Y Eau de Parfum", brand="Yves Saint Laurent", category="Diseñador", concentration="Eau de Parfum",
         aromatic_family="Aromático Fougère", duration="Media", sillage="Moderada",
         occasion="Día, Oficina, Casual", release_year=2018, perfumer="Dominique Ropion, Claire Liégent", is_featured=False,
         notes_top=["Manzana", "Jengibre", "Bergamota"],
         notes_heart=["Salvia", "Bayas de enebro", "Geranio"],
         notes_base=["Madera de ámbar", "Haba tonka", "Cedro", "Vetiver", "Olíbano"],
         accords=[("Aromático", 100), ("Especiado fresco", 98), ("Amaderado", 74), ("Afrutado", 59), ("Fresco", 52), ("Ámbar", 52), ("Cítrico", 46), ("Herbal", 39)],
         description="Fresco, limpio y versátil: manzana y salvia sobre un fondo de ámbar y cedro.",
         sizes=[(3, 8.00, 12), (5, 12.00, 10), (10, 21.00, 8), (100, 125.00, 5)]),
    dict(slug="sauvage-elixir", name="Sauvage Elixir", brand="Dior", category="Diseñador", concentration="Elixir",
         aromatic_family="Aromático", duration="Alta", sillage="Pesada",
         occasion="Noche, Invierno, Citas", release_year=2021, perfumer="François Demachy", is_featured=True,
         notes_top=["Nuez moscada", "Canela", "Cardamomo", "Toronja"],
         notes_heart=["Lavanda"],
         notes_base=["Regaliz", "Sándalo", "Ámbar", "Pachulí", "Vetiver de Haití"],
         accords=[("Especiado cálido", 100), ("Especiado fresco", 74), ("Amaderado", 70), ("Aromático", 70), ("Lavanda", 66), ("Especiado suave", 55), ("Canela", 44), ("Ámbar", 35)],
         description="La versión más concentrada de Sauvage: lavanda y regaliz con un corazón de especias cálidas.",
         sizes=[(3, 10.00, 10), (5, 15.00, 10), (10, 27.00, 8), (100, 185.00, 4)]),
    dict(slug="aventus", name="Aventus", brand="Creed", category="Nicho", concentration="Eau de Parfum",
         aromatic_family="Chipre Frutal", duration="Alta", sillage="Moderada",
         occasion="Día, Oficina, Noche", release_year=2010, perfumer="Erwin Creed, Jean-Christophe Hérault", is_featured=True,
         notes_top=["Bergamota", "Grosella negra", "Manzana", "Limón", "Pimienta rosa"],
         notes_heart=["Piña", "Pachulí", "Jazmín de Marruecos"],
         notes_base=["Abedul", "Almizcle", "Musgo de roble", "Madera de cedro", "Ambroxan"],
         accords=[("Afrutado", 100), ("Dulce", 55), ("Amaderado", 55), ("Cuero", 48), ("Cítrico", 42), ("Ahumado", 39), ("Almizclado", 36), ("Fresco", 32)],
         description="El icono de la perfumería de nicho masculina: piña ahumada, abedul y musgo de roble.",
         sizes=[(3, 24.00, 10), (5, 38.00, 8), (10, 70.00, 0), (100, 445.00, 3)]),
    dict(slug="baccarat-rouge-540", name="Baccarat Rouge 540", brand="Maison Francis Kurkdjian", category="Nicho", concentration="Eau de Parfum",
         aromatic_family="Oriental Floral", duration="Alta", sillage="Pesada",
         occasion="Noche, Fiesta, Citas", release_year=2015, perfumer="Francis Kurkdjian", is_featured=True,
         notes_top=["Azafrán", "Jazmín"],
         notes_heart=["Madera de ámbar", "Ámbar gris", "Hedione"],
         notes_base=["Resina de abeto", "Cedro", "Azúcar", "Ambroxan", "Musgo de roble"],
         accords=[("Amaderado", 100), ("Ámbar", 99), ("Especiado cálido", 58), ("Metálico", 24), ("Especiado fresco", 23), ("Aromático", 22), ("Floral blanco", 22), ("Animálico", 22)],
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
