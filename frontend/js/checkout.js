// checkout.js: resumen del carrito + generación de la ORDEN DE PRUEBA (sin pago).
import { createOrder, dop, esc, money, toDop, usd } from "./api.js";
import { cartTotal, clearCart, getCart } from "./cart.js";
import { initLayout } from "./layout.js";

const summary = document.getElementById("summary");
const form = document.getElementById("order-form");
const err = document.getElementById("error");

function renderSummary() {
  const cart = getCart();
  if (!cart.length) { summary.innerHTML = `<p class="empty">Tu carrito está vacío. <a href="index.html#catalogo">Ir al catálogo</a></p>`; form.hidden = true; return; }
  form.hidden = false;
  summary.innerHTML = `<table class="tbl"><thead><tr><th>Producto</th><th class="num">Cant.</th><th class="num">Subtotal</th></tr></thead><tbody>` +
    cart.map((l) => `<tr><td>${esc(l.name)}<br><span class="tiny">${esc(l.brand)} · ${l.size_ml} ml</span></td><td class="num">${l.qty}</td><td class="num">${usd(l.price * l.qty)}<br><span class="tiny">${dop(toDop(l.price * l.qty))}</span></td></tr>`).join("") +
    `</tbody></table><p class="total-row" style="margin-top:18px"><span>Total de demostración</span><strong>${money(cartTotal())}</strong></p>`;
}

function renderTicket(o) {
  document.getElementById("checkout-view").innerHTML = `
    <div class="ticket" role="status">
      <p class="eyebrow" style="text-align:center">Orden de demostración generada</p>
      <p class="code">${esc(o.order_code)}</p>
      <p class="tiny" style="text-align:center">${new Date(o.created_at + "Z").toLocaleString("es-DO")}</p>
      <p class="demo-note" style="margin-top:22px">Esto es un ticket de prueba de un proyecto de portafolio. No se realizó ningún cobro ni habrá envío, pero el stock de la base de datos sí se descontó.</p>
      <p>${esc(o.customer_name)} · ${esc(o.customer_email)}</p>
      <table class="tbl"><thead><tr><th>Producto</th><th class="num">Cant.</th><th class="num">Subtotal</th></tr></thead><tbody>
      ${o.items.map((l) => `<tr><td>${esc(l.name)}<br><span class="tiny">${esc(l.brand)} · ${l.size_ml} ml</span></td><td class="num">${l.quantity}</td><td class="num">${usd(l.subtotal)}</td></tr>`).join("")}
      </tbody></table>
      <p class="total-row" style="margin-top:18px"><span>Total</span><strong>${usd(o.total_price)} · ${dop(o.total_price_dop)}</strong></p>
      <p style="text-align:center;margin-top:30px"><a class="btn" href="index.html">Volver a la tienda</a></p>
    </div>`;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  err.textContent = "";
  const btn = form.querySelector("button[type=submit]");
  btn.disabled = true;
  try {
    const d = Object.fromEntries(new FormData(form));
    const order = await createOrder({
      customer_name: d.customer_name, customer_email: d.customer_email, notes: d.notes || null,
      items: getCart().map((l) => ({ variant_id: l.variant_id, quantity: l.qty })),
    });
    clearCart();
    renderTicket(order);
    scrollTo({ top: 0 });
  } catch (ex) { err.textContent = ex.message; btn.disabled = false; }
});

(async () => { await initLayout(); renderSummary(); window.addEventListener("cart:change", renderSummary); })();
