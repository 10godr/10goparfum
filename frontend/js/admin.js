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
const sortEs = (arr) => [...new Set(arr)].sort((a, b) => a.localeCompare(b, "es"));

// Opciones base; se suman las que ya existen en el catálogo.
const FAMILIES = ["Acuático", "Amaderado", "Amaderado Acuático", "Amaderado Especiado", "Aromático", "Aromático Acuático", "Aromático Fougère",
  "Chipre", "Chipre Frutal", "Cítrico", "Cítrico Aromático", "Cuero", "Floral", "Floral Afrutado", "Floral Amaderado Almizclado",
  "Gourmand", "Oriental", "Oriental Amaderado", "Oriental Especiado", "Oriental Floral", "Oriental Vainilla"];
const OCCASIONS = ["Día", "Noche", "Primavera", "Verano", "Otoño", "Invierno", "Casual", "Oficina", "Citas", "Fiesta", "Formal", "Deporte"];
const NOTES = ["Ámbar", "Ambroxan", "Almizcle", "Anís estrellado", "Bergamota", "Benjuí", "Cachemira", "Cacao", "Café", "Canela", "Cardamomo",
  "Cedro", "Cuero", "Dátiles", "Elemí", "Geranio", "Haba tonka", "Heliotropo", "Incienso", "Iris", "Jazmín", "Jengibre", "Lavanda",
  "Limón", "Madera de oud", "Mandarina", "Manzana", "Miel", "Mirra", "Musgo de roble", "Naranja", "Neroli", "Nuez moscada", "Pachulí",
  "Pimienta negra", "Pimienta rosa", "Piña", "Pomelo", "Praliné", "Rosa", "Romero", "Salvia", "Sándalo", "Tabaco", "Tuberosa",
  "Vainilla", "Vetiver", "Violeta", "Ylang-ylang", "Azafrán", "Caramelo", "Coco", "Grosella negra", "Melocotón", "Pera"];

// Selector de etiquetas: con `options` muestra botones fijos; con `free` deja escribir o elegir de la lista de sugerencias.
function chipPicker(name, { options = [], free = false }) {
  const el = document.querySelector(`[data-picker="${name}"]`), hidden = pform.elements[name];
  let values = [], rendering = false;
  const add = (v) => { v = v.trim(); if (v && !values.includes(v)) values.push(v); };
  function render() {
    hidden.value = values.join(", ");
    rendering = true; // al reemplazar el input se dispara focusout; lo ignoramos
    el.innerHTML = free
      ? values.map((v) => `<button type="button" class="chip" aria-pressed="true" data-v="${esc(v)}" title="Quitar">${esc(v)}<span class="x">×</span></button>`).join("") +
        `<input list="note-options" placeholder="Escribe o elige una nota y pulsa Enter">`
      : options.map((o) => `<button type="button" class="chip" aria-pressed="${values.includes(o)}" data-v="${esc(o)}">${esc(o)}</button>`).join("");
    rendering = false;
  }
  const commit = (input) => { if (input.value.trim()) { add(input.value); render(); el.querySelector("input").focus(); } };
  el.addEventListener("click", (e) => {
    const b = e.target.closest(".chip"); if (!b) return;
    const v = b.dataset.v;
    values = values.includes(v) ? values.filter((x) => x !== v) : [...values, v];
    render();
  });
  if (free) {
    el.addEventListener("keydown", (e) => { if (e.target.tagName === "INPUT" && (e.key === "Enter" || e.key === ",")) { e.preventDefault(); commit(e.target); } });
    // elegir una sugerencia de la lista la agrega de inmediato
    el.addEventListener("input", (e) => { if (e.target.tagName === "INPUT" && (!e.inputType || e.inputType === "insertReplacementText")) commit(e.target); });
    el.addEventListener("focusout", (e) => { if (!rendering && e.target.tagName === "INPUT" && e.target.value.trim()) { add(e.target.value); render(); } });
  }
  return { set(arr, opts) { if (opts) options = opts; values = []; arr.forEach(add); render(); }, get: () => values };
}
const pickers = {
  occasion: chipPicker("occasion", { options: OCCASIONS }),
  notes_top: chipPicker("notes_top", { free: true }),
  notes_heart: chipPicker("notes_heart", { free: true }),
  notes_base: chipPicker("notes_base", { free: true }),
};
function ensureOption(select, value) {
  if (value && ![...select.options].some((o) => o.value === value)) select.add(new Option(value, value));
}
function fillOptions() {
  const fam = pform.elements.aromatic_family, current = fam.value;
  fam.innerHTML = sortEs([...FAMILIES, ...perfumes.map((p) => p.aromatic_family)]).map((f) => `<option>${esc(f)}</option>`).join("");
  if (current) fam.value = current;
  $("note-options").innerHTML = sortEs([...NOTES, ...perfumes.flatMap((p) => [...p.notes_top, ...p.notes_heart, ...p.notes_base])])
    .map((n) => `<option value="${esc(n)}">`).join("");
}
function openForm(p = null) {
  pform.reset();
  pform.dataset.id = p ? p.id : "";
  $("form-title").textContent = p ? `Editar ${p.name}` : "Nuevo perfume";
  $("variants-field").hidden = !!p; // las variantes existentes se editan en la tabla
  fillOptions();
  const occ = p ? list(p.occasion) : [];
  pickers.occasion.set(occ, [...OCCASIONS, ...occ.filter((o) => !OCCASIONS.includes(o))]);
  for (const k of ["notes_top", "notes_heart", "notes_base"]) pickers[k].set(p ? p[k] : []);
  if (p) {
    ensureOption(pform.elements.concentration, p.concentration);
    ensureOption(pform.elements.aromatic_family, p.aromatic_family);
    for (const k of ["name", "brand", "category", "concentration", "aromatic_family", "duration", "sillage", "release_year", "perfumer", "image_url", "description", "source"]) pform.elements[k].value = p[k] ?? "";
    pform.elements.is_featured.checked = p.is_featured;
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
  const missing = [["occasion", "una ocasión"], ["notes_top", "una nota de salida"], ["notes_heart", "una nota de corazón"], ["notes_base", "una nota de fondo"]]
    .find(([k]) => !pickers[k].get().length);
  if (missing) { $("form-error").textContent = `Elige al menos ${missing[1]}.`; return; }
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
