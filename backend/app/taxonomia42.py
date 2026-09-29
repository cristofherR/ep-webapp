"""Taxonomía canónica del módulo 4.2 (incidencias / alertas) — Efecto Áncash.

Fuente de verdad del triángulo, con relaciones N:M explícitas:

    Naturaleza (familia)   1→N   Subcategoría (cada sub vive en UNA familia)
    Categoría (ámbito)     N:M   Subcategoría (tabla puente)
    ⇒  Naturaleza          N:M   Categoría (derivada)

El endpoint /api/catalogos sirve esto mismo; si la BD ya tiene el puente
(prog_nat_subcat / prog_cat_subcat) ese manda. Este módulo es el respaldo
canónico para que la cascada del formulario NUNCA quede vacía.
"""

# (codigo, etiqueta, color_hex, orden)
NATURALEZAS = [
    ("CONV",  "Conducta y violencia",  "#C0574B", 1),
    ("SALUD", "Salud y seguridad",     "#0E7C70", 2),
    ("DER",   "Protección y derechos", "#B5651D", 3),
    ("GEST",  "Gestión y operación",   "#0077A8", 4),
]

# subcategoría (código canónico) → naturaleza (familia)
SUB_NATURALEZA = {
    "FISICA": "CONV", "VERBAL": "CONV", "PSICOLOGICA": "CONV",
    "SEXUAL": "CONV", "CIBERBULLYING": "CONV",
    "ACCIDENTE": "SALUD", "ENFERMEDAD": "SALUD", "CRISIS_EMOCIONAL": "SALUD",
    "NEGLIGENCIA": "DER", "VIOLENCIA_DOMESTICA": "DER",
    "AUSENTISMO_DOCENTE": "GEST", "INFRAESTRUCTURA": "GEST",
    "CONFLICTO_AUTORIDAD": "GEST", "LOGISTICA": "GEST",
    "COMUNICACION": "GEST", "CLIMA_LABORAL": "GEST",
}

# categoría (ámbito) → subcategorías permitidas (N:M)
CATEGORIA_SUBCATEGORIA = {
    "PB":  ["FISICA", "VERBAL", "PSICOLOGICA", "SEXUAL", "CIBERBULLYING",
            "NEGLIGENCIA", "VIOLENCIA_DOMESTICA", "CRISIS_EMOCIONAL"],
    "BP":  ["FISICA", "PSICOLOGICA", "SEXUAL", "CIBERBULLYING", "NEGLIGENCIA",
            "VIOLENCIA_DOMESTICA", "CRISIS_EMOCIONAL", "ACCIDENTE", "ENFERMEDAD"],
    "IE":  ["FISICA", "VERBAL", "PSICOLOGICA", "SEXUAL", "NEGLIGENCIA", "COMUNICACION"],
    "NEE": ["CRISIS_EMOCIONAL", "AUSENTISMO_DOCENTE", "NEGLIGENCIA"],
    "OP":  ["AUSENTISMO_DOCENTE", "LOGISTICA", "COMUNICACION", "CLIMA_LABORAL",
            "CONFLICTO_AUTORIDAD"],
    "DO":  ["INFRAESTRUCTURA", "LOGISTICA", "AUSENTISMO_DOCENTE", "ACCIDENTE", "ENFERMEDAD"],
    "RT":  ["CONFLICTO_AUTORIDAD", "COMUNICACION", "VERBAL"],
    "AT":  ["CONFLICTO_AUTORIDAD", "FISICA", "VERBAL"],
}

# Categoría que lleva campos exclusivos (bloque NEE). El resto usa campos genéricos.
CATEGORIA_CAMPOS_ESPECIALES = "NEE"


def naturalezas_payload() -> list:
    return [{"codigo": c, "etiqueta": e, "color": col}
            for c, e, col, _ in NATURALEZAS]


def payload() -> dict:
    """Estructura que consume el formulario (cascada Naturaleza→Categoría→Subcategoría)."""
    return {
        "naturalezas": naturalezas_payload(),
        "sub_nat": dict(SUB_NATURALEZA),
        "cat_sub": {k: list(v) for k, v in CATEGORIA_SUBCATEGORIA.items()},
        "campos_especiales": CATEGORIA_CAMPOS_ESPECIALES,
    }
