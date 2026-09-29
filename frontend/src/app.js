// app.js — Arranque: sesión (login), layout dual, nav, router, modales, PWA.
import { NAV, ICONS, findByRoute } from "./nav.js";
import { store } from "./store.js";
import { router } from "./router.js";
import { views } from "./views.js";
import { api } from "./api.js";

const navEl     = document.getElementById("nav");
const viewEl    = document.getElementById("view");

/* Ícono de "Cerrar sesión" (solo escritorio). Vive dentro de la cabecera de la vista,
   justo a la derecha del logo Efecto Áncash, así que se re-crea en cada render: el clic se
   atiende por delegación desde el documento. Es el mismo cierre que el botón de Inicio. */
document.addEventListener("click", async (e) => {
  const btn = e.target.closest && e.target.closest("#logout-btn");
  if (!btn) return;
  btn.disabled = true;
  try { await api.logout(); } catch { /* ignore */ }
  location.reload();
});

/* Markup del ícono de salida (lo inserta headHtml() en cada cabecera). */
const LOGOUT_BTN = `<button class="icon-btn" id="logout-btn" type="button" title="Cerrar sesión" aria-label="Cerrar sesión">
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor"
       stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M10 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M15.5 16.5 20 12l-4.5-4.5" />
    <path d="M20 12H9" />
  </svg>
</button>`;

const escHtml = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));

/* Orden de la barra inferior (izq→der): es el orden del deslizamiento lateral.
   7 vistas · Inicio va al centro de la barra y es la vista inicial.
   (El sidebar de escritorio usa otro orden: se fija con `order` en app.css.) */
const ORDER = NAV.map(n => n.route);

/* Clave de caché de vistas = ruta COMPLETA (con sub-ruta).
   #/reportes y #/reportes/7 deben cachearse por separado: antes compartían clave y al
   abrir el Reporte (4.2) se pintaba la lista grande de Reportes ya precargada. */
