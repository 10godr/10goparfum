// admin.js: panel básico (sin login por ahora): resumen, inventario editable y órdenes de prueba.
import { api, dop, esc, getPerfumes, getToken, login, logout, toast, usd } from "./api.js";
import { initLayout } from "./layout.js";

const $ = (id) => document.getElementById(id);
const dlg = $("perfume-dialog"), pform = $("perfume-form");
let perfumes = [];

async function loadStats() {
  const s = await api("/admin/stats");
  $("stats").innerHTML = [
    [usd(s.simulated_revenue_usd), `Ingresos simulados · ${dop(s.simulated_revenue_dop)}`],
    [s.orders_count, "Órdenes de prueba"],
    [s.out_of_stock_variants, "Formatos sin stock"],
    [s.perfumes_count, "Perfumes en catálogo"],
  ].map(([n, l]) => `<div class="stat"><b>${n}</b><span>${l}</span></div>`).join("");
}

async function loadInventory() {
  perfumes = await getPerfumes();
  $("inventory").innerHTML = perfumes.map((p) => `
    <section style="margin-bottom:38px">
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap">
        <h3 style="margin:0">${esc(p.name)} <span class="tiny">${esc(p.brand)} · ${esc(p.category)}</span></h3>
        <span><button class="link" data-edit="${p.id}">Editar</button> &nbsp; <button class="link" data-del="${p.id}">Eliminar</button></span>
      </div>
      <div class="table-scroll"><table class="tbl"><thead><tr><th>Formato</th><th>Precio USD</th><th>Stock</th><th></th></tr></thead><tbody>
      ${p.variants.map((v) => `<tr data-variant="${v.id}"><td>${v.size_ml} ml ${v.is_decant ? "(decant)" : "(botella)"}</td>
        <td><input type="number" step="0.01" min="0.01" value="${v.price}" aria-label="Precio"></td>
        <td><input type="number" min="0" value="${v.stock}" aria-label="Stock" class="${v.stock === 0 ? "out" : ""}"></td>
        <td><button class="link" data-save="${v.id}">Guardar</button></td></tr>`).join("")}
      </tbody></table></div>
    </section>`).join("");
}

async function loadOrders() {
  const orders = await api("/admin/orders");
  $("orders").innerHTML = orders.length ? `<div class="table-scroll"><table class="tbl"><thead><tr><th>Código</th><th>Cliente</th><th>Productos</th><th class="num">Total</th><th>Fecha</th></tr></thead><tbody>` +
    orders.map((o) => `<tr><td>${esc(o.order_code)}</td><td>${esc(o.customer_name)}<br><span class="tiny">${esc(o.customer_email)}</span></td>
      <td>${o.items.map((i) => `${i.quantity}× ${esc(i.name)} ${i.size_ml} ml`).join("<br>")}</td>
      <td class="num">${usd(o.total_price)}<br><span class="tiny">${dop(o.total_price_dop)}</span></td><td>${new Date(o.created_at + "Z").toLocaleString("es-DO")}</td></tr>`).join("") +
    `</tbody></table></div>` : `<p class="empty">Todavía no hay órdenes de prueba.</p>`;
}

// ---- sesión: mostramos el login o el panel según haya token ----
function showView(loggedIn) {
  $("login-view").hidden = loggedIn;
  $("admin-view").hidden = !loggedIn;
  if (!loggedIn) $("l-user").focus();
}
const refresh = () => Promise.all([loadStats(), loadInventory(), loadOrders()]).catch((e) => { if (getToken()) $("inventory").innerHTML = `<p class="error">${esc(e.message)}</p>`; });

$("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("login-error").textContent = "";
  try {
    await login(e.target.username.value, e.target.password.value);
    e.target.reset(); showView(true); refresh();
  } catch (ex) { $("login-error").textContent = ex.message; }
});
$("logout").addEventListener("click", () => { logout(); showView(false); });
window.addEventListener("auth:expired", () => { showView(false); $("login-error").textContent = "Tu sesión caducó. Inicia sesión otra vez."; });

