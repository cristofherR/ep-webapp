# Arquitectura — WebApp MEL · Efecto Áncash

## 0. Resumen

Aplicación **web real**, responsive de verdad (un solo código, dos estilos), con backend propio,
persistencia PostgreSQL, autenticación por rol y despliegue. Prioriza **velocidad de consulta** sin
sacrificar una **estructura sólida y ampliable**.

## 1. Stack (decidido)

| Capa | Tecnología | Por qué |
|---|---|---|
| **Frontend** | SPA estándar: **ES Modules nativos + CSS con tokens + router hash + store mínimo**. Sin bundler. | Coincide con el prototipo (cero dependencias), despliegue trivial (estático), iteración rápida y cacheable. Alternativa (Vue/React) posible, pero añade build sin necesidad. |
| **PWA** | `manifest.webmanifest` + `sw.js` | Instalable en el teléfono “como otro aplicativo”. |
| **Backend** | **FastAPI** (Python 3.12) + **SQLAlchemy 2.0 async / asyncpg** | Reutiliza el patrón de `la-app-anterior`; async, tipado, docs automáticas (OpenAPI). |
| **Validación** | **Pydantic v2** | Contratos de entrada/salida explícitos. |
| **BD** | **PostgreSQL** schema **`efectoancash`** (+ lectura cualificada `bd_intranet`, `bd_analitica`) | Ya construido por el builder; aislado y multi-proyecto. |
| **Migraciones** | Builder declarativo (`arquitectura/builder/`) + ledger (`apply.py`) | Aditivo e idempotente; crecer sin romper. |
| **Auth** | Sesión firmada (cookie `HttpOnly`) + **RBAC** rol×alcance | Simple, seguro, sin exponer tokens al JS. |
| **Gráficos** | SVG/CSS nativos (dona, línea, barras) | Sin dependencias externas; rápido. |
| **Deploy** | Estáticos servidos por FastAPI (o Azure Static Web Apps / GitHub Pages para la parte pública) | Un origen, HTTPS. |

> Decisión de fondo: **no reescribir** el prototipo ni el schema; **componer** sobre ellos.

## 2. Capas

```
┌───────────────────────────────────────────────────────────────┐
│ 4 · UI         frontend/  (tokens.css → app.css → vistas)     │
│                router.js · store.js · nav.js · views/*        │
├───────────────────────────────────────────────────────────────┤
│ 3 · API        backend/app  (routers por dominio)             │
│                auth · rbac · validación · paginación          │
├───────────────────────────────────────────────────────────────┤
│ 2 · Servicios  caché TTL · agregados/indicadores · sync Outlook│
├───────────────────────────────────────────────────────────────┤
│ 1 · Datos      PostgreSQL `efectoancash` (+ bd_intranet R/O)│
└───────────────────────────────────────────────────────────────┘
```

**Regla de oro:** la UI **nunca** toca la BD; pasa por la API (delegación, permisos, contrato).

## 3. Doble layout (un código, dos estilos)

- `tokens.css` define colores/tipografía/espaciado/alturas (`--nav-h`, `--sidebar-w`).
- `app.css` define **base móvil** y, en `@media (min-width:1024px)`, el **estilo escritorio**
  (sidebar + rejilla). El atributo `data-layout="mobile|desktop"` en `<html>` permite **forzar
  previsualización** de cualquiera de los dos sin cambiar de dispositivo.
- Breakpoints: `<1024` móvil · `≥1024` escritorio. Alto táctil mínimo **44 px**.

## 4. Navegación

`nav.js` = **datos** (array de 7 ítems: `id`, `label`, `route`, `icon`, `accent`). Renderiza la
barra inferior (móvil) y el sidebar (escritorio). El ítem activo se marca con `--accent` de su
sección y crece 15%.

## 5. Módulos del backend (por dominio)

