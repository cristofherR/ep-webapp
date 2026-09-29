# Visión — WebApp MEL · Efecto Áncash

> Documento de visión **completa** (el proyecto entero) y **detallada** (qué hace cada pieza).
> Fuente de verdad de requisitos: `la especificación funcional del proyecto` (especificación del equipo).

## 1. Qué es

La **WebApp MEL** es la aplicación de trabajo del equipo del programa **Efecto Áncash**.
Reemplaza la app actual (Power Apps + 8 listas de SharePoint) por una web propia, multi-rol,
que **programa** actividades, **reporta** su cumplimiento, **gestiona** incidencias y alertas,
**mide** indicadores y **visualiza** todo en un calendario de equipo.

**No es un mockup**: backend real contra PostgreSQL (`efectoancash`), autenticación por rol,
persistencia, PWA instalable y despliegue.

### Principios rectores
1. **Móvil primero.** El estilo principal es de teléfono; en PC **se adapta** (estilo secundario).
2. **Rápido.** Consultas indexadas y delegables + agregados precomputados + caché.
3. **Estructura fuerte y ampliable.** "Builder" de datos por capas; crecer sin reescribir.
4. **Data-driven.** Textos, tema, orden de bloques y visibilidad salen de la BD (`ui_*`).
5. **No duplicar la intranet** (`bd_intranet`): solo lectura cualificada.
6. **Privacidad:** datos de estudiantes/familias **nunca** a APIs externas; iniciales en UI.

## 2. Las 3 piezas (y cuál es oficial)

| Pieza | Qué es | Rol |
|---|---|---|
| **Prototipo de pantallas** (`el-prototipo-de-pantallas/`) | 32 pantallas HTML navegables | **Base oficial de diseño** (referencia visual/lógica) |
| **Backend/BD** (`backend_mel/arquitectura/` builder + `la-app-anterior/`) | Schema `efectoancash` (55 tablas), seeds, API de lectura | **Base oficial de datos** |
| **Esta WebApp** (``) | App real = frontend + API de escritura | **Producto final** |

Regla: esta WebApp **hereda** el diseño del prototipo y la estructura de datos del schema, y
lo convierte en aplicación real (con escritura, auth, roles, PWA, despliegue).

## 3. Navegación (común a todas las secciones)

Barra **inferior fija** (pegada al borde inferior) con **7 íconos**, estilo *lineal minimalista*
(monoline, esquinas redondeadas, monocromático `#808080`, tamaño base 25 px; el ícono de la
sección activa **crece 15%**). En escritorio esa barra se convierte en **sidebar lateral**.

Orden (izquierda → derecha):

| # | Sección | Ícono |
|---|---|---|
| 1 | **Portada** (home) | casa |
| 2 | **Mi historial** | reloj con flecha antihoraria |
| 3 | **Indicadores** | gráfico de línea ascendente |
| 4 | **Actividades (POA)** | bloques / tarjetas |
| 5 | **Reportes** | portapapeles con lista |
| 6 | **Incidencias / Alertas** | triángulo de alerta |
| 7 | **Calendario** | calendario (badge “18”) |

La barra es **estática** y visible en cada sección.

## 4. Alcance funcional (7 secciones)

### Sección 1 — Portada
- **Barra superior** color navy `#1F3460`: saludo según hora (Buen día 05:00–12:00 con ícono
  de sol · Buenas tardes 12:00–18:30 con sol · Buenas noches 18:30–05:00 con luna) + **nombre**
  y **cargo/rol**; **logo Efecto Áncash** a la derecha. Botón **Salir** (logout).
- **Bloque 2 (KPIs del mes):** 3 targets — *programadas*, *reportadas* y *% reportabilidad*
  (reportadas / programadas × 100), filtrados por el mes actual.
- **Bloque 1 (menú):** grid 2×3 de 6 botones (ícono + título) → Reportes, Indicadores,
  Actividades, Calendario, Mi historial, Incidencias.
- **Bloque 3:** tabla “Próximas actividades” (col. Actividad 3x / col. Fecha x), orden por
  cercanía (desempate alfabético), **máx. 5 filas**.
- **Bloque 4:** 2 botones — “Visitar web principal” y “Dejar comentario o sugerencia”
  (modal con textarea, cerrar arriba-derecha, Enviar → popup “Gracias por tus comentarios.”).

