// cart.js: el carrito vive en localStorage (no hay cuentas de usuario).
// Cada línea: { variant_id, perfume_id, name, brand, size_ml, price (USD), image, stock, qty }
const KEY = "10go_cart";
let memory = []; // respaldo por si localStorage está bloqueado

export function getCart() {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return memory; }
}
function save(cart) {
  memory = cart;
  try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch { /* ignorado */ }
  window.dispatchEvent(new CustomEvent("cart:change"));
}
export function addItem(item, qty = 1) {
  const cart = getCart();
  const line = cart.find((l) => l.variant_id === item.variant_id);
  if (line) { line.qty = Math.min(line.qty + qty, item.stock); line.stock = item.stock; }
  else cart.push({ ...item, qty: Math.min(qty, item.stock) });
  save(cart);
}
export function setQty(variantId, qty) {
  const cart = getCart();
  const line = cart.find((l) => l.variant_id === variantId);
  if (!line) return;
  line.qty = Math.max(1, Math.min(qty, line.stock));
  save(cart);
}
export const removeItem = (variantId) => save(getCart().filter((l) => l.variant_id !== variantId));
export const clearCart = () => save([]);
export const cartCount = () => getCart().reduce((n, l) => n + l.qty, 0);
export const cartTotal = () => getCart().reduce((n, l) => n + l.qty * l.price, 0);