// ---- inventario: guardar variante / editar / eliminar ----
$("inventory").addEventListener("click", async (e) => {
  const t = e.target;
  try {
    if (t.dataset.save) {
      const row = t.closest("tr"), [price, stock] = row.querySelectorAll("input");
      await api(`/admin/variants/${t.dataset.save}`, { method: "PATCH", body: { price: price.value, stock: +stock.value } });
      toast("Guardado"); refresh();
    }
    if (t.dataset.del && confirm("¿Eliminar este perfume y sus formatos?")) {
      await api(`/admin/perfumes/${t.dataset.del}`, { method: "DELETE" }); toast("Eliminado"); refresh();
    }
    if (t.dataset.edit) openForm(perfumes.find((p) => p.id === +t.dataset.edit));
  } catch (ex) { toast(ex.message); }
});

// ---- formulario de perfume (crear / editar) ----
const list = (s) => s.split(",").map((x) => x.trim()).filter(Boolean);
function openForm(p = null) {
  pform.reset();
  pform.dataset.id = p ? p.id : "";
  $("form-title").textContent = p ? `Editar ${p.name}` : "Nuevo perfume";
  $("variants-field").hidden = !!p; // las variantes existentes se editan en la tabla
  if (p) {
    for (const k of ["name", "brand", "category", "concentration", "aromatic_family", "duration", "sillage", "occasion", "release_year", "perfumer", "image_url", "description", "source"]) pform.elements[k].value = p[k] ?? "";
    pform.elements.is_featured.checked = p.is_featured;
    for (const k of ["notes_top", "notes_heart", "notes_base"]) pform.elements[k].value = p[k].join(", ");
    pform.elements.accords.value = p.accords.map((a) => `${a.name}:${a.percentage}:${a.color}`).join("\n");
  }
  $("form-error").textContent = "";
  dlg.showModal();
}
$("new-perfume").addEventListener("click", () => openForm());
$("form-cancel").addEventListener("click", () => dlg.close());

pform.addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = pform.elements, id = pform.dataset.id;
  try {
    const body = {
      name: f.name.value, brand: f.brand.value, category: f.category.value, concentration: f.concentration.value,
      aromatic_family: f.aromatic_family.value, duration: f.duration.value, sillage: f.sillage.value, occasion: f.occasion.value,
      notes_top: list(f.notes_top.value), notes_heart: list(f.notes_heart.value), notes_base: list(f.notes_base.value),
      accords: f.accords.value.split("\n").filter((l) => l.trim()).map((l) => { const [name, pct, color] = l.split(":").map((x) => x.trim()); return { name, percentage: +pct, color: color || "#C9A968" }; }),
      description: f.description.value || null, perfumer: f.perfumer.value || null, release_year: f.release_year.value ? +f.release_year.value : null,
      source: f.source.value || null, image_url: f.image_url.value || null, is_featured: f.is_featured.checked,
    };
    if (id) await api(`/admin/perfumes/${id}`, { method: "PUT", body });
    else {
      body.variants = f.variants.value.split("\n").filter((l) => l.trim()).map((l) => { const [ml, price, stock] = l.split(":").map((x) => x.trim()); return { size_ml: +ml, is_decant: +ml < 30, price, stock: +stock }; });
      await api("/admin/perfumes", { method: "POST", body });
    }
    dlg.close(); toast("Perfume guardado"); refresh();
  } catch (ex) { $("form-error").textContent = ex.message; }
});

// ---- pestañas ----
document.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => {
  document.querySelectorAll("[data-tab]").forEach((x) => x.setAttribute("aria-pressed", x === b));
  $("inventory-panel").hidden = b.dataset.tab !== "inventory";
  $("orders-panel").hidden = b.dataset.tab !== "orders";
}));

initLayout().then(() => {
  showView(!!getToken());
  if (getToken()) refresh();
});
