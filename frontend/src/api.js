// api.js — Cliente HTTP de la WebApp.
// En dev: el frontend puede correr en :5173 y la API en :8090 (mismo host).
// En prod: la API vive en el mismo origen (/api/*).

const BASE = (() => {
  // Mismo origen: el backend FastAPI sirve el front y la API (/api/*).
  // Override manual: ?api=http://host:8090
  const q = new URLSearchParams(location.search);
  if (q.get("api")) return q.get("api").replace(/\/$/, "");
  return "";
})();

async function req(path, { method = "GET", body, headers } = {}) {
  const res = await fetch(BASE + "/api" + path, {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(headers || {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const ct = res.headers.get("content-type") || "";
  const data = ct.includes("application/json") ? await res.json() : await res.text();
  if (!res.ok) {
    const msg = (data && data.detail) || (typeof data === "string" ? data : res.statusText);
    const err = new Error(msg || "Error de red");
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  base: BASE,
  health:      ()              => req("/health"),
  ui:          ()              => req("/ui"),
  me:          ()              => req("/auth/me"),
  login:       (email, pwd, remember) => req("/auth/login", { method:"POST", body:{ email, password:pwd, remember } }),
  logout:      ()              => req("/auth/logout", { method:"POST" }),
  portada:     (period)        => req(`/portada?periodo=${encodeURIComponent(period || "")}`),
  actividades: (f = {})        => req("/actividades?" + new URLSearchParams(f)),
  cts:         (f = {})        => req("/ct" + (Object.keys(f).length ? "?" + new URLSearchParams(f) : "")),
  programacion:(id)            => req(`/actividades/${encodeURIComponent(id)}/subactividades`),
  reportar:    (payload)       => req("/reportes", { method:"POST", body:payload }),
  catalogos:   ()              => req("/catalogos"),
  subactividad:(id)            => req(`/subactividades/${encodeURIComponent(id)}`),
  casos:       (f = {})        => req("/incidencias?" + new URLSearchParams(f)),
  crearCaso:   (payload)       => req("/incidencias", { method:"POST", body:payload }),
  indicadores: (f = {})        => req("/indicadores?" + new URLSearchParams(f)),
  calendario:  (f = {})        => req("/calendario?" + new URLSearchParams(f)),
  historial:   (f = {})        => req("/historial?" + new URLSearchParams(f)),
  comentario:  (texto)         => req("/portada/comentario", { method:"POST", body:{ texto } }),
  // Sección 4.3 "Crear actividad" (nueva sub-actividad).
  actividad43:      (aid)    => req(`/actividad43/${encodeURIComponent(aid)}/catalogos`),
  ubicacion43:      (f = {}) => req(`/actividad43/ubicacion?${new URLSearchParams(f)}`),
  crearActividad43: (payload) => req(`/actividad43`, { method: "POST", body: payload }),
};
