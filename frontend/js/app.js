// app.js: página principal (hero, destacados y catálogo con filtros).
import { getFilters, getPerfumes, esc } from "./api.js";
import { cardHTML, initLayout } from "./layout.js";

// Imágenes del hero: para usar fotos propias, cambia la ruta de `img` (por ejemplo "img/hero/hero-1.jpg").
// Recomendado: fotos anchas (proporción 12:5, por ejemplo 1920x800) con los frascos abajo: el texto va centrado arriba.
const SLIDES = [
  { eyebrow: "Proyecto de portafolio", title: "10go's Perfumes", img: "img/hero/hero-1.svg", href: "#catalogo", cta: "Explorar el catálogo",
    text: "Una tienda de perfumes y decants de demostración, hecha con FastAPI, PostgreSQL y JavaScript. No es una tienda real." },
  { eyebrow: "Búsqueda avanzada", title: "Todo tipo de perfumes, por filtros.", img: "img/hero/hero-2.svg", href: "#catalogo", cta: "Probar los filtros",
    text: "Filtra por notas olfativas, familia aromática, duración, estela y ocasión hasta encontrar el tuyo." },
  { eyebrow: "Decants y botellas", title: "Pruébalos antes de elegir.", img: "img/hero/hero-3.svg", href: "#guia", cta: "Ver cómo funciona",
    text: "Decants de 3, 5 y 10 ml o botella completa. Arma una orden de prueba: el stock baja de verdad en la base de datos." },
  { eyebrow: "Datos reales", title: "Árabes, diseñador y nicho.", img: "img/hero/hero-4.svg", href: "#categorias", cta: "Ver las categorías",
    text: "Notas, acordes y perfumistas verificados en Fragrantica, de Lattafa y Armaf a Dior y Creed." },
];
const AUTOPLAY_MS = 10000;
const CHEVRON = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;

function initHero() {
  const hero = document.getElementById("hero");
  hero.innerHTML = SLIDES.map((s, i) => `
    <section class="slide${i === 0 ? " active" : ""}" aria-roledescription="slide" aria-label="${i + 1} de ${SLIDES.length}" ${i === 0 ? "" : 'aria-hidden="true"'}>
      <img class="slide-bg" src="${s.img}" alt="" width="1920" height="800" ${i === 0 ? "" : 'loading="lazy"'}>
      <div class="slide-text"><p class="eyebrow">${s.eyebrow}</p><h1>${s.title}</h1><p>${s.text}</p>
        <a class="btn" href="${s.href}">${s.cta}</a></div>
    </section>`).join("") + `
    <button class="hero-arrow prev" id="prev" aria-label="Imagen anterior">${CHEVRON("M15 5l-7 7 7 7")}</button>
    <button class="hero-arrow next" id="next" aria-label="Imagen siguiente">${CHEVRON("M9 5l7 7-7 7")}</button>
    <div class="dots">${SLIDES.map((_, i) => `<button class="dot" aria-label="Ir a la imagen ${i + 1}" aria-current="${i === 0}"></button>`).join("")}</div>`;

  const slides = [...hero.querySelectorAll(".slide")], dots = [...hero.querySelectorAll(".dot")];
  let current = 0, timer, cleanup;

  // La imagen nueva aparece ENCIMA de la anterior (que sigue visible debajo) y se desvanece hacia opaca:
  // ese es el efecto de superposición. Cuando termina, la anterior se oculta.
  function go(n) {
    const next = (n + slides.length) % slides.length;
    if (next === current) return;
    const old = slides[current];
    clearTimeout(cleanup);
    slides.forEach((s) => s.classList.remove("prev"));
    old.classList.remove("active"); old.classList.add("prev");
    slides[next].classList.add("active");
    slides.forEach((s, k) => s.setAttribute("aria-hidden", k !== next));
    dots.forEach((d, k) => d.setAttribute("aria-current", k === next));
    cleanup = setTimeout(() => old.classList.remove("prev"), 1400);
    current = next;
  }
  const stop = () => clearInterval(timer);
  const play = () => {
    stop();
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) timer = setInterval(() => go(current + 1), AUTOPLAY_MS);
  };
  // al usar flechas o puntos, reiniciamos la cuenta de 10 s
  const manual = (n) => { go(n); play(); };
  dots.forEach((d, k) => d.addEventListener("click", () => manual(k)));
  hero.querySelector("#prev").addEventListener("click", () => manual(current - 1));
  hero.querySelector("#next").addEventListener("click", () => manual(current + 1));
  hero.addEventListener("keydown", (e) => { if (e.key === "ArrowLeft") manual(current - 1); if (e.key === "ArrowRight") manual(current + 1); });
  hero.addEventListener("mouseenter", stop); hero.addEventListener("mouseleave", play);
  hero.addEventListener("focusin", stop); hero.addEventListener("focusout", play);
  play();
}

const form = document.getElementById("filters");
const grid = document.getElementById("catalog-grid");
const count = document.getElementById("result-count");

function fillSelect(name, values) {
  const sel = form.elements[name];
  sel.insertAdjacentHTML("beforeend", values.map((v) => `<option>${esc(v)}</option>`).join(""));
}

async function loadCatalog() {
  const params = Object.fromEntries(new FormData(form));
  grid.setAttribute("aria-busy", "true");
  try {
    const list = await getPerfumes(params);
    count.textContent = `${list.length} perfume${list.length === 1 ? "" : "s"}`;
    grid.innerHTML = list.length ? list.map(cardHTML).join("") : `<p class="empty">No hay perfumes con esos filtros. Prueba quitando alguno.</p>`;
  } catch (e) {
    grid.innerHTML = `<p class="empty">No se pudo conectar con la API (${esc(e.message)}). ¿Está corriendo uvicorn?</p>`;
  }
  grid.removeAttribute("aria-busy");
}

function setFilter(name, value) { form.elements[name].value = value; loadCatalog(); }

async function init() {
  await initLayout();
  initHero();
  try {
    const f = await getFilters();
    fillSelect("category", f.categories); fillSelect("family", f.families); fillSelect("note", f.notes);
    fillSelect("duration", f.durations); fillSelect("sillage", f.sillages); fillSelect("occasion", f.occasions);
  } catch { /* el catálogo mostrará el error de conexión */ }

  // filtros iniciales desde la URL (?category=Árabe&q=...)
  const url = new URLSearchParams(location.search);
  for (const [k, v] of url) if (form.elements[k]) form.elements[k].value = v;

  form.addEventListener("input", loadCatalog);
  form.addEventListener("submit", (e) => e.preventDefault());
  document.getElementById("clear").addEventListener("click", () => { form.reset(); loadCatalog(); });
  window.addEventListener("search:submit", (e) => setFilter("q", e.detail));
  document.addEventListener("click", (e) => {
    const a = e.target.closest("[data-cat]");
    if (!a) return;
    e.preventDefault(); form.reset(); setFilter("category", a.dataset.cat);
    document.getElementById("catalogo").scrollIntoView({ behavior: "smooth" });
  });

  loadCatalog();
  try {
    const featured = await getPerfumes({ featured: true });
    document.getElementById("featured-grid").innerHTML = featured.slice(0, 4).map(cardHTML).join("");
  } catch { document.getElementById("featured").hidden = true; }
}
init();
