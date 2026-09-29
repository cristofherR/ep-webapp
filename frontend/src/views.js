// views.js — Vistas de las 7 secciones.
// Datos: intenta la API; si no está disponible, usa DEMO (marcado) para que la app
// funcione y se pueda revisar el diseño. Al conectar el backend, los datos son reales.
import { api } from "./api.js";
import { ICONS } from "./nav.js";
import { store } from "./store.js";

/* ============================ helpers ============================ */
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
const css = v => `var(${v})`;
const hashArgs = () => (location.hash || "").replace(/^#\/?/, "").split("/");
/* Argumento de sub-ruta: el router entrega solo los args (p. ej. ["25"]);
   si la vista se invoca sin args, se deduce del hash (#/actividades/25 → hashArgs()[1]). */
const arg = (args, i = 0) => (args && args.length ? args[i] : hashArgs()[i + 1]);

const EST_GRANDE = {
  "Programado":"--est-programado","En ejecución":"--est-ejecucion","Completado":"--est-completado",
  "Reprogramado":"--est-reprogramado","No ejecutado":"--est-noejecutado",
};
const SUB = {
  "Ejecutado":"--sub-ejecutado","Reprogramado":"--sub-reprogramado","Cancelado":"--sub-cancelado",
  "Vencida":"--sub-vencida","Vencida3":"--sub-vencida3","Pendiente":"--sub-pendiente",
};
const UGT = {
  "Mina":"--ugt-mina","San Marcos":"--ugt-sanmarcos","Huallanca":"--ugt-huallanca",
  "Valle Fortaleza":"--ugt-vallefortaleza","Huarmey":"--ugt-huarmey",
  "Huaripampa":"--ugt-huaripampa","Región":"--ugt-region",
};
/* Semáforo de 5 niveles (spec 4.2): Informativo · Leve · Moderado · Urgente · Prioritario. */
const SEM = {
  "Informativo":"--sem-informativo","Leve":"--sem-leve","Moderado":"--sem-moderado",
  "Urgente":"--sem-urgente","Prioritario":"--sem-prioritario",
};
const semTok = s => SEM[s] || ("--sem-" + String(s || "moderado").toLowerCase());
const pill = (txt, v) => `<span class="pill" style="background:${css(v)}">${esc(txt)}</span>`;
const dot  = v => `<span class="dot" style="background:${css(v)}"></span>`;

/* Componentes del POA: código → [nombre visible, token de color] (colores del diseño Power Apps). */
/* Claves reales de la BD (core_componente.codigo) + alias del diseño Power Apps (PROG-n / ECO-n). */
const COMP = {
  "PDL":  ["Programa de Liderazgo PDL","--prog-1"],     "PROG-1":["Programa de Liderazgo PDL","--prog-1"],
  "QM":   ["¡Qué Maestro! QM","--prog-2"],              "PROG-2":["¡Qué Maestro! QM","--prog-2"],
  "PDLD": ["Liderazgo para Directivos PDLD","--prog-3"],"PROG-3":["Liderazgo para Directivos PDLD","--prog-3"],
  "LECTO":["Formación en Lectoescritura","--prog-4"],  "PROG-4":["Formación en Lectoescritura","--prog-4"],
  "CCA":  ["Crecemos con Amor CCA","--prog-5"],         "PROG-5":["Crecemos con Amor CCA","--prog-5"],
  "MS":   ["Mente Sana MS","--prog-6"],                 "PROG-6":["Mente Sana MS","--prog-6"],
  "PDLE": ["Liderazgo Estudiantil PDLE","--prog-7"],   "PROG-7":["Liderazgo Estudiantil PDLE","--prog-7"],
  "AJ":   ["Academia Juvenil AJ","--prog-8"],           "PROG-8":["Academia Juvenil AJ","--prog-8"],
  "CONECT":["Conectividad para Aprender","--prog-9"], "PROG-9":["Conectividad para Aprender","--prog-9"],
  "ECO":  ["Ecosistema y gestión territorial","--eco-2"],
  "ECO-1":["Gobernanza Territorial","--eco-1"],        "ECO-2":["MEL","--eco-2"],
  "ECO-3":["Sostenibilidad","--eco-3"],
  "PROG-0":["Gestión del Proyecto","--prog-0"],
};
const compOf = c => COMP[String(c || "").toUpperCase()] || [String(c || "—"), "--header-gris"];

const SVG_CHEV = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>`;
const SVG_BACK = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg>`;
const SVG_PLUS = `<svg viewBox="0 0 20 20" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M6 3a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3V6a3 3 0 0 0-3-3H6ZM4 6c0-1.1.9-2 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6Zm6.5.5a.5.5 0 0 0-1 0v3h-3a.5.5 0 0 0 0 1h3v3a.5.5 0 1 0 1 0v-3h3a.5.5 0 1 0 0-1h-3v-3Z"/></svg>`;
const MES_ORDEN = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

/* ============================ DEMO ============================ */
const DEMO = {
  user: { nombre:"Cristofher Rodriguez Atilano", rol:"Admin MEL - MEL" },
  mes: "Septiembre",
  kpis: { programadas:24, reportadas:18 },
  proximas: [
    { id:"A-101", nombre:"Taller de lectura compartida con familias", fecha:"18 set · 10:00" },
    { id:"A-102", nombre:"Visita de seguimiento a IE 24920496",       fecha:"19 set · 09:00" },
    { id:"A-103", nombre:"Sesión Mente Sana - Sec-1ero",              fecha:"20 set · 11:30" },
    { id:"A-104", nombre:"Reporte de asistencia docentes UGT Huari",  fecha:"21 set · 08:30" },
    { id:"A-105", nombre:"Espacios de sensibilización · Huarmey",     fecha:"24 set · 10:00" },
  ],
  actividades: [
    { id:"A-101", nombre:"Jornada formativa presencial", ugt:"San Marcos", comp:"PROG-1", ct:"Yorlemi Montes", anio:2026, mes:"Septiembre", estado:"Programado",
      subs:[{e:"Ejecutado"},{e:"Ejecutado"},{e:"Vencida3"},{e:"Pendiente"},{e:"Pendiente"},{e:"Pendiente"}] },
    { id:"A-102", nombre:"Seguimiento a docentes", ugt:"Huaripampa", comp:"PROG-3", ct:"Santiago Mansilla", anio:2026, mes:"Septiembre", estado:"En ejecución",
      subs:[{e:"Ejecutado"},{e:"Reprogramado"},{e:"Vencida"},{e:"Pendiente"},{e:"Pendiente"}] },
    { id:"A-103", nombre:"Espacio de gobernanza", ugt:"Huallanca", comp:"ECO-1", ct:"Miguel Saenz", anio:2026, mes:"Septiembre", estado:"Reprogramado",
      subs:[{e:"Cancelado"},{e:"Pendiente"},{e:"Pendiente"},{e:"Pendiente"}] },
    { id:"A-104", nombre:"Acompañamiento al participante", ugt:"Valle Fortaleza", comp:"PROG-2", ct:"Miroshina Nolasco", anio:2026, mes:"Septiembre", estado:"Completado",
      subs:[{e:"Ejecutado"},{e:"Ejecutado"},{e:"Ejecutado"}] },
    { id:"A-105", nombre:"Espacios de sensibilización", ugt:"Huarmey", comp:"ECO-2", ct:"Helder Vilchez", anio:2026, mes:"Septiembre", estado:"Programado",
      subs:[{e:"Pendiente"},{e:"Pendiente"}] },
  ],
  /* Catálogo de Coordinadores Territoriales (CT) por UGT. Ojo: UGT Mina tiene DOS. */
  cts: [
    { ugt:"Huallanca", ct:"Miguel Saenz" },
    { ugt:"Huarmey", ct:"Helder Vilchez" },
    { ugt:"Mina", ct:"Rayza Jara" },
    { ugt:"Mina", ct:"Santiago Mansilla" },
    { ugt:"San Marcos", ct:"Yorlemi Montes" },
    { ugt:"Valle Fortaleza", ct:"Miroshina Nolasco" },
  ],
  indicadores: {
    programadas:24, reportadas:16, canceladas:3, reprogramadas:5,
    porUGT:[["San Marcos",24],["Huari",18],["Recuay",12],["Carhuaz",9]],
    porTipo:[["Jornada formativa",35],["Seguimiento",25],["Acompañamiento",18],["Gobernanza",12],["Sensibilización",10]],
    porSemana:[["S1",4],["S2",5],["S3",4],["S4",6],["S5",2]],
    porMes:[["Jun",88],["Jul",72],["Ago",91],["Set",67]],
  },
  casos: [
    { id:"C-201", tipo:"Incidencia", cat:"IE", sub:"Infraestructura", sem:"Moderado", estado:"Abierta", origen:"A-101" },
    { id:"C-202", tipo:"Alerta", cat:"NEE", sub:"Riesgo de aprendizaje", sem:"Leve", estado:"En seguimiento", origen:"A-102", diag:"En proceso" },
    { id:"C-203", tipo:"Incidencia", cat:"AT", sub:"Ausentismo docente", sem:"Urgente", estado:"Cerrada", origen:"—" },
  ],
  eventos: [
    { f:"15/09/2026 08:10", tipo:"Reporte", txt:"Reporte registrado · A-101 (San Marcos)" },
    { f:"15/09/2026 07:55", tipo:"Actividad", txt:"Actividad programada · A-105 (Huarmey)" },
    { f:"14/09/2026 17:20", tipo:"Incidencia", txt:"Caso C-201 abierto (Infraestructura)" },
    { f:"14/09/2026 12:05", tipo:"Alerta", txt:"Caso C-202 en seguimiento (NEE)" },
  ],
};

async function safe(fn, fallback) { try { const r = await fn(); return r ?? fallback; } catch { return fallback; } }

/* ============================ PORTADA ============================ */
/* Íconos monoline de sol/luna (estilo del sistema de íconos de la app). */
const SUN  = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.6v2.4M12 19v2.4M2.6 12H5M19 12h2.4M5.3 5.3l1.7 1.7M17 17l1.7 1.7M18.7 5.3 17 7M7 17l-1.7 1.7"/></svg>`;
const MOON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.5 14.3A8.5 8.5 0 1 1 9.7 3.5a6.6 6.6 0 0 0 10.8 10.8Z"/></svg>`;

/* Caché de la carga de portada: la comparten la cabecera (topbar) y el cuerpo. */
let _pData = null;
const loadPortada = () => (_pData = _pData || safe(() => api.portada(), DEMO));   // una sola consulta por pasada

const portada = {
  title: "Inicio",
  // Cabecera propia de la Portada: saludo + nombre + cargo (izq.) y logo efecto Áncash (der.).
  async topbar() {
    const p = await loadPortada();
    // Usuario real: sesión (store) o /api/portada. DEMO solo si no hay backend.
    const su = store.get().user;
    const du = p.user || (su ? { nombre: su.nombre, rol: su.rol } : null);
    const u = du || DEMO.user;
    const h = new Date().getHours();
    const saludo = h >= 5 && h < 12 ? "Buen día" : h >= 12 && h < 18.5 ? "Buenas tardes" : "Buenas noches";
    const icono = h >= 5 && h < 18.5 ? SUN : MOON;   // sol en día/tarde, luna de noche
    return `
      <div class="hero">
        <div class="hero__left">
          <div class="hero__saludo">${saludo} ${icono}</div>
          <div class="hero__name">${esc(u.nombre)}</div>
          <div class="hero__rol">${esc(u.rol)}</div>
        </div>
        <div class="hero__logo">
          <img class="hero__logoimg" src="assets/logo-ancash-blanco.png" alt="Efecto Áncash" />
        </div>
      </div>`;
  },
  async render() {
    const p = await (_pData || loadPortada()); _pData = null;   // reutiliza la carga de la cabecera
    const k = p.kpis || { programadas: 0, reportadas: 0 };
    const prox = Array.isArray(p.proximas) ? p.proximas : [];
    const pct = k.programadas ? Math.round((k.reportadas / k.programadas) * 100) : 0;
    // Orden del grid = el del texto de Cristofher (2 filas x 3 columnas), con sus íconos.
    const jump = [
      ["Reportes","list","#/reportes"], ["Indicadores","chart","#/indicadores"], ["Actividades","blocks","#/actividades"],
      ["Calendario","calendar","#/calendario"], ["Mi historial","clock","#/historial"], ["Incidencias","alert","#/incidencias"],
    ];
    return `
      <div class="metrics">
        <div class="metrics__col">
          <div class="metric"><div class="metric__n">${k.programadas}</div><div class="metric__l">Actividades programadas</div></div>
          <div class="metric"><div class="metric__n">${k.reportadas}</div><div class="metric__l">Actividades reportadas</div></div>
        </div>
        <div class="metric metric--big"><div class="metric__n">${pct}%</div><div class="metric__l">Reportabilidad</div></div>
      </div>

      <div class="jump" style="margin-top:var(--sp-3)">
        ${jump.map(([t,ic,r]) => `<a class="jump__btn" href="${r}">
          <svg viewBox="0 0 20 20" aria-hidden="true"><path fill="currentColor" d="${ICONS[ic]}"/></svg>
          <span>${t}</span></a>`).join("")}
      </div>

      <div class="card" style="margin-top:var(--sp-3)"><div class="card__body">
        <div class="pta__title">Próximas actividades:</div>
        <div class="pta__head"><span>Actividad</span><span>Fecha programada</span></div>
        ${prox.slice(0,5).map(a => `<div class="pta__row"><span>${esc(a.nombre)}</span><span>${esc(a.fecha)}</span></div>`).join("") || `<div class="pta__row"><span>Sin actividades próximas</span><span>—</span></div>`}
      </div></div>

      <div class="grid grid--2" style="margin-top:var(--sp-3)">
        <a class="btn" href="https://example.org" target="_blank" rel="noopener">Visitar web principal</a>
        <button class="btn btn--primary" id="btn-comentario" type="button">Dejar un comentario</button>
      </div>

      <button class="btn btn--ghost" id="btn-logout" type="button"
              style="width:100%;margin-top:var(--sp-3);color:var(--text-2)">Cerrar sesión</button>`;
  },
  mount(el) {
    el.querySelector("#btn-logout")?.addEventListener("click", async () => {
      el.querySelector("#btn-logout").disabled = true;
      try { await api.logout(); } catch { /* ignore */ }
      location.reload();
    });
    el.querySelector("#btn-comentario")?.addEventListener("click", () => {
      window.__ui.modal({
        title: "Comentario o sugerencia",
        body: `<textarea id="c" rows="4" style="width:100%;border:1px solid var(--line);border-radius:8px;padding:8px"></textarea>`,
        actions: [
          { label: "Cancelar" },
          { label: "Enviar", kind: "primary", onClick: async (b) => {
              const t = b.querySelector("#c").value.trim();
              if (!t) return false;
              await safe(() => api.comentario(t), true);
              window.__ui.toast("Gracias por tus comentarios.");
            } },
        ],
      });
    });
  },
};

/* ============================ ACTIVIDADES (4) ============================ */
let _poa = [];   // lista completa del año consultado (el filtrado es en el cliente)
let _cts = [];   // catálogo de Coordinadores Territoriales (CT) por UGT

/* Tarjetas del listado POA: borde verde, cabecera cian, etiquetas y puntos de estado. */
function poaCards(list) {
  if (!list.length) return `<div class="card"><div class="card__body">Sin actividades para los filtros seleccionados.</div></div>`;
  return list.map(a => {
    const cNom = a.compNom || compOf(a.comp)[0];
    const cTok = compOf(a.comp)[1];
    return `
      <article class="poa-card">
        <div class="poa-card__head">${esc(a.nombre)}</div>
        <div class="poa-card__body">
          <div class="poa-card__tags">
            ${pill(a.ugt, UGT[a.ugt] || "--ugt-otro")}
            ${pill(cNom, cTok)}
            ${pill(String(a.anio), "--prog-1")}
            ${pill(a.mes, "--mes-badge")}
            ${pill(a.estado, EST_GRANDE[a.estado] || "--muted")}
          </div>
          <button class="poa-card__go" type="button" data-go="${esc(a.id)}" aria-label="Abrir programación">${SVG_CHEV}</button>
        </div>
        <div class="poa-card__dots">${(a.subs || []).map(s => dot(SUB[s.e] || "--sub-pendiente")).join("")}</div>
      </article>`;
  }).join("");
}

/* Barra de filtros (gris claro): año/mes/territorio · componente/estado/CT · limpiar. */
function poaFiltros(list, cts) {
  const años = [...new Set([2026, ...list.map(a => a.anio)])].filter(Boolean).sort((a, b) => b - a);
  const meses = MES_ORDEN.filter(m => list.some(a => a.mes === m));
  const ugts = [...new Set(list.map(a => a.ugt))].filter(Boolean).sort();
  const comps = [...new Set(list.map(a => String(a.comp || "").toUpperCase()))].filter(Boolean).sort();
  const cNom = {};
  list.forEach(a => { const k = String(a.comp || "").toUpperCase(); if (k && a.compNom) cNom[k] = a.compNom; });
  const estados = Object.keys(EST_GRANDE);
  // CT: catálogo (incluye los DOS de UGT Mina) o, si no llega, los que aparezcan en la lista.
  const ctBase = (cts && cts.length)
    ? cts.map(c => ({ v: c.ct, l: c.ugt ? `${c.ct} · ${c.ugt}` : c.ct }))
    : [...new Set(list.map(a => a.ct).filter(Boolean))].sort().map(c => ({ v: c, l: c }));
  const vistos = new Set();
  const ctOpts = ctBase.filter(o => o.v && !vistos.has(o.v) && vistos.add(o.v));
  const haySinCt = list.some(a => !a.ct);
  const opt = (v, t) => `<option value="${esc(v)}">${esc(t)}</option>`;
  return `
    <div class="poa-filtros">
      <div class="poa-filtros__row">
        <label class="poa-sel"><select id="f-anio" aria-label="Año">${años.map(a => opt(a, a)).join("")}</select></label>
        <label class="poa-sel"><select id="f-mes" aria-label="Mes"><option value="">Mes</option>${meses.map(m => opt(m, m)).join("")}</select></label>
        <label class="poa-sel"><select id="f-ugt" aria-label="Territorio (UGT)"><option value="">Territorio</option>${ugts.map(u => opt(u, u)).join("")}</select></label>
      </div>
      <div class="poa-filtros__row">
        <label class="poa-sel"><select id="f-comp" aria-label="Componente"><option value="">Componente</option>${comps.map(c => opt(c, cNom[c] || compOf(c)[0])).join("")}</select></label>
        <label class="poa-sel"><select id="f-estado" aria-label="Estado"><option value="">Estado</option>${estados.map(e => opt(e, e)).join("")}</select></label>
        <label class="poa-sel"><select id="f-ct" aria-label="Coordinador territorial"><option value="">Coordinador territorial</option>${ctOpts.map(o => opt(o.v, o.l)).join("")}${haySinCt ? opt("__none__", "Sin CT") : ""}</select></label>
      </div>
      <div class="poa-filtros__row poa-filtros__row--end">
        <button class="poa-clear" id="f-clear" type="button" aria-label="Limpiar filtros">✕</button>
      </div>
    </div>`;
}

const actividades = {
  title: "Actividades (POA)",
  async render(args) {
    const id = arg(args);
    if (arg(args, 1) === "nueva") return renderNuevaActividad(arg(args, 0));
    if (id) return renderProgramacion(id);
    _poa = await safe(() => api.actividades({}), DEMO.actividades);
    if (!Array.isArray(_poa)) _poa = DEMO.actividades;
    _cts = await safe(() => api.cts(), DEMO.cts);
    if (!Array.isArray(_cts)) _cts = DEMO.cts;
    return `<div id="poa-filtros">${poaFiltros(_poa, _cts)}</div>
      <div id="poa-list" class="poa-list">${poaCards(_poa)}</div>`;
  },
  /* Cabecera móvil: en el detalle (4.1) muestra actividad + mes/año y el círculo de estado. */
  async topbar(args) {
    if (arg(args, 1) === "nueva") return topbarNueva(arg(args, 0));
    const id = arg(args);
    if (id) {
      const a = await actGrande(id);
      const est = (a && a.estado) || "";
      const hex = { "Programado": "#0077a8", "En ejecución": "#8a6500", "Completado": "#437a22",
                    "Reprogramado": "#5c3d8f", "No ejecutado": "#c0392b" }[est] || "#888888";
      const cNom = (a && a.compNom) || compOf(a && a.comp)[0];
      const compTxt = (a && a.comp && !new RegExp(`\\(${a.comp}\\)|\\b${a.comp}\\b`, "i").test(cNom || "")) ? ` (${a.comp})` : "";
      const mesAnio = a && a.mes ? ` - ${a.mes} ${a.anio || ""}` : "";
      return `<div class="prog-head">
        <button class="prog-back" id="atras" type="button" aria-label="Volver">${SVG_BACK}</button>
        <div class="prog-head__txt">
          <b class="prog-head__t">${esc((a && a.nombre) || "Actividad")}${esc(mesAnio)}</b>
          <span class="prog-head__s">UGT ${esc((a && a.ugt) || "—")} - ${esc(cNom)}${esc(compTxt)}</span>
        </div>
        <span class="prog-head__est" style="background:${hex}" title="${esc(est)}"></span>
      </div>`;
    }
    return `<div class="poa-head">
      <button class="poa-back" id="poa-back" type="button" aria-label="Volver">${SVG_BACK}</button>
      <span class="poa-title">Actividades (POA)</span>
    </div>`;
  },
  mount(el) {
    // Sub-vista "Nueva actividad" (4.3): formulario propio; no aplica el cableado del POA.
    if (hashArgs()[2] === "nueva") { mountNueva(el); return; }
    el.querySelector("#poa-back")?.addEventListener("click", () => { location.hash = "#/portada"; });
    const lista = () => el.querySelector("#poa-list");
    const val = s => el.querySelector(s)?.value || "";
    const go = () => lista()?.querySelectorAll("[data-go]").forEach(b =>
      b.addEventListener("click", () => { location.hash = "#/actividades/" + b.dataset.go; }));
    const aplicar = () => {
      const ctv = val("#f-ct");
      const l = _poa.filter(a =>
        (!val("#f-mes") || a.mes === val("#f-mes")) &&
        (!val("#f-ugt") || a.ugt === val("#f-ugt")) &&
        (!val("#f-comp") || String(a.comp).toUpperCase() === val("#f-comp")) &&
        (!val("#f-estado") || a.estado === val("#f-estado")) &&
        (!ctv || (ctv === "__none__" ? !a.ct : a.ct === ctv)));
      if (lista()) lista().innerHTML = poaCards(l);
      go();
    };
    const wire = () => {
      ["#f-mes", "#f-ugt", "#f-comp", "#f-estado", "#f-ct"].forEach(s =>
        el.querySelector(s)?.addEventListener("change", aplicar));
      el.querySelector("#f-anio")?.addEventListener("change", async e => {
        _poa = await safe(() => api.actividades({ anio: Number(e.target.value) || 2026 }), DEMO.actividades);
        el.querySelector("#poa-filtros").innerHTML = poaFiltros(_poa, _cts);
        wire(); aplicar();
      });
      el.querySelector("#f-clear")?.addEventListener("click", () => {
        ["#f-mes", "#f-ugt", "#f-comp", "#f-estado", "#f-ct"].forEach(s => { const n = el.querySelector(s); if (n) n.value = ""; });
        aplicar();
      });
    };
    wire(); go();
    // Sub-vista "Programación" (4.1): atrás, agregar, filtros responsable/estado y abrir el Reporte (4.2).
    if (hashArgs()[1]) {
      const atras = el.querySelector("#atras") || document.getElementById("atras");
      atras?.addEventListener("click", () => { location.hash = "#/actividades"; });
      // La cabecera 4.1 va en turquesa claro (spec webapp3 §4.1).
      const head = document.querySelector(".view-head");
      if (head) head.style.background = "#18C2AD";
      const lista = () => el.querySelector("#prog-list");
      // Un solo listener por delegación: click (o Enter) en la tarjeta abre el Reporte (4.2).
      // Vale para TODA la tarjeta, no solo la píldora de estado.
      lista()?.addEventListener("click", e => {
        const c = e.target.closest("[data-rep]");
        if (c) location.hash = "#/reportes/" + c.dataset.rep;
      });
      lista()?.addEventListener("keydown", e => {
        if (e.key !== "Enter" && e.key !== " ") return;
        const c = e.target.closest("[data-rep]");
        if (c) { e.preventDefault(); location.hash = "#/reportes/" + c.dataset.rep; }
      });
      const aplicarP = () => {
        const rv = el.querySelector("#p-resp")?.value || "";
        const ev = el.querySelector("#p-estado")?.value || "";
        lista()?.querySelectorAll(".prog-card").forEach(c => {
          c.hidden = !((!rv || c.dataset.resp === rv) && (!ev || c.dataset.est === ev));
        });
      };
      el.querySelector("#p-resp")?.addEventListener("change", aplicarP);
      el.querySelector("#p-estado")?.addEventListener("change", aplicarP);
      el.querySelector("#p-clear")?.addEventListener("click", () => {
        ["#p-resp", "#p-estado"].forEach(s => { const n = el.querySelector(s); if (n) n.value = ""; });
        aplicarP();
      });
      // "Agregar nueva actividad" navega al formulario 4.3 (en vez del toast provisional).
      el.querySelector("#prog-add")?.addEventListener("click", () => {
        location.hash = "#/actividades/" + (hashArgs()[1] || "") + "/nueva";
      });
    }
  },
};

const SUBDOT = { "Ejecutado": "#437a22", "Reprogramado": "#8e44ad", "Cancelado": "#000000",
                 "Vencida": "#c0392b", "Vencida3": "#c0392b", "Pendiente": "#cccccc" };
let _repAct = null;   // id de la actividad grande del Reporte (4.2) abierto, para volver a 4.1
const SUBPILL = { "Ejecutado": "#437a22", "Reprogramado": "#5c3d8f", "Cancelado": "#c0392b",
                  "Vencida": "#c0392b", "Vencida3": "#c0392b", "Pendiente": "#888888" };

/* Actividad grande del detalle 4.1 (memoizada en _poa). */
async function actGrande(id) {
  if (!_poa.length) {
    const lst = await safe(() => api.actividades({}), null);
    if (Array.isArray(lst)) _poa = lst;
  }
  return _poa.find(x => String(x.id) === String(id)) || null;
}

async function renderProgramacion(id) {
  const subs = await safe(() => api.programacion(id), null);
  await actGrande(id);
  if (!Array.isArray(subs)) {
    return `<div class="card"><div class="card__body"><b>No se pudo cargar la programación.</b></div></div>`;
  }
  const respons = [...new Set(subs.map(s => s.resp).filter(Boolean))].sort();
  const estados = [...new Set(subs.map(s => s.e || "Pendiente"))];
  const opt = (v, t) => `<option value="${esc(v)}">${esc(t)}</option>`;
  const tarjeta = s => {
    const e = s.e || "Pendiente";
    const lugar = esc(s.lugar || "—") + (s.nivel ? ` (${esc(s.nivel)})` : "");
    const abierta = e !== "Ejecutado";   // no reportada → se puede reportar/editar
    return `
    <article class="prog-card${abierta ? " prog-card--click" : ""}" data-est="${esc(e)}" data-resp="${esc(s.resp || "")}"
             data-rep="${esc(s.id)}" role="button" tabindex="0" title="${abierta ? "Reportar esta actividad" : "Ver reporte (solo lectura)"}">
      <div class="prog-card__head">${esc(s.titulo || "Actividad")}</div>
      <div class="prog-card__body">
        <div class="prog-card__lugar"><b>Lugar:</b> ${lugar}</div>
        <div class="prog-card__fila">Responsable: ${esc(s.resp || "—")}</div>
        <div class="prog-card__fila">Fecha: ${esc(s.dia || "")}; ${esc(s.fecha_num || "—")} - Hora inicio: ${esc(s.hora || "—")}</div>
      </div>
      <div class="prog-card__foot">
        <span class="prog-dot" style="background:${SUBDOT[e] || "#cccccc"}"></span>
        <button class="prog-pill" type="button" data-rep="${esc(s.id)}" style="background:${SUBPILL[e] || "#888888"}">${esc(e)}</button>
      </div>
    </article>`;
  };
  return `
    <button class="prog-add" id="prog-add" type="button">
      <span class="prog-add__txt">Agregar nueva actividad</span>
      <span class="prog-add__ico">${SVG_PLUS}</span>
    </button>
    <div class="prog-filtros">
      <label class="prog-sel"><select id="p-resp" aria-label="Responsable"><option value="">Responsable</option>${respons.map(r => opt(r, r)).join("")}</select></label>
      <label class="prog-sel"><select id="p-estado" aria-label="Estado"><option value="">Estado</option>${estados.map(e => opt(e, e)).join("")}</select></label>
      <button class="prog-clear" id="p-clear" type="button" aria-label="Limpiar filtros">✕</button>
    </div>
    <div class="prog-list" id="prog-list">${subs.length
      ? subs.map(tarjeta).join("")
      : `<div class="card"><div class="card__body">Sin sub-actividades programadas.</div></div>`}</div>`;
}

/* ============================ INDICADORES (3) ============================ */
const indicadores = {
  title: "Indicadores",
  async render() {
    // Si el backend no devuelve la forma esperada (p. ej. base aún sin cablear),
    // se usa el set DEMO: la vista nunca debe quedar en blanco.
    let d = await safe(() => api.indicadores({}), null);
    if (!d || !Array.isArray(d.porUGT) || !Array.isArray(d.porTipo) || !Array.isArray(d.porSemana)) {
      d = DEMO.indicadores;
    }
    const pct = d.programadas ? Math.round((d.reportadas / d.programadas) * 100) : 0;
    const maxU = Math.max(...d.porUGT.map(x => x[1]), 1);
    const maxS = Math.max(...d.porSemana.map(x => x[1]), 1);
    const totalT = d.porTipo.reduce((s, x) => s + x[1], 0) || 1;
    let acc = 0; const donut = d.porTipo.map(([t, v], i) => {
      const frac = v / totalT, len = Math.round(frac * 100); const seg = `${acc} ${acc + len}`; acc += len;
      const col = ["#0E7C70","#6B3293","#0077a8","#e07000","#437a22"][i % 5];
      return `${col} ${seg}`;
    }).join(",");
    return `
      <div class="grid grid--2">
        <div class="kpi"><div class="kpi__n">${d.programadas}</div><div class="kpi__l">Programadas</div></div>
        <div class="kpi"><div class="kpi__n">${d.reportadas}</div><div class="kpi__l">Reportadas</div></div>
        <div class="kpi"><div class="kpi__n">${d.canceladas}</div><div class="kpi__l">Canceladas</div></div>
        <div class="kpi"><div class="kpi__n">${d.reprogramadas}</div><div class="kpi__l">Reprogramadas</div></div>
      </div>
      <div class="pills" style="margin-top:var(--sp-3)">
        ${pill("Reportabilidad "+pct+"%","--teal")} ${pill("Cancel./Reprog. "+Math.round(((d.canceladas+d.reprogramadas)/d.programadas)*100)+"%","--sem-moderado")}
      </div>

      <div class="card"><div class="card__head">Programadas por UGT</div><div class="card__body">
        ${d.porUGT.map(([u, v]) => `<div style="margin-bottom:8px"><div style="display:flex;justify-content:space-between"><span>${esc(u)}</span><b>${v}</b></div>
          <div style="height:10px;background:var(--surface-3);border-radius:6px;overflow:hidden"><div style="width:${Math.round(v/maxU*100)}%;height:100%;background:${css(UGT[u]||"--teal")}"></div></div></div>`).join("")}
      </div></div>

      <div class="card"><div class="card__head">Tipos de actividad</div><div class="card__body" style="display:flex;gap:var(--sp-4);align-items:center">
        <svg viewBox="0 0 42 42" width="140" height="140" aria-label="Dona por tipo">
          <circle cx="21" cy="21" r="15.9" fill="none" stroke-width="6" stroke="var(--surface-3)"></circle>
          ${(() => { let a0 = 0; return d.porTipo.map(([t, v], i) => { const len = v/totalT*100; const col = ["#0E7C70","#6B3293","#0077a8","#e07000","#437a22"][i%5];
            const c = 2*Math.PI*15.9; const dash = `${len/100*c} ${c}`; const rot = a0*3.6; a0 += len;
            return `<circle cx="21" cy="21" r="15.9" fill="none" stroke-width="6" stroke="${col}" stroke-dasharray="${dash}" transform="rotate(${rot-90} 21 21)"></circle>`; }).join(""); })()}
          <text x="21" y="22" text-anchor="middle" font-size="6" fill="#212121">${totalT}</text>
        </svg>
        <div>${d.porTipo.map(([t, v], i) => `<div style="display:flex;gap:8px;align-items:center"><span class="dot" style="background:${["#0E7C70","#6B3293","#0077a8","#e07000","#437a22"][i%5]}"></span>${esc(t)} <b>${v}%</b></div>`).join("")}</div>
      </div></div>

      <div class="card"><div class="card__head">Ejecutadas por semana</div><div class="card__body" style="display:flex;gap:var(--sp-3);align-items:flex-end;height:140px">
        ${d.porSemana.map(([s, v]) => `<div style="flex:1;text-align:center">
          <div style="height:${Math.round(v/maxS*100)}%;min-height:6px;background:var(--teal);border-radius:6px 6px 0 0"></div>
          <div style="font-size:10px;color:var(--muted)">${esc(s)}</div><b>${v}</b></div>`).join("")}
      </div></div>`;
  },
};

/* ============================ REPORTES (5) / 4.2 Reporte ============================ */
/* Pantalla "Reporte" (4.2) — diseño móvil según spec de Cristofher (17-sep 2026):
   (A) "Detalle y Ejecución de Actividad" y, activada por el interruptor,
   (B) "Reporte de incidencia / alerta" (pestañas Incidencia / Alerta). */

/* Taxonomía 4.2 (aplicado 20-sep-2026): un único eje "Tipo = Naturaleza" (familia) para
   Incidencia y Alerta, y cascada N:M  Naturaleza → Categoría → Subcategoría.
   El catálogo canónico lo sirve /api/catalogos (cats.taxonomia); esto es el respaldo local. */
const REP_NAT = [
  ["CONV", "Conducta y violencia"], ["SALUD", "Salud y seguridad"],
  ["DER", "Protección y derechos"], ["GEST", "Gestión y operación"],
];
const REP_SUB_NAT = {
  FISICA: "CONV", VERBAL: "CONV", PSICOLOGICA: "CONV", SEXUAL: "CONV", CIBERBULLYING: "CONV",
  ACCIDENTE: "SALUD", ENFERMEDAD: "SALUD", CRISIS_EMOCIONAL: "SALUD",
  NEGLIGENCIA: "DER", VIOLENCIA_DOMESTICA: "DER",
  AUSENTISMO_DOCENTE: "GEST", INFRAESTRUCTURA: "GEST", CONFLICTO_AUTORIDAD: "GEST",
  LOGISTICA: "GEST", COMUNICACION: "GEST", CLIMA_LABORAL: "GEST",
};
const REP_CAT_SUB = {
  PB: ["FISICA", "VERBAL", "PSICOLOGICA", "SEXUAL", "CIBERBULLYING", "NEGLIGENCIA", "VIOLENCIA_DOMESTICA", "CRISIS_EMOCIONAL"],
  BP: ["FISICA", "PSICOLOGICA", "SEXUAL", "CIBERBULLYING", "NEGLIGENCIA", "VIOLENCIA_DOMESTICA", "CRISIS_EMOCIONAL", "ACCIDENTE", "ENFERMEDAD"],
  IE: ["FISICA", "VERBAL", "PSICOLOGICA", "SEXUAL", "NEGLIGENCIA", "COMUNICACION"],
  NEE: ["CRISIS_EMOCIONAL", "AUSENTISMO_DOCENTE", "NEGLIGENCIA"],
  OP: ["AUSENTISMO_DOCENTE", "LOGISTICA", "COMUNICACION", "CLIMA_LABORAL", "CONFLICTO_AUTORIDAD"],
  DO: ["INFRAESTRUCTURA", "LOGISTICA", "AUSENTISMO_DOCENTE", "ACCIDENTE", "ENFERMEDAD"],
  RT: ["CONFLICTO_AUTORIDAD", "COMUNICACION", "VERBAL"],
  AT: ["CONFLICTO_AUTORIDAD", "FISICA", "VERBAL"],
};
const REP_NEE_CAT = "NEE";   // categoría que muestra campos exclusivos (NEE)
let _repTaxo = null;         // taxonomía del Reporte abierto (para montar la cascada)
/* Semáforo oficial (5 niveles). El backend devuelve el catálogo; esto es el respaldo. */
const REP_CAPS = [
  ["informativo", "Informativo"], ["leve", "Leve"], ["moderado", "Moderado"],
  ["urgente", "Urgente"], ["prioritario", "Prioritario"],
];

function repContador(clave, texto) {
  return `<div class="rep-count"><span class="rep-count__k">${esc(texto)}</span>
    <div class="rep-count__c">
      <input class="rep-count__v" id="${clave}" type="number" min="0" value="0" inputmode="numeric" aria-label="${esc(texto)}" />
      <span class="rep-count__btns"><button type="button" data-step="1" tabindex="-1">▲</button><button type="button" data-step="-1" tabindex="-1">▼</button></span>
    </div></div>`;
}

function repRadios(id, opciones, activo) {
  return `<div class="rep-radio" id="${id}">${opciones.map(([v, t]) =>
    `<button type="button" data-v="${esc(v)}"${t === activo ? ' class="is-on"' : ""}>${esc(t)}</button>`).join("")}</div>`;
}

async function renderReporte(sid) {
  const s = await safe(() => api.subactividad(sid), null);
  if (!s || !s.id) return `<div class="card"><div class="card__body"><b>No se pudo cargar la sub-actividad.</b></div></div>`;
  _repAct = s.act_id || null;   // para volver a 4.1 de su actividad grande al guardar
  const cats = await safe(() => api.catalogos(), { categorias: [], subcategorias: [], semaforo: [] });
  const o = (v, t) => `<option value="${esc(v)}">${esc(t)}</option>`;
  /* Taxonomía N:M: de la API si viene; si no, respaldo local. */
  const tx = (cats && cats.taxonomia) || {};
  const nats = (tx.naturalezas && tx.naturalezas.length)
    ? tx.naturalezas : REP_NAT.map(([codigo, etiqueta]) => ({ codigo, etiqueta }));
  const subNat = (tx.sub_nat && Object.keys(tx.sub_nat).length) ? tx.sub_nat : REP_SUB_NAT;
  const catSub = (tx.cat_sub && Object.keys(tx.cat_sub).length) ? tx.cat_sub : REP_CAT_SUB;
  const catLabel = Object.fromEntries((cats.categorias || []).map(x => [x.codigo, x.codigo + " · " + x.etiqueta]));
  const subLabel = Object.fromEntries((cats.subcategorias || []).map(x => [x.codigo, x.etiqueta]));
  _repTaxo = { nats, subNat, catSub, catLabel, subLabel, neeCat: (tx.campos_especiales || REP_NEE_CAT) };
  const optNat = nats.map(x => o(x.codigo, x.etiqueta)).join("");
  const capsHtml = REP_CAPS.map(([c, t]) =>
    `<button type="button" class="rep-cap" data-sem="${esc(c)}">${esc(t)}</button>`).join("");

  const ctx = `
    <div class="rep-ctx">
      <div>Actividad: <b>${esc(s.actividad || "—")}</b></div>
      <div>${esc(s.lugar || "—")}</div>
      <div>Fecha programada: ${esc(s.fecha || "—")}</div>
      <div>Responsable: ${esc(s.resp || "—")}</div>
    </div>`;

  if (s.estado === "Ejecutado") {
    return ctx + `<div class="card" style="margin-top:var(--sp-3)"><div class="card__body">
      <div class="pills">${pill("Ejecutado · solo lectura", "--sub-ejecutado")}</div>
      <p style="margin-top:8px;color:var(--text-2)">Esta sub-actividad ya fue reportada. El detalle completo está en Reportes.</p>
    </div></div>`;
  }

  const caso = `
    <div id="rep-caso" class="rep-caso" hidden>
      <div class="rep-caso__head">
        <button class="rep-circle" id="caso-atras" type="button" aria-label="Volver al detalle">◂</button>
        <div class="rep-headtxt"><b>Reporte de incidencia / alerta</b><span>${esc(s.actividad || "")} - ${esc(s.mes || "")} ${esc(String(s.anio || ""))}</span></div>
      </div>
      <div class="rep-caso__ctx">Actividad: <b>${esc(s.actividad || "—")}</b><br>${esc(s.lugar || "—")}</div>
      <div class="rep-tabs">
        <button type="button" class="rep-tab is-on" data-caso="incidencia">Incidencia</button>
        <button type="button" class="rep-tab" data-caso="alerta">Alerta</button>
      </div>
      <div class="rep-form">
        <label class="rep-lbl" id="r-nat-lbl" for="r-nat">Tipo de incidencia</label>
        <select id="r-nat" class="rep-sel"><option value="">Selecciona tipo</option>${optNat}</select>
        <label class="rep-lbl" for="r-cat">Categoría</label>
        <select id="r-cat" class="rep-sel" disabled><option value="">Elige primero el tipo</option></select>
        <label class="rep-lbl" for="r-sub">Subcategoría</label>
        <select id="r-sub" class="rep-sel" disabled><option value="">Elige la categoría</option></select>
        <label class="rep-lbl">Nivel semáforo</label>
        <div class="rep-caps" id="r-caps">${capsHtml}</div>
      </div>
      <div class="rep-box rep-box--gen" id="r-box-gen">
        <div class="rep-box__t">Descripción del caso</div>
        <div class="rep-lbl">¿Requiere derivación / atención inmediata?</div>
        ${repRadios("r-deriv", [["1", "Sí"], ["0", "No"]], "No")}
        <label class="rep-lbl" for="r-desc-gen">Describe lo ocurrido y las acciones tomadas</label>
        <textarea id="r-desc-gen" class="rep-ta" rows="3" placeholder="Describe lo ocurrido, involucrados y acciones tomadas"></textarea>
      </div>
      <div class="rep-box rep-box--nee" id="r-box-nee" hidden>
        <div class="rep-box__t">Campos NEE</div>
        <div class="rep-lbl">Diagnóstico previo</div>
        ${repRadios("r-diag", [["No", "No"], ["Si", "Sí"], ["En proceso", "En proceso"], ["Desconoce", "Desconoce"]], "En proceso")}
        <label class="rep-lbl" for="r-infonee">Información adicional (NEE)</label>
        <textarea id="r-infonee" class="rep-ta" rows="2" placeholder="Antecedentes, apoyos, seguimiento..."></textarea>
        <label class="rep-lbl" for="r-desc-nee">Describe lo ocurrido y las acciones tomadas</label>
        <textarea id="r-desc-nee" class="rep-ta" rows="3" placeholder="Describe la situación NEE y las acciones tomadas"></textarea>
      </div>
    </div>`;

  return ctx + `
    <div class="rep-field">
      <label class="rep-lbl" for="r-desc">Descripción de la actividad:</label>
      <textarea id="r-desc" class="rep-ta" rows="3" placeholder="Describir puntos importantes de la actividad realizada"></textarea>
    </div>
    <div class="rep-field">
      <label class="rep-lbl">Participantes:</label>
      <div class="rep-counters">
        ${repContador("r-doc", "Docentes")}${repContador("r-fam", "Familias")}
        ${repContador("r-est", "Estudiantes")}${repContador("r-otros", "Otros")}
      </div>
      <div class="rep-otros" id="r-otros-wrap">
        <label class="rep-lbl" for="r-otros-det">Detalle de “Otros” participantes:</label>
        <input class="rep-inp" id="r-otros-det" type="text" maxlength="200" autocomplete="off"
               placeholder="¿Quiénes otros participaron? (ej. madres/padres, autoridades, aliados…)" />
      </div>
    </div>
    <div class="rep-field">
      <label class="rep-lbl" for="r-logro">Logro del espacio:</label>
      <textarea id="r-logro" class="rep-ta" rows="3" placeholder="Describir puntos importantes de la actividad realizada"></textarea>
    </div>
    <div class="rep-switch">
      <span>¿Hubo incidencia/alerta en esta actividad?</span>
      <label class="rep-sw"><input type="checkbox" id="r-inc" /><span class="rep-sw__ui"></span></label>
    </div>
    ${caso}`;
}

const reportes = {
  title: "Reportes",
  /* La cabecera de 4.2 es morada (spec 17-sep). */
  accent(args) { return arg(args) ? "#6B2D8B" : null; },
  /* Cabecera propia de 4.2 (título + subtítulo + atrás + guardar); en la lista, título normal. */
  async topbar(args) {
    const sid = arg(args);
    if (!sid) return `<h1 class="topbar__title">Reportes</h1>`;
    const s = await safe(() => api.subactividad(sid), null);
    const ok = !!(s && s.id);
    const titulo = ok ? `${esc(s.especifico || "Actividad")} - ${esc(s.mes || "")} ${esc(String(s.anio || ""))}` : "Reporte";
    const sub = ok ? `${esc(s.ugt || "")} - ${esc(s.compNom || s.comp || "")}` : "";
    const guardar = (!ok || s.estado !== "Ejecutado")
      ? `<button class="rep-circle rep-circle--save" id="r-guardar-top" type="button" aria-label="Guardar y enviar">💾➔</button>` : "";
    return `<button class="rep-circle" id="atras" type="button" aria-label="Volver">◂</button>
      <div class="rep-headtxt"><b>${titulo}</b><span>${sub}</span></div>${guardar}`;
  },
  async render(args) {
    const sid = arg(args);
    if (sid) return renderReporte(sid);
    const list = await safe(() => api.actividades({}), DEMO.actividades);
    return `
      <div class="fbar"><button class="field" type="button"><span class="field__k">Actividad grande</span><span class="field__v">Todas ▾</span></button>
      <button class="field" type="button"><span class="field__k">Estado</span><span class="field__v">Todos ▾</span></button></div>
      <div style="margin-top:var(--sp-3)"></div>
      ${list.map(a => { const total = (a.subs||[]).length; const rep = (a.subs||[]).filter(s => s.e === "Ejecutado").length; const pc = total?Math.round(rep/total*100):0;
        return `<div class="card"><div class="card__body">
          <b>${esc(a.nombre)}</b>
          <div class="pills" style="margin:6px 0">${pill(a.ugt, UGT[a.ugt]||"--teal")} ${pill(a.estado, EST_GRANDE[a.estado]||"--muted")}</div>
          <div style="height:8px;background:var(--surface-3);border-radius:6px;overflow:hidden"><div style="width:${pc}%;height:100%;background:var(--teal)"></div></div>
          <div style="color:var(--muted);font-size:var(--fs-xs);margin-top:4px">Reportadas ${rep}/${total} · ${pc}%</div>
          <div class="grid grid--3" style="margin-top:var(--sp-3)">
            <a class="btn" href="#/actividades/${a.id}">Registrar</a>
            <a class="btn" href="#/actividades/${a.id}">Editar</a>
            <button class="btn btn--ghost" type="button">Reprogramar</button>
          </div>
        </div></div>`; }).join("")}
      <button class="btn btn--primary" style="width:100%;margin-top:var(--sp-3)" type="button" id="pdf">Generar reporte consolidado (PDF)</button>`;
  },
  mount(el) {
    el.querySelector("#pdf")?.addEventListener("click", () => window.__ui.toast("Se generará el PDF consolidado (endpoint pendiente)."));

    /* --- 4.2 Reporte ------------------------------------------------------ */
    /* El botón "atrás" vive en la cabecera (.view-head), fuera de `el` → document. */
    document.getElementById("atras")?.addEventListener("click", () => {
      location.hash = _repAct ? "#/actividades/" + _repAct : "#/actividades";
    });

    const caso = el.querySelector("#rep-caso");
    const swInc = el.querySelector("#r-inc");
    swInc?.addEventListener("change", e => {
      if (caso) caso.hidden = !e.target.checked;
      if (e.target.checked) setTimeout(() => caso?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
    });
    el.querySelector("#caso-atras")?.addEventListener("click", () => {
      if (caso) caso.hidden = true;
      if (swInc) swInc.checked = false;
    });

    /* 4.2: cascada Naturaleza → Categoría → Subcategoría (N:M) + campos NEE por categoría. */
    const caps = el.querySelectorAll("#r-caps .rep-cap");
    const marcarCap = code => caps.forEach(b => b.classList.toggle("is-on", b.dataset.sem === code));
    const T = _repTaxo || { nats: REP_NAT.map(([codigo, etiqueta]) => ({ codigo, etiqueta })),
                            subNat: REP_SUB_NAT, catSub: REP_CAT_SUB, catLabel: {}, subLabel: {}, neeCat: REP_NEE_CAT };
    const $nat = el.querySelector("#r-nat"), $cat = el.querySelector("#r-cat"), $sub = el.querySelector("#r-sub");
    const opt = (v, t) => `<option value="${esc(v)}">${esc(t)}</option>`;
    const natVal = () => ($nat?.value || "");
    const catsDeNat = nat => Object.keys(T.catSub).filter(c => (T.catSub[c] || []).some(s => T.subNat[s] === nat));
    const subsDeNatCat = (nat, cat) => (T.catSub[cat] || []).filter(s => !nat || T.subNat[s] === nat);

    const llenaCat = () => {
      const nat = natVal();
      const lista = nat ? catsDeNat(nat) : Object.keys(T.catSub);
      $cat.innerHTML = `<option value="">${nat ? "Selecciona categoría" : "Elige primero el tipo"}</option>`
        + lista.map(c => opt(c, T.catLabel[c] || c)).join("");
      $cat.disabled = !nat;
    };
    const llenaSub = () => {
      const nat = natVal(), cat = ($cat?.value || "");
      const lista = cat ? subsDeNatCat(nat, cat)
                        : (nat ? Object.keys(T.subNat).filter(s => T.subNat[s] === nat) : []);
      $sub.innerHTML = `<option value="">${cat ? "Selecciona subcategoría" : "Elige la categoría"}</option>`
        + lista.map(s => opt(s, T.subLabel[s] || s)).join("");
      $sub.disabled = !cat;
    };

    /* Campos exclusivos (NEE): solo si la categoría elegida es NEE; el resto usa campos genéricos. */
    const syncBoxes = () => {
      const esNee = ($cat?.value || "") === (T.neeCat || REP_NEE_CAT);
      const bNee = el.querySelector("#r-box-nee"), bGen = el.querySelector("#r-box-gen");
      if (bNee) bNee.hidden = !esNee;
      if (bGen) bGen.hidden = esNee;
    };

    /* Semáforo sugerido: base Alerta=Leve / Incidencia=Urgente; +1 si la categoría es PB/BP/IE. */
    const sugerirSem = () => {
      const tipo = el.querySelector(".rep-tab.is-on")?.dataset.caso || "incidencia";
      const orden = REP_CAPS.map(([c]) => c);
      let i = tipo === "alerta" ? orden.indexOf("leve") : orden.indexOf("urgente");
      if (["PB", "BP", "IE"].includes($cat?.value || "")) i = Math.min(i + 1, orden.length - 1);
      marcarCap(orden[Math.max(i, 0)]);
    };

    const setCaso = tipo => {
      el.querySelectorAll(".rep-tab").forEach(b => b.classList.toggle("is-on", b.dataset.caso === tipo));
      const lbl = el.querySelector("#r-nat-lbl");
      if (lbl) lbl.textContent = tipo === "alerta" ? "Tipo de alerta" : "Tipo de incidencia";
      sugerirSem();
    };

    /* Poblado inicial + eventos de cascada. */
    if ($nat) {
      $nat.innerHTML = `<option value="">Selecciona tipo</option>` + T.nats.map(x => opt(x.codigo, x.etiqueta)).join("");
      llenaCat(); llenaSub(); syncBoxes();
      $nat.addEventListener("change", () => { llenaCat(); llenaSub(); syncBoxes(); sugerirSem(); });
      $cat.addEventListener("change", () => { llenaSub(); syncBoxes(); sugerirSem(); });
      $sub.addEventListener("change", syncBoxes);
    }
    el.querySelectorAll(".rep-tab").forEach(b => b.addEventListener("click", () => setCaso(b.dataset.caso)));
    if (caso) setCaso("incidencia");

    /* Nivel semáforo: clic manual manda (la cascada solo sugiere). */
    caps.forEach(b => b.addEventListener("click", () => marcarCap(b.dataset.sem)));

    /* Grupos Sí/No y Diagnóstico previo: selección única. */
    ["#r-diag", "#r-deriv"].forEach(sel => {
      const g = el.querySelector(sel);
      if (!g) return;
      g.querySelectorAll("button").forEach(b => b.addEventListener("click", () =>
        g.querySelectorAll("button").forEach(x => x.classList.toggle("is-on", x === b))));
    });

    /* Contadores de participantes (▲ / ▼). */
    el.querySelectorAll(".rep-count").forEach(c => {
      const inp = c.querySelector(".rep-count__v");
      if (!inp) return;
      c.querySelectorAll("[data-step]").forEach(b => b.addEventListener("click", () => {
        inp.value = String(Math.max(0, (Number(inp.value) || 0) + Number(b.dataset.step)));
        inp.dispatchEvent(new Event("input", { bubbles: true }));
      }));
    });

    /* (El detalle de “Otros” queda siempre visible, junto a los contadores.) */

    /* Guardar y enviar (icono de la cabecera). */
    const btn = document.getElementById("r-guardar-top");
    btn?.addEventListener("click", async () => {
      if (btn.disabled) return;
      const v = q => (el.querySelector(q)?.value || "").trim();
      const pick = (q, attr) => {
        const b = el.querySelector(q)?.querySelector(".is-on");
        return b ? (attr ? b.dataset.v : b.textContent) : null;
      };
      const tipo = el.querySelector(".rep-tab.is-on")?.dataset.caso || "incidencia";
      const incidencia = !!swInc?.checked;
      const esNee = (v("#r-cat") || "") === ((_repTaxo && _repTaxo.neeCat) || REP_NEE_CAT);
      const payload = {
        subactividad_id: Number(hashArgs()[1]),
        descripcion: v("#r-desc"), logro: v("#r-logro"),
        docentes: Number(v("#r-doc")) || 0, familias: Number(v("#r-fam")) || 0,
        estudiantes: Number(v("#r-est")) || 0, otros: Number(v("#r-otros")) || 0,
        otros_detalle: v("#r-otros-det") || null,
        incidencia,
        tipo,
        naturaleza: incidencia ? (v("#r-nat") || null) : null,
        categoria: incidencia ? (v("#r-cat") || null) : null,
        subcategoria: incidencia ? (v("#r-sub") || null) : null,
        semaforo: incidencia ? (pick("#r-caps", true) || null) : null,
        diagnostico_previo: incidencia && esNee ? (pick("#r-diag", true) || null) : null,
        informacion_nee: incidencia && esNee ? (v("#r-infonee") || null) : null,
        derivacion: incidencia && !esNee ? (pick("#r-deriv", true) === "1") : null,
        descripcion_caso: (incidencia ? (esNee ? v("#r-desc-nee") : v("#r-desc-gen")) : "") || null,
        observacion: v("#r-desc"),
      };
      const prev = btn.textContent;
      btn.disabled = true; btn.textContent = "…";
      try {
        const r = await api.reportar(payload);
        if (r && r.ok === false) throw new Error(r.detail || "No se pudo registrar");
        window.__ui.toast("Reporte registrado · la sub-actividad quedó Ejecutada.");
        location.hash = _repAct ? "#/actividades/" + _repAct : "#/actividades";
      } catch (ex) {
        btn.disabled = false; btn.textContent = prev;
        window.__ui.toast("Error: " + (ex.message || "no se pudo registrar"));
      }
    });
  },
};

/* ============================ INCIDENCIAS (6) ============================ */
const incidencias = {
  title: "Incidencias y alertas",
  async render() {
    const casos = await safe(() => api.casos({}), DEMO.casos);
    const k = { abiertas: casos.filter(c => c.estado === "Abierta").length,
                seguim: casos.filter(c => c.estado === "En seguimiento").length,
                cerradas: casos.filter(c => c.estado === "Cerrada").length };
    return `
      <div class="pills"><button class="field" type="button"><span class="field__v">Todas ▾</span></button>
      <button class="field" type="button"><span class="field__v">Abiertas ▾</span></button></div>
      <div class="grid grid--3" style="margin-top:var(--sp-3)">
        <div class="kpi"><div class="kpi__n">${k.abiertas}</div><div class="kpi__l">Abiertas</div></div>
        <div class="kpi"><div class="kpi__n">${k.seguim}</div><div class="kpi__l">En seguimiento</div></div>
        <div class="kpi"><div class="kpi__n">${k.cerradas}</div><div class="kpi__l">Resueltas</div></div>
      </div>
      <button class="btn btn--primary" style="width:100%;margin:var(--sp-3) 0" id="nuevo" type="button">+ Registrar caso</button>
      ${casos.map(c => `<div class="card"><div class="card__body">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <b>${esc(c.tipo)} · ${esc(c.cat)}</b> ${pill(c.sem, "--sem-" + c.sem.toLowerCase())}
        </div>
        <div style="color:var(--text-2);font-size:var(--fs-sm)">${esc(c.sub)}${c.diag ? " · Diagnóstico: "+esc(c.diag) : ""}</div>
        <div class="pills" style="margin-top:6px">${pill(c.estado, c.estado === "Cerrada" ? "--sub-ejecutado" : c.estado === "Abierta" ? "--sub-vencida" : "--sem-moderado")} <span style="color:var(--muted);font-size:12px">Origen: ${esc(c.origen)}</span></div>
      </div></div>`).join("")}`;
  },
  mount(el) { el.querySelector("#nuevo")?.addEventListener("click", () => window.__ui.modal({ title:"Registrar caso", body:"Formulario de incidencia/alerta (Sección 6) — en construcción.", actions:[{label:"Cerrar"}] })); },
};

/* ============================ CALENDARIO (7) ============================ */
const calendario = {
  title: "Calendario",
  async render() {
    const ev = await safe(() => api.calendario({}), []);
    const hoy = new Date(); const y = hoy.getFullYear(), m = hoy.getMonth();
    const first = new Date(y, m, 1).getDay(); const days = new Date(y, m + 1, 0).getDate();
    const cells = []; for (let i = 0; i < (first === 0 ? 6 : first - 1); i++) cells.push("");
    for (let d = 1; d <= days; d++) cells.push(d);
    const marcados = [3, 9, 12, 17, 18, 19, 24];
    return `
      <div class="split">
        <div class="card"><div class="card__head">${hoy.toLocaleDateString("es-PE",{month:"long",year:"numeric"}).toUpperCase()}</div>
          <div class="card__body" style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;text-align:center">
            ${["L","M","M","J","V","S","D"].map(d => `<b style="color:var(--muted);font-size:12px">${d}</b>`).join("")}
            ${cells.map(c => c ? `<div style="min-height:36px;display:flex;align-items:center;justify-content:center;border-radius:8px;${c===hoy.getDate()?"background:var(--accent);color:#fff;":marcados.includes(c)?"background:var(--surface-3);":""}">${c}</div>` : "<div></div>").join("")}
          </div></div>
        <div class="card"><div class="card__head">Hoy</div><div class="card__body">
          ${(ev.length ? ev : [{ nombre: "Sin actividades para hoy", fecha: "" }]).map(a => `<div style="padding:8px 0;border-bottom:1px solid var(--line)"><b>${esc(a.nombre)}</b><div style="color:var(--muted);font-size:12px">${esc(a.fecha||"")}</div></div>`).join("")}
        </div></div>
      </div>
      <div class="fbar" style="margin-top:var(--sp-3)">
        ${["Territorio","Integrantes","CR","Tipo"].map(f => `<button class="field" type="button"><span class="field__k">${f}</span><span class="field__v">Todos ▾</span></button>`).join("")}
      </div>`;
  },
};

/* ============================ HISTORIAL (2) ============================ */
const historial = {
  title: "Mi historial",
  async render() {
    const evs = await safe(() => api.historial({}), DEMO.eventos);
    return `<div class="card"><div class="card__head">Actividad reciente</div><div class="card__body">
      ${evs.map(e => `<div style="display:flex;gap:var(--sp-3);padding:8px 0;border-bottom:1px solid var(--line)">
        <div style="min-width:120px;color:var(--muted);font-size:12px">${esc(e.f)}</div>
        <div><b>${esc(e.tipo)}</b> · ${esc(e.txt)}</div></div>`).join("")}
    </div></div>`;
  },
};

export const views = { portada, actividades, indicadores, reportes, incidencias, calendario, historial };

/* ============================ NUEVA ACTIVIDAD (4.3) ============================ */
/* Formulario "Nueva actividad" (sub-actividad de una actividad grande).
   Catálogos del backend: GET /actividad43/{aid}/catalogos →
     { grande:{id,nombre,ugt,comp,compNom}, tipos:[{id,codigo,nombre}],
       equipo:[{id,nombre,rol}], provincias:[str] }.
   Cascada de ubicación: GET /actividad43/ubicacion?provincia&distrito&cp →
     { distritos:[str], centros:[{id,nombre}], ie:[{cod_inst,nombre,niveles:[{id,cod_mod,niv_mod,nivel}]}] }. */
const SVG_SAVE = `<svg viewBox="0 0 20 20" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M3 5c0-1.1.9-2 2-2h8.38a2 2 0 0 1 1.41.59l1.62 1.62A2 2 0 0 1 17 6.62V9.6c-.32-.16-.65-.3-1-.4V6.63a1 1 0 0 0-.3-.7L14.1 4.28a1 1 0 0 0-.71-.29H13v2.5c0 .83-.67 1.5-1.5 1.5h-4A1.5 1.5 0 0 1 6 6.5V4H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1v-4.5c0-.83.67-1.5 1.5-1.5h4.84c-.4.28-.77.62-1.08 1H6.5a.5.5 0 0 0-.5.5V16h3.2c.1.35.24.68.4 1H5a2 2 0 0 1-2-2V5Zm4-1v2.5c0 .28.22.5.5.5h4a.5.5 0 0 0 .5-.5V4H7Zm12 10.5a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Zm-2.15.35a.5.5 0 0 0 .15-.35.5.5 0 0 0-.15-.35l-2-2a.5.5 0 0 0-.7.7L15.29 14H12.5a.5.5 0 0 0 0 1h2.8l-1.15 1.15a.5.5 0 0 0 .7.7l2-2Z"/></svg>`;
const HORAS43 = (() => { const a = []; for (let h = 0; h < 24; h++) for (const m of ["00", "30"]) a.push(`${String(h).padStart(2, "0")}:${m}`); return a; })();
const DIAS43 = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const SELL43 = `<option value="">Seleccione…</option>`;
const o43 = (v, t) => `<option value="${esc(v)}">${esc(t)}</option>`;
function diaEs43(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T12:00:00");
  return isNaN(d.getTime()) ? "" : DIAS43[d.getDay()];
}
/* La cabecera (topbar) y el cuerpo se piden en paralelo: memoiza la promesa
   de catálogos para hacer UNA sola consulta por navegación a 4.3. */
function load43(aid) {
  const key = String(aid ?? "");
  if (window.__a43p && window.__a43p.key === key) return window.__a43p.p;
  const p = safe(() => api.actividad43(key), null);
  window.__a43p = { key, p };
  return p;
}

/* Cuerpo del formulario 4.3. */
async function renderNuevaActividad(aid) {
  const cat = await load43(aid);
  window.__a43 = { aid: String(aid ?? ""), cat };
  const g = (cat && cat.grande) || {};
  const tipos = (cat && cat.tipos) || [];
  const equipo = (cat && cat.equipo) || [];
  const provincias = (cat && cat.provincias) || [];
  const hoy = new Date().toISOString().slice(0, 10);
  return `
  <div class="f43-wrap">
    <div class="f43-body">
      <label class="f43-lbl" for="a43-nombre">Nombre de la actividad</label>
      <input class="f43-input" id="a43-nombre" type="text" placeholder="Escribe el nombre de la actividad…" autocomplete="off" />

      <label class="f43-lbl" for="a43-tipo">Tipo de actividad</label>
      <select class="f43-sel" id="a43-tipo">${SELL43}${tipos.map(t => o43(t.id, t.nombre)).join("")}</select>

      <label class="f43-lbl" for="a43-fecha">Fecha programada</label>
      <div class="f43-fecha">
        <span class="f43-dia" id="a43-dia"></span>
        <input class="f43-input" id="a43-fecha" type="date" value="${esc(hoy)}" />
      </div>

      <div class="f43-horas">
        <label class="f43-col"><span class="f43-lbl">Hora inicio</span>
          <select class="f43-sel" id="a43-hi">${HORAS43.map(h => o43(h, h)).join("")}</select></label>
        <label class="f43-col"><span class="f43-lbl">Hora fin</span>
          <select class="f43-sel" id="a43-hf">${HORAS43.map(h => o43(h, h)).join("")}</select></label>
      </div>

      <label class="f43-lbl" for="a43-prov">Provincia</label>
      <select class="f43-sel" id="a43-prov">${SELL43}${provincias.map(p => o43(p, p)).join("")}</select>

      <label class="f43-lbl" for="a43-dist">Distrito</label>
      <select class="f43-sel" id="a43-dist" disabled>${SELL43}</select>

      <label class="f43-lbl" for="a43-cp">Centro poblado</label>
      <select class="f43-sel" id="a43-cp" disabled>${SELL43}</select>

      <label class="f43-lbl" for="a43-ie">Institución educativa (opcional)</label>
      <select class="f43-sel" id="a43-ie" disabled>${SELL43}</select>

      <label class="f43-lbl" for="a43-niv">Nivel modular (opcional)</label>
      <select class="f43-sel" id="a43-niv" disabled>${SELL43}</select>

      <label class="f43-lbl" for="a43-lugar">Lugar específico</label>
      <input class="f43-input" id="a43-lugar" type="text" autocomplete="off" />

      <label class="f43-lbl" for="a43-resp">Responsable</label>
      <select class="f43-sel" id="a43-resp">${SELL43}${equipo.map(u => o43(u.id, u.nombre)).join("")}</select>

      <span class="f43-lbl">Participantes</span>
      <div class="f43-parts" id="a43-parts">${equipo.map(u => `
        <label class="f43-chk"><input type="checkbox" value="${esc(u.id)}" data-name="${esc(u.nombre)}" /><span>${esc(u.nombre)}</span></label>`).join("") || `<span class="f43-vacio">Sin integrantes en el equipo.</span>`}</div>
      <label class="f43-switch"><span>Todo el equipo</span><input type="checkbox" id="a43-todo" /></label>
      <div class="f43-names" id="a43-names">Sin participantes seleccionados</div>

      <button class="f43-save" id="a43-save" type="button">
        <span class="f43-save__txt">Guardar y enviar</span>
        <span class="f43-save__ico">${SVG_SAVE}</span>
      </button>
      <button class="f43-back" id="a43-back" type="button">${SVG_BACK}<span>Volver a la programación</span></button>
    </div>
  </div>`;
}

/* Cabecera 4.3: fondo gris, título + actividad grande + "UGT X - Componente". */
async function topbarNueva(aid) {
  const cat = await load43(aid);
  const g = (cat && cat.grande) || {};
  return `<div class="f43-head">
    <button class="f43-head__back" id="a43-head-back" type="button" aria-label="Volver">${SVG_BACK}</button>
    <div class="f43-head__txt">
      <b class="f43-head__t">Nueva actividad</b>
      <span class="f43-head__s">${esc(g.nombre || "Actividad")}</span>
      <span class="f43-head__u">UGT ${esc(g.ugt || "—")} - ${esc(g.comp || "—")}</span>
    </div>
  </div>`;
}

/* Cableado del formulario 4.3: cascada de ubicación, día, participantes y guardado. */
function mountNueva(el) {
  const q = s => el.querySelector(s);
  const val = s => (q(s)?.value || "");
  const aid = hashArgs()[1] || (window.__a43 && window.__a43.aid) || "";

  // Cabecera gris neutra (spec 4.3): el <header> lo genera app.js; aquí solo se colorea.
  const head = document.querySelector(".view-head");
  if (head) head.style.background = "#A9AFB3";

  // Caché de ubicación (dato de referencia): evita repetir consultas al ir y volver en la cascada.
  const ucache = (window.__a43u = window.__a43u || new Map());
  const ubi = (f) => {
    const k = `${f.provincia || ""}|${f.distrito || ""}|${f.cp || ""}`;
    if (!ucache.has(k)) {
      ucache.set(k, safe(() => api.ubicacion43(f), null).then(d => { if (!d) ucache.delete(k); return d; }));
    }
    return ucache.get(k);
  };

  // --- Fecha → día de la semana (español) ---
  const pintaDia = () => { const s = q("#a43-dia"); if (s) s.textContent = diaEs43(val("#a43-fecha")); };
  q("#a43-fecha")?.addEventListener("change", pintaDia);
  q("#a43-fecha")?.addEventListener("input", pintaDia);
  pintaDia();
  // Horas por defecto (08:00–10:00) para no guardar 00:00 sin querer.
  if (q("#a43-hi")) q("#a43-hi").value = "08:00";
  if (q("#a43-hf")) q("#a43-hf").value = "10:00";

  // --- Helpers de selects ---
  const llenar = (sel, items, ph) => {
    const n = q(sel); if (!n) return;
    n.innerHTML = `<option value="">${esc(ph)}</option>` + items.map(o => o43(o.v, o.l)).join("");
    n.value = "";
  };
  const vaciar = (sel, ph = "Seleccione…") => { const n = q(sel); if (n) { n.innerHTML = `<option value="">${esc(ph)}</option>`; n.value = ""; } };
  const onoff = (sel, on) => { const n = q(sel); if (n) n.disabled = !on; };

  // Estado de la cascada del catálogo cargado.
  const st = (window.__a43 = window.__a43 || {});
  st.centros = st.centros || []; st.ie = st.ie || [];

  // Provincia → Distrito (y limpia el resto)
  q("#a43-prov")?.addEventListener("change", async () => {
    const prov = val("#a43-prov");
    vaciar("#a43-dist", "Cargando…"); onoff("#a43-dist", false);
    const d = prov ? await ubi({ provincia: prov }) : null;
    const distritos = ((d && d.distritos) || []).map(x => ({ v: x, l: x }));
    llenar("#a43-dist", distritos, distritos.length ? "Seleccione…" : "Sin distritos");
    st.centros = []; st.ie = [];
    vaciar("#a43-cp"); vaciar("#a43-ie"); vaciar("#a43-niv");
    onoff("#a43-dist", distritos.length > 0);
    onoff("#a43-cp", false); onoff("#a43-ie", false); onoff("#a43-niv", false);
  });

  // Distrito → Centros poblados
  q("#a43-dist")?.addEventListener("change", async () => {
    const prov = val("#a43-prov"), dist = val("#a43-dist");
    vaciar("#a43-cp", "Cargando…"); onoff("#a43-cp", false);
    const d = (prov && dist) ? await ubi({ provincia: prov, distrito: dist }) : null;
    st.centros = (d && d.centros) || [];
    llenar("#a43-cp", st.centros.map(c => ({ v: c.id, l: c.nombre })), st.centros.length ? "Seleccione…" : "Sin centros poblados");
    vaciar("#a43-ie"); vaciar("#a43-niv");
    onoff("#a43-cp", st.centros.length > 0);
    onoff("#a43-ie", false); onoff("#a43-niv", false);
  });

  // Centro poblado → IE (el filtro va por el TEXTO del centro, como espera la API)
  q("#a43-cp")?.addEventListener("change", async () => {
    const prov = val("#a43-prov"), dist = val("#a43-dist");
    const cpId = val("#a43-cp");
    const cpTxt = (st.centros.find(c => String(c.id) === String(cpId)) || {}).nombre || "";
    vaciar("#a43-ie", "Cargando…"); onoff("#a43-ie", false);
    const d = (prov && cpTxt) ? await ubi({ provincia: prov, distrito: dist, cp: cpTxt }) : null;
    st.ie = (d && d.ie) || [];
    llenar("#a43-ie", st.ie.map(x => ({ v: x.cod_inst, l: `${x.cod_inst} - ${x.nombre}` })), st.ie.length ? "Seleccione…" : "Sin IIEE");
    vaciar("#a43-niv");
    onoff("#a43-ie", st.ie.length > 0);
    onoff("#a43-niv", false);
  });

  // IE → Nivel modular (opciones = filas core_ie del grupo; su id es el ie_id del payload)
  q("#a43-ie")?.addEventListener("change", () => {
    const cod = val("#a43-ie");
    const nodo = st.ie.find(x => String(x.cod_inst) === String(cod));
    const nivs = (nodo && nodo.niveles) || [];
    const n = q("#a43-niv");
    if (n) n.innerHTML = `<option value="">Seleccione…</option>` + nivs.map(v =>
      `<option value="${esc(v.id)}" data-niv="${esc(v.niv_mod || "")}" data-nivel="${esc(v.nivel || "")}">${esc(v.nivel || v.niv_mod || "Nivel")}${v.niv_mod ? " (" + esc(v.niv_mod) + ")" : ""}</option>`).join("");
    if (n && nivs.length === 1) n.value = String(nivs[0].id);   // un único nivel → se elige solo
    onoff("#a43-niv", nivs.length > 0);
  });

  // --- Participantes ---
  const chks = () => Array.from(el.querySelectorAll("#a43-parts input[type=checkbox]"));
  const syncNames = () => {
    const lab = q("#a43-names"); if (!lab) return;
    if (q("#a43-todo")?.checked) { lab.textContent = "Todo el equipo"; return; }
    const names = chks().filter(c => c.checked).map(c => c.dataset.name || c.value);
    lab.textContent = names.length ? names.join(", ") : "Sin participantes seleccionados";
  };
  const syncResp = () => {
    const r = String(val("#a43-resp"));
    chks().forEach(c => {
      const esResp = c.value === r;                       // el responsable no puede ser participante
      if (esResp) c.checked = false;
      c.disabled = esResp;
    });
    syncNames();
  };
  q("#a43-resp")?.addEventListener("change", syncResp);
  chks().forEach(c => c.addEventListener("change", syncNames));
  q("#a43-todo")?.addEventListener("change", e => {
    const on = e.target.checked;
    chks().forEach(c => { if (!c.disabled) c.checked = on; });
    syncNames();
  });
  syncResp();

  // --- Volver a 4.1 ---
  const volver = () => { location.hash = "#/actividades/" + aid; };
  q("#a43-back")?.addEventListener("click", volver);
  q("#a43-head-back")?.addEventListener("click", volver);

  // --- Guardar y enviar ---
  q("#a43-save")?.addEventListener("click", async () => {
    const nombre = val("#a43-nombre").trim();
    const tipo = val("#a43-tipo");
    const fecha = val("#a43-fecha");
    if (!nombre) return window.__ui.toast("Escribe el nombre de la actividad.");
    if (!tipo) return window.__ui.toast("Selecciona el tipo de actividad.");
    if (!fecha) return window.__ui.toast("Selecciona la fecha programada.");

    const cpId = val("#a43-cp");
    const cpTxt = (st.centros.find(c => String(c.id) === String(cpId)) || {}).nombre || "";
    const niv = q("#a43-niv");
    const nivOpt = niv ? niv.options[niv.selectedIndex] : null;
    const ieId = (niv && niv.value) ? Number(niv.value) : null;
    const nivel = (nivOpt && nivOpt.dataset && nivOpt.dataset.niv) || "";
    const resp = val("#a43-resp");

    const payload = {
      act_grande_id: Number(aid),
      nombre,
      tipo_id: tipo ? Number(tipo) : null,
      fecha,
      hora_inicio: val("#a43-hi") || "",
      hora_fin: val("#a43-hf") || "",
      provincia: val("#a43-prov"),
      distrito: val("#a43-dist"),
      centro_poblado_id: cpId ? Number(cpId) : null,
      centro_poblado: cpTxt,
      ie_id: ieId,
      nivel,
      lugar: val("#a43-lugar").trim(),
      responsable_id: resp ? Number(resp) : null,
      participantes: chks().filter(c => c.checked).map(c => Number(c.value)).filter(n => !Number.isNaN(n)),
      todo_equipo: !!q("#a43-todo")?.checked,
    };

    const btn = q("#a43-save");
    const txt = btn && btn.querySelector(".f43-save__txt");
    if (btn) btn.disabled = true;
    if (txt) { txt.dataset.txt = txt.textContent; txt.textContent = "Guardando…"; }
    let r = null;
    try { r = await api.crearActividad43(payload); }
    catch (e) { r = { ok: false, detail: (e && e.message) || "Error de red" }; }
    if (btn) btn.disabled = false;
    if (txt) txt.textContent = txt.dataset.txt || "Guardar y enviar";

    if (r && r.ok) {
      window.__ui.toast("Actividad creada y enviada.");
      window.__ui.clearCache?.();          // que la 4.1 no muestre una copia precargada sin la nueva fila
      location.hash = "#/actividades/" + aid;
    } else {
      window.__ui.toast("No se pudo crear: " + ((r && r.detail) || "error desconocido"));
    }
  });
}
