// api.js: todo lo que habla con FastAPI y utilidades de formato.
// El backend sirve también este frontend, así que la API está en el mismo origen (/api).
// Si abres el HTML con otro servidor (Live Server), define antes: window.API_BASE = "http://localhost:8000"
const BASE = (window.API_BASE || "") + "/api";

// --- Sesión del administrador: el token JWT se guarda en localStorage ---
const TOKEN_KEY = "10go_admin_token";
export const getToken = () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } };
const setToken = (t) => { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* ignorado */ } };
export const logout = () => setToken(null);
export async function login(username, password) {
  const data = await api("/auth/login", { method: "POST", body: { username, password } });
  setToken(data.access_token);
}

export async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + path, { ...options, headers, body: options.body ? JSON.stringify(options.body) : undefined });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && path.startsWith("/admin")) {
    setToken(null); // token caducado o inválido: obligamos a iniciar sesión otra vez
    window.dispatchEvent(new CustomEvent("auth:expired"));
  }
  if (!res.ok) {
    // FastAPI manda {detail: "texto"} o {detail: [{msg}, ...]} en errores de validación
    const d = data.detail;
    throw new Error(Array.isArray(d) ? d.map((e) => e.msg).join(". ") : d || "Error del servidor");
  }
  return data;
}

export const getPerfumes = (params = {}) => {
  const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== "" && v != null));
  return api("/perfumes?" + new URLSearchParams(clean));
};
export const getPerfume = (id) => api(`/perfumes/${id}`);
export const getFilters = () => api("/filters");
export const createOrder = (body) => api("/orders", { method: "POST", body });

// --- Dinero: guardamos USD y mostramos también pesos dominicanos (tasa fija del backend) ---
let rate = 61;
export async function loadRate() {
  try { rate = (await api("/config")).usd_to_dop; } catch { /* usamos 61 */ }
  return rate;
}
export const toDop = (usd) => Math.round(Number(usd) * rate);
export const usd = (n) => "US$ " + Number(n).toFixed(2);
export const dop = (n) => "RD$ " + Math.round(Number(n)).toLocaleString("es-DO");
export const money = (n) => `${usd(n)} · ${dop(toDop(n))}`;

// Evita inyectar HTML cuando pintamos texto que viene de la base de datos.
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const sizeLabel = (v) => (v.is_decant ? `${v.size_ml} ml` : `${v.size_ml} ml`);
export function toast(msg) {
  let t = document.querySelector(".toast");
  if (!t) { t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); document.body.append(t); }
  t.textContent = msg; t.classList.add("show");
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), 2200);
}