### Sección 4 — Actividades (POA)
- **Listado de actividades grandes** con filtros **Año · Mes · Territorio (UGT) · Componente · Estado**.
- Tarjeta por actividad: **barra de color** de título, etiquetas (UGT, Componente, año, Mes,
  Estado — cada una con su color oficial) y **círculos pequeños** = sub-actividades (un color por
  estado de cumplimiento) + **chevron** → abre **4.1 Programación**.
  - Estados de sub-actividad: Ejecutado `#437a22` · Reprogramado `#8e44ad` · Cancelado `#000000` ·
    vencida >3 d `#c0392b` · vencida >0 d `#e07000` · pendiente `#cccccc`.
- **4.1 Programación:** cabecera con nombre de la actividad grande, label `UGT - Componente`,
  botón atrás y **círculo de estado**; bloque **“Agregar actividad”**; filtros **Responsable** y
  **Estado**; listado de **sub-actividades** con lugar (`Distrito / CentroPoblado / IE (nivel)`),
  responsable, `Fecha: <día>; dd/mm/aaaa - Hora inicio: hh:mm` y **punto+pastilla de estado**.
- **4.2 Reporte:** según estado → si *Programado* abre formulario de reporte; si *Ejecutado/
  Cancelado* abre **solo lectura**. Cabecera morada `#6B3293` con botón **Guardar y enviar**.
  Campos: Actividad · Localización (+Fecha programada) · Responsable · **Descripción** ·
  **Participantes** (Docentes, Familias, Estudiantes, Otros — enteros ≥0) · **Logro del espacio** ·
  **toggle “¿Hubo incidencia/alerta?”** → despliega bloque Incidencia/Alerta (ver Sección 6).
- **4.3 Crear actividad:** formulario de nueva sub-actividad (tipo, fecha, horas, lugar,
  responsable, etc.); mismo lenguaje visual.

### Sección 6 — Incidencias y Alertas
- **Registrar caso:** origen **De actividad (POA)** (asocia localización/actividad) o
  **Independiente**. Segmento **Incidencia | Alerta**.
- **Incidencia** → categorías relacionadas a violencia/riesgo y subcategorías
  (Física, Verbal, Psicológica, Sexual, Ciberbullying, Accidente, Enfermedad, Crisis emocional,
  Negligencia, Violencia doméstica, Ausentismo docente, Infraestructura, Conflicto con autoridad,
  Logística, Comunicación, Clima laboral). **Observación:** muy probable que las subcategorías de
  riesgo/conducta (Física…Negligencia) sean **incidencia** y las operativas (Infraestructura,
  Logística, Comunicación, Clima laboral, Ausentismo, Conflicto con autoridad) sean **alerta** →
  **a confirmar** antes de fijar el catálogo (ver §11).
- **Alerta** → alertas **NEE** (Riesgo de aprendizaje) con **Diagnóstico previo**
  (Sí / No / En proceso / Desconoce) + alertas informativas.
- **NivelSemáforo:** Informativo · Leve · Moderado · Urgente · Prioritario.
- Categorías de riesgo: RT, OP, PB, IE, AT, BP, NEE, DO.
- Categorías/subcategorías = **listas desplegables** (no saturar). Bloques exclusivos de Alerta
  solo visibles si se marcó *Alerta*.
- **Bandeja** → **Detalle** → **Crear actividad de seguimiento** (1..N, origen = caso, estado
  automático *En seguimiento*) → **Cerrar caso** (Resuelta / No requiere) → **Indicador de
  resolución** (totales, % efectividad, por tipo, por origen, tiempo medio de cierre).
- Ciclo: `Abierta → En seguimiento → Cerrada`.

### Sección 5 — Reportes
- **Hub** que filtra por **Actividad grande del POA** (+ Periodo, Estado) y **redirige** a las
  vistas ya existentes: **Generar/Registrar reporte → 4.2**; **Editar → 4.3**; **Posponer/
  reprogramar**; y botón **“Generar reporte consolidado (PDF)”**.
- KPIs: Programadas · Reportadas · Pendientes · Canceladas; tarjetas con barra de avance
  (sub-actividades reportadas x/y · %).

