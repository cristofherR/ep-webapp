# Plan por etapas — WebApp MEL · Efecto Áncash

> Método: **analizar → construir → verificar** por etapa. Cada etapa entrega algo que funciona.
> Regla: el prototipo (`el-prototipo-de-pantallas/`) es la **base de diseño**; el schema
> `efectoancash` es la **base de datos**. Se compone sobre lo hecho, no se rehace.

## ¿Por dónde empezar? (decisión)

**Etapa 1 = shell + layout dual + navegación + tokens + PWA.**
Motivo: todo lo demás (portada, 4.x, 6, 5, 3, 7) **cuelga de ese armazón**. Construirlo primero
evita rehacer y garantiza que cada vista herede el doble estilo y el nav correctos.

En paralelo (Etapa 2) el **backend base + auth + RBAC**, porque la Portada depende del login.

---

## Etapa 0 — Fundamentos  ✅
- Preservar la especificación funcional.
- Visión, arquitectura y plan (`docs/*.md`).
- Repo del proyecto (``).

## Etapa 1 — Shell real (armazón)  ✅
- `tokens.css` (design system: colores UGT/Componente/Estados/Semáforo, tipografía, espaciado).
- `app.css` — **base móvil** + `@media ≥1024px` **escritorio** (sidebar + rejilla).
- `nav.js` (7 secciones, data-driven) → barra inferior / sidebar.
- `router.js` (hash) + `store.js` + `api.js` + 8 vistas placeholder.
- **PWA**: manifest + service worker + toggle “móvil/escritorio” para previsualizar.

## Etapa 2 — Auth + Portada
- Allowlist hasheada + login (5 intentos → 15 min), “Recordarme 30 días”, logout.
- Portada: saludo por hora, KPIs del mes, menú 2×3, próximas 5, comentario/sugerencia.

## Etapa 3 — Sección 4 (Actividades / Programación / Reporte)
- 4: listado POA + filtros + círculos de estado.
- 4.1: sub-actividades + agregar + filtros.
- 4.2: reporte (participantes, logro, **toggle incidencia/alerta**).
- 4.3: crear/editar/reprogramar.

## Etapa 4 — Sección 6 (Incidencias / Alertas)
- Registrar (origen actividad|aislado; Incidencia|Alerta; semáforo; NEE).
- Bandeja → detalle → crear seguimiento (1..N) → cerrar → indicador de resolución.
- Catálogos (categoría→subcategoría) **a confirmar** con Cristofher.

## Etapa 5 — Sección 3 (Indicadores)
- KPIs, % reportabilidad y cancelación; barras por UGT; dona por tipo; línea semanal;
  % por mes; chips ampliados (sin reportar, % con evidencia, alertas abiertas/resueltas).

## Etapa 6 — Sección 5 (Reportes)
- Hub por actividad grande → redirige a 4.2 / 4.3 / reprogramar; reporte consolidado (PDF).

## Etapa 7 — Sección 7 (Calendario)
- Día · Semana · Mes; filtros Territorio/Equipo/CR/Tipo; responsables+participantes (iniciales);
  horizontal (mes 60% / día 40%); capa **Outlook** opt-in.

## Etapa 8 — Historial, pulido y despliegue
- Sección 2 (evento append-only + drill-down).
- Accesibilidad (44 px, `:focus-visible`, contraste), guard de regresión visual.
- Despliegue (VPS + HTTPS; parte pública en Pages/SWA) y PWA instalable.

---

## Definition of Done (por etapa)
1. Funciona en **móvil y escritorio** (toggle de layout verificado).
2. Datos **reales** desde la API (no hardcode) o vacío explícito.
3. Escrituras validadas **en el servicio**; errores con mensajes claros.
4. Sin regresión visual (render/verificación de la vista).
5. Documentado (qué cambió y qué falta).

## Riesgos / dependencias
- **Confirmar** mapeo categoría→subcategoría y definición de “reportada”.
- Conexión a Azure/Postgres (credenciales, IP) — gestión de Cristofher.
- Exposición pública (Funnel/dominio) — fuera del alcance técnico de las etapas 1–8.
