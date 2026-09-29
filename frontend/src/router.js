// router.js — Router por hash, sin dependencias.
// Rutas: #/portada  #/actividades  #/actividades/<id>  #/indicadores ...
const routes = new Map();
let notFound = () => "<p>No encontrado</p>";
let onChange = () => {};

export const router = {
  register(path, fn) { routes.set(path, fn); },
  setNotFound(fn) { notFound = fn; },
  onChange(fn) { onChange = fn; },
  go(hash) { if (location.hash === hash) this.resolve(); else location.hash = hash; },
  resolve() {
    const raw = (location.hash || "").replace(/^#\/?/, "");
    const [path, ...args] = raw.split("/");
    const key = path || "portada";
    const handler = routes.get(key) || notFound;
    onChange(key, args);
    return handler(args);
  },
  start() { window.addEventListener("hashchange", () => this.resolve()); return this.resolve(); },
};
