// app.js: página principal (hero, destacados y catálogo con filtros).
import { getFilters, getPerfumes, esc, imgClass } from "./api.js";
import { cardHTML, initLayout } from "./layout.js";

const SLIDES = [
  { eyebrow: "Perfumería árabe", title: "Ámbar, dátiles y vainilla.", tint: "138,69,32", img: "img/perfumes/khamrah.svg", q: "Khamrah", cat: "Árabe", cta: "Explorar árabes",
    text: "Khamrah de Lattafa: el gourmand que huele a postre y dura todo el día. Pruébalo primero en un decant de 3 ml." },
  { eyebrow: "Diseñador", title: "El clásico, más concentrado.", tint: "74,42,18", img: "img/perfumes/sauvage-elixir.svg", q: "Sauvage Elixir", cat: "Diseñador", cta: "Explorar diseñador",
    text: "Sauvage Elixir de Dior: lavanda, especias cálidas y regaliz en un extrait de larga duración." },
  { eyebrow: "Nicho", title: "Una estela que se reconoce a distancia.", tint: "160,58,44", img: "img/perfumes/baccarat-rouge-540.svg", q: "Baccarat Rouge 540", cat: "Nicho", cta: "Explorar nicho",
    text: "Baccarat Rouge 540 de Maison Francis Kurkdjian: azafrán, jazmín y un fondo ambarado inconfundible." },
];

function initHero() {
  const hero = document.getElementById("hero");
  hero.innerHTML = SLIDES.map((s, i) => `
    <section class="slide${i === 0 ? " active" : ""}" style="--tint:rgba(${s.tint},.5)" aria-roledescription="slide" aria-label="${i + 1} de ${SLIDES.length}">
      <div class="slide-text"><p class="eyebrow">${s.eyebrow}</p><h1>${s.title}</h1><p>${s.text}</p>
        <a class="btn" href="?category=${encodeURIComponent(s.cat)}#catalogo" data-cat="${s.cat}">${s.cta}</a></div>
      <div class="slide-img"><img src="${s.img}" alt="" width="400" height="500"></div>
    </section>`).join("") + `
    <div class="hero-ctrl"><div class="dots">${SLIDES.map((_, i) => `<button class="dot" aria-label="Ir a la diapositiva ${i + 1}" aria-current="${i === 0}"></button>`).join("")}</div>
    <div><button class="link" id="prev">Anterior</button> &nbsp; <button class="link" id="next">Siguiente</button></div></div>`;
  // Si el perfume tiene foto real, reemplazamos la ilustración del slide.
  SLIDES.forEach((s, k) => getPerfumes({ q: s.q }).then((r) => {
    const url = r[0]?.image_url;
    if (!url) return;
    const box = hero.querySelectorAll(".slide-img")[k];
    box.classList.add(...(imgClass(url) ? [imgClass(url)] : []));
    box.querySelector("img").src = url;
  }).catch(() => {}));
  const slides = [...hero.querySelectorAll(".slide")], dots = [...hero.querySelectorAll(".dot")];
  let i = 0, timer;
  const go = (n) => {
    i = (n + slides.length) % slides.length;
    slides.forEach((s, k) => s.classList.toggle("active", k === i));
    dots.forEach((d, k) => d.setAttribute("aria-current", k === i));
  };
  const play = () => { if (!matchMedia("(prefers-reduced-motion: reduce)").matches) timer = setInterval(() => go(i + 1), 6500); };
  const stop = () => clearInterval(timer);
  dots.forEach((d, k) => d.addEventListener("click", () => go(k)));
  hero.querySelector("#prev").addEventListener("click", () => go(i - 1));
  hero.querySelector("#next").addEventListener("click", () => go(i + 1));
  hero.addEventListener("mouseenter", stop); hero.addEventListener("mouseleave", () => { stop(); play(); });
  hero.addEventListener("focusin", stop);
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