### Sección 3 — Indicadores
- **Cabecera verde claro** (~1/3 de pantalla) con título, UGT/programa y selector de mes.
- KPIs de cantidad: Programadas · Reportadas · Canceladas · Reprogramadas.
- Chips: **% Reportabilidad**, **% Cancelación/Reprogramación**.
- Barras **por UGT**; **dona** por tipo de actividad; **línea** de ejecutadas por semana;
  **% reportabilidad por mes**.
- Ampliaciones sugeridas (chips): cobertura de IIEE, actividades sin reportar (vencidas),
  participantes/docentes alcanzados (**distinct**), % de reportes con evidencia, alertas
  resueltas vs abiertas, carga por responsable.

### Sección 7 — Calendario
- **3 vistas: Día · Semana · Mes**, con todas las actividades del grupo.
- **Filtros en desplegables:** Territorio · Integrantes del equipo · CR · Tipo de actividad.
- Cada evento con **Responsable** y **participantes** (estudiantes en **iniciales**).
- **Modo horizontal (escritorio) optimizado:** mes al **60%** del ancho + lista del día al 40%;
  semana en 7 columnas.
- **Outlook** como **capa opt-in** (`enabled=false`): importar (solo lectura), enviar o
  bidireccional; nunca se fusiona con una actividad; degradación limpia.

### Sección 2 — Mi historial
- Bandeja de eventos (actividad / reporte / incidencia / alerta) con **drill-down** por tipo,
  alimentada por la tabla de auditoría **append-only** (`evento`).

## 5. Doble estilo (requisito explícito)

| | Principal (teléfono) | Secundario (PC/laptop) |
|---|---|---|
| Breakpoint | `< 1024px` | `≥ 1024px` |
| Navegación | barra inferior fija (7 íconos) | **sidebar** izquierda + topbar |
| Contenido | una columna, scroll | rejilla multi-columna, listas + detalle lado a lado |
| Casos | portada, 4.x, 6, calendario vertical | calendario horizontal, indicadores en grid, tablas |

El **mismo código** sirve ambos: CSS con `@media` + `data-layout` conmutado por JS (permite
**previsualizar** ambos estilos desde un toggle).

## 6. Usuarios y roles

El equipo territorial. Roles: **6 CT · 7 Coord. PDL/PDLD · 4 Coord. QM ·
3 Tutores Lectoescritura · 2 Comunicaciones · 2 Formación · 1 Jefe Territorial · 1 Admin MEL**.
Login: correo del equipo + contraseña (hash SHA-256; demo de acceso). **5 intentos** → bloqueo
15 min. “Recordarme 30 días”. **Logout** visible. RBAC por rol × alcance (UGT/programa).

## 7. Datos

- Schema **`efectoancash`** (PostgreSQL): core + programación + instrumentos + CCA + Mente Sana +
  PDLE + Academia Juvenil (builder declarativo por capas).
- **`bd_intranet`** (intranet) y **`bd_analitica`** (AJ): solo lectura cualificada.
- **ESCALE** (4 983 escuelas) como padrón de IIEE (`core_ie`), IE = **IE × Nivel** (`cod_unico`).
- Catálogos oficiales: UGT, Componente (PROG-0..9 / ECO-1..3), Estados, Categorías/Subcategorías,
  NivelSemáforo (colores en `tokens.css`).

## 8. Privacidad y seguridad

- Datos de estudiantes/familias: **solo servidor interno**, nunca a APIs externas; en UI,
  **iniciales**. La lista `Incidencias` original trae campos sensibles → jamás a repo público.
- Repo público (si GitHub Pages/Azure SWA): **sin correos en claro** (allowlist hasheada).

## 9. Estado y brechas (a cerrar)

- Prototipo: **completo** (32 pantallas) pero con deuda (CSS duplicado, sin router real).
- Backend: schema + seeds aplicados; falta **API de escritura + auth + RBAC**.
- Brechas de diseño a confirmar: mapeo **categoría → subcategoría** (incidencia vs alerta),
  valores de `especifico`, alcance de KPIs y qué cuenta como **“reportada”**; catálogo NEE.

Ver `ARQUITECTURA.md` (cómo se construye) y `PLAN_ETAPAS.md` (por dónde empezamos).
