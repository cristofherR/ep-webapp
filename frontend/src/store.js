// store.js — Estado mínimo reactivo (sin dependencias).
const state = {
  layout: "mobile",   // "mobile" | "desktop" (automático, según ancho de pantalla)
  user: null,
  accent: "#1F3460",
};
const subs = new Set();

export const store = {
  get: () => state,
  set(patch) {
    Object.assign(state, patch);
    subs.forEach(fn => fn(state));
  },
  subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
};
