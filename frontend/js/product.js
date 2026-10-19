// product.js: detalle de un perfume (selector de formato, gráfico de acordes, ficha técnica).
import { dop, esc, getPerfume, getPerfumes, imgClass, toDop, toast, usd } from "./api.js";
import { addItem } from "./cart.js";
import { cardHTML, initLayout } from "./layout.js";

const root = document.getElementById("product");

// Texto negro o blanco según el brillo del color de la barra, para que siempre se lea.
function textOn(hex) {
  const n = parseInt(hex.replace("#", ""), 16);
  const lum = 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return lum > 150 ? "#111" : "#fff";
}

function render(p) {
  document.title = `${p.name} · ${p.brand} · 10go's Perfumes`;
  let selected = p.variants.find((v) => v.stock > 0) || p.variants[0];
  let qty = 1;

  root.innerHTML = `
    <div class="product-img ${imgClass(p.image_url)}"><img src="${esc(p.image_url)}" alt="${esc(p.brand)} ${esc(p.name)}" width="400" height="500"></div>
    <div>
      <p class="eyebrow">${esc(p.brand)} · ${esc(p.category)}</p>
      <h1 style="font-size:clamp(2.2rem,5vw,3.6rem)">${esc(p.name)}</h1>
      <p style="color:var(--muted);margin:0">${esc(p.concentration)}${p.release_year ? " · " + p.release_year : ""}</p>
      <div class="price-big" id="price"></div><p class="price-sub" id="price-sub"></p>
      <p class="eyebrow">Formato</p>
      <div class="sizes" id="sizes" role="group" aria-label="Formato"></div>
      <p class="stock-line" id="stock" aria-live="polite"></p>
      <div class="buy-row">
        <div class="qty"><button id="dec" aria-label="Menos">−</button><span id="qty">1</span><button id="inc" aria-label="Más">+</button></div>
        <button class="btn" id="add">Añadir al carrito</button>
      </div>
      <p class="note-src" style="margin-top:14px">Demostración: no se cobra ni se envía nada.</p>
      ${p.description ? `<p style="margin-top:34px">${esc(p.description)}</p>` : ""}
      <h2 style="margin-top:44px;font-size:1.8rem">Main accords</h2>
      <div class="accords" id="accords" aria-label="Acordes principales"></div>
      <h2 style="margin-top:40px;font-size:1.8rem">Notas</h2>
      <div class="pyramid">
        <div><h4>Salida</h4><p>${p.notes_top.map(esc).join(", ")}</p></div>
        <div><h4>Corazón</h4><p>${p.notes_heart.map(esc).join(", ")}</p></div>
        <div><h4>Fondo</h4><p>${p.notes_base.map(esc).join(", ")}</p></div>
      </div>
      <h2 style="font-size:1.8rem">Ficha técnica</h2>
      <table class="spec"><tbody>
        <tr><th>Familia aromática</th><td>${esc(p.aromatic_family)}</td></tr>
        <tr><th>Duración</th><td>${esc(p.duration)}</td></tr>
        <tr><th>Estela</th><td>${esc(p.sillage)}</td></tr>
        <tr><th>Ocasión</th><td>${esc(p.occasion)}</td></tr>
        <tr><th>Concentración</th><td>${esc(p.concentration)}</td></tr>
        ${p.perfumer ? `<tr><th>Perfumista</th><td>${esc(p.perfumer)}</td></tr>` : ""}
      </tbody></table>
      <p class="note-src">${esc(p.source || "")}</p>
    </div>`;

  // Barras de acordes generadas desde el JSON: --w es el ancho final, --i escalona la animación.
  document.getElementById("accords").innerHTML = p.accords.map((a, i) =>
    `<div class="bar"><span style="--w:${a.percentage}%;--i:${i};background:${esc(a.color)};color:${textOn(a.color)}">${esc(a.name)}</span></div>`).join("");

  const sizes = document.getElementById("sizes");
  sizes.innerHTML = p.variants.map((v) => `
    <button class="size" data-id="${v.id}" aria-pressed="false" ${v.stock === 0 ? "disabled" : ""}>
      ${v.size_ml} ml<small>${v.stock === 0 ? "Agotado" : v.is_decant ? "Decant" : "Botella"}</small></button>`).join("");

  function update() {
    qty = Math.min(qty, Math.max(selected.stock, 1));
    document.getElementById("price").textContent = usd(selected.price);
    document.getElementById("price-sub").textContent = `${dop(toDop(selected.price))} · ${selected.size_ml} ml ${selected.is_decant ? "(decant)" : "(botella completa)"}`;
    document.getElementById("stock").textContent = selected.stock === 0 ? "AGOTADO" : selected.stock <= 3 ? `Últimas ${selected.stock} unidades` : `${selected.stock} disponibles`;
    document.getElementById("qty").textContent = qty;
    document.getElementById("add").disabled = selected.stock === 0;
    sizes.querySelectorAll(".size").forEach((b) => b.setAttribute("aria-pressed", +b.dataset.id === selected.id));
  }
  sizes.addEventListener("click", (e) => {
    const b = e.target.closest(".size");
    if (b && !b.disabled) { selected = p.variants.find((v) => v.id === +b.dataset.id); qty = 1; update(); }
  });
  document.getElementById("inc").addEventListener("click", () => { qty = Math.min(qty + 1, selected.stock); update(); });
  document.getElementById("dec").addEventListener("click", () => { qty = Math.max(1, qty - 1); update(); });
  document.getElementById("add").addEventListener("click", () => {
    addItem({ variant_id: selected.id, perfume_id: p.id, name: p.name, brand: p.brand, size_ml: selected.size_ml, price: Number(selected.price), image: p.image_url, stock: selected.stock }, qty);
    toast(`${p.name} ${selected.size_ml} ml añadido`);
    window.dispatchEvent(new CustomEvent("cart:open"));
  });
  update();
}

function $related(list) {
  document.getElementById("related-grid").innerHTML = list.map(cardHTML).join("");
  document.getElementById("related").hidden = false;
}

async function init() {
  await initLayout();
  const id = new URLSearchParams(location.search).get("id");
  try {
    const p = await getPerfume(id);
    render(p);
    const others = (await getPerfumes({ category: p.category })).filter((o) => o.id !== p.id).slice(0, 4);
    if (others.length) { $related(others); }
  }
  catch (e) { root.innerHTML = `<p class="empty" style="grid-column:1/-1">No se encontró el perfume (${esc(e.message)}). <a href="index.html#catalogo">Volver al catálogo</a></p>`; }
}
init();