const routeKey = h => (h || "").replace(/^#\/?/, "") || "portada";
const HOME  = "#/portada";
let slideDir = 0;   // +1 = entra desde la derecha (siguiente) · -1 = desde la izquierda (anterior)

/* ---------- Layout dual (automático, según el ancho de pantalla) ----------
   La webapp detecta sola si es teléfono o PC: <1024px = móvil, ≥1024px = escritorio.
   Ya no hay botón de previsualización. */
function computeLayout() {
  return window.matchMedia("(min-width:1024px)").matches ? "desktop" : "mobile";
}
function applyLayout() {
  const l = computeLayout();
  document.documentElement.dataset.layout = l;
  store.set({ layout: l });
}

/* ---------- Sesión (login contra la BD Azure · efectoancash) ---------- */
let ME = null;

async function ensureSession() {
  try { ME = await api.me(); } catch { ME = null; }
  store.set({ user: ME });
}

function renderLogin() {
  // Vuelta al acceso: nada de caché ni refrescos de la sesión anterior
  prefetchCache.clear();
  prefetched = null;
  stopPrefetchCycle();
  prefetchPrimera = true;
  // La pantalla de acceso también respeta el estilo móvil/escritorio
  // (si no, en PC se vería el diseño de móvil centrado).
  applyLayout();
  navEl.hidden = true;
  // Marca la pantalla como "portada de acceso": activa la foto de fondo a pantalla completa.
  document.documentElement.dataset.auth = "login";
  viewEl.innerHTML = `
    <div class="login-stage">
      <div class="login-stage__top">
        <img class="login-stage__logo" src="assets/logo-ancash-blanco.png" alt="Efecto Áncash" />
      </div>
      <div class="login-stage__load" id="li-load" hidden>
        <span class="spin" aria-hidden="true"></span>
        <span id="li-load-txt">Cargando…</span>
      </div>
      <form class="login" id="login-form" novalidate>
        <label class="login__lbl" for="li-email">Usuario</label>
        <input class="login__inp" id="li-email" name="email" type="email" inputmode="email"
               autocomplete="username" autocapitalize="none" spellcheck="false"
               placeholder="usuario@example.org" required />
        <label class="login__lbl" for="li-pwd">Contraseña</label>
        <input class="login__inp" id="li-pwd" name="password" type="password"
               autocomplete="current-password" required />
        <div class="login__err" id="li-err" hidden></div>
        <button class="btn login__btn" type="submit">Ingresar</button>
        <label class="login__remember"><input type="checkbox" id="li-remember" checked /> Mantener sesión</label>
      </form>
    </div>`;
  const form = viewEl.querySelector("#login-form");
  const err = viewEl.querySelector("#li-err");
  const btn = form.querySelector('button[type="submit"]');
  form.addEventListener("submit", async e => {
    e.preventDefault();
    err.hidden = true;
    btn.disabled = true; btn.textContent = "Ingresando…";
    // Aviso de carga centrado: aparece SOLO al pulsar "Ingresar" (no antes).
    const load = viewEl.querySelector("#li-load");
    const ltxt = viewEl.querySelector("#li-load-txt");
    if (ltxt) ltxt.textContent = "Ingresando…";
    if (load) load.hidden = false;
    try {
      await api.login(
        viewEl.querySelector("#li-email").value.trim(),
        viewEl.querySelector("#li-pwd").value,
        viewEl.querySelector("#li-remember").checked,
      );
      await ensureSession();
      if (!ME) throw new Error("No se pudo iniciar sesión");
      // La portada de acceso (foto + logo) se queda a la vista con el aviso de carga
      // hasta que Inicio está listo; recién ahí se revela el panel.
      if (ltxt) ltxt.textContent = "Cargando tu panel…";
      btn.textContent = "Preparando…";
      viewEl.querySelector("#login-form")?.classList.add("login--busy");
      goHome();
      await boot({ silent: true });
    } catch (ex) {
      viewEl.querySelector("#login-form")?.classList.remove("login--busy");
      const load = viewEl.querySelector("#li-load");
      if (load) load.hidden = true;
      err.textContent = ex.message || "No se pudo iniciar sesión";
      err.hidden = false;
      btn.disabled = false; btn.textContent = "Ingresar";
    }
  });
}

/* ---------- Nav ---------- */
function renderNav() {
  navEl.innerHTML = NAV.map(n => `
    <button class="nav__item" type="button" data-route="${n.route}" aria-label="${n.label}">
      <svg viewBox="0 0 20 20" width="25" height="25" aria-hidden="true"><path fill="currentColor" d="${ICONS[n.icon]}"/></svg>
      <span class="nav__label">${n.label}</span>
      ${n.badge ? `<span class="nav__badge">${n.badge}</span>` : ""}
    </button>`).join("");
  navEl.querySelectorAll(".nav__item").forEach(b =>
    b.addEventListener("click", () => {
      // Al tocar un icono, el deslizamiento va en la dirección del movimiento.
      const i = ORDER.indexOf(findByRoute(location.hash).route);
      const j = ORDER.indexOf(b.dataset.route);
      if (i >= 0 && j >= 0 && i !== j) slideDir = j > i ? 1 : -1;
      router.go(b.dataset.route);
    }));
}

/* ---------- Render de vista ---------- */
async function render(opts = {}) {
  const silent = !!opts.silent;   // true = no pintar el stub (la portada de acceso sigue visible)
  const args = opts.args || [];   // argumentos de la sub-ruta (p. ej. el id de #/actividades/25)
  const item = findByRoute(location.hash);
  const v = views[item.id] || views.portada;
  const key = routeKey(location.hash);   // caché por ruta completa, no por sección
  // La vista puede imponer su propio color de cabecera (p. ej. 4.2 Reporte = morado).
  let accent = item.accent;
  if (typeof v.accent === "function") {
    try { accent = (await Promise.resolve(v.accent(args))) || accent; } catch { /* usa el de la sección */ }
  }
  document.documentElement.style.setProperty("--accent", accent);
  store.set({ accent });
  // La cabecera va DENTRO de la vista (así viaja con ella al deslizar). Se prepara en paralelo.
  const phead = headHtml(item, v, args);
  // Si la vista ya está renderizada (por el gesto o por la precarga de fondo), se pinta tal cual.
  const pre = (prefetched && prefetched.route === key) ? prefetched.html : takeCached(key);
  if (prefetched) prefetched = null;
  prefetchCache.delete(key);
  if (pre) {
    viewEl.innerHTML = pre;
  } else {
    if (!silent) viewEl.innerHTML = `<div class="stub"><span class="stub__tag">Cargando…</span></div>`;
    let body;
    try { body = await v.render(args); }
    catch (e) { body = `<div class="card"><div class="card__body"><b>No se pudo cargar.</b><p>${e.message || e}</p></div></div>`; }
    viewEl.innerHTML = (await phead) + body;
  }
  // Deslizamiento lateral: anima la entrada de la vista en la dirección del gesto.
  if (resetAfterRender) {          // cierre del gesto: la vecina ya está en su sitio
    resetAfterRender = false;
    dragGen++; animating = false;
    viewEl.style.transition = "none";
    viewEl.style.transform = "";
    viewEl.classList.remove("is-swiping");
    document.querySelector(".app")?.classList.remove("is-swiping");
    viewEl.querySelectorAll(".swipe-ghost").forEach(g => g.remove());
    void viewEl.offsetWidth;
    viewEl.style.transition = "";
  }
  if (slideDir) {
    viewEl.classList.remove("view--from-right", "view--from-left");
    void viewEl.offsetWidth;   // fuerza reflow para reiniciar la animación
    viewEl.classList.add(slideDir > 0 ? "view--from-right" : "view--from-left");
    slideDir = 0;
  }
  navEl.querySelectorAll(".nav__item").forEach(b => {
    if (b.dataset.route === item.route) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  });
  viewEl.scrollTop = 0;
  window.scrollTo(0, 0);                  // cada vista empieza arriba
  if (v.mount) { try { await v.mount(viewEl); } catch (e) { console.warn(e); } }
  schedulePrefetch();      // adelanta y refresca las demás vistas
}

/* ---------- UI helpers (toast / modal) ---------- */
export function toast(msg, ms = 2600) {
  const root = document.getElementById("toast-root");
  const t = document.createElement("div");
  t.className = "toast"; t.textContent = msg; root.appendChild(t);
  setTimeout(() => t.remove(), ms);
}
export function modal({ title, body, actions = [] }) {
  const root = document.getElementById("modal-root");
  const back = document.createElement("div");
  back.className = "modal__backdrop";
  back.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="${title || "Diálogo"}">
      <div class="modal__head"><b>${title || ""}</b>
        <button class="btn btn--ghost" data-close type="button" aria-label="Cerrar">✕</button></div>
      <div class="modal__body">${body || ""}</div>
      <div class="modal__foot"></div>
    </div>`;
  const foot = back.querySelector(".modal__foot");
  actions.forEach(a => {
    const b = document.createElement("button");
    b.className = "btn " + (a.kind === "primary" ? "btn--primary" : "btn--ghost");
    b.type = "button"; b.textContent = a.label;
    b.onclick = () => { if (!a.onClick || a.onClick(back) !== false) back.remove(); };
    foot.appendChild(b);
  });
  const close = () => back.remove();
  back.querySelector("[data-close]").onclick = close;
  back.addEventListener("click", e => { if (e.target === back) close(); });
  root.appendChild(back);
  return { el: back, close };
}
// clearCache(): invalida la caché de vistas precargadas (p. ej. tras crear una actividad).
window.__ui = { toast, modal, clearCache: () => prefetchCache.clear() };

/* ---------- Inicio (Home) ---------- */
function goHome() {
  // replaceState evita un hashchange extra (no duplica el render)
  try { history.replaceState(null, "", HOME); } catch { location.hash = HOME; }
}

/* ---------- Deslizamiento lateral entre vistas (solo móvil) ----------
   Recorre las 7 vistas en el orden de la barra inferior. Sin scroll infinito:
   los topes son la primera vista (Actividades) y la última (Calendario).
   Estilo "Instagram": durante el gesto el contenido sigue el dedo y entra la
   vista vecina (solo 2 vistas vivas: la actual + la vecina). */
const SWIPE_LOCK = 10;     // px para decidir si el gesto es horizontal
let drag = null;           // gesto en curso
let animating = false;     // hay una transición de cierre en curso
let resetAfterRender = false;
let dragGen = 0;
let prefetched = null;      // {route, html} de la vista ya renderizada (gesto o segundo plano)
const PREFETCH_TODAS = true;      // false = apagar toda la precarga de fondo
const PREFETCH_TTL   = 60000;     // ms que una vista precargada se considera fresca
const PREFETCH_CADA  = 30000;     // cada cuánto se refrescan las viejas (ronda de fondo)
const PREFETCH_MAX   = 4;         // vistas refrescadas por ronda (reparte la carga de red)
const PREFETCH_PAR   = 4;         // vistas pedidas EN PARALELO dentro de una ronda
const PREFETCH_TOPE  = 14;        // tope de vistas guardadas
const prefetchCache = new Map(); // route -> {html, t}
let prefetchTimer = null, prefetchCycle = null, prefetchRunning = false, prefetchPrimera = true;
let prefetchCursor = 0;           // por dónde va la ronda de refresco

/* Toma del caché una vista ya renderizada (con vigencia). */
function takeCached(route) {
  const e = prefetchCache.get(route);
  if (!e) return null;
  if (Date.now() - e.t > PREFETCH_TTL) { prefetchCache.delete(route); return null; }
  return e.html;
}

/* Cabecera de cada vista. Va DENTRO de la vista: viaja con ella en el deslizamiento.
   Portada aporta su propia cabecera (saludo + nombre + logo); las demás, el título. */
async function headHtml(item, v, args = []) {
  let lead;
  if (typeof v.topbar === "function") {
    lead = await Promise.resolve().then(() => v.topbar(args))
      .catch(() => `<h1 class="topbar__title">${escHtml(v.title || item.label)}</h1>`);
  } else {
    lead = `<h1 class="topbar__title">${escHtml(v.title || item.label)}</h1>`;
  }
  return `<header class="view-head"><div class="view-head__lead">${lead}</div><div class="view-head__actions">${LOGOUT_BTN}</div></header>`;
}

/* Precarga/refresca vistas en segundo plano (nunca toca la vista visible).
   La ronda avanza con un cursor: en varias rondas quedan frescas las 7, sin picos de red. */
async function prefetchAll({ max = PREFETCH_MAX } = {}) {
  if (!PREFETCH_TODAS || prefetchRunning || !prefetchAvailable()) return;
  prefetchRunning = true;
  try {
    const n = ORDER.length, actual = findByRoute(location.hash).route;
    const pend = [];
    for (let k = 0; k < n && pend.length < max; k++) {
      const route = ORDER[(prefetchCursor + k) % n];
      if (route === actual) continue;                                // la visible no se re-renderiza
      const e = prefetchCache.get(routeKey(route));
      if (e && Date.now() - e.t < PREFETCH_TTL) continue;            // ya está fresca
      const item = findByRoute(route);
      const v = views[item.id] || views.portada;
      if (!v || typeof v.render !== "function") continue;
      pend.push([route, item, v]);
    }
    // Se piden en grupos (PREFETCH_PAR): antes iban una tras otra y cada vista costaba
    // ~0.9 s, así que refrescar las 7 tardaba ~6 s. Ahora una ronda tarda ~1 s.
    for (let i = 0; i < pend.length; i += PREFETCH_PAR) {
      await Promise.all(pend.slice(i, i + PREFETCH_PAR).map(async ([route, item, v]) => {
        try {
          const phead = headHtml(item, v, []);    // primero la cabecera (la portada comparte la carga)
          const body = await v.render([]);        // sin args: se precargan las rutas base de cada sección
          if (typeof body !== "string") return;
          const head = await phead;
          if (prefetchCache.size > PREFETCH_TOPE) prefetchCache.clear();
          prefetchCache.set(routeKey(route), { html: head + body, t: Date.now() });
        } catch { /* si falla, esa vista se cargará normal al entrar */ }
      }));
    }
    prefetchCursor = (prefetchCursor + Math.max(pend.length, 1)) % n;
  } finally { prefetchRunning = false; }
}

/* Tras pintar una vista: la primera vez prepara las 7; después, refrescos cortos. */
function schedulePrefetch() {
  if (!PREFETCH_TODAS) return;
  clearTimeout(prefetchTimer);
  // En PC la ronda cubre TODAS las vistas (el pedido va en paralelo y la base responde
  // del caché) para que cualquier clic sea instantáneo; en móvil se reparte.
  const todas = prefetchPrimera || document.documentElement.dataset.layout === "desktop";
  const max = todas ? ORDER.length : PREFETCH_MAX;
  prefetchPrimera = false;
  prefetchTimer = setTimeout(() => prefetchAll({ max }), 400);
}
/* Ronda periódica: mantiene las vistas frescas mientras la app está abierta y visible. */
function startPrefetchCycle() {
  if (!PREFETCH_TODAS || prefetchCycle) return;
  prefetchCycle = setInterval(() => { if (!document.hidden) prefetchAll(); }, PREFETCH_CADA);
}
function stopPrefetchCycle() { clearInterval(prefetchCycle); prefetchCycle = null; clearTimeout(prefetchTimer); }
document.addEventListener("visibilitychange", () => {
  if (document.hidden) return;
  prefetchPrimera = true;             // al volver a la app: repaso completo
  schedulePrefetch();
});

function slideAvailable() {
  return document.documentElement.dataset.layout === "mobile"
      && document.documentElement.dataset.auth !== "login";
}
/* La precarga de vistas ya no es solo del móvil: en PC también (ahí es donde el salto
   entre vistas tardaba ~0.9 s por la ida a la base). El deslizamiento sigue siendo móvil. */
function prefetchAvailable() {
  return document.documentElement.dataset.auth !== "login";
}
function orderIndex() { return ORDER.indexOf(findByRoute(location.hash).route); }
function goRelative(delta) {
  if (!slideAvailable()) return false;
  const i = orderIndex(), j = i + delta;
  if (i < 0 || j < 0 || j >= ORDER.length) return false;   // tope: no hay más vistas
  slideDir = delta > 0 ? 1 : -1;
  router.go(ORDER[j]);
  return true;
}
function hasHScroll(el) {
  for (let n = el; n && n !== viewEl.parentElement; n = n.parentElement) {
    const cs = getComputedStyle(n);
    if ((cs.overflowX === "auto" || cs.overflowX === "scroll") && n.scrollWidth > n.clientWidth + 4) return true;
  }
  return false;
}
function endDrag(d) {
  if (d && d.ghost) d.ghost.remove();
  viewEl.style.transition = "";
  viewEl.style.transform = "";
  viewEl.classList.remove("is-swiping");
  document.querySelector(".app")?.classList.remove("is-swiping");
}
/* Crea la vista vecina ("ghost") justo al lado de la actual. */
function makeGhost(d, j, dir) {
  if (d.ghost) d.ghost.remove();
  d.dir = dir;
  const g = document.createElement("div");
  g.className = "swipe-ghost";
  g.style.transform = `translate3d(${dir > 0 ? 100 : -100}%,0,0)`;
  viewEl.classList.add("is-swiping");
  document.querySelector(".app")?.classList.add("is-swiping");
  viewEl.appendChild(g);
  d.ghost = g;
  const cached = takeCached(routeKey(ORDER[j]));
  if (cached) {                       // ya estaba adelantada: aparece al instante
    g.innerHTML = cached;
    prefetched = { route: routeKey(ORDER[j]), html: cached };
    return;
  }
  const itemj = findByRoute(ORDER[j]);
  const v = views[itemj.id] || views.portada;
  const phead = headHtml(itemj, v, []);
  Promise.resolve(v.render([]))
    .then(async body => { if (d.ghost !== g) return; const full = (await phead) + body; g.innerHTML = full; prefetched = { route: routeKey(ORDER[j]), html: full }; })
    .catch(() => {});
}
function paint(dx) { viewEl.style.transform = `translate3d(${dx}px,0,0)`; }

viewEl.addEventListener("touchstart", e => {
  if (drag) { endDrag(drag); drag = null; }   // gesto previo abandonado: no dejar la vista desplazada
  if (animating || !slideAvailable() || e.touches.length !== 1) return;
  viewEl.classList.remove("view--from-right", "view--from-left");
  const t = e.touches[0];
  drag = { x0:t.clientX, y0:t.clientY, dx:0, lock:null, ghost:null, dir:0,
           xPrev:t.clientX, tPrev:performance.now(), vx:0,
           hscroll:hasHScroll(e.target) };
}, { passive: true });

viewEl.addEventListener("touchmove", e => {
  const d = drag;
  if (!d || d.hscroll) return;
  const t = e.touches[0];
  const dx = t.clientX - d.x0, dy = t.clientY - d.y0;
  if (d.lock === null) {
    if (Math.abs(dx) < SWIPE_LOCK && Math.abs(dy) < SWIPE_LOCK) return;
    d.lock = Math.abs(dx) > Math.abs(dy) * 1.2 ? "x" : "y";
    if (d.lock === "y") { endDrag(d); drag = null; return; }   // es scroll vertical: no intervenir
  }
  if (d.lock !== "x") return;
  if (e.cancelable) e.preventDefault();                      // el gesto es horizontal: no arrastra la página
  const now = performance.now();
  if (now > d.tPrev) d.vx = (t.clientX - d.xPrev) / (now - d.tPrev);
  d.xPrev = t.clientX; d.tPrev = now;
  d.dx = dx;
  const dir = dx < 0 ? 1 : -1;                               // deslizar a la izquierda = siguiente
  const j = orderIndex() + dir;
  const hay = orderIndex() >= 0 && j >= 0 && j < ORDER.length;
  if (hay) { if (!d.ghost || d.dir !== dir) makeGhost(d, j, dir); }
  else if (d.ghost) { d.ghost.remove(); d.ghost = null; }    // tope: sin vecina
  paint(hay ? dx : dx * 0.32);                               // en el tope, con resistencia
}, { passive: false });

viewEl.addEventListener("touchend", e => {
  const d = drag; drag = null;
  if (!d || d.lock !== "x") return;
  const w = viewEl.clientWidth || window.innerWidth;
  const dir = d.dx < 0 ? 1 : -1;
  const j = orderIndex() + dir;
  const rapido = Math.abs(d.vx) > 0.45 && Math.sign(d.vx) === Math.sign(d.dx);
  const cierra = d.ghost && j >= 0 && j < ORDER.length &&
                 (Math.abs(d.dx) > Math.max(60, w * 0.22) || rapido);
  viewEl.style.transition = "transform .12s cubic-bezier(.22,.61,.36,1)";
  if (cierra) {
    animating = true;
    const myGen = ++dragGen;
    viewEl.style.transform = `translate3d(${-dir * w}px,0,0)`;   // la actual sale hacia su lado
    setTimeout(() => {                                          // entra la vecina = ya renderizada por render()
      resetAfterRender = true;
      router.go(ORDER[j]);
    }, 120);
    setTimeout(() => {                 // red de seguridad (si render() no llegó)
      if (dragGen !== myGen) return;
      if (resetAfterRender) { resetAfterRender = false; endDrag(d); }
      animating = false; dragGen++;
    }, 1200);
  } else {
    const myGen = ++dragGen;
    viewEl.style.transform = "";                                // vuelve a su sitio
    setTimeout(() => { if (dragGen === myGen) { animating = false; endDrag(d); } }, 130);
  }
});
viewEl.addEventListener("touchcancel", () => { const d = drag; drag = null; if (d) endDrag(d); });

/* ---------- Router ---------- */
Object.keys(views).forEach(id => router.register(id, (args) => render({ args })));
router.setNotFound(() => render());
router.onChange(() => {});
window.addEventListener("hashchange", render);
window.addEventListener("resize", applyLayout);

/* ---------- Arranque (con sesión) ---------- */
async function boot(opts = {}) {
  applyLayout();
  if (!location.hash) location.hash = HOME;
  renderNav();
  // Con sesión recién iniciada (silent) NO se pinta "Cargando…": la portada de acceso
  // (logo + aviso de carga) sigue a la vista hasta que Inicio está listo, y ahí se revela todo.
  await render({ silent: !!opts.silent });
  delete document.documentElement.dataset.auth;
  navEl.hidden = false;
  startPrefetchCycle();
}

await ensureSession();
if (ME) boot(); else renderLogin();

/* ---------- PWA ---------- */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () =>
    navigator.serviceWorker.register("sw.js").catch(() => {}));
}