```
backend/app/
├─ main.py            # app FastAPI, CORS, estáticos, montaje de routers
├─ config.py          # .env (Pydantic Settings)
├─ db.py              # engine async + sesión solo-lectura/cualificada
├─ security.py        # hash, sesión firmada, intentos/bloqueo
├─ deps.py            # dependencias (usuario actual, RBAC, paginación)
└─ routers/
   ├─ health.py       # /api/health
   ├─ auth.py         # /api/auth/{login,logout,me}
   ├─ ui.py           # /api/ui (textos/tema/orden desde ui_*)
   ├─ portada.py      # /api/portada (KPIs mes, próximas 5, comentarios)
   ├─ actividades.py  # POA + sub-actividades (4.x)
   ├─ reportes.py     # registrar/actualizar (Sección 5)
   ├─ incidencias.py  # casos + seguimiento (Sección 6)
   ├─ indicadores.py  # agregados (Sección 3)
   ├─ calendario.py   # rango visible + filtros (Sección 7)
   └─ historial.py    # evento (append-only, Sección 2)
```

## 6. Contrato de datos (resumen)

- `actividad_grande` (POA): `ID_ActividadGrande`, nombre, UGT, Anio, MesProgramado, Estado, Componente.
- `actividad_pequena`: FK a grande, FechaProgramada, HoraInicio, Estado, Distrito, CentroPoblado,
  NombreIE, nivel, especifico, Responsable.
- `reporte`: FK a pequeña, descripción, logro, participantes (Docente/Familias/Estudiantes/Otros), evidencia.
- `caso` (incidencia/alerta): tipo, categoría, subcategoría, NivelSemáforo, DiagnosticoPrevio (NEE),
  origen (actividad | aislado).
- `seguimiento`: FK a caso, 1..N actividades, estado.
- `evento`: auditoría **append-only** que alimenta “Mi historial”.
- `comentario_sugerencia`, `sync_outlook`.
- **Integridad:** un reporte = un registro (idempotente); estado ≠ reporte; toda escritura valida
  **en el servicio**; `bd_intranet` solo lectura (anti-duplicado).

## 7. Rendimiento

- Índices por `(Anio, MesProgramado, UGT, Estado)`; consultas **delegables** y paginadas.
- **Agregados precomputados** / vistas para indicadores (no recalcular en el teléfono).
- **Caché TTL** (segundos configurable) en endpoints de lectura pesada.
- Calendario: paginación **por rango visible** (no traer el año completo).
- Frontend: una hoja de estilos cacheable; sin frameworks; `content-visibility` en listas largas.

## 8. Robustez

- **Tokens** → cambiar un color = una línea.
- **Contrato versionado**: cada cambio de esquema deja fila en `schema_version` + script.
- **Migrations aditivas** (nunca destructivas) + ledger.
- **Feature flag** Outlook (`enabled=false`) → degradación limpia.
- **RBAC en el servicio**, no solo en la UI.
- Backups y `_archivo/` de versiones previas.

## 9. Seguridad

- Sesión firmada en cookie `HttpOnly`/`SameSite=Lax`; CSRF token en escrituras.
- Intentos de login: **5** → bloqueo **15 min** (por usuario+IP).
- Allowlist de correos **hasheada**; sin PII de estudiantes en la API pública.
- Lecturas cualificadas a la intranet por nombre de schema.

## 10. Despliegue

- **App completa:** FastAPI sirve estáticos + API en el VPS (systemd, p. ej. `:8090`), detrás de
  nginx con HTTPS y Basic Auth/clave de equipo si aplica.
- **Parte pública** (instalación/PWA): GitHub Pages o **Azure Static Web Apps** (gratis, HTTPS).
- PWA instalable en Android/iOS desde el navegador.

## 11. Alternativas consideradas

- **Vue 3 / React + Vite**: mejor ergonomía con estado complejo; se descartó por costo de toolchain
  y por coherencia con el prototipo (cero dependencias, despliegue estático). Migrable por vista.
- **HTMX**: simple, pero el calendario y los indicadores exigen estado en cliente.
- **Power Apps**: solución actual; se abandona por delegación limitada, costo y rigidez.
