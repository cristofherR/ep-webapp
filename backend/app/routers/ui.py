from fastapi import APIRouter
from .. import db

router = APIRouter(tags=["ui"])

# Contenido data-driven (ui_*). Lista para migrar a la tabla cuando el schema esté conectado.
DEFAULT_UI = {
    "tema": {"navy": "#1F3460", "teal": "#0E7C70", "morado": "#6B3293"},
    "secciones": [
        {"id": "actividades", "label": "Actividades"},
        {"id": "indicadores", "label": "Indicadores"},
        {"id": "historial", "label": "Mi historial"},
        {"id": "portada", "label": "Inicio"},
        {"id": "reportes", "label": "Reportes"},
        {"id": "incidencias", "label": "Incidencias"},
        {"id": "calendario", "label": "Calendario"},
    ],
}


@router.get("/ui")
def ui():
    try:
        rows = None  # TODO: SELECT desde <schema>.ui_texto / ui_orden
        if rows:
            return {"tema": DEFAULT_UI["tema"], "secciones": rows}
    except Exception:
        pass
    return DEFAULT_UI
