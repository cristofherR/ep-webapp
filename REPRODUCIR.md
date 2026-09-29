# Cómo reproducir este proyecto

Todo se ejecuta **sin credenciales y sin datos reales**. El backend arranca en *modo UI*
(sin base de datos) y el frontend es estático. Si quieres datos, apunta a **tu propia**
base de datos PostgreSQL con un schema equivalente.

## Requisitos

- Python 3.10+
- `pip install -r backend/requirements.txt`
  (fastapi, uvicorn, sqlalchemy[asyncio], asyncpg, pydantic-settings, itsdangerous)

## 1. Backend (modo UI, sin base de datos)

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# .env con EA_DATABASE_URL vacío → no toca ninguna BD
cp .env.example .env

uvicorn app.main:app --port 8090
```

Resultado esperado:

- `GET http://localhost:8090/api/health` → `{"status":"ok","app":"EA WebApp MEL","db":false}`
- Documentación OpenAPI en `http://localhost:8090/docs` (la app monta los routers listados en
  `backend/app/routers/`).

## 2. Frontend (estático)

```bash
cd frontend
python3 -m http.server 5173
```

Abre `http://localhost:5173`. En desarrollo el frontend llama a la API en el mismo host:5173
por defecto; puedes forzar el host de la API con `?api=http://localhost:8090` (ver `src/api.js`).

El **service worker** (PWA) solo se activa sobre `http://localhost` o `https://`, no con `file://`.

## 3. Con tu propia base de datos (opcional)

1. Copia `.env.example` a `.env` y define:

   | Variable | Para qué |
   |---|---|
   | `EA_DATABASE_URL` | cadena async: `postgresql+asyncpg://usuario:clave@host:5432/base` |
   | `EA_SCHEMA` | schema donde viven las tablas (por defecto `efectoancash`) |
   | `EA_SECRET_KEY` | clave larga y aleatoria para firmar la sesión |

2. Crea el schema con las tablas que consultan los routers (`core_*`, `prog_*`,
   `ui_*`, catálogos). Los nombres de tabla y columnas están documentados en el
   docstring de cada router en `backend/app/routers/`.
3. Reinicia `uvicorn`. `/api/health` debe mostrar `"db":true`.

> `EA_SECRET_KEY` **nunca** debe ser la de ejemplo en producción.

## 4. Verificación antes de publicar

```bash
```

Recorre todo el repo y avisa si aparece una credencial, un host interno, un correo personal,
un ID de hoja de cálculo, un UUID interno, un teléfono/DNI o una ruta privada.
Si imprime **Limpio**, se puede publicar.

## Estructura y contrato de datos

- `docs/ARQUITECTURA.md` — stack, capas, doble layout, contrato de datos y rendimiento.
- `docs/VISION.md` — qué hace cada sección de la aplicación.
- `docs/PLAN_ETAPAS.md` — plan por etapas y *definition of done*.

## Notas de saneamiento (qué se cambió para publicar)

- Se eliminaron `.env` reales, `__pycache__`, herramientas internas de un solo uso y las
  auditorías internas (mencionaban hosts, rutas y decisiones privadas).
- Los nombres de sistemas/base internos se generalizaron (`bd_intranet`, `bd_analitica`).
- Las fotos de portada y los logotipos se reemplazaron por **placeholders neutros**
  (no verificables como libres de personas); reemplázalos por tus propios assets.
- Los correos, conteos de personal y contraseñas de demostración se retiraron.
