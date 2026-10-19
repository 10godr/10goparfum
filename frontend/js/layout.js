// layout.js: partes comunes de todas las páginas (aviso, header, carrito lateral, footer, cookies).
import { cartCount, cartTotal, getCart, removeItem, setQty } from "./cart.js";
import { esc, imgClass, loadRate, money } from "./api.js";

const NOTICE = "⚡ PROYECTO DE PORTAFOLIO / DEMOSTRACIÓN TÉCNICA - NO ES UNA TIENDA REAL ⚡";
const NOTICE2 = "NO SE REALIZAN COBROS NI ENVÍOS";

function html(strings, ...v) { return strings.reduce((a, s, i) => a + s + (v[i] ?? ""), ""); }

export async function initLayout() {
  await loadRate();
  const track = [NOTICE, NOTICE2].map((t) => `<span>${t}</span>`).join("");
  document.body.insertAdjacentHTML("afterbegin", html`
    <div class="topbar" role="note"><div class="topbar-track" aria-label="${NOTICE}">${track.repeat(4)}</div></div>
    <header class="site-header">
      <div class="header-row">
        <nav class="nav" aria-label="Principal">
          <a href="index.html?category=Árabe#catalogo">Árabes</a>
          <a href="index.html?category=Diseñador#catalogo">Diseñador</a>
          <a href="index.html?category=Nicho#catalogo">Nicho</a>
          <a href="index.html#guia">Guía de decants</a>
        </nav>
        <a class="logo" href="index.html" aria-label="10go's Perfumes, inicio"><b>10go's</b><small>PERFUMES</small></a>
        <div class="header-tools">
          <button class="link" id="search-toggle" aria-expanded="false" aria-controls="search-bar">Buscar</button>
          <button class="link" id="cart-open" aria-haspopup="dialog">Carrito<span class="cart-count" id="cart-count">0</span></button>
        </div>
      </div>
      <form class="search-bar" id="search-bar" role="search" action="index.html#catalogo">
        <label class="sr-only" for="search-input">Buscar perfumes</label>
        <input id="search-input" name="q" type="search" placeholder="Buscar por nombre o marca…" autocomplete="off">
      </form>
    </header>
    <div class="overlay" id="overlay"></div>
    <aside class="drawer" id="drawer" role="dialog" aria-modal="true" aria-label="Carrito" aria-hidden="true">
      <div class="drawer-head"><h2>Tu carrito</h2><button class="link" id="cart-close">Cerrar</button></div>
      <div class="drawer-items" id="drawer-items"></div>
      <div class="drawer-foot" id="drawer-foot"></div>
    </aside>`);

  document.body.insertAdjacentHTML("beforeend", html`
    <footer class="site-footer">
      <div class="footer-grid">
        <div><div class="logo" style="text-align:left"><b>10go's</b><small>PERFUMES</small></div>
          <p>Proyecto de portafolio fullstack (FastAPI, PostgreSQL y JavaScript). No es una tienda real: no se venden productos, no se cobra y no se envía nada.</p></div>
        <div><h4>Explorar</h4><ul><li><a href="index.html#catalogo">Catálogo</a></li><li><a href="index.html#guia">Guía de decants</a></li><li><a href="admin.html">Panel de administración</a></li></ul></div>
        <div><h4>Legal</h4><ul><li><a href="legal.html#terminos">Términos y condiciones</a></li><li><a href="legal.html#cookies">Política de cookies</a></li><li><a href="legal.html#marcas">Marcas e imágenes</a></li></ul></div>
      </div>
      <p class="legal-note">Las marcas y nombres de perfumes pertenecen a sus respectivos dueños y se usan solo con fines educativos y de demostración. Las imágenes mostradas son ilustraciones o fotografías de terceros usadas con fines ilustrativos.</p>
    </footer>
    <div class="cookie" id="cookie" role="dialog" aria-label="Aviso de cookies">
      <p>Este sitio usa almacenamiento técnico del navegador (localStorage) solo para recordar tu carrito. No usa cookies de seguimiento ni publicidad. <a href="legal.html#cookies">Más información</a></p>
      <div class="row"><button class="btn" id="cookie-ok">Entendido</button></div>
    </div>`);

  // --- buscador: en el catálogo filtra al instante; en otras páginas navega a index ---
  const bar = document.getElementById("search-bar"), toggle = document.getElementById("search-toggle");
  toggle.addEventListener("click", () => {
    const open = bar.classList.toggle("open");
    toggle.setAttribute("aria-expanded", open);
    if (open) document.getElementById("search-input").focus();
  });
  bar.addEventListener("submit", (e) => {
    if (document.getElementById("catalogo")) {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent("search:submit", { detail: bar.q.value }));
      document.getElementById("catalogo").scrollIntoView({ behavior: "smooth" });
    }
  });

  // --- carrito lateral ---
  const drawer = document.getElementById("drawer"), overlay = document.getElementById("overlay");
  const openCart = () => { drawer.classList.add("open"); overlay.classList.add("open"); drawer.setAttribute("aria-hidden", "false"); };
  const closeCart = () => { drawer.classList.remove("open"); overlay.classList.remove("open"); drawer.setAttribute("aria-hidden", "true"); };
  document.getElementById("cart-open").addEventListener("click", openCart);
  document.getElementById("cart-close").addEventListener("click", closeCart);
  overlay.addEventListener("click", closeCart);
  document.addEventListener("keydown", (e) => e.key === "Escape" && closeCart());
  window.addEventListener("cart:open", openCart);

  const items = document.getElementById("drawer-items"), foot = document.getElementById("drawer-foot");
  function renderCart() {
    const cart = getCart();
    document.getElementById("cart-count").textContent = cartCount();
    items.innerHTML = cart.length ? cart.map((l) => html`
      <div class="line">
        <img class="${imgClass(l.image)}" src="${esc(l.image)}" alt="" width="64" height="80">
        <div><h4>${esc(l.name)}</h4><p>${esc(l.brand)} · ${l.size_ml} ml</p>
          <div class="qty"><button data-dec="${l.variant_id}" aria-label="Menos">−</button><span>${l.qty}</span><button data-inc="${l.variant_id}" aria-label="Más">+</button></div></div>
        <div style="text-align:right"><div>${money(l.price * l.qty)}</div><button class="link" data-rm="${l.variant_id}" style="margin-top:8px">Quitar</button></div>
      </div>`).join("") : `<p class="empty">Tu carrito está vacío.</p>`;
    foot.innerHTML = cart.length ? html`
      <div class="total-row"><span>Total de demostración</span><strong>${money(cartTotal())}</strong></div>
      <p class="tiny">Pesos dominicanos a tasa fija de demostración. No se cobra nada.</p>
      <a class="btn" href="checkout.html">Ir al checkout de prueba</a>` : "";
  }
  items.addEventListener("click", (e) => {
    const t = e.target, line = (id) => getCart().find((l) => l.variant_id === +id);
    if (t.dataset.rm) removeItem(+t.dataset.rm);
    if (t.dataset.inc) setQty(+t.dataset.inc, line(t.dataset.inc).qty + 1);
    if (t.dataset.dec) setQty(+t.dataset.dec, line(t.dataset.dec).qty - 1);
  });
  window.addEventListener("cart:change", renderCart);
  window.addEventListener("storage", renderCart);
  renderCart();

  // --- aviso de cookies (solo la primera visita) ---
  let seen = false;
  try { seen = localStorage.getItem("10go_cookies") === "1"; } catch { /* sin storage: mostramos el aviso */ }
  const cookie = document.getElementById("cookie");
  if (!seen) cookie.classList.add("show");
  document.getElementById("cookie-ok").addEventListener("click", () => {
    try { localStorage.setItem("10go_cookies", "1"); } catch { /* ignorado */ }
    cookie.classList.remove("show");
  });
}

// Tarjeta de producto reutilizable (catálogo y destacados)
export function cardHTML(p) {
  const stockOut = p.variants.every((v) => v.stock === 0);
  return html`<a class="card" href="producto.html?id=${p.id}">
    <div class="card-img ${imgClass(p.image_url)}"><img src="${esc(p.image_url)}" alt="${esc(p.brand)} ${esc(p.name)}" loading="lazy" width="400" height="500">
      ${stockOut ? '<span class="card-badge">Agotado</span>' : p.is_featured ? '<span class="card-badge">Destacado</span>' : ""}</div>
    <p class="card-brand">${esc(p.brand)}</p><h3>${esc(p.name)}</h3>
    <p class="card-meta">${esc(p.concentration)} · ${p.variants.length} tamaños: ${p.variants.map((v) => v.size_ml).join(" · ")} ml</p>
    <p class="card-price">Desde ${money(p.from_price)}</p></a>`;
}
